import { spawn, ChildProcess } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'
import logger from './logger.js'

const log = logger.scope('openclaw')

export class OpenClawProcess {
  private process: ChildProcess | null = null
  private openclawPath: string = ''

  constructor() {
    this.initPath()
  }

  private initPath() {
    // 开发环境: 使用项目目录下的 openclaw
    // 生产环境: 使用 resources 目录
    if (app.isPackaged) {
      // 生产环境: extraResources 直接在 Contents/Resources/openclaw-source/
      this.openclawPath = path.join(process.resourcesPath, 'openclaw-source')
    } else {
      // 开发环境: resources/ 在 client/ 目录下
      this.openclawPath = path.join(app.getAppPath(), 'resources', 'openclaw-source')
    }
    log.info('OpenClaw 路径:', this.openclawPath)
  }

  async start(): Promise<void> {
    if (this.process) {
      log.warn('OpenClaw 进程已在运行')
      return
    }

    return new Promise((resolve, reject) => {
      log.info('正在启动 OpenClaw 进程...')

      // 优先使用 tsx（开发/调试时），fallback 到 node（生产 npm 安装）
      const tsxBin = path.join(this.openclawPath, 'node_modules', 'tsx', 'dist', 'cli.mjs')
      const useTsx = fs.existsSync(tsxBin)
      const runnerArgs = useTsx
        ? [tsxBin, 'openclaw.mjs']
        : [path.join(this.openclawPath, 'openclaw.mjs')]
      const runnerLabel = useTsx ? 'tsx' : 'node'

      if (!useTsx) {
        log.info('tsx not found in node_modules, using node directly')
      }

      this.process = spawn('node', runnerArgs, {
        cwd: this.openclawPath,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          OPENCLAW_HOME: path.join(app.getPath('userData'), 'openclaw'),
          ...(process.env.NODE_ENV === 'development' ? { SKIP_UPDATE_CHECK: 'true' } : {})
        }
      })
      log.info(`OpenClaw 进程已启动 (runner=${runnerLabel})，等待 Gateway 就绪...`)

      // 收集输出
      this.process.stdout?.on('data', (data) => {
        log.info('[OpenClaw stdout]:', data.toString().trim())
      })

      this.process.stderr?.on('data', (data) => {
        log.warn('[OpenClaw stderr]:', data.toString().trim())
      })

      this.process.on('error', (err) => {
        log.error('OpenClaw 启动失败:', err)
        this.process = null
        reject(err)
      })

      this.process.on('exit', (code, signal) => {
        log.info(`OpenClaw 进程退出: code=${code}, signal=${signal}`)
        this.process = null
      })

      // 进程已启动，resolve 即可
      // 整体超时由 gateway-bridge.waitForHttpReady() 的 30 秒超时处理
      resolve()
    })
  }

  stop(): void {
    if (this.process) {
      log.info('正在停止 OpenClaw 进程...')
      this.process.removeAllListeners('exit')
      this.process.removeAllListeners('error')
      this.process.removeAllListeners('data')
      this.process.kill('SIGTERM')
      this.process = null
    }
  }

  restart(attempt = 0): Promise<void> {
    this.stop()
    // Exponential backoff: 1s, 2s, 4s, 8s (max 10s)
    const delay = Math.min(1000 * Math.pow(2, attempt), 10_000)
    return new Promise<void>(resolve => setTimeout(() => resolve(), delay))
      .then(() => this.start())
  }

  isRunning(): boolean {
    return this.process !== null
  }

  getStatus(): { running: boolean; path: string } {
    return {
      running: this.isRunning(),
      path: this.openclawPath
    }
  }
}

// 导出单例
export const openclawProcess = new OpenClawProcess()

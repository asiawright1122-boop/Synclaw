import { spawn, ChildProcess } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'

const log = {
  info: (...args: any[]) => console.log('[OpenClaw]', new Date().toISOString(), ...args),
  warn: (...args: any[]) => console.warn('[OpenClaw]', new Date().toISOString(), ...args),
  error: (...args: any[]) => console.error('[OpenClaw]', new Date().toISOString(), ...args)
}

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

      // 使用 tsx 运行 TypeScript 源码（无需预编译 dist/）
      // tsx 支持直接加载 .ts 文件并处理相对路径导入
      const tsxBin = path.join(this.openclawPath, 'node_modules', 'tsx', 'dist', 'cli.mjs')

      // 快速失败检查：确保 tsx 二进制文件存在
      if (!fs.existsSync(tsxBin)) {
        const msg = (
          `tsx binary not found at: ${tsxBin}\n` +
          `This usually means OpenClaw source has not been downloaded.\n` +
          `To fix this, run one of the following:\n` +
          `  - node scripts/download-openclaw.mjs\n` +
          `  - npm run openclaw:download\n` +
          `Or check if openclaw-source directory exists at: ${this.openclawPath}`
        )
        log.error(msg)
        reject(new Error(msg))
        return
      }

      this.process = spawn('node', [tsxBin, 'openclaw.mjs'], {
        cwd: this.openclawPath,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          OPENCLAW_HOME: path.join(app.getPath('userData'), 'openclaw'),
          ...(process.env.NODE_ENV === 'development' ? { SKIP_UPDATE_CHECK: 'true' } : {})
        }
      })

      // 收集输出
      this.process.stdout?.on('data', (data) => {
        log.info('[OpenClaw stdout]:', data.toString().trim())
      })

      this.process.stderr?.on('data', (data) => {
        log.warn('[OpenClaw stderr]:', data.toString().trim())
      })

      this.process.on('error', (err) => {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          log.error(`OpenClaw 启动失败: 找不到 tsx 可执行文件，请确认 openclaw-source 已下载`)
        } else {
          log.error('OpenClaw 启动失败:', err)
        }
        this.process = null
      })

      this.process.on('exit', (code, signal) => {
        log.info(`OpenClaw 进程退出: code=${code}, signal=${signal}`)
        this.process = null
      })

      // 进程已启动，resolve 即可
      // 整体超时由 gateway-bridge.waitForHttpReady() 的 30 秒超时处理
      log.info('OpenClaw 进程已启动，等待 Gateway 就绪...')
      resolve()
    })
  }

  stop(): void {
    if (this.process) {
      log.info('正在停止 OpenClaw 进程...')
      this.process.kill('SIGTERM')
      this.process = null
    }
  }

  restart(): Promise<void> {
    this.stop()
    return new Promise<void>(resolve => setTimeout(() => resolve(), 1000))
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

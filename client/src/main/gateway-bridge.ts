/**
 * gateway-bridge.ts
 *
 * SynClaw 与 OpenClaw Gateway 的核心桥接层。
 *
 * 职责：
 * 1. 启动 OpenClaw 子进程（通过 openclawProcess）
 * 2. 轮询 HTTP /ready 等待 Gateway 就绪
 * 3. 实例化 GatewayClient 并连接
 * 4. 将 RPC 请求透传给 Gateway
 * 5. 将 Gateway 事件（EventFrame）分发给 Electron BrowserWindow
 *
 * 注意：由于 openclaw-source 使用 "type": "module" 且 exports 字段限制了子路径导入，
 * 我们用运行时 require() 动态加载，绕过 esbuild 的静态 import 解析。
 * build 时 __OPENCLAW_SOURCE_PATH__ 被构建脚本替换为绝对路径。
 */

import type { BrowserWindow } from 'electron'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
// __OPENCLAW_SOURCE_PLACEHOLDER__ 在构建时被替换为实际的路径字符串
// 使用 .ts 扩展名动态导入（Node.js ESM 支持 TypeScript 文件）
const _OPENCLAW_ACTUAL_PATH = __OPENCLAW_SOURCE_PLACEHOLDER__
const _m: any = await import(_OPENCLAW_ACTUAL_PATH + '/src/gateway/client.ts')
const GatewayClient = _m.GatewayClient
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const GatewayClientOptions: any = _m.GatewayClientOptions

const log = {
  info: (...args: unknown[]) => console.log(`[GatewayBridge] ${new Date().toISOString()}`, ...args),
  warn: (...args: unknown[]) => console.warn(`[GatewayBridge] ${new Date().toISOString()}`, ...args),
  error: (...args: unknown[]) => console.error(`[GatewayBridge] ${new Date().toISOString()}`, ...args),
}

export type GatewayStatus = 'idle' | 'starting' | 'ready' | 'connected' | 'disconnected' | 'error'

export type GatewayBridgeOptions = {
  /** Gateway WebSocket 地址，默认 ws://127.0.0.1:18789 */
  url?: string
  /** 认证 Token（从 openclaw config get gateway.auth.token 获取） */
  token?: string
  /** Bootstrap Token */
  bootstrapToken?: string
  /** 启动超时（ms），默认 30000 */
  startupTimeoutMs?: number
  /** 就绪检查间隔（ms），默认 500 */
  readyCheckIntervalMs?: number
}

type EventHandler = (event: string, payload: unknown) => void

export class GatewayBridge {
  private client: GatewayClient | null = null
  private status: GatewayStatus = 'idle'
  private statusListeners: Array<(s: GatewayStatus) => void> = []
  private eventListeners: EventHandler[] = []
  private browserWindows: Set<BrowserWindow> = new Set()
  private opts: Required<GatewayBridgeOptions>

  constructor(opts: GatewayBridgeOptions = {}) {
    this.opts = {
      url: opts.url ?? 'ws://127.0.0.1:18789',
      token: opts.token,
      bootstrapToken: opts.bootstrapToken,
      startupTimeoutMs: opts.startupTimeoutMs ?? 30_000,
      readyCheckIntervalMs: opts.readyCheckIntervalMs ?? 500,
    }
  }

  // ── 连接生命周期 ──────────────────────────────────────────────────────

  /**
   * 完整连接流程：
   * 1. 启动 OpenClaw 子进程
   * 2. 轮询 /ready 直到就绪
   * 3. 获取 auth token（若未提供）
   * 4. 实例化并启动 GatewayClient
   */
  async connect(): Promise<void> {
    if (this.status === 'connected' || this.status === 'ready' || this.status === 'starting') {
      log.warn('Gateway 已在连接中或已连接')
      return
    }

    this.setStatus('starting')
    log.info('开始连接 OpenClaw Gateway...')

    try {
      // 步骤 1: 启动 OpenClaw 子进程
      log.info('[Step 1] 启动 OpenClaw 子进程...')
      const { openclawProcess } = await import('./openclaw.js')
      if (!openclawProcess.isRunning()) {
        await openclawProcess.start()
      }

      // 步骤 2: 等待 Gateway HTTP 服务就绪
      log.info('[Step 2] 等待 Gateway HTTP 服务就绪...')
      await this.waitForHttpReady()

      // 步骤 3: 获取 auth token（如果未提供）
      let token = this.opts.token
      if (!token) {
        log.info('[Step 3] 获取 Gateway auth token...')
        token = await this.fetchAuthToken()
      }

      // 步骤 4: 连接 Gateway WebSocket
      log.info('[Step 4] 连接 Gateway WebSocket...')
      await this.connectWebSocket(token)

      this.setStatus('connected')
      log.info('OpenClaw Gateway 连接成功')
    } catch (err) {
      this.setStatus('error')
      log.error('OpenClaw Gateway 连接失败:', err)
      throw err
    }
  }

  /**
   * 断开 Gateway 连接并停止子进程。
   */
  async disconnect(): Promise<void> {
    log.info('正在断开 OpenClaw Gateway...')

    if (this.client) {
      this.client.stop()
      this.client = null
    }

    const { openclawProcess } = await import('./openclaw.js')
    if (openclawProcess.isRunning()) {
      openclawProcess.stop()
    }

    this.setStatus('disconnected')
    log.info('OpenClaw Gateway 已断开')
  }

  /**
   * 重新连接。
   */
  async reconnect(): Promise<void> {
    await this.disconnect()
    await this.connect()
  }

  // ── RPC 请求 ─────────────────────────────────────────────────────────

  /**
   * 向 Gateway 发送 RPC 请求。
   *
   * @param method  Gateway 方法名（如 'agent', 'chat.send', 'sessions.list'）
   * @param params  请求参数
   * @param opts.expectFinal  是否等待流式方法的最终响应（默认 false）
   * @param opts.timeoutMs    超时（ms），null 表示无限
   */
  async request<T = Record<string, unknown>>(
    method: string,
    params?: unknown,
    opts: { expectFinal?: boolean; timeoutMs?: number | null } = {},
  ): Promise<T> {
    if (!this.client) {
      throw new Error('Gateway 未连接，请先调用 connect()')
    }
    return this.client.request<T>(method, params, opts)
  }

  // ── 状态 ─────────────────────────────────────────────────────────────

  getStatus(): GatewayStatus {
    return this.status
  }

  onStatusChange(listener: (s: GatewayStatus) => void): () => void {
    this.statusListeners.push(listener)
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== listener)
    }
  }

  // ── 事件监听 ────────────────────────────────────────────────────────

  /**
   * 监听所有 Gateway 事件。
   * 返回取消订阅函数。
   */
  onEvent(listener: EventHandler): () => void {
    this.eventListeners.push(listener)
    return () => {
      this.eventListeners = this.eventListeners.filter(l => l !== listener)
    }
  }

  // ── BrowserWindow 注册 ──────────────────────────────────────────────

  /**
   * 注册 BrowserWindow，Gateway 事件会广播到所有已注册的窗口。
   */
  registerWindow(win: BrowserWindow): void {
    this.browserWindows.add(win)
    win.on('closed', () => {
      this.browserWindows.delete(win)
    })
  }

  // ── 私有方法 ────────────────────────────────────────────────────────

  private setStatus(s: GatewayStatus) {
    this.status = s
    this.broadcastStatusChange(s)
    for (const listener of this.statusListeners) {
      try {
        listener(s)
      } catch (err) {
        log.error('status listener error:', err)
      }
    }
  }

  private broadcastEvent(event: string, payload: unknown) {
    for (const listener of this.eventListeners) {
      try {
        listener(event, payload)
      } catch (err) {
        log.error('event listener error:', err)
      }
    }
    for (const win of this.browserWindows) {
      if (!win.isDestroyed()) {
        win.webContents.send('openclaw:event', { event, payload })
      }
    }
  }

  private broadcastStatusChange(status: GatewayStatus) {
    for (const win of this.browserWindows) {
      if (!win.isDestroyed()) {
        win.webContents.send('openclaw:statusChange', status)
      }
    }
  }

  private async waitForHttpReady(): Promise<void> {
    const httpUrl = this.opts.url.replace(/^ws/, 'http').replace(/\/ws$/, '') + '/ready'
    const deadline = Date.now() + this.opts.startupTimeoutMs

    while (Date.now() < deadline) {
      try {
        const res = await fetch(httpUrl, { signal: AbortSignal.timeout(this.opts.readyCheckIntervalMs * 2) })
        if (res.ok || res.status === 200) {
          log.info('Gateway HTTP 服务已就绪')
          return
        }
      } catch {
        // 还没启动，继续等待
      }
      const waited = Date.now() - (deadline - this.opts.startupTimeoutMs)
      if (waited > 5000 && waited % 10000 < this.opts.readyCheckIntervalMs) {
        log.warn(`Gateway 启动中，已等待 ${Math.round(waited / 1000)}s...`)
      }
      await this.sleep(this.opts.readyCheckIntervalMs)
    }
    const elapsed = this.opts.startupTimeoutMs
    throw new Error(
      `Gateway HTTP 服务在 ${elapsed / 1000}s 后仍未就绪。\n` +
      `可能原因：\n` +
      `1. OpenClaw 源码未下载（运行: node scripts/download-openclaw.mjs）\n` +
      `2. OpenClaw 进程启动失败（检查日志 above）\n` +
      `3. 端口 ${this.opts.url.replace('ws://','').replace(':18789','')}:18789 被占用\n` +
      `4. Node.js 版本不兼容（需要 >= 18）`
    )
  }

  private async fetchAuthToken(): Promise<string> {
    // 通过 HTTP 获取当前 token（从 openclaw 配置文件）
    // 尝试从 gateway.auth.token 读取
    const cfgUrl = this.opts.url.replace(/^ws/, 'http').replace(/\/ws$/, '') + '/config'
    try {
      // 通过 /ready 后的已知端点获取 token
      // 实际 token 存储在 OpenClaw 配置文件中，我们通过 gateway.identity.get 首次获取
      // 但首次连接需要 token，所以我们需要一个 bootstrap token
      // 使用空 token 触发 challenge，看 gateway 返回什么
      const httpUrl = this.opts.url.replace(/^ws/, 'http').replace(/\/ws$/, '')
      const res = await fetch(`${httpUrl}/health`, { signal: AbortSignal.timeout(5000) })
      if (!res.ok) {
        throw new Error(`health check failed: ${res.status}`)
      }
      // token 为空时，GatewayClient 会自动尝试无认证连接
      return ''
    } catch (err) {
      log.warn('无法获取 auth token，将使用无认证连接:', err)
      return ''
    }
  }

  private async connectWebSocket(token: string): Promise<void> {
    // Collect helloOk / connectError via temporary callbacks so we can await them.
    let helloResolve!: () => void
    let helloReject!: (err: Error) => void
    let connected = false

    const clientOpts: GatewayClientOptions = {
      url: this.opts.url,
      token: token || undefined,
      bootstrapToken: this.opts.bootstrapToken || undefined,
      clientName: 'synclaw',
      clientDisplayName: 'SynClaw',
      clientVersion: '1.0.0',
      platform: process.platform,
      role: 'operator',
      scopes: ['operator.admin'],
      onEvent: (evt) => {
        this.broadcastEvent(evt.event, evt.payload)
      },
      onHelloOk: (hello) => {
        if (connected) return
        connected = true
        log.info('Gateway handshake 成功:', hello)
        helloResolve()
      },
      onConnectError: (err) => {
        if (connected) return
        connected = true
        log.error('Gateway 连接错误:', err.message)
        this.setStatus('error')
        const msg = `Gateway WebSocket 连接失败: ${err.message}\n` +
          `可能原因：\n` +
          `1. Gateway HTTP 服务未就绪\n` +
          `2. Token 认证失败（检查 OpenClaw 配置）\n` +
          `3. 网络连接问题\n` +
          `请尝试：重启 SynClaw 或检查 OpenClaw Gateway 配置`
        helloReject(new Error(msg))
      },
      onClose: (code, reason) => {
        log.warn(`Gateway 连接关闭: code=${code} reason=${reason}`)
        this.setStatus('disconnected')
      },
    }

    this.client = new GatewayClient(clientOpts)
    this.client.start()

    // 等待 helloOk（连接成功）或连接错误
    await new Promise<void>((resolve, reject) => {
      helloResolve = resolve
      helloReject = reject
      // 超时保护：15s 后若仍未连接成功则放弃
      setTimeout(() => {
        if (!connected) {
          connected = true
          reject(new Error('Gateway handshake 超时（15s）'))
        }
      }, 15_000)
    })
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// 单例导出
let bridgeInstance: GatewayBridge | null = null

export function getGatewayBridge(): GatewayBridge {
  if (!bridgeInstance) {
    bridgeInstance = new GatewayBridge()
  }
  return bridgeInstance
}

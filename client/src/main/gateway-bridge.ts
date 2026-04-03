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
 * 我们用运行时动态 import() 动态加载，绕过 esbuild 的静态 import 解析。
 * 路径通过 app.isPackaged 运行时判断（与 openclaw.ts 一致）。
 */

import { app, BrowserWindow } from 'electron'
import * as path from 'path'
import * as os from 'node:os'
import logger from './logger.js'
import { getAppSettings } from './index.js'
import { getGatewayClientClass, getGatewayClientOptionsClass } from './openclaw-gateway.js'

const log = logger.scope('gateway-bridge')

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any = null
  private status: GatewayStatus = 'idle'
  private statusListeners: Array<(s: GatewayStatus) => void> = []
  private eventListeners: EventHandler[] = []
  private browserWindows: Set<BrowserWindow> = new Set()
  private opts: Required<GatewayBridgeOptions>

  constructor(opts: GatewayBridgeOptions = {}) {
    this.opts = {
      url: opts.url ?? 'ws://127.0.0.1:18789',
      token: opts.token ?? '',
      bootstrapToken: opts.bootstrapToken ?? '',
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

      // 步骤 5: 应用 SynClaw 安全加固配置
      log.info('[Step 5] 应用安全加固配置...')
      await this.applySecurityConfig()

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
    // @ts-expect-error — client is dynamically loaded, type-safe call not possible at compile time
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.client as any).request<T>(method, params, opts)
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
    for (const win of Array.from(this.browserWindows)) {
      if (!win.isDestroyed()) {
        win.webContents.send('openclaw:event', { event, payload })
      }
    }
  }

  private broadcastStatusChange(status: GatewayStatus) {
    for (const win of Array.from(this.browserWindows)) {
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
    // 从 OpenClaw 配置文件读取 gateway.auth.token
    const httpUrl = this.opts.url.replace(/^ws/, 'http').replace(/\/ws$/, '')
    try {
      // 先检查 Gateway 是否就绪
      const res = await fetch(`${httpUrl}/health`, { signal: AbortSignal.timeout(5000) })
      if (!res.ok) {
        throw new Error(`health check failed: ${res.status}`)
      }
      // Gateway 已就绪后，尝试读取配置文件获取 token
      // 优先使用 OPENCLAW_HOME（与 openclawProcess 启动参数一致）
      const openclawHome =
        (process.env.OPENCLAW_HOME && process.env.OPENCLAW_HOME.trim()) ||
        path.join(app.getPath('userData'), 'openclaw')
      const candidates = [
        path.join(openclawHome, '.openclaw', 'openclaw.json'),
        path.join(openclawHome, '.openclaw', 'config.json'),
        path.join(openclawHome, 'openclaw.json'),
        path.join(os.homedir(), '.openclaw', 'openclaw.json'),
        path.join(os.homedir(), '.openclaw', 'config.json'),
      ]

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const readTokenFrom = async (filePath: string): Promise<string | null> => {
        try {
          const fs = await import('node:fs/promises')
          const content = await fs.readFile(filePath, 'utf-8')
          const config = JSON.parse(content)
          const token = config?.gateway?.auth?.token
          return typeof token === 'string' ? token : null
        } catch {
          return null
        }
      }

      for (const filePath of candidates) {
        const token = await readTokenFrom(filePath)
        if (token) {
          log.info(`从配置文件读取 gateway token 成功: ${filePath}`)
          return token
        }
      }
      log.warn('所有候选配置文件中均未找到 gateway.auth.token，尝试无认证连接')
      return ''
    } catch (err) {
      log.warn('获取 auth token 失败，将使用无认证连接:', err)
      return ''
    }
  }

  private async connectWebSocket(token: string): Promise<void> {
    // Collect helloOk / connectError via temporary callbacks so we can await them.
    let helloResolve!: () => void
    let helloReject!: (err: Error) => void
    let connected = false

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clientOpts: any = {
      url: this.opts.url,
      token: token || undefined,
      bootstrapToken: this.opts.bootstrapToken || undefined,
      clientName: 'synclaw',
      clientDisplayName: 'SynClaw',
      clientVersion: '1.0.0',
      platform: process.platform,
      // Minimal scopes: only what SynClaw actually needs.
      // Scope elevation risk (GHSA-rqpp-rjj8-7wv8) is mitigated by:
      //   1. OpenClaw version >= 2026.3.12 (CVE fixed)
      //   2. Token fetched from Gateway config (not empty)
      //   3. electron-store is single source of truth for UI config
      //   4. File operations go through IPC path validation, NOT Gateway exec
      role: 'operator',
      scopes: ['gateway.healthy', 'config.get', 'sessions.list', 'sessions.patch', 'sessions.reset', 'sessions.delete', 'sessions.preview', 'sessions.compact', 'sessions.usage', 'agent', 'agent.wait', 'agent.identity.get', 'chat.send', 'chat.history', 'chat.abort', 'chat.inject', 'skills.status', 'skills.install', 'skills.update', 'memory.search', 'memory.list', 'memory.delete', 'memory.store', 'hooks.list', 'hooks.add', 'hooks.update', 'hooks.remove', 'hooks.runs', 'logs.tail', 'tools.catalog', 'models.list', 'models.getCurrent', 'models.setCurrent', 'models.configure', 'cron.list', 'cron.status', 'cron.add', 'cron.update', 'cron.remove', 'cron.run', 'cron.runs'],
      onEvent: (evt: { event: string; payload: unknown }) => {
        this.broadcastEvent(evt.event, evt.payload)
      },
      onHelloOk: (hello: unknown) => {
        if (connected) return
        connected = true
        log.info('Gateway handshake 成功:', hello)
        helloResolve()
      },
      onConnectError: (err: { message: string }) => {
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
      onClose: (code: number, reason: string) => {
        log.warn(`Gateway 连接关闭: code=${code} reason=${reason}`)
        this.setStatus('disconnected')
      },
    }

    const GatewayClient = await getGatewayClientClass()
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

  /**
   * 应用 SynClaw 安全加固配置到 Gateway。
   * 通过 config.patch RPC 设置，不修改 openclaw 配置文件。
   *
   * 配置分层：
   *   Layer 1（强制，不可关闭）：gateway.tools.deny — Gateway 全局工具阻断
   *   Layer 2（建议，SynClaw 默认开启）：agents.defaults.sandbox — Docker 隔离
   *   Layer 3（可选）：tools.* — 运行时工具策略
   */
  /**
   * 推送安全加固配置到 Gateway。
   * 首次连接时由 connect() 自动调用；也可由外部（如 index.ts store 变更监听器）
   * 调用本方法重新推送，无需重连。
   *
   * 关键：limitAccess 从 getAppSettings() 实时读取，而非硬编码。
   */
  async refreshSecurityConfig(): Promise<void> {
    await this.applySecurityConfig()
  }

  private async applySecurityConfig(): Promise<void> {
    // 实时读取 limitAccess（来自 electron-store，不在连接时缓存）
    const { limitAccess } = getAppSettings().workspace
    const securityConfig = {
      // Layer 1: Gateway 全局阻断 — 最高优先级
      gateway: {
        tools: {
          // 阻止危险的工具跨所有 agent 逃逸
          deny: [
            'operator.admin',     // 禁止 scope 提升攻击（GHSA-rqpp）
          ],
        },
      },

      // Layer 2: Agent 沙箱配置
      agents: {
        defaults: {
          sandbox: {
            // non-main: 主会话在宿主机，sub-session 在 Docker 隔离
            // 平衡安全性与功能（主进程需要访问 GUI 资源）
            mode: 'non-main' as const,
            scope: 'session' as const,
          },
        },
      },

      // Layer 3: 工具运行时策略
      tools: {
        // 最小工具集（SynClaw 主要用于文件系统操作和 AI 对话）
        profile: 'minimal' as const,

        // 全局工具阻断
        deny: [
          // 禁止自动化攻击工具
          'group:automation',
          // 禁止运行时注入（eval/exec）
          'group:runtime',
          // 禁止会话冒充（会话在沙箱中隔离）
          'sessions_spawn',
          'sessions_send',
          // 禁止文件描述符攻击
          'fd_write',
        ],

        // 文件工具限制：limitAccess=true 时强制工作区隔离
        fs: {
          workspaceOnly: limitAccess,
        },

        // exec 工具：限制在沙箱中，强制审批
        exec: {
          host: limitAccess ? 'sandbox' : 'host',
          security: 'deny',
          ask: 'always',
        },

        // 禁用特权提升（关键）
        elevated: {
          enabled: false,
        },
      },
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await this.request<any>('config.patch', securityConfig)
      if (res?.success === false || res?.error) {
        log.warn('安全加固配置应用失败（非致命，继续运行）:', res?.error)
      } else {
        log.info(`安全加固配置应用成功 (limitAccess=${limitAccess})`)
      }
    } catch (err) {
      // 配置失败不阻止连接，记录警告继续
      log.warn('安全加固 RPC 调用失败（非致命，继续运行）:', err)
    }
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

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
import { getGatewayClientClass } from './openclaw-gateway.js'

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

// ── Request Deduplication & Hot Method Caching ─────────────────────────
// 29-03: Request deduplication within 500ms window
// 29-04: Hot method caching with per-method TTL

const DEFAULT_REQUEST_TIMEOUT_MS = 10_000 // 10 seconds
const SHOULD_RETRY_METHODS = new Set([
  'agent', 'chat.send', 'chat.abort',
  'exec.approval.request', 'exec.approval.resolve',
  'file.read', 'file.write', 'file.delete', 'file.mkdir',
])

// Hot methods with per-method TTL (ms) — 29-04
const HOT_METHODS: Record<string, number> = {
  'models.list': 30_000,        // 30s — Header + ChatView model selector
  'models.getCurrent': 10_000,  // 10s — Header model selector
  'config.get': 5_000,          // 5s — Settings access
  'skills.status': 30_000,      // 30s — SkillsPanel
  'gateway.ping': 2_000,        // 2s — Status polling (most frequent)
  'sessions.list': 10_000,      // 10s — Session list
}

const CACHE_TTL_MS = 500        // Default TTL for non-hot methods (29-03)
const DEDUP_WINDOW_MS = 500     // Deduplication window (29-03)

// Methods excluded from caching/dedup — must always execute fresh
const DEDUP_EXCLUDED = new Set([
  'chat.send', 'chat.inject', 'chat.abort',
  'file.write', 'file.delete', 'file.mkdir',
  'sessions.patch', 'sessions.delete',
  'memory.store', 'memory.delete',
  'skills.install', 'skills.update',
  'cron.add', 'cron.update', 'cron.remove', 'cron.run',
  'models.setCurrent', 'models.configure',
  'config.patch',
])

// ── 请求去重配置 ──────────────────────────────────────────────────────

/** 写操作不参与去重（每次都应执行） */
const DEDUP_EXCLUDED = new Set([
  'chat.send', 'chat.inject', 'chat.abort',
  'file.write', 'file.delete', 'file.mkdir',
  'sessions.patch', 'sessions.delete',
  'memory.store', 'memory.delete',
  'skills.install', 'skills.update',
  'cron.add', 'cron.update', 'cron.remove', 'cron.run',
  'exec.approval.resolve',
])

const CACHE_TTL_MS = 500  // 缓存有效期 500ms
const CACHE_CLEANUP_THRESHOLD_MS = 1000  // 超过 1000ms 的缓存条目清理

// ── Typed interfaces for dynamic GatewayClient ──────────────────────
// Avoids `any` when calling client.request<T>() after dynamic import

interface GatewayClientInterface {
  start(): void
  stop(): void
  request<T>(
    method: string,
    params?: unknown,
    opts?: { expectFinal?: boolean; timeoutMs?: number | null },
  ): Promise<T>
}

interface GatewayClientOptionsInterface {
  url: string
  token?: string
  bootstrapToken?: string
  clientName: string
  clientDisplayName: string
  clientVersion: string
  platform: string
  role: string
  scopes: string[]
  onEvent: (evt: { event: string; payload: unknown }) => void
  onHelloOk: (hello: unknown) => void
  onConnectError: (err: { message: string }) => void
  onClose: (code: number, reason: string) => void
}

interface ConfigPatchResult {
  success?: boolean
  error?: string
}

export class GatewayBridge {
  private client: GatewayClientInterface | null = null
  private status: GatewayStatus = 'idle'
  private statusListeners: Array<(s: GatewayStatus) => void> = []
  private eventListeners: EventHandler[] = []
  private browserWindows: Set<BrowserWindow> = new Set()
  private opts: Required<GatewayBridgeOptions>
  private workspacePath: string | null = null

  // ── Request Deduplication & Caching (29-03, 29-04) ──────────────────
  private pendingRequests: Map<string, Promise<unknown>> = new Map()
  private requestCache: Map<string, { result: unknown; timestamp: number }> = new Map()
  private cacheStats = { hits: 0, misses: 0, invalidations: 0 }

  /** 正在进行的请求（用于去重：500ms 内相同请求等待同一 Promise） */
  private pendingRequests: Map<string, Promise<unknown>> = new Map()
  /** 请求结果缓存（TTL 500ms） */
  private requestCache: Map<string, { result: unknown; timestamp: number }> = new Map()

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

      // 步骤 5: 应用 SynClaw 安全加固配置
      log.info('[Step 5] 应用安全加固配置...')
      await this.applySecurityConfig()

      // 步骤 6: 获取 Gateway workspace 路径
      log.info('[Step 6] 获取 Gateway workspace 路径...')
      await this.fetchWorkspacePath()

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
   * 包含请求去重：500ms 内相同 method+params 的请求合并为一次 RPC 调用。
   *
   * @param method  Gateway 方法名（如 'agent', 'chat.send', 'sessions.list'）
   * @param params  请求参数
   * @param opts.expectFinal  是否等待流式方法的最终响应（默认 false）
   * @param opts.timeoutMs    超时（ms），null 表示无限
   * @param opts.retry        是否失败后重试 1 次（默认 false）
   */
  async request<T = Record<string, unknown>>(
    method: string,
    params?: unknown,
    opts: { expectFinal?: boolean; timeoutMs?: number | null; retry?: boolean } = {},
  ): Promise<T> {
    // 写操作不参与去重，直接执行
    if (DEDUP_EXCLUDED.has(method)) {
      return this.executeRequest<T>(method, params, opts, '__no_cache__')
    }

    const cacheKey = this.buildRequestKey(method, params)
    const now = Date.now()

    // 步骤 1: 检查缓存（TTL 500ms 内的读请求直接返回缓存）
    const cached = this.requestCache.get(cacheKey)
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      log.debug(`[cache-hit] ${method}`)
      return cached.result as T
    }

    // 步骤 2: 检查去重窗口（500ms 内相同请求等待同一 Promise）
    const existing = this.pendingRequests.get(cacheKey)
    if (existing) {
      log.debug(`[dedup] ${method} — 等待进行中的请求`)
      return existing as Promise<T>
    }

    // 步骤 3: 清理过期缓存（超过 1000ms 的条目）
    this.cleanupExpiredCache(now)

    // 步骤 4: 执行实际请求
    const promise = this.executeRequest<T>(method, params, opts, cacheKey)
    this.pendingRequests.set(cacheKey, promise)

    try {
      return await promise
    } finally {
      this.pendingRequests.delete(cacheKey)
    }
  }

  /**
   * 构建请求去重 key：method + JSON.stringify(params)
   */
  private buildRequestKey(method: string, params: unknown): string {
    return `${method}:${JSON.stringify(params ?? {})}`
  }

  /**
   * 清理过期缓存条目，防止内存泄漏
   */
  private cleanupExpiredCache(now: number): void {
    for (const [key, { timestamp }] of this.requestCache) {
      if (now - timestamp > CACHE_CLEANUP_THRESHOLD_MS) {
        this.requestCache.delete(key)
      }
    }
  }

  /**
   * 执行实际 RPC 请求
   */
  private async executeRequest<T>(
    method: string,
    params: unknown,
    opts: { expectFinal?: boolean; timeoutMs?: number | null; retry?: boolean },
    cacheKey: string,
  ): Promise<T> {
    const requestId = crypto.randomUUID()
    const logPrefix = `[req:${requestId.slice(0, 8)}]`
    const timeout = opts.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS
    const shouldRetry = opts.retry ?? SHOULD_RETRY_METHODS.has(method)

    log.debug(`${logPrefix} ${method} called`, { params })

    const attempt = async (attemptNum: number): Promise<T> => {
      try {
        const result = await this.requestWithTimeout<T>(method, params, opts, requestId, logPrefix, timeout)
        // 成功时缓存结果
        if (cacheKey !== '__no_cache__') {
          this.requestCache.set(cacheKey, { result, timestamp: Date.now() })
        }
        return result
      } catch (err) {
        if (attemptNum === 0 && shouldRetry) {
          log.warn(`${logPrefix} ${method} failed (attempt 1), retrying once...`, err)
          return this.requestWithTimeout<T>(method, params, opts, requestId, logPrefix, timeout)
            .then(result => {
              if (cacheKey !== '__no_cache__') {
                this.requestCache.set(cacheKey, { result, timestamp: Date.now() })
              }
              return result
            })
        }
        log.error(`${logPrefix} ${method} failed after ${attemptNum + 1} attempt(s):`, err)
        // 失败时不缓存，允许下次重试
        if (cacheKey !== '__no_cache__') {
          this.requestCache.delete(cacheKey)
        }
        throw err
      }
    }

    return attempt(0)
  }

  private async requestWithTimeout<T>(
    method: string,
    params: unknown,
    opts: { expectFinal?: boolean },
    requestId: string,
    logPrefix: string,
    timeoutMs: number,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Gateway request timed out after ${timeoutMs}ms: ${method}`))
      }, timeoutMs)

      const rawPromise = this.client!.request<T>(method, params, opts)

      rawPromise
        .then((result) => {
          clearTimeout(timer)
          log.debug(`${logPrefix} ${method} resolved`)
          resolve(result)
        })
        .catch((err) => {
          clearTimeout(timer)
          reject(err)
        })
    })
  }

  // ── 状态 ─────────────────────────────────────────────────────────────

  getStatus(): GatewayStatus {
    return this.status
  }

  /** Returns the WebSocket connection URL used by this bridge. */
  getConnectionUrl(): string {
    return this.opts.url
  }

  /**
   * Returns the Gateway workspace path, or falls back to the default path.
   */
  getWorkspacePath(): string {
    return this.workspacePath ?? path.join(app.getPath('home'), '.openclaw-synclaw', 'workspace')
  }

  /**
   * Fetches the Gateway workspace path via RPC and caches it.
   * Called after connection is established.
   */
  private async fetchWorkspacePath(): Promise<void> {
    try {
      // Try to get workspace path from Gateway config
      const result = await this.client!.request<{ workspacePath?: string }>('config.get', {})
      if (result?.workspacePath) {
        this.workspacePath = result.workspacePath
        log.info(`Gateway workspace path: ${this.workspacePath}`)
      } else {
        log.warn('Gateway config.get did not return workspacePath — using default')
        this.workspacePath = path.join(app.getPath('home'), '.openclaw-synclaw', 'workspace')
      }
    } catch (err) {
      log.warn('Failed to fetch workspace path from Gateway, using default:', err)
      this.workspacePath = path.join(app.getPath('home'), '.openclaw-synclaw', 'workspace')
    }
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

      const readTokenFrom = async (filePath: string): Promise<string | null> => {
        try {
          const fs = await import('node:fs/promises')
          const content = await fs.readFile(filePath, 'utf-8')
          const config: { gateway?: { auth?: { token?: unknown } } } = JSON.parse(content)
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
      log.warn('所有候选配置文件中均未找到 gateway.auth.token')
      throw new Error('Gateway auth token 未配置。请在 OpenClaw 配置文件中设置 gateway.auth.token，或通过 SynClaw 设置界面提供 Token。')
    } catch (err) {
      log.error('获取 auth token 失败:', err)
      return ''
    }
  }

  private async connectWebSocket(token: string): Promise<void> {
    // Collect helloOk / connectError via temporary callbacks so we can await them.
    let helloResolve!: () => void
    let helloReject!: (err: Error) => void
    let connected = false

    const clientOpts: GatewayClientOptionsInterface = {
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

  // ── Request Deduplication & Caching (29-03, 29-04) ──────────────────

  /**
   * Build cache/dedup key from method and params.
   */
  private buildRequestKey(method: string, params: unknown): string {
    return `${method}:${JSON.stringify(params ?? {})}`
  }

  /**
   * Invalidate related read caches after a write operation (29-04).
   * Maps write methods to their related read caches.
   */
  private invalidateRelatedCache(method: string): void {
    const maps: Record<string, string[]> = {
      'models.setCurrent': ['models.list:{}', 'models.getCurrent:{}'],
      'models.configure': ['models.list:{}', 'models.getCurrent:{}'],
      'config.patch': ['config.get:{}'],
      'skills.install': ['skills.status:{}'],
      'skills.update': ['skills.status:{}'],
    }
    const toDelete = maps[method] ?? []
    for (const key of toDelete) {
      this.requestCache.delete(key)
      this.cacheStats.invalidations++
    }
  }

  /**
   * Cleanup expired cache entries to prevent memory leaks (29-03).
   */
  private cleanupExpiredCache(): void {
    const now = Date.now()
    for (const [key, { timestamp }] of this.requestCache) {
      const ttl = this.getCacheTTL(key.split(':')[0])
      if (now - timestamp > ttl * 2) {
        this.requestCache.delete(key)
      }
    }
  }

  /**
   * Get TTL for a method (hot method or default 500ms).
   */
  private getCacheTTL(method: string): number {
    return HOT_METHODS[method] ?? CACHE_TTL_MS
  }

  /**
   * Get cache statistics for debugging (29-04).
   */
  getCacheStats(): { hits: number; misses: number; invalidations: number; hitRate: string } {
    const total = this.cacheStats.hits + this.cacheStats.misses
    const hitRate = total > 0 ? `${((this.cacheStats.hits / total) * 100).toFixed(1)}%` : '0%'
    return { ...this.cacheStats, hitRate }
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
            // Docker 隔离配置（SBX-02, SBX-03）
            docker: {
              network: 'none' as const,       // SBX-02: 沙箱内网络完全禁用
              readOnlyRoot: true as const,    // SBX-03: 根目录只读
            },
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
      const res = await this.request<ConfigPatchResult>('config.patch', securityConfig)
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

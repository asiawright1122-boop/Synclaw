// Type declarations for the preload API surface exposed via contextBridge.
// This file augments the global Window interface for the renderer process.

export type OpenClawStatus = 'idle' | 'starting' | 'ready' | 'connected' | 'disconnected' | 'error'

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface OpenClawEvent {
  event: string
  payload: unknown
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  fontSize: number
  animationsEnabled: boolean
  notificationsEnabled: boolean
  compactMode: boolean
  favorites: string[]
  hasCompletedOnboarding: boolean
  authorizedDirs: string[]
  privacy: {
    optimizationPlan: boolean
  }
  workspace: {
    limitAccess: boolean
    autoSave: boolean
    watch: boolean
    heartbeat: '30m' | '1h' | '2h' | '4h'
  }
  tts: {
    enabled: boolean
    speed: number
    volume: number
    autoPlay: boolean
    provider: string | null
  }
  stt: {
    enabled: boolean
    autoStart: boolean
  }
  web: {
    deviceToken: string
    deviceId: string
    deviceName: string
    lastReportedAt: string | null
  }
  security: {
    encryptionEnabled: boolean
    encryptionKeySetAt: string | null
    webApiBase: string
  }
}

export interface FileInfo {
  name: string
  path: string
  isDirectory: boolean
}

export interface FileStat {
  size: number
  isDirectory: boolean
  isFile: boolean
  created: string
  modified: string
}

export interface ClawHubSkillSummary {
  name: string
  description: string
  emoji?: string
  eligible: boolean
  disabled: boolean
  blockedByAllowlist: boolean
  source?: string
  bundled: boolean
  primaryEnv?: string
  homepage?: string
  missing: { bins: string[]; anyBins: string[]; env: string[]; config: string[]; os: string[] }
  install: Array<{ kind: string; label: string; [key: string]: unknown }>
}

export interface ClawHubListResult {
  workspaceDir: string
  managedSkillsDir: string
  skills: ClawHubSkillSummary[]
}

export interface ClawHubSearchResult {
  results: Array<{ name: string; description: string; version?: string; author?: string; downloads?: number; [key: string]: unknown }>
}

export interface ClawHubCheckResult {
  summary: { total: number; eligible: number; disabled: number; blocked: number; missingRequirements: number }
  eligible: string[]
  disabled: string[]
  blocked: string[]
  missingRequirements: Array<{ name: string; missing: ClawHubSkillSummary['missing']; install: ClawHubSkillSummary['install'] }>
}

export interface ElectronAPI {
  window: {
    minimize: () => Promise<void>
    maximize: () => Promise<void>
    close: () => Promise<void>
    isMaximized: () => Promise<boolean>
    toggleFullScreen: () => Promise<void>
    onMaximizeChange: (callback: (isMaximized: boolean) => void) => void
  }
  file: {
    read: (filePath: string) => Promise<ApiResponse<string>>
    readBinary: (filePath: string) => Promise<ApiResponse<string>>
    write: (filePath: string, content: string) => Promise<ApiResponse>
    list: (dirPath: string) => Promise<ApiResponse<FileInfo[]>>
    delete: (filePath: string) => Promise<ApiResponse>
    stat: (filePath: string) => Promise<ApiResponse<FileStat>>
    mkdir: (dirPath: string) => Promise<ApiResponse>
    exists: (filePath: string) => Promise<ApiResponse<boolean>>
    rename: (oldPath: string, newPath: string) => Promise<ApiResponse>
    copy: (srcPath: string, destPath: string) => Promise<ApiResponse>
    watch: (dirPath: string) => Promise<ApiResponse>
    unwatch: (dirPath: string) => Promise<ApiResponse>
    onFileChange: (callback: (data: { dirPath: string; event: string; filename: string | null }) => void) => () => void
    /** 查询路径是否在授权范围内（不执行实际操作） */
    validatePath: (filePath: string) => Promise<ApiResponse<{ authorized: boolean; reason?: string }>>
  }
  dialog: {
    openFile: (options?: Electron.OpenDialogOptions) => Promise<Electron.OpenDialogReturnValue>
    saveFile: (options?: Electron.SaveDialogOptions) => Promise<Electron.SaveDialogReturnValue>
    selectDirectory: () => Promise<Electron.OpenDialogReturnValue>
  }
  shell: {
    openPath: (filePath: string) => Promise<string>
    openExternal: (url: string) => Promise<void>
    showItemInFolder: (filePath: string) => Promise<void>
    expandTilde: (inputPath: string) => Promise<string>
  }
  app: {
    getVersion: () => Promise<string>
    getPath: (name: 'home' | 'appData' | 'userData' | 'temp' | 'desktop' | 'documents' | 'trash') => Promise<string>
    setAutoLaunch: (enabled: boolean) => Promise<ApiResponse>
    getAutoLaunch: () => Promise<boolean>
    downloadUpdate: () => Promise<ApiResponse>
    installUpdate: () => Promise<ApiResponse>
  }
  notifications: {
    setEnabled: (enabled: boolean) => Promise<ApiResponse>
  }
  // Landing page (About)
  landing: {
    isAvailable: () => Promise<ApiResponse<boolean>>
    show: () => Promise<ApiResponse>
    hide: () => Promise<ApiResponse>
  }
  // App Settings (electron-store)
  settings: {
    get: () => Promise<ApiResponse<AppSettings>>
    set: (key: string, value: unknown) => Promise<ApiResponse>
    reset: () => Promise<ApiResponse<AppSettings>>
    /** 监听其他窗口对 electron-store 的修改 */
    onChanged: (callback: (data: { key: string; value: unknown; settings: AppSettings }) => void) => () => void
  }
  // ClawHub
  clawhub: {
    status: () => Promise<ApiResponse<{ installed: boolean; version: string | null; error?: string }>>
    list: () => Promise<ApiResponse<ClawHubListResult>>
    search: (query: string) => Promise<ApiResponse<ClawHubSearchResult>>
    install: (name: string, version?: string) => Promise<ApiResponse<{ ok: boolean; message: string; stdout?: string; stderr?: string }>>
    update: (name?: string, version?: string) => Promise<ApiResponse<{ ok: boolean; message: string; stdout?: string }>>
    check: () => Promise<ApiResponse<ClawHubCheckResult>>
    uninstall: (name: string) => Promise<ApiResponse<{ ok: boolean; message: string; stdout?: string }>>
    installCli: () => Promise<ApiResponse<{ ok: boolean; message: string; version?: string | null }>>
  }
  // Navigation events from main process
  onNavigate: (callback: (data: { page: string }) => void) => () => void
  // Security & Encryption
  security: {
    getStatus: () => Promise<ApiResponse<{
      encryptionEnabled: boolean
      encryptionKeySetAt: string | null
      webApiBaseConfigured: boolean
      webApiBase: string
      webApiBaseFromEnv: boolean
    }>>
    generateKey: () => Promise<ApiResponse<{
      key: string
      setAt: string
      instructions: string
    }>>
    setWebApiBase: (url: string) => Promise<ApiResponse>
  }
}

export interface OpenClawAPI {
  // Lifecycle
  getStatus: () => Promise<OpenClawStatus>
  connect: () => Promise<ApiResponse>
  disconnect: () => Promise<ApiResponse>
  reconnect: () => Promise<ApiResponse>
  onStatusChange: (callback: (status: OpenClawStatus) => void) => () => void

  // Agent
  agent: (params: {
    message?: string
    sessionKey?: string
    agentId?: string
    model?: string
    thinking?: boolean
    [key: string]: unknown
  }) => Promise<ApiResponse>
  agentWait: (params: { runId: string; timeoutMs?: number }) => Promise<ApiResponse>
  agentIdentity: () => Promise<ApiResponse>

  // Chat
  chat: {
    send: (params: { message?: string; sessionKey?: string; model?: string; [key: string]: unknown }) => Promise<ApiResponse>
    history: (params: { sessionKey?: string; limit?: number; [key: string]: unknown }) => Promise<ApiResponse>
    abort: (params: { runId?: string; [key: string]: unknown }) => Promise<ApiResponse>
    inject: (params: { sessionKey?: string; parentId?: string; role?: string; content?: string; [key: string]: unknown }) => Promise<ApiResponse>
  }

  // Sessions
  sessions: {
    list: (params?: { label?: string; limit?: number; [key: string]: unknown }) => Promise<ApiResponse>
    preview: (params: { keys: string[]; limit?: number; maxChars?: number; [key: string]: unknown }) => Promise<ApiResponse>
    patch: (params: { id?: string; label?: string; config?: Record<string, unknown>; [key: string]: unknown }) => Promise<ApiResponse>
    reset: (params: { id?: string; [key: string]: unknown }) => Promise<ApiResponse>
    delete: (params: { id?: string; [key: string]: unknown }) => Promise<ApiResponse>
    compact: () => Promise<ApiResponse>
    usage: (params: { key?: string; startDate?: string; endDate?: string; [key: string]: unknown }) => Promise<ApiResponse>
  }

  // Send message
  send: (params: { to: string; message?: string; channel?: string; accountId?: string; [key: string]: unknown }) => Promise<ApiResponse>
  poll: (params: { to: string; question: string; options: string[]; maxSelections?: number; durationSeconds?: number; [key: string]: unknown }) => Promise<ApiResponse>

  // Avatars
  avatars: {
    list: () => Promise<ApiResponse>
    create: (params: { name?: string; model?: string; personality?: string; [key: string]: unknown }) => Promise<ApiResponse>
    update: (params: { id?: string; name?: string; model?: string; personality?: string; [key: string]: unknown }) => Promise<ApiResponse>
    delete: (params: { id?: string; [key: string]: unknown }) => Promise<ApiResponse>
  }

  // Agents files
  agentsFiles: {
    list: (params: { agentId: string }) => Promise<ApiResponse>
    get: (params: { agentId: string; name: string }) => Promise<ApiResponse>
    set: (params: { agentId: string; name: string; content: string }) => Promise<ApiResponse>
  }

  // Skills
  skills: {
    status: (params?: { skillKey?: string; [key: string]: unknown }) => Promise<ApiResponse>
    install: (params: { name?: string; installId?: string; [key: string]: unknown }) => Promise<ApiResponse>
    update: (params: { skillKey?: string; enabled?: boolean; apiKey?: string; env?: Record<string, string>; [key: string]: unknown }) => Promise<ApiResponse>
  }

  // Config
  config: {
    get: () => Promise<ApiResponse>
    set: (params: { baseHash?: string; raw: Record<string, unknown> }) => Promise<ApiResponse>
    patch: (params: Record<string, unknown>) => Promise<ApiResponse>
    apply: (params?: Record<string, unknown>) => Promise<ApiResponse>
    schema: () => Promise<ApiResponse>
  }

  // Cron
  cron: {
    list: (params?: { [key: string]: unknown }) => Promise<ApiResponse>
    status: () => Promise<ApiResponse>
    add: (params: { schedule?: string; agentId?: string; message?: string; [key: string]: unknown }) => Promise<ApiResponse>
    update: (params: { id?: string; schedule?: string; agentId?: string; message?: string; enabled?: boolean; [key: string]: unknown }) => Promise<ApiResponse>
    remove: (params: { id?: string; [key: string]: unknown }) => Promise<ApiResponse>
    run: (params: { id?: string; [key: string]: unknown }) => Promise<ApiResponse>
    runs: (params: { id?: string; limit?: number; [key: string]: unknown }) => Promise<ApiResponse>
  }

  // Tools
  tools: {
    catalog: (params?: { includePlugins?: boolean; [key: string]: unknown }) => Promise<ApiResponse>
  }

  // Models
  models: {
    list: () => Promise<ApiResponse>
    getCurrent: () => Promise<ApiResponse>
    setCurrent: (params: { modelId?: string; [key: string]: unknown }) => Promise<ApiResponse>
    configure: (params: {
      temperature?: number
      topP?: number
      topK?: number
      maxTokens?: number
      thinking?: boolean
      thinkingBudget?: number
      [key: string]: unknown
    }) => Promise<ApiResponse>
  }

  // Memory
  memory: {
    search: (params: { query?: string; limit?: number; type?: string; [key: string]: unknown }) => Promise<ApiResponse>
    store: (params: { type?: string; content?: string; metadata?: Record<string, unknown>; [key: string]: unknown }) => Promise<ApiResponse>
    list: (params?: { type?: string; limit?: number; [key: string]: unknown }) => Promise<ApiResponse>
    delete: (params: { key?: string; id?: string; [key: string]: unknown }) => Promise<ApiResponse>
  }

  // Channels
  channels: {
    status: (params?: { [key: string]: unknown }) => Promise<ApiResponse>
    configure: (params: { channel: string; accountId?: string; [key: string]: unknown }) => Promise<ApiResponse>
    disconnect: (params: { channel: string; accountId?: string; [key: string]: unknown }) => Promise<ApiResponse>
    logout: (params: { channel: string; accountId?: string; [key: string]: unknown }) => Promise<ApiResponse>
    send: (params: { channel: string; accountId?: string; to: string; content: string; [key: string]: unknown }) => Promise<ApiResponse>
  }

  // Web Login
  webLogin: {
    start: (params?: { force?: boolean; timeoutMs?: number; verbose?: boolean; accountId?: string }) => Promise<ApiResponse>
    wait: (params?: { timeoutMs?: number; accountId?: string }) => Promise<ApiResponse>
  }

  // TTS
  tts: {
    status: () => Promise<ApiResponse>
    providers: () => Promise<ApiResponse>
    enable: () => Promise<ApiResponse>
    disable: () => Promise<ApiResponse>
    convert: (params: { text: string; channel?: string }) => Promise<ApiResponse>
    setProvider?: (params: Record<string, unknown>) => Promise<ApiResponse>
  }

  // Update
  update: {
    run: (params?: { sessionKey?: string; note?: string; restartDelayMs?: number }) => Promise<ApiResponse>
  }

  // Logs
  logs: {
    tail: (params?: { cursor?: string; limit?: number; maxBytes?: number }) => Promise<ApiResponse>
  }

  // Hooks
  hooks: {
    list: (params?: { [key: string]: unknown }) => Promise<ApiResponse>
    add: (params: { id?: string; event: string; prompt?: string; enabled?: boolean; [key: string]: unknown }) => Promise<ApiResponse>
    update: (params: { id: string; event?: string; prompt?: string; enabled?: boolean; [key: string]: unknown }) => Promise<ApiResponse>
    remove: (params: { id: string; [key: string]: unknown }) => Promise<ApiResponse>
    runs: (params?: { id?: string; limit?: number; [key: string]: unknown }) => Promise<ApiResponse>
  }

  // User
  user: {
    getPoints: () => Promise<ApiResponse>
    getPointsHistory: (params?: { limit?: number; [key: string]: unknown }) => Promise<ApiResponse>
  }

  // Usage
  usage: {
    status: () => Promise<ApiResponse>
    cost: (params?: { startDate?: string; endDate?: string; [key: string]: unknown }) => Promise<ApiResponse>
  }

  // Gateway
  gateway: {
    identity: () => Promise<ApiResponse>
    health: () => Promise<ApiResponse>
  }

  // Device
  device: {
    pair: {
      list: (params?: Record<string, unknown>) => Promise<ApiResponse>
      approve: (params: Record<string, unknown>) => Promise<ApiResponse>
      reject: (params: Record<string, unknown>) => Promise<ApiResponse>
      remove: (params: Record<string, unknown>) => Promise<ApiResponse>
    }
    token: {
      rotate: (params?: Record<string, unknown>) => Promise<ApiResponse>
      revoke: (params?: Record<string, unknown>) => Promise<ApiResponse>
    }
  }

  // Node
  node: {
    pair: {
      request: (params: Record<string, unknown>) => Promise<ApiResponse>
      list: (params?: Record<string, unknown>) => Promise<ApiResponse>
      approve: (params: Record<string, unknown>) => Promise<ApiResponse>
      reject: (params: Record<string, unknown>) => Promise<ApiResponse>
      verify: (params: Record<string, unknown>) => Promise<ApiResponse>
    }
    rename: (params: Record<string, unknown>) => Promise<ApiResponse>
    list: (params?: Record<string, unknown>) => Promise<ApiResponse>
    describe: (params: Record<string, unknown>) => Promise<ApiResponse>
    pending: {
      drain: (params: Record<string, unknown>) => Promise<ApiResponse>
      enqueue: (params: Record<string, unknown>) => Promise<ApiResponse>
      pull: (params: Record<string, unknown>) => Promise<ApiResponse>
      ack: (params: Record<string, unknown>) => Promise<ApiResponse>
    }
    invoke: (params: Record<string, unknown>) => Promise<ApiResponse>
    invokeResult: (params: Record<string, unknown>) => Promise<ApiResponse>
    event: (params: Record<string, unknown>) => Promise<ApiResponse>
    canvas: {
      capabilityRefresh: (params?: Record<string, unknown>) => Promise<ApiResponse>
    }
  }

  // Exec
  exec: {
    approvals: {
      get: (params?: Record<string, unknown>) => Promise<ApiResponse>
      set: (params: Record<string, unknown>) => Promise<ApiResponse>
      nodeGet: (params: Record<string, unknown>) => Promise<ApiResponse>
      nodeSet: (params: Record<string, unknown>) => Promise<ApiResponse>
    }
    approval: {
      request: (params: Record<string, unknown>) => Promise<ApiResponse>
      waitDecision: (params: Record<string, unknown>) => Promise<ApiResponse>
      resolve: (params: Record<string, unknown>) => Promise<ApiResponse>
    }
  }

  // Wizard
  wizard: {
    start: (params?: Record<string, unknown>) => Promise<ApiResponse>
    next: (params?: Record<string, unknown>) => Promise<ApiResponse>
    cancel: (params?: Record<string, unknown>) => Promise<ApiResponse>
    status: (params?: Record<string, unknown>) => Promise<ApiResponse>
  }

  // Push
  push: {
    test: (params?: Record<string, unknown>) => Promise<ApiResponse>
  }

  // Voice Wake
  voicewake: {
    get: (params?: Record<string, unknown>) => Promise<ApiResponse>
    set: (params: Record<string, unknown>) => Promise<ApiResponse>
  }

  // Browser
  browser: {
    request: (params: { method: string; url: string; body?: string; headers?: Record<string, string>; nodeId?: string }) => Promise<ApiResponse>
  }

  // System
  system: {
    presence: (params?: Record<string, unknown>) => Promise<ApiResponse>
    event: (params: Record<string, unknown>) => Promise<ApiResponse>
    lastHeartbeat: (params?: Record<string, unknown>) => Promise<ApiResponse>
    setHeartbeats: (params: Record<string, unknown>) => Promise<ApiResponse>
  }

  // Talk
  talk: {
    config: (params?: Record<string, unknown>) => Promise<ApiResponse>
    mode: (params: Record<string, unknown>) => Promise<ApiResponse>
  }

  // Doctor
  doctor: {
    memory: {
      status: (params?: Record<string, unknown>) => Promise<ApiResponse>
    }
  }

  // Config schema
  configSchema: {
    lookup: (params?: Record<string, unknown>) => Promise<ApiResponse>
  }

  // TTS setProvider (flat)
  ttsSetProvider?: (params: Record<string, unknown>) => Promise<ApiResponse>

  // Status
  statusGet?: (params?: Record<string, unknown>) => Promise<ApiResponse>

  // App Settings (electron-store)
  settings: {
    get: () => Promise<ApiResponse<AppSettings>>
    set: (key: string, value: unknown) => Promise<ApiResponse>
    reset: () => Promise<ApiResponse<AppSettings>>
    /** 监听其他窗口对 electron-store 的修改 */
    onChanged: (callback: (data: { key: string; value: unknown; settings: AppSettings }) => void) => () => void
  }

  // UI actions
  ui: {
    openCredits: () => void
    openSettings: () => void
    openAvatarCreate: () => void
  }

  // Navigation events
  onNavigate: (callback: (page: { page: string }) => void) => () => void

  // Events
  on: (callback: (e: OpenClawEvent) => void) => () => void

  // Web Platform Bridge
  web: {
    register: (apiToken: string) => Promise<ApiResponse<{ id: string; token: string }>>
    reportUsage: (events: Array<{
      eventType: 'SESSION_START' | 'MESSAGE_SENT' | 'TOKENS_CONSUMED'
      model?: string
      inputTokens?: number
      outputTokens?: number
      sessionId?: string
      messageCount?: number
      metadata?: Record<string, unknown>
    }>) => Promise<ApiResponse & { skipped?: boolean }>
    revoke: () => Promise<ApiResponse>
  }
}

// ── Subscription & Credits Types ─────────────────────────────────────────────

export type SubscriptionPlan = 'FREE' | 'STARTER' | 'PRO' | 'TEAM' | 'BYOK'
export type SubscriptionStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'INCOMPLETE' | 'INCOMPLETE_EXPIRED' | 'TRIALING' | 'UNPAID'

export interface Subscription {
  id: string
  plan: SubscriptionPlan
  status: SubscriptionStatus
  stripeCurrentPeriodEnd: string | null
  stripePriceId: string | null
  creditsBalance: number
  creditsExpireAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CreditsTransaction {
  id: string
  amount: number
  type: 'PURCHASE' | 'CONSUMPTION' | 'REFERRAL' | 'PROMO' | 'REFUND' | 'SUBSCRIPTION_BONUS'
  description: string
  createdAt: string
}

export interface UsageStats {
  period: 'daily' | 'weekly' | 'monthly' | 'yearly'
  creditsUsed: number
  apiCalls: number
  activeDays: number
  sessionsCount: number
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
    openclaw?: OpenClawAPI
  }
}

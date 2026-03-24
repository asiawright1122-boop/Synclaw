import { contextBridge, ipcRenderer } from 'electron'

// ── Shared types ─────────────────────────────────────────────────────

export type OpenClawStatus = 'idle' | 'starting' | 'ready' | 'connected' | 'disconnected' | 'error'

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  fontSize: number
  animationsEnabled: boolean
  notificationsEnabled: boolean
  compactMode: boolean
  favorites: string[]
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

export interface OpenClawEvent {
  event: string
  payload: unknown
}

// ── ElectronAPI ───────────────────────────────────────────────────────

const electronAPI = {
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    toggleFullScreen: () => ipcRenderer.invoke('window:toggleFullScreen'),
    onMaximizeChange: (callback: (isMaximized: boolean) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, isMaximized: boolean) => callback(isMaximized)
      ipcRenderer.on('window:maximizeChange', handler)
      return () => ipcRenderer.removeListener('window:maximizeChange', handler)
    },
  },

  file: {
    read: (filePath: string): Promise<ApiResponse<string>> =>
      ipcRenderer.invoke('file:read', filePath),
    readBinary: (filePath: string): Promise<ApiResponse<string>> =>
      ipcRenderer.invoke('file:readBinary', filePath),
    write: (filePath: string, content: string): Promise<ApiResponse> =>
      ipcRenderer.invoke('file:write', filePath, content),
    list: (dirPath: string): Promise<ApiResponse<FileInfo[]>> =>
      ipcRenderer.invoke('file:list', dirPath),
    delete: (filePath: string): Promise<ApiResponse> =>
      ipcRenderer.invoke('file:delete', filePath),
    stat: (filePath: string): Promise<ApiResponse<FileStat>> =>
      ipcRenderer.invoke('file:stat', filePath),
    mkdir: (dirPath: string): Promise<ApiResponse> =>
      ipcRenderer.invoke('file:mkdir', dirPath),
    exists: (filePath: string): Promise<ApiResponse<boolean>> =>
      ipcRenderer.invoke('file:exists', filePath),
    rename: (oldPath: string, newPath: string): Promise<ApiResponse> =>
      ipcRenderer.invoke('file:rename', oldPath, newPath),
    copy: (srcPath: string, destPath: string): Promise<ApiResponse> =>
      ipcRenderer.invoke('file:copy', srcPath, destPath),
    watch: (dirPath: string): Promise<ApiResponse> =>
      ipcRenderer.invoke('file:watch', dirPath),
    unwatch: (dirPath: string): Promise<ApiResponse> =>
      ipcRenderer.invoke('file:unwatch', dirPath),
    onFileChange: (callback: (data: { dirPath: string; event: string; filename: string | null }) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { dirPath: string; event: string; filename: string | null }) => callback(data)
      ipcRenderer.on('file:changed', handler)
      return () => ipcRenderer.removeListener('file:changed', handler)
    },
  },

  dialog: {
    openFile: (options?: Electron.OpenDialogOptions): Promise<Electron.OpenDialogReturnValue> =>
      ipcRenderer.invoke('dialog:openFile', options),
    saveFile: (options?: Electron.SaveDialogOptions): Promise<Electron.SaveDialogReturnValue> =>
      ipcRenderer.invoke('dialog:saveFile', options),
    selectDirectory: (): Promise<Electron.OpenDialogReturnValue> =>
      ipcRenderer.invoke('dialog:selectDirectory'),
  },

  shell: {
    openPath: (filePath: string): Promise<string> =>
      ipcRenderer.invoke('shell:openPath', filePath),
    openExternal: (url: string): Promise<void> =>
      ipcRenderer.invoke('shell:openExternal', url),
    showItemInFolder: (filePath: string): Promise<void> =>
      ipcRenderer.invoke('shell:showItemInFolder', filePath),
    expandTilde: (inputPath: string): Promise<string> =>
      ipcRenderer.invoke('path:expandTilde', inputPath),
  },

  app: {
    getVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),
    getPath: (name: 'home' | 'appData' | 'userData' | 'temp' | 'desktop' | 'documents'): Promise<string> =>
      ipcRenderer.invoke('app:getPath', name),
    setAutoLaunch: (enabled: boolean): Promise<ApiResponse> =>
      ipcRenderer.invoke('app:setAutoLaunch', enabled),
    getAutoLaunch: (): Promise<boolean> =>
      ipcRenderer.invoke('app:getAutoLaunch'),
    downloadUpdate: (): Promise<ApiResponse> =>
      ipcRenderer.invoke('app:downloadUpdate'),
    installUpdate: (): Promise<ApiResponse> =>
      ipcRenderer.invoke('app:installUpdate'),
  },

  notifications: {
    setEnabled: (enabled: boolean): Promise<ApiResponse> =>
      ipcRenderer.invoke('notifications:setEnabled', enabled),
  },

  // Navigation events from main process
  onNavigate: (callback: (data: { page: string }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { page: string }) => callback(data)
    ipcRenderer.on('navigate', handler)
    return () => ipcRenderer.removeListener('navigate', handler)
  },
}

// ── Update API ──────────────────────────────────────────────────────

contextBridge.exposeInMainWorld('updates', {
  onUpdateAvailable: (callback: (info: { version: string; releaseDate?: string }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, info: { version: string; releaseDate?: string }) => callback(info)
    ipcRenderer.on('openclaw:update-available', handler)
    return () => ipcRenderer.removeListener('openclaw:update-available', handler)
  },
  onUpdateDownloaded: (callback: (info: { version: string }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, info: { version: string }) => callback(info)
    ipcRenderer.on('openclaw:update-downloaded', handler)
    return () => ipcRenderer.removeListener('openclaw:update-downloaded', handler)
  },
})

// ── OpenClaw API ─────────────────────────────────────────────────────

const openclaw = {
  // ── Lifecycle ─────────────────────────────────────────────────────

  getStatus: (): Promise<OpenClawStatus> => ipcRenderer.invoke('openclaw:status'),
  connect: (): Promise<ApiResponse> => ipcRenderer.invoke('openclaw:connect'),
  disconnect: (): Promise<ApiResponse> => ipcRenderer.invoke('openclaw:disconnect'),
  reconnect: (): Promise<ApiResponse> => ipcRenderer.invoke('openclaw:reconnect'),

  onStatusChange: (callback: (status: OpenClawStatus) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, status: OpenClawStatus) => callback(status)
    ipcRenderer.on('openclaw:statusChange', handler)
    return () => ipcRenderer.removeListener('openclaw:statusChange', handler)
  },

  // ── Agent ──────────────────────────────────────────────────────────

  agent: (params: {
    message?: string
    sessionKey?: string
    agentId?: string
    model?: string
    thinking?: boolean
    [key: string]: unknown
  }): Promise<ApiResponse> => ipcRenderer.invoke('openclaw:agent', params),

  agentWait: (params: { runId: string; timeoutMs?: number }): Promise<ApiResponse> =>
    ipcRenderer.invoke('openclaw:agent:wait', params),

  agentIdentity: (): Promise<ApiResponse> => ipcRenderer.invoke('openclaw:agent:identity'),

  // ── Chat ──────────────────────────────────────────────────────────

  chat: {
    send: (params: { message?: string; sessionKey?: string; model?: string; [key: string]: unknown }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:chat:send', params),
    history: (params: { sessionKey?: string; limit?: number; [key: string]: unknown }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:chat:history', params),
    abort: (params: { runId?: string; [key: string]: unknown }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:chat:abort', params),
    inject: (params: { sessionKey?: string; parentId?: string; role?: string; content?: string; [key: string]: unknown }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:chat:inject', params),
  },

  // ── Sessions ─────────────────────────────────────────────────────

  sessions: {
    list: (params?: { label?: string; limit?: number; [key: string]: unknown }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:sessions:list', params ?? {}),
    preview: (params: { keys: string[]; limit?: number; maxChars?: number; [key: string]: unknown }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:sessions:preview', params),
    patch: (params: { id?: string; label?: string; config?: Record<string, unknown>; [key: string]: unknown }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:sessions:patch', params),
    reset: (params: { id?: string; [key: string]: unknown }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:sessions:reset', params),
    delete: (params: { id?: string; [key: string]: unknown }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:sessions:delete', params),
    compact: (): Promise<ApiResponse> => ipcRenderer.invoke('openclaw:sessions:compact'),
    usage: (params: { key?: string; startDate?: string; endDate?: string; [key: string]: unknown }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:sessions:usage', params),
  },

  // ── Send message ─────────────────────────────────────────────────

  send: (params: { to: string; message?: string; channel?: string; accountId?: string; [key: string]: unknown }): Promise<ApiResponse> =>
    ipcRenderer.invoke('openclaw:send', params),

  poll: (params: { to: string; question: string; options: string[]; maxSelections?: number; durationSeconds?: number; [key: string]: unknown }): Promise<ApiResponse> =>
    ipcRenderer.invoke('openclaw:poll', params),

  // ── Avatars (agents) ──────────────────────────────────────────────

  avatars: {
    list: (): Promise<ApiResponse> => ipcRenderer.invoke('openclaw:agents:list'),
    create: (params: { name?: string; model?: string; personality?: string; [key: string]: unknown }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:agents:create', params),
    update: (params: { id?: string; name?: string; model?: string; personality?: string; [key: string]: unknown }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:agents:update', params),
    delete: (params: { id?: string; [key: string]: unknown }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:agents:delete', params),
  },

  // ── Agents files ─────────────────────────────────────────────────

  agentsFiles: {
    list: (params: { agentId: string }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:agents:files:list', params),
    get: (params: { agentId: string; name: string }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:agents:files:get', params),
    set: (params: { agentId: string; name: string; content: string }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:agents:files:set', params),
  },

  // ── Skills ────────────────────────────────────────────────────────

  skills: {
    status: (params?: { skillKey?: string; [key: string]: unknown }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:skills:status', params ?? {}),
    install: (params: { name?: string; installId?: string; [key: string]: unknown }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:skills:install', params),
    update: (params: { skillKey?: string; enabled?: boolean; apiKey?: string; env?: Record<string, string>; [key: string]: unknown }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:skills:update', params),
  },

  // ── Config ───────────────────────────────────────────────────────

  config: {
    get: (): Promise<ApiResponse> => ipcRenderer.invoke('openclaw:config:get'),
    set: (params: { baseHash?: string; raw: Record<string, unknown> }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:config:set', params),
    patch: (params: Record<string, unknown>): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:config:patch', params),
    apply: (params?: Record<string, unknown>): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:config:apply', params ?? {}),
    schema: (): Promise<ApiResponse> => ipcRenderer.invoke('openclaw:config:schema'),
  },

  // ── Cron ──────────────────────────────────────────────────────────

  cron: {
    list: (params?: { [key: string]: unknown }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:cron:list', params ?? {}),
    status: (): Promise<ApiResponse> => ipcRenderer.invoke('openclaw:cron:status'),
    add: (params: { schedule?: string; agentId?: string; message?: string; [key: string]: unknown }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:cron:add', params),
    update: (params: { id?: string; schedule?: string; agentId?: string; message?: string; enabled?: boolean; [key: string]: unknown }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:cron:update', params),
    remove: (params: { id?: string; [key: string]: unknown }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:cron:remove', params),
    run: (params: { id?: string; [key: string]: unknown }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:cron:run', params),
    runs: (params: { id?: string; limit?: number; [key: string]: unknown }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:cron:runs', params),
  },

  // ── Tools ─────────────────────────────────────────────────────────

  tools: {
    catalog: (params?: { includePlugins?: boolean; [key: string]: unknown }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:tools:catalog', params ?? {}),
  },

  // ── Models ───────────────────────────────────────────────────────

  models: {
    list: (): Promise<ApiResponse> => ipcRenderer.invoke('openclaw:models:list'),
    getCurrent: (): Promise<ApiResponse> => ipcRenderer.invoke('openclaw:models:getCurrent'),
    setCurrent: (params: { modelId?: string; [key: string]: unknown }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:models:setCurrent', params),
    configure: (params: {
      temperature?: number
      topP?: number
      topK?: number
      maxTokens?: number
      thinking?: boolean
      thinkingBudget?: number
      [key: string]: unknown
    }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:models:configure', params),
  },

  // ── Memory ─────────────────────────────────────────────────────────

  memory: {
    search: (params: { query?: string; limit?: number; type?: string; [key: string]: unknown }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:memory:search', params),
    store: (params: { type?: string; content?: string; metadata?: Record<string, unknown>; [key: string]: unknown }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:memory:store', params),
    list: (params?: { type?: string; limit?: number; [key: string]: unknown }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:memory:list', params ?? {}),
    delete: (params: { key?: string; id?: string; [key: string]: unknown }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:memory:delete', params),
  },

  // ── Web Login ─────────────────────────────────────────────────────

  webLogin: {
    start: (params?: { force?: boolean; timeoutMs?: number; verbose?: boolean; accountId?: string }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:web:login:start', params ?? {}),
    wait: (params?: { timeoutMs?: number; accountId?: string }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:web:login:wait', params ?? {}),
  },

  // ── Channels ───────────────────────────────────────────────────────

  channels: {
    status: (params?: { [key: string]: unknown }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:channels:status', params ?? {}),
    configure: (params: { channel: string; accountId?: string; [key: string]: unknown }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:channels:configure', params),
    disconnect: (params: { channel: string; accountId?: string; [key: string]: unknown }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:channels:disconnect', params),
    logout: (params: { channel: string; accountId?: string; [key: string]: unknown }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:channels:logout', params),
    send: (params: { channel: string; accountId?: string; to: string; content: string; [key: string]: unknown }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:channels:send', params),
  },

  // ── TTS ───────────────────────────────────────────────────────────

  tts: {
    status: (): Promise<ApiResponse> => ipcRenderer.invoke('openclaw:tts:status'),
    providers: (): Promise<ApiResponse> => ipcRenderer.invoke('openclaw:tts:providers'),
    enable: (): Promise<ApiResponse> => ipcRenderer.invoke('openclaw:tts:enable'),
    disable: (): Promise<ApiResponse> => ipcRenderer.invoke('openclaw:tts:disable'),
    convert: (params: { text: string; channel?: string }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:tts:convert', params),
  },

  // ── Update ────────────────────────────────────────────────────────

  update: {
    run: (params?: { sessionKey?: string; note?: string; restartDelayMs?: number }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:update:run', params ?? {}),
  },

  // ── Logs ─────────────────────────────────────────────────────────

  logs: {
    tail: (params?: { cursor?: string; limit?: number; maxBytes?: number }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:logs:tail', params ?? {}),
  },

  // ── Hooks ─────────────────────────────────────────────────────────

  hooks: {
    list: (params?: { [key: string]: unknown }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:hooks:list', params ?? {}),
    add: (params: { id?: string; event: string; prompt?: string; enabled?: boolean; [key: string]: unknown }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:hooks:add', params),
    update: (params: { id: string; event?: string; prompt?: string; enabled?: boolean; [key: string]: unknown }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:hooks:update', params),
    remove: (params: { id: string; [key: string]: unknown }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:hooks:remove', params),
    runs: (params?: { id?: string; limit?: number; [key: string]: unknown }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:hooks:runs', params ?? {}),
  },

  // ── User ────────────────────────────────────────────────────────

  user: {
    getPoints: (): Promise<ApiResponse> => ipcRenderer.invoke('openclaw:user:getPoints'),
    getPointsHistory: (params?: { limit?: number; [key: string]: unknown }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:user:getPointsHistory', params ?? {}),
  },

  // ── Usage ─────────────────────────────────────────────────────────

  usage: {
    status: (): Promise<ApiResponse> => ipcRenderer.invoke('openclaw:usage:status'),
    cost: (params?: { startDate?: string; endDate?: string; [key: string]: unknown }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:usage:cost', params ?? {}),
  },

  // ── Device Pair ────────────────────────────────────────────────────

  device: {
    pair: {
      list: (params?: Record<string, unknown>): Promise<ApiResponse> =>
        ipcRenderer.invoke('openclaw:device:pair:list', params ?? {}),
      approve: (params: Record<string, unknown>): Promise<ApiResponse> =>
        ipcRenderer.invoke('openclaw:device:pair:approve', params),
      reject: (params: Record<string, unknown>): Promise<ApiResponse> =>
        ipcRenderer.invoke('openclaw:device:pair:reject', params),
      remove: (params: Record<string, unknown>): Promise<ApiResponse> =>
        ipcRenderer.invoke('openclaw:device:pair:remove', params),
    },
    token: {
      rotate: (params?: Record<string, unknown>): Promise<ApiResponse> =>
        ipcRenderer.invoke('openclaw:device:token:rotate', params ?? {}),
      revoke: (params?: Record<string, unknown>): Promise<ApiResponse> =>
        ipcRenderer.invoke('openclaw:device:token:revoke', params ?? {}),
    },
  },

  // ── Node Pair ─────────────────────────────────────────────────────

  node: {
    pair: {
      request: (params: Record<string, unknown>): Promise<ApiResponse> =>
        ipcRenderer.invoke('openclaw:node:pair:request', params),
      list: (params?: Record<string, unknown>): Promise<ApiResponse> =>
        ipcRenderer.invoke('openclaw:node:pair:list', params ?? {}),
      approve: (params: Record<string, unknown>): Promise<ApiResponse> =>
        ipcRenderer.invoke('openclaw:node:pair:approve', params),
      reject: (params: Record<string, unknown>): Promise<ApiResponse> =>
        ipcRenderer.invoke('openclaw:node:pair:reject', params),
      verify: (params: Record<string, unknown>): Promise<ApiResponse> =>
        ipcRenderer.invoke('openclaw:node:pair:verify', params),
    },
    rename: (params: Record<string, unknown>): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:node:rename', params),
    list: (params?: Record<string, unknown>): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:node:list', params ?? {}),
    describe: (params: Record<string, unknown>): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:node:describe', params),
    pending: {
      drain: (params: Record<string, unknown>): Promise<ApiResponse> =>
        ipcRenderer.invoke('openclaw:node:pending:drain', params),
      enqueue: (params: Record<string, unknown>): Promise<ApiResponse> =>
        ipcRenderer.invoke('openclaw:node:pending:enqueue', params),
      pull: (params: Record<string, unknown>): Promise<ApiResponse> =>
        ipcRenderer.invoke('openclaw:node:pending:pull', params),
      ack: (params: Record<string, unknown>): Promise<ApiResponse> =>
        ipcRenderer.invoke('openclaw:node:pending:ack', params),
    },
    invoke: (params: Record<string, unknown>): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:node:invoke', params),
    invokeResult: (params: Record<string, unknown>): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:node:invoke:result', params),
    event: (params: Record<string, unknown>): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:node:event', params),
    canvas: {
      capabilityRefresh: (params?: Record<string, unknown>): Promise<ApiResponse> =>
        ipcRenderer.invoke('openclaw:node:canvas:capability:refresh', params ?? {}),
    },
  },

  // ── Exec Approvals ─────────────────────────────────────────────────

  exec: {
    approvals: {
      get: (params?: Record<string, unknown>): Promise<ApiResponse> =>
        ipcRenderer.invoke('openclaw:exec:approvals:get', params ?? {}),
      set: (params: Record<string, unknown>): Promise<ApiResponse> =>
        ipcRenderer.invoke('openclaw:exec:approvals:set', params),
      nodeGet: (params: Record<string, unknown>): Promise<ApiResponse> =>
        ipcRenderer.invoke('openclaw:exec:approvals:node:get', params),
      nodeSet: (params: Record<string, unknown>): Promise<ApiResponse> =>
        ipcRenderer.invoke('openclaw:exec:approvals:node:set', params),
    },
    approval: {
      request: (params: Record<string, unknown>): Promise<ApiResponse> =>
        ipcRenderer.invoke('openclaw:exec:approval:request', params),
      waitDecision: (params: Record<string, unknown>): Promise<ApiResponse> =>
        ipcRenderer.invoke('openclaw:exec:approval:waitDecision', params),
      resolve: (params: Record<string, unknown>): Promise<ApiResponse> =>
        ipcRenderer.invoke('openclaw:exec:approval:resolve', params),
    },
  },

  // ── Wizard ─────────────────────────────────────────────────────────

  wizard: {
    start: (params?: Record<string, unknown>): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:wizard:start', params ?? {}),
    next: (params?: Record<string, unknown>): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:wizard:next', params ?? {}),
    cancel: (params?: Record<string, unknown>): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:wizard:cancel', params ?? {}),
    status: (params?: Record<string, unknown>): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:wizard:status', params ?? {}),
  },

  // ── Push (APNs) ───────────────────────────────────────────────────

  push: {
    test: (params?: Record<string, unknown>): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:push:test', params ?? {}),
  },

  // ── Voice Wake ────────────────────────────────────────────────────

  voicewake: {
    get: (params?: Record<string, unknown>): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:voicewake:get', params ?? {}),
    set: (params: Record<string, unknown>): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:voicewake:set', params),
  },

  // ── Browser ──────────────────────────────────────────────────────

  browser: {
    request: (params: { method: string; url: string; body?: string; headers?: Record<string, string>; nodeId?: string }): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:browser:request', params),
  },

  // ── System ───────────────────────────────────────────────────────

  system: {
    presence: (params?: Record<string, unknown>): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:system:presence', params ?? {}),
    event: (params: Record<string, unknown>): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:system:event', params),
    lastHeartbeat: (params?: Record<string, unknown>): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:last-heartbeat', params ?? {}),
    setHeartbeats: (params: Record<string, unknown>): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:set-heartbeats', params),
  },

  // ── Talk (Dialog Mode) ───────────────────────────────────────────

  talk: {
    config: (params?: Record<string, unknown>): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:talk:config', params ?? {}),
    mode: (params: Record<string, unknown>): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:talk:mode', params),
  },

  // ── Doctor ───────────────────────────────────────────────────────

  doctor: {
    memory: {
      status: (params?: Record<string, unknown>): Promise<ApiResponse> =>
        ipcRenderer.invoke('openclaw:doctor:memory:status', params ?? {}),
    },
  },

  // ── Config schema.lookup ─────────────────────────────────────────

  configSchema: {
    lookup: (params?: Record<string, unknown>): Promise<ApiResponse> =>
      ipcRenderer.invoke('openclaw:config:schema:lookup', params ?? {}),
  },

  // ── TTS provider ────────────────────────────────────────────────

  ttsSetProvider: (params: Record<string, unknown>): Promise<ApiResponse> =>
    ipcRenderer.invoke('openclaw:tts:setProvider', params),

  // ── Status ──────────────────────────────────────────────────────

  statusGet: (params?: Record<string, unknown>): Promise<ApiResponse> =>
    ipcRenderer.invoke('openclaw:status:get', params ?? {}),

  // ── Gateway ────────────────────────────────────────────────────────

  gateway: {
    identity: (): Promise<ApiResponse> => ipcRenderer.invoke('openclaw:gateway:identity'),
    health: (): Promise<ApiResponse> => ipcRenderer.invoke('openclaw:health'),
  },

  // ── App Settings (electron-store) ─────────────────────────────────

  settings: {
    get: (): Promise<ApiResponse<AppSettings>> =>
      ipcRenderer.invoke('settings:get') as Promise<ApiResponse<AppSettings>>,
    set: (key: string, value: unknown): Promise<ApiResponse> =>
      ipcRenderer.invoke('settings:set', key, value),
    reset: (): Promise<ApiResponse<AppSettings>> =>
      ipcRenderer.invoke('settings:reset') as Promise<ApiResponse<AppSettings>>,
  },

  // ── UI Actions ─────────────────────────────────────────────────────

  ui: {
    openCredits: () => ipcRenderer.invoke('ui:openCredits'),
    openSettings: () => ipcRenderer.invoke('ui:openSettings'),
    openAvatarCreate: () => ipcRenderer.invoke('ui:openAvatarCreate'),
  },

  // ── Events ────────────────────────────────────────────────────────

  on: (callback: (e: OpenClawEvent) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, e: OpenClawEvent) => callback(e)
    ipcRenderer.on('openclaw:event', handler)
    return () => ipcRenderer.removeListener('openclaw:event', handler)
  },
}

// ── Expose to global ─────────────────────────────────────────────────

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
contextBridge.exposeInMainWorld('openclaw', openclaw)

// ── Re-export types for renderer consumers ──────────────────────────

export type ElectronAPI = typeof electronAPI
export type OpenClawAPI = typeof openclaw

/**
 * app-settings.ts — Shared AppSettings type definition.
 * Used by both the main process (index.ts) and renderer (settingsStore).
 * Single source of truth for UI configuration shape.
 */

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
  web: {
    /** SynClaw 桌面客户端与 web 平台关联的 Device Token（明文） */
    deviceToken: string
    deviceId: string
    deviceName: string
    lastReportedAt: string | null
  }
  security: {
    /** 是否已设置 STORE_ENCRYPTION_KEY 环境变量 */
    encryptionEnabled: boolean
    /** 用户启用加密的时间戳（ISO） */
    encryptionKeySetAt: string | null
    /** 用户配置的 WEB_API_BASE（存储在 electron-store，不依赖环境变量） */
    webApiBase: string
  }
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  fontSize: 14,
  animationsEnabled: true,
  notificationsEnabled: true,
  compactMode: false,
  favorites: [],
  hasCompletedOnboarding: false,
  authorizedDirs: [],
  privacy: {
    optimizationPlan: false,
  },
  workspace: {
    limitAccess: true,
    autoSave: true,
    watch: true,
    heartbeat: '2h',
  },
  web: {
    deviceToken: '',
    deviceId: '',
    deviceName: '',
    lastReportedAt: null,
  },
  security: {
    // Derived from env var at startup (read-only in settings, can't be changed at runtime)
    encryptionEnabled: !!process.env.STORE_ENCRYPTION_KEY,
    encryptionKeySetAt: null,
    webApiBase: '',
  },
}

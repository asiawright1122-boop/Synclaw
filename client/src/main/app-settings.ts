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
}

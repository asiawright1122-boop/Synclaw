import { create } from 'zustand'

export type ThemeMode = 'light' | 'dark' | 'system'

export interface SettingsState {
  // Theme
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void

  // Font size
  fontSize: number
  setFontSize: (size: number) => void

  // Animations
  animationsEnabled: boolean
  setAnimationsEnabled: (enabled: boolean) => void

  // Notifications
  notificationsEnabled: boolean
  setNotificationsEnabled: (enabled: boolean) => void

  // Compact mode
  compactMode: boolean
  setCompactMode: (enabled: boolean) => void

  // File Explorer favorites
  favorites: string[]
  addFavorite: (path: string) => void
  removeFavorite: (path: string) => void

  // Onboarding
  hasCompletedOnboarding: boolean
  setHasCompletedOnboarding: (value: boolean) => void
  authorizedDirs: string[]
  addAuthorizedDir: (path: string) => void
  removeAuthorizedDir: (path: string) => void

  // Workspace (synced to both Gateway and electron-store)
  workspace: {
    limitAccess: boolean
    autoSave: boolean
    watch: boolean
    heartbeat: '30m' | '1h' | '2h' | '4h'
  }
  setWorkspaceLimitAccess: (value: boolean) => void
  setWorkspaceAutoSave: (value: boolean) => void
  setWorkspaceWatch: (value: boolean) => void
  setWorkspaceHeartbeat: (value: '30m' | '1h' | '2h' | '4h') => void
  syncWorkspaceFromGateway: () => Promise<void>

  // Reset to defaults
  resetSettings: () => void

  // Load initial state from electron-store
  loadSettings: () => Promise<void>
}

const defaultSettings = {
  theme: 'system' as ThemeMode,
  fontSize: 14,
  animationsEnabled: true,
  notificationsEnabled: true,
  compactMode: false,
  favorites: [],
  hasCompletedOnboarding: false,
  authorizedDirs: [],
  workspace: {
    limitAccess: true,
    autoSave: true,
    watch: true,
    heartbeat: '2h' as const,
  },
}

export const useSettingsStore = create<SettingsState>((set) => ({
  // Start with safe defaults while loading from electron-store
  ...defaultSettings,

  loadSettings: async () => {
    try {
      const res = await window.openclaw?.settings.get()
      if (res?.success && res.data) {
        set({
          theme: res.data.theme,
          fontSize: res.data.fontSize,
          animationsEnabled: res.data.animationsEnabled,
          notificationsEnabled: res.data.notificationsEnabled,
          compactMode: res.data.compactMode,
          favorites: Array.isArray(res.data.favorites) ? res.data.favorites : [],
          hasCompletedOnboarding: res.data.hasCompletedOnboarding ?? false,
          authorizedDirs: Array.isArray(res.data.authorizedDirs) ? res.data.authorizedDirs : [],
          workspace: {
            limitAccess: res.data.workspace?.limitAccess ?? true,
            autoSave: res.data.workspace?.autoSave ?? true,
            watch: res.data.workspace?.watch ?? true,
            heartbeat: (['30m', '1h', '2h', '4h'].includes(res.data.workspace?.heartbeat) ? res.data.workspace?.heartbeat : '2h') as '30m' | '1h' | '2h' | '4h',
          },
        })
      }
    } catch {
      // electron-store unavailable — keep renderer defaults
    }
  },

  setTheme: async (theme) => {
    set({ theme })
    await window.openclaw?.settings.set('theme', theme)
  },

  setFontSize: async (fontSize) => {
    set({ fontSize })
    await window.openclaw?.settings.set('fontSize', fontSize)
  },

  setAnimationsEnabled: async (animationsEnabled) => {
    set({ animationsEnabled })
    await window.openclaw?.settings.set('animationsEnabled', animationsEnabled)
  },

  setNotificationsEnabled: async (notificationsEnabled) => {
    set({ notificationsEnabled })
    await window.openclaw?.settings.set('notificationsEnabled', notificationsEnabled)
    // Notify main process immediately
    await window.electronAPI?.notifications?.setEnabled?.(notificationsEnabled)
  },

  setCompactMode: async (compactMode) => {
    set({ compactMode })
    await window.openclaw?.settings.set('compactMode', compactMode)
  },

  addFavorite: async (path) => {
    set(s => {
      if (s.favorites.includes(path)) return s
      const next = [...s.favorites, path]
      window.openclaw?.settings.set('favorites', next)
      return { favorites: next }
    })
  },

  removeFavorite: async (path) => {
    set(s => {
      const next = s.favorites.filter(p => p !== path)
      window.openclaw?.settings.set('favorites', next)
      return { favorites: next }
    })
  },

  setHasCompletedOnboarding: async (value) => {
    set({ hasCompletedOnboarding: value })
    await window.openclaw?.settings.set('hasCompletedOnboarding', value)
  },

  addAuthorizedDir: async (path) => {
    set(s => {
      if (s.authorizedDirs.includes(path)) return s
      const next = [...s.authorizedDirs, path]
      window.openclaw?.settings.set('authorizedDirs', next)
      return { authorizedDirs: next }
    })
  },

  removeAuthorizedDir: async (path) => {
    set(s => {
      const next = s.authorizedDirs.filter(p => p !== path)
      window.openclaw?.settings.set('authorizedDirs', next)
      return { authorizedDirs: next }
    })
  },

  setWorkspaceLimitAccess: async (value) => {
    set(s => ({ workspace: { ...s.workspace, limitAccess: value } }))
    await window.openclaw?.settings.set('workspace.limitAccess', value)
    if (window.openclaw) window.openclaw.config.patch({ limitAccess: value }).catch(() => {})
  },

  setWorkspaceAutoSave: async (value) => {
    set(s => ({ workspace: { ...s.workspace, autoSave: value } }))
    await window.openclaw?.settings.set('workspace.autoSave', value)
    if (window.openclaw) window.openclaw.config.patch({ autoSave: value }).catch(() => {})
  },

  setWorkspaceWatch: async (value) => {
    set(s => ({ workspace: { ...s.workspace, watch: value } }))
    await window.openclaw?.settings.set('workspace.watch', value)
    if (window.openclaw) window.openclaw.config.patch({ watch: value }).catch(() => {})
  },

  setWorkspaceHeartbeat: async (value) => {
    set(s => ({ workspace: { ...s.workspace, heartbeat: value } }))
    await window.openclaw?.settings.set('workspace.heartbeat', value)
    if (window.openclaw) window.openclaw.config.patch({ heartbeat: value }).catch(() => {})
  },

  // Sync workspace config from Gateway to local electron-store (one-time on mount)
  syncWorkspaceFromGateway: async () => {
    if (!window.openclaw) return
    try {
      const res = await window.openclaw.config.get()
      if (res?.success && res.data) {
        const cfg = res.data as Record<string, unknown>
        const patches: Array<{ key: string; value: unknown }> = []
        if (typeof cfg.limitAccess === 'boolean') patches.push({ key: 'workspace.limitAccess', value: cfg.limitAccess })
        if (typeof cfg.autoSave === 'boolean') patches.push({ key: 'workspace.autoSave', value: cfg.autoSave })
        if (typeof cfg.watch === 'boolean') patches.push({ key: 'workspace.watch', value: cfg.watch })
        if (['30m', '1h', '2h', '4h'].includes(cfg.heartbeat as string)) {
          patches.push({ key: 'workspace.heartbeat', value: cfg.heartbeat })
        }
        for (const { key, value } of patches) {
          await window.openclaw.settings.set(key, value)
        }
      }
    } catch {}
  },

  resetSettings: async () => {
    try {
      const res = await window.openclaw?.settings.reset()
      if (res?.success && res.data) {
        set({
          theme: res.data.theme,
          fontSize: res.data.fontSize,
          animationsEnabled: res.data.animationsEnabled,
          notificationsEnabled: res.data.notificationsEnabled,
          compactMode: res.data.compactMode,
          favorites: [],
          hasCompletedOnboarding: false,
          authorizedDirs: [],
          workspace: {
            limitAccess: res.data.workspace?.limitAccess ?? true,
            autoSave: res.data.workspace?.autoSave ?? true,
            watch: res.data.workspace?.watch ?? true,
            heartbeat: (['30m', '1h', '2h', '4h'].includes(res.data.workspace?.heartbeat) ? res.data.workspace?.heartbeat : '2h') as '30m' | '1h' | '2h' | '4h',
          },
        })
      }
    } catch {
      set({ ...defaultSettings })
    }
  },
}))

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

  // Workspace — stored in electron-store only; Gateway reads from runtime config
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

  // TTS (Text-to-Speech) settings
  tts: {
    enabled: boolean
    speed: number
    volume: number
    autoPlay: boolean
    provider: string | null
  }
  setTtsEnabled: (enabled: boolean) => void
  setTtsSpeed: (speed: number) => void
  setTtsVolume: (volume: number) => void
  setTtsAutoPlay: (autoPlay: boolean) => void
  setTtsProvider: (provider: string | null) => void

  // STT (Speech-to-Text) settings
  stt: {
    enabled: boolean
    autoStart: boolean
  }
  setSttEnabled: (enabled: boolean) => void
  setSttAutoStart: (autoStart: boolean) => void

  // Reset to defaults
  resetSettings: () => void

  // Load initial state from electron-store and subscribe to cross-window changes
  loadSettings: () => Promise<() => void>

  // Error state: set when electron-store loading fails
  loadError: string | null
  setLoadError: (msg: string | null) => void
}

const defaultSettings = {
  theme: 'system' as ThemeMode,
  fontSize: 14,
  animationsEnabled: true,
  notificationsEnabled: true,
  compactMode: false,
  favorites: [] as string[],
  hasCompletedOnboarding: false,
  authorizedDirs: [] as string[],
  workspace: {
    limitAccess: true,
    autoSave: true,
    watch: true,
    heartbeat: '2h' as const,
  },
  tts: {
    enabled: false,
    speed: 1.0,
    volume: 1.0,
    autoPlay: false,
    provider: null,
  },
  stt: {
    enabled: true,
    autoStart: false,
  },
}

export const useSettingsStore = create<SettingsState>((set) => ({
  // Start with safe defaults while loading from electron-store
  ...defaultSettings,
  loadError: null,
  setLoadError: (msg) => set({ loadError: msg }),

  loadSettings: async () => {
    try {
      // electron-store is the single source of truth for UI settings
      const res = await window.electronAPI?.settings.get()
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
            heartbeat: (['30m', '1h', '2h', '4h'].includes(res.data.workspace?.heartbeat)
              ? res.data.workspace?.heartbeat : '2h') as '30m' | '1h' | '2h' | '4h',
          },
          tts: {
            enabled: res.data.tts?.enabled ?? false,
            speed: typeof res.data.tts?.speed === 'number' ? res.data.tts.speed : 1.0,
            volume: typeof res.data.tts?.volume === 'number' ? res.data.tts.volume : 1.0,
            autoPlay: res.data.tts?.autoPlay ?? false,
            provider: res.data.tts?.provider ?? null,
          },
          stt: {
            enabled: res.data.stt?.enabled ?? true,
            autoStart: res.data.stt?.autoStart ?? false,
          },
        })
      }
    } catch (err) {
      // electron-store unavailable — surface the error so the UI can show a warning.
      // Users who have completed onboarding will see the warning on restart instead of
      // silently losing their onboarding-complete state.
      console.error('[SettingsStore] Failed to load settings from electron-store:', err)
      set({ loadError: '无法从 electron-store 加载设置，应用将使用默认配置。请重启 SynClaw。' })
    }

    // Listen for cross-window electron-store changes (broadcast from main process)
    const unsubscribe = window.electronAPI?.settings.onChanged?.(({ settings: s }) => {
      set({
        theme: s.theme,
        fontSize: s.fontSize,
        animationsEnabled: s.animationsEnabled,
        notificationsEnabled: s.notificationsEnabled,
        compactMode: s.compactMode,
        favorites: Array.isArray(s.favorites) ? s.favorites : [],
        hasCompletedOnboarding: s.hasCompletedOnboarding ?? false,
        authorizedDirs: Array.isArray(s.authorizedDirs) ? s.authorizedDirs : [],
        workspace: {
          limitAccess: s.workspace?.limitAccess ?? true,
          autoSave: s.workspace?.autoSave ?? true,
          watch: s.workspace?.watch ?? true,
          heartbeat: (['30m', '1h', '2h', '4h'].includes(s.workspace?.heartbeat)
            ? s.workspace?.heartbeat : '2h') as '30m' | '1h' | '2h' | '4h',
        },
        tts: {
          enabled: s.tts?.enabled ?? false,
          speed: typeof s.tts?.speed === 'number' ? s.tts.speed : 1.0,
          volume: typeof s.tts?.volume === 'number' ? s.tts.volume : 1.0,
          autoPlay: s.tts?.autoPlay ?? false,
          provider: s.tts?.provider ?? null,
        },
        stt: {
          enabled: s.stt?.enabled ?? true,
          autoStart: s.stt?.autoStart ?? false,
        },
        // Clear load error when settings are successfully updated from main process
        loadError: null,
      })
    })
    return () => { unsubscribe?.() }
  },

  // ── Persist to electron-store only (single source of truth) ──────────────

  setTheme: async (theme) => {
    set({ theme })
    await window.electronAPI?.settings.set('theme', theme)
  },

  setFontSize: async (fontSize) => {
    set({ fontSize })
    await window.electronAPI?.settings.set('fontSize', fontSize)
  },

  setAnimationsEnabled: async (animationsEnabled) => {
    set({ animationsEnabled })
    await window.electronAPI?.settings.set('animationsEnabled', animationsEnabled)
  },

  setNotificationsEnabled: async (notificationsEnabled) => {
    set({ notificationsEnabled })
    await window.electronAPI?.settings.set('notificationsEnabled', notificationsEnabled)
    // Notify main process immediately for system-level notifications
    await window.electronAPI?.notifications?.setEnabled?.(notificationsEnabled)
  },

  setCompactMode: async (compactMode) => {
    set({ compactMode })
    await window.electronAPI?.settings.set('compactMode', compactMode)
  },

  addFavorite: async (path) => {
    set(s => {
      if (s.favorites.includes(path)) return s
      const next = [...s.favorites, path]
      window.electronAPI?.settings.set('favorites', next)
      return { favorites: next }
    })
  },

  removeFavorite: async (path) => {
    set(s => {
      const next = s.favorites.filter(p => p !== path)
      window.electronAPI?.settings.set('favorites', next)
      return { favorites: next }
    })
  },

  setHasCompletedOnboarding: async (value) => {
    set({ hasCompletedOnboarding: value })
    await window.electronAPI?.settings.set('hasCompletedOnboarding', value)
  },

  addAuthorizedDir: async (path) => {
    set(s => {
      if (s.authorizedDirs.includes(path)) return s
      const next = [...s.authorizedDirs, path]
      window.electronAPI?.settings.set('authorizedDirs', next)
      return { authorizedDirs: next }
    })
  },

  removeAuthorizedDir: async (path) => {
    set(s => {
      const next = s.authorizedDirs.filter(p => p !== path)
      window.electronAPI?.settings.set('authorizedDirs', next)
      return { authorizedDirs: next }
    })
  },

  // Workspace settings — persisted to electron-store only
  // Gateway receives these as runtime config via openclaw.config.patch() during app init
  setWorkspaceLimitAccess: async (value) => {
    set(s => ({ workspace: { ...s.workspace, limitAccess: value } }))
    await window.electronAPI?.settings.set('workspace.limitAccess', value)
  },

  setWorkspaceAutoSave: async (value) => {
    set(s => ({ workspace: { ...s.workspace, autoSave: value } }))
    await window.electronAPI?.settings.set('workspace.autoSave', value)
  },

  setWorkspaceWatch: async (value) => {
    set(s => ({ workspace: { ...s.workspace, watch: value } }))
    await window.electronAPI?.settings.set('workspace.watch', value)
  },

  setWorkspaceHeartbeat: async (value) => {
    set(s => ({ workspace: { ...s.workspace, heartbeat: value } }))
    await window.electronAPI?.settings.set('workspace.heartbeat', value)
  },

  // ── TTS Settings ──────────────────────────────────────────────────────────

  setTtsEnabled: async (enabled) => {
    set(s => ({ tts: { ...s.tts, enabled } }))
    await window.electronAPI?.settings.set('tts.enabled', enabled)
  },

  setTtsSpeed: async (speed) => {
    const clamped = Math.min(2, Math.max(0.5, speed))
    set(s => ({ tts: { ...s.tts, speed: clamped } }))
    await window.electronAPI?.settings.set('tts.speed', clamped)
  },

  setTtsVolume: async (volume) => {
    const clamped = Math.min(1, Math.max(0, volume))
    set(s => ({ tts: { ...s.tts, volume: clamped } }))
    await window.electronAPI?.settings.set('tts.volume', clamped)
  },

  setTtsAutoPlay: async (autoPlay) => {
    set(s => ({ tts: { ...s.tts, autoPlay } }))
    await window.electronAPI?.settings.set('tts.autoPlay', autoPlay)
  },

  setTtsProvider: async (provider) => {
    set(s => ({ tts: { ...s.tts, provider } }))
    await window.electronAPI?.settings.set('tts.provider', provider)
  },

  // ── STT Settings ───────────────────────────────────────────────────────────

  setSttEnabled: async (enabled) => {
    set(s => ({ stt: { ...s.stt, enabled } }))
    await window.electronAPI?.settings.set('stt.enabled', enabled)
  },

  setSttAutoStart: async (autoStart) => {
    set(s => ({ stt: { ...s.stt, autoStart } }))
    await window.electronAPI?.settings.set('stt.autoStart', autoStart)
  },

  resetSettings: async () => {
    try {
      const res = await window.electronAPI?.settings.reset()
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
            heartbeat: (['30m', '1h', '2h', '4h'].includes(res.data.workspace?.heartbeat)
              ? res.data.workspace?.heartbeat : '2h') as '30m' | '1h' | '2h' | '4h',
          },
          tts: {
            enabled: res.data.tts?.enabled ?? false,
            speed: typeof res.data.tts?.speed === 'number' ? res.data.tts.speed : 1.0,
            volume: typeof res.data.tts?.volume === 'number' ? res.data.tts.volume : 1.0,
            autoPlay: res.data.tts?.autoPlay ?? false,
            provider: res.data.tts?.provider ?? null,
          },
          stt: {
            enabled: res.data.stt?.enabled ?? true,
            autoStart: res.data.stt?.autoStart ?? false,
          },
          loadError: null,
        })
      }
    } catch {
      set({ ...defaultSettings, loadError: null })
    }
  },
}))

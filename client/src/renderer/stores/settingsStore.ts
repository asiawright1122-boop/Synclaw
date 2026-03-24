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
        })
      }
    } catch {
      // electron-store unavailable — reset to renderer defaults
      set({ ...defaultSettings })
    }
  },
}))

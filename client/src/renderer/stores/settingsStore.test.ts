import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

const mockElectronAPI = vi.hoisted(() => {
  // Define data INSIDE hoisted to avoid initialization order issues
  const data = {
    theme: 'dark' as const,
    fontSize: 16,
    animationsEnabled: false,
    notificationsEnabled: true,
    compactMode: true,
    favorites: ['/home/user'],
    hasCompletedOnboarding: true,
    authorizedDirs: ['/home/user/projects'],
    workspace: { limitAccess: false, autoSave: false, watch: false, heartbeat: '1h' as const },
    tts: { enabled: true, speed: 1.5, volume: 0.8, autoPlay: true, provider: 'test' },
    stt: { enabled: false, autoStart: true },
    privacy: { optimizationPlan: true },
    web: { deviceToken: 'tok', deviceId: 'dev', deviceName: 'test', lastReportedAt: '2024' },
  }
  const defaults = {
    theme: 'system' as const,
    fontSize: 14,
    animationsEnabled: true,
    notificationsEnabled: true,
    compactMode: false,
    favorites: [] as string[],
    hasCompletedOnboarding: false,
    authorizedDirs: [] as string[],
    workspace: { limitAccess: true, autoSave: true, watch: true, heartbeat: '2h' as const },
    tts: { enabled: false, speed: 1.0, volume: 1.0, autoPlay: false, provider: null },
    stt: { enabled: true, autoStart: false },
    privacy: { optimizationPlan: false },
    web: { deviceToken: '', deviceId: '', deviceName: '', lastReportedAt: null },
  }
  const changeListeners: Array<(d: { key: string; value: unknown; settings: typeof data }) => void> = []

  return {
    settings: {
      get: vi.fn().mockResolvedValue({ success: true, data }),
      set: vi.fn().mockResolvedValue({ success: true }),
      reset: vi.fn().mockResolvedValue({ success: true, data: defaults }),
      onChanged: vi.fn((cb: (d: { key: string; value: unknown; settings: typeof data }) => void) => {
        changeListeners.push(cb)
        return () => { const idx = changeListeners.indexOf(cb); if (idx !== -1) changeListeners.splice(idx, 1) }
      }),
    },
    notifications: { setEnabled: vi.fn().mockResolvedValue({ success: true }) },
    _fireChange: (changes: Partial<typeof data>) => {
      const merged = { ...data, ...changes } as typeof data
      changeListeners.forEach((cb) => cb({ key: 'settings', value: merged, settings: merged }))
    },
  }
})

vi.stubGlobal('window', { electronAPI: mockElectronAPI, openclaw: undefined })

const { useSettingsStore } = await import('./settingsStore')

describe('settingsStore', () => {
  beforeEach(async () => {
    useSettingsStore.setState({
      theme: 'system',
      fontSize: 14,
      animationsEnabled: true,
      notificationsEnabled: true,
      compactMode: false,
      favorites: [],
      hasCompletedOnboarding: false,
      authorizedDirs: [],
      workspace: { limitAccess: true, autoSave: true, watch: true, heartbeat: '2h' },
      tts: { enabled: false, speed: 1.0, volume: 1.0, autoPlay: false, provider: null },
      stt: { enabled: true, autoStart: false },
      loadError: null,
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('uses default theme before loadSettings resolves', () => {
      expect(useSettingsStore.getState().theme).toBe('system')
      expect(useSettingsStore.getState().hasCompletedOnboarding).toBe(false)
      expect(useSettingsStore.getState().fontSize).toBe(14)
    })
  })

  describe('loadSettings', () => {
    it('loads from electron-store and updates state', async () => {
      await useSettingsStore.getState().loadSettings()
      expect(useSettingsStore.getState().theme).toBe('dark')
      expect(useSettingsStore.getState().hasCompletedOnboarding).toBe(true)
      expect(useSettingsStore.getState().fontSize).toBe(16)
    })
  })

  describe('setTheme', () => {
    it('updates state and calls electronAPI.settings.set', async () => {
      await useSettingsStore.getState().setTheme('light')
      expect(useSettingsStore.getState().theme).toBe('light')
      expect(mockElectronAPI.settings.set).toHaveBeenCalledWith('theme', 'light')
    })
  })

  describe('setHasCompletedOnboarding', () => {
    it('persists to electron-store', async () => {
      await useSettingsStore.getState().setHasCompletedOnboarding(true)
      expect(useSettingsStore.getState().hasCompletedOnboarding).toBe(true)
      expect(mockElectronAPI.settings.set).toHaveBeenCalledWith('hasCompletedOnboarding', true)
    })
  })

  describe('cross-window sync via onChanged', () => {
    it('updates state when electron-store changes externally', async () => {
      await useSettingsStore.getState().loadSettings()
      mockElectronAPI._fireChange({ theme: 'light', hasCompletedOnboarding: false })
      expect(useSettingsStore.getState().theme).toBe('light')
      expect(useSettingsStore.getState().hasCompletedOnboarding).toBe(false)
    })
  })

  describe('workspace nested keys', () => {
    it('setWorkspaceLimitAccess persists nested key', async () => {
      await useSettingsStore.getState().setWorkspaceLimitAccess(false)
      expect(mockElectronAPI.settings.set).toHaveBeenCalledWith('workspace.limitAccess', false)
    })
  })

  describe('TTS clamping', () => {
    it('setTtsSpeed clamps to MAX_SPEED of 2.0', async () => {
      await useSettingsStore.getState().setTtsSpeed(5.0)
      expect(useSettingsStore.getState().tts.speed).toBe(2.0)
    })

    it('setTtsVolume clamps to 0', async () => {
      await useSettingsStore.getState().setTtsVolume(-0.5)
      expect(useSettingsStore.getState().tts.volume).toBe(0)
    })

    it('setTtsVolume clamps to MAX 1.0', async () => {
      await useSettingsStore.getState().setTtsVolume(2.0)
      expect(useSettingsStore.getState().tts.volume).toBe(1.0)
    })
  })

  describe('resetSettings', () => {
    it('restores defaults and calls reset API', async () => {
      await useSettingsStore.getState().loadSettings()
      await useSettingsStore.getState().resetSettings()
      expect(mockElectronAPI.settings.reset).toHaveBeenCalled()
    })
  })
})

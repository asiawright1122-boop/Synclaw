/**
 * Mock factories for window.electronAPI in Vitest unit tests.
 * Use `vi.hoisted()` in test files to create mocks before importing the store/hook under test.
 */
import { vi } from 'vitest'

const defaultSettingsData = {
  theme: 'system',
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

export interface MockElectronAPIOptions {
  settingsGetResult?: { success: boolean; data?: Partial<typeof defaultSettingsData> }
  settingsSetResult?: { success: boolean }
  settingsResetResult?: { success: boolean; data?: Partial<typeof defaultSettingsData> }
}

export function createMockElectronAPI(opts: MockElectronAPIOptions = {}) {
  const {
    settingsGetResult = { success: true, data: defaultSettingsData },
    settingsSetResult = { success: true },
    settingsResetResult = { success: true, data: defaultSettingsData },
  } = opts

  const changeListeners: Array<(d: { key: string; value: unknown; settings: typeof defaultSettingsData }) => void> = []

  const mock = {
    settings: {
      get: vi.fn().mockResolvedValue(settingsGetResult),
      set: vi.fn().mockResolvedValue(settingsSetResult),
      reset: vi.fn().mockResolvedValue(settingsResetResult),
      onChanged: vi.fn((cb: (d: { key: string; value: unknown; settings: typeof defaultSettingsData }) => void) => {
        changeListeners.push(cb)
        return () => {
          const idx = changeListeners.indexOf(cb)
          if (idx !== -1) changeListeners.splice(idx, 1)
        }
      }),
    },
    notifications: {
      setEnabled: vi.fn().mockResolvedValue({ success: true }),
    },
    // Helper to fire onChanged events from tests
    _fireSettingsChange: (data: Partial<typeof defaultSettingsData>) => {
      const settings = { ...defaultSettingsData, ...data } as typeof defaultSettingsData
      changeListeners.forEach((cb) => cb({ key: 'settings', value: settings, settings }))
    },
  }

  return mock as typeof window.electronAPI & {
    _fireSettingsChange: (data: Partial<typeof defaultSettingsData>) => void
  }
}

export const mockElectronAPI = createMockElectronAPI()

/**
 * Mock factories for Vitest unit tests.
 * Use `vi.hoisted()` in test files to create mocks before importing the store/hook under test.
 */
import { vi } from 'vitest'

export interface MockOpenClawOptions {
  modelsListResult?: { success: boolean; data?: unknown }
  avatarsListResult?: { success: boolean; data?: unknown }
  avatarsCreateResult?: { success: boolean; data?: unknown }
  avatarsUpdateResult?: { success: boolean }
  avatarsDeleteResult?: { success: boolean }
  chatHistoryResult?: { success: boolean; data?: unknown }
  chatAbortResult?: { success: boolean }
  execApprovalResolveResult?: { success: boolean }
  ttsStatusResult?: { success: boolean }
  ttsProvidersResult?: { success: boolean; data?: { providers: unknown[] } }
  ttsConvertResult?: { success: boolean; data?: { url: string } }
}

export function createMockOpenClaw(opts: MockOpenClawOptions = {}) {
  const {
    modelsListResult = { success: true, data: [{ id: 'test-model' }] },
    avatarsListResult = { success: true, data: [] },
    avatarsCreateResult = { success: true, data: { id: 'new-avatar' } },
    avatarsUpdateResult = { success: true },
    avatarsDeleteResult = { success: true },
    chatHistoryResult = { success: true, data: [] },
    chatAbortResult = { success: true },
    execApprovalResolveResult = { success: true },
    ttsStatusResult = { success: true },
    ttsProvidersResult = { success: true, data: { providers: [] } },
    ttsConvertResult = { success: true, data: { url: 'data:audio/mp3;base64,' } },
  } = opts

  const listeners = new Map<string, (e: { event: string; payload: unknown }) => void>()
  const statusListeners: Array<(status: string) => void> = []

  const mock = {
    getStatus: vi.fn().mockResolvedTo('ready'),
    connect: vi.fn().mockResolvedValue({ success: true }),
    disconnect: vi.fn().mockResolvedValue({ success: true }),
    reconnect: vi.fn().mockResolvedValue({ success: true }),
    onStatusChange: vi.fn((cb: (status: string) => void) => {
      statusListeners.push(cb)
      return () => {
        const idx = statusListeners.indexOf(cb)
        if (idx !== -1) statusListeners.splice(idx, 1)
      }
    }),
    agent: vi.fn().mockResolvedValue({ success: true, data: { runId: 'run-1' } }),
    models: {
      list: vi.fn().mockResolvedValue(modelsListResult),
      getCurrent: vi.fn().mockResolvedValue({ success: true }),
      setCurrent: vi.fn().mockResolvedValue({ success: true }),
    },
    chat: {
      history: vi.fn().mockResolvedValue(chatHistoryResult),
      abort: vi.fn().mockResolvedValue(chatAbortResult),
      send: vi.fn().mockResolvedValue({ success: true }),
    },
    avatars: {
      list: vi.fn().mockResolvedValue(avatarsListResult),
      create: vi.fn().mockResolvedValue(avatarsCreateResult),
      update: vi.fn().mockResolvedValue(avatarsUpdateResult),
      delete: vi.fn().mockResolvedValue(avatarsDeleteResult),
    },
    exec: {
      approval: {
        resolve: vi.fn().mockResolvedValue(execApprovalResolveResult),
      },
    },
    tts: {
      status: vi.fn().mockResolvedValue(ttsStatusResult),
      providers: vi.fn().mockResolvedValue(ttsProvidersResult),
      enable: vi.fn().mockResolvedValue({ success: true }),
      disable: vi.fn().mockResolvedValue({ success: true }),
      convert: vi.fn().mockResolvedValue(ttsConvertResult),
    },
    on: vi.fn((cb: (e: { event: string; payload: unknown }) => void) => {
      const id = Math.random().toString(36)
      listeners.set(id, cb)
      return () => listeners.delete(id)
    }),
    // Helper to fire events from tests
    _fireEvent: (event: string, payload: unknown) => {
      listeners.forEach((cb) => cb({ event, payload }))
    },
  }

  return mock as typeof window.openclaw & { _fireEvent: (event: string, payload: unknown) => void }
}

export const mockOpenClaw = createMockOpenClaw()

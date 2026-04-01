/**
 * Gateway mock — plain JavaScript version for Playwright browser injection.
 * This file is loaded via setupFiles and injects the mock into every browser page.
 *
 * DO NOT use TypeScript here — setupFiles runs in Node context,
 * and Playwright handles injection automatically.
 */

let mockMode = 'success'
let listeners = []

function createMockOpenClaw() {
  return {
    getStatus: () => Promise.resolve('ready'),
    connect: () => Promise.resolve({ success: true }),
    disconnect: () => Promise.resolve({ success: true }),
    reconnect: () => Promise.resolve({ success: true }),
    onStatusChange: (cb) => {
      setTimeout(() => cb('ready'), 0)
      return () => {}
    },
    models: {
      list: () => Promise.resolve({ success: true, data: [{ id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' }] }),
      getCurrent: () => Promise.resolve({ success: true }),
      setCurrent: () => Promise.resolve({ success: true }),
    },
    chat: {
      history: () => Promise.resolve({ success: true, data: [] }),
      abort: () => Promise.resolve({ success: true }),
      send: () => Promise.resolve({ success: true }),
    },
    avatars: {
      list: () => Promise.resolve({ success: true, data: [] }),
      create: () => Promise.resolve({ success: true, data: { id: 'av-e2e' } }),
      update: () => Promise.resolve({ success: true }),
      delete: () => Promise.resolve({ success: true }),
    },
    exec: {
      approval: {
        resolve: () => Promise.resolve({ success: true }),
      },
    },
    tts: {
      status: () => Promise.resolve({ success: false }),
      providers: () => Promise.resolve({ success: true, data: { providers: [] } }),
      enable: () => Promise.resolve({ success: true }),
      disable: () => Promise.resolve({ success: true }),
      convert: () => Promise.resolve({ success: true, data: { url: '' } }),
    },
    agent: async (params) => {
      // Simulate network delay
      await new Promise(r => setTimeout(r, 500))

      // Emit thinking event
      listeners.forEach(cb => cb({
        event: 'agent',
        payload: { type: 'thinking', content: '正在思考...' },
      }))

      await new Promise(r => setTimeout(r, 300))

      if (mockMode === 'api-key') {
        return { success: false, error: 'invalid_api_key' }
      }
      if (mockMode === 'error') {
        return { success: false, error: 'Test error: something went wrong' }
      }

      // Success response
      listeners.forEach(cb => cb({
        event: 'agent',
        payload: { type: 'content', content: `收到消息: ${params.message}. 这是一个来自 E2E 测试模拟 Gateway 的响应。` },
      }))

      await new Promise(r => setTimeout(r, 200))
      listeners.forEach(cb => cb({ event: 'agent', payload: { type: 'done' } }))

      return { success: true, data: { runId: `run-e2e-${Date.now()}` } }
    },
    on: (cb) => {
      listeners.push(cb)
      return () => {
        const idx = listeners.indexOf(cb)
        if (idx !== -1) listeners.splice(idx, 1)
      }
    },
  }
}

// Inject into browser page
const originalWindow = globalThis.window
Object.defineProperty(globalThis, 'window', {
  value: {
    ...originalWindow,
    openclaw: createMockOpenClaw(),
    electronAPI: {
      settings: {
        get: () => Promise.resolve({ success: true, data: {} }),
        set: () => Promise.resolve({ success: true }),
        reset: () => Promise.resolve({ success: true, data: {} }),
        onChanged: () => () => {},
      },
      notifications: { setEnabled: () => Promise.resolve({ success: true }) },
    },
  },
  writable: true,
  configurable: true,
})

// Make mock mode switcher available to tests
globalThis.__E2E_MOCK__ = { setMode: (m) => { mockMode = m } }

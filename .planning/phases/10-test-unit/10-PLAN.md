---
phase: 10-test-unit
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - client/package.json
  - client/vitest.config.ts
  - client/src/test/mocks/openclaw.ts
  - client/src/test/mocks/electronAPI.ts
  - client/src/renderer/stores/chatStore.test.ts
  - client/src/renderer/stores/settingsStore.test.ts
  - client/src/renderer/stores/avatarStore.test.ts
  - client/src/renderer/stores/execApprovalStore.test.ts
  - client/src/renderer/hooks/useTTS.test.tsx
autonomous: true
requirements:
  - TEST-01
  - TEST-02
  - TEST-03
  - TEST-04
  - TEST-05
  - TEST-06

must_haves:
  truths:
    - "`pnpm test` runs Vitest in jsdom environment and passes all tests"
    - "chatStore tests verify sendMessage, message addition, MAX_MESSAGES cap, and Gateway event handling"
    - "settingsStore tests verify theme switching, hasCompletedOnboarding persistence, and cross-window sync"
    - "avatarStore tests verify activateAvatar, setActiveAvatar sync, and demo mode fallback"
    - "execApprovalStore tests verify approval queue, approve/deny/approve-once decisions, and timeout logic"
    - "useTTS hook tests verify play/stop/pause/resume and currentWordIndex updates"
  artifacts:
    - path: "client/vitest.config.ts"
      provides: "Vitest configuration with jsdom environment"
      contains: "environment: 'jsdom'"
    - path: "client/src/test/mocks/openclaw.ts"
      provides: "Mock factory for window.openclaw API"
      exports: "createMockOpenClaw"
    - path: "client/src/test/mocks/electronAPI.ts"
      provides: "Mock factory for window.electronAPI"
      exports: "createMockElectronAPI"
    - path: "client/src/renderer/stores/chatStore.test.ts"
      provides: "Unit tests for chatStore"
      exports: "describe('chatStore')"
    - path: "client/src/renderer/stores/settingsStore.test.ts"
      provides: "Unit tests for settingsStore"
      exports: "describe('settingsStore')"
    - path: "client/src/renderer/stores/avatarStore.test.ts"
      provides: "Unit tests for avatarStore"
      exports: "describe('avatarStore')"
    - path: "client/src/renderer/stores/execApprovalStore.test.ts"
      provides: "Unit tests for execApprovalStore"
      exports: "describe('execApprovalStore')"
    - path: "client/src/renderer/hooks/useTTS.test.tsx"
      provides: "Unit tests for useTTS hook"
      exports: "describe('useTTS')"
  key_links:
    - from: "client/vitest.config.ts"
      to: "client/src/test/mocks/openclaw.ts"
      via: "vi.mock('../../openclaw')"
      pattern: "vi.mock.*openclaw"
    - from: "chatStore.test.ts"
      to: "chatStore.ts"
      via: "import from '../stores/chatStore'"
    - from: "settingsStore.test.ts"
      to: "settingsStore.ts"
      via: "import from '../stores/settingsStore'"
    - from: "avatarStore.test.ts"
      to: "avatarStore.ts"
      via: "import from '../stores/avatarStore'"
    - from: "execApprovalStore.test.ts"
      to: "execApprovalStore.ts"
      via: "import from '../stores/execApprovalStore'"
    - from: "useTTS.test.tsx"
      to: "useTTS.ts"
      via: "import from '../hooks/useTTS'"
---

<objective>
Install Vitest testing infrastructure and write unit tests for all 5 core stores/hooks (chatStore, settingsStore, avatarStore, execApprovalStore, useTTS).

Purpose: Eliminate regression risk on core conversation logic, settings management, avatar activation, exec approvals, and TTS playback. Tests run headless via `pnpm test` with no browser required.

Output: vitest.config.ts, mock factories, and 5 test files passing `pnpm test`.
</objective>

<context>
@client/package.json
@client/src/renderer/types/electron.d.ts
@client/src/renderer/stores/chatStore.ts
@client/src/renderer/stores/settingsStore.ts
@client/src/renderer/stores/avatarStore.ts
@client/src/renderer/stores/execApprovalStore.ts
@client/src/renderer/hooks/useTTS.ts
</context>

<interfaces>
<!-- Key types from electron.d.ts that mocks must satisfy -->
```typescript
// OpenClawAPI mock shape
interface MockOpenClawAPI {
  getStatus: () => Promise<'idle' | 'ready' | 'connected'>
  connect: () => Promise<{ success: boolean }>
  disconnect: () => Promise<{ success: boolean }>
  onStatusChange: (cb: (status: string) => void) => () => void
  models: {
    list: () => Promise<{ success: boolean; data?: unknown[] }>
    getCurrent: () => Promise<{ success: boolean }>
    setCurrent: (p: { modelId: string }) => Promise<{ success: boolean }>
  }
  chat: {
    history: (p: { sessionKey: string; limit?: number }) => Promise<{ success: boolean; data?: unknown[] }>
    abort: (p: { runId: string }) => Promise<{ success: boolean }>
  }
  avatars: {
    list: () => Promise<{ success: boolean; data?: unknown[] }>
    create: (p: { name?: string; model?: string; personality?: string }) => Promise<{ success: boolean; data?: unknown }>
    update: (p: { id?: string }) => Promise<{ success: boolean }>
    delete: (p: { id: string }) => Promise<{ success: boolean }>
  }
  exec: {
    approval: {
      resolve: (p: { id: string; approved: boolean; decision: string }) => Promise<{ success: boolean }>
    }
  }
  tts: {
    status: () => Promise<{ success: boolean }>
    providers: () => Promise<{ success: boolean; data?: { providers: unknown[] } }>
    enable: () => Promise<{ success: boolean }>
    disable: () => Promise<{ success: boolean }>
    convert: (p: { text: string }) => Promise<{ success: boolean; data?: { url: string } }>
  }
  on: (cb: (e: { event: string; payload: unknown }) => void) => () => void
}

// ElectronAPI mock shape
interface MockElectronAPI {
  settings: {
    get: () => Promise<{ success: boolean; data?: AppSettings }>
    set: (key: string, value: unknown) => Promise<{ success: boolean }>
    reset: () => Promise<{ success: boolean; data?: AppSettings }>
    onChanged: (cb: (d: { key: string; value: unknown; settings: AppSettings }) => void) => () => void
  }
  notifications?: { setEnabled?: (enabled: boolean) => Promise<{ success: boolean }> }
}
```
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Install Vitest and configure vitest.config.ts</name>
  <files>client/package.json, client/vitest.config.ts</files>
  <read_first>
    client/package.json
  </read_first>
  <action>
Add the following devDependencies to `client/package.json` (use pnpm add -D):
- `vitest@^2.2.0`
- `@testing-library/react@^16.0.0`
- `@testing-library/jest-dom@^6.6.0`
- `jsdom@^25.0.0`

Then add a `test` script to package.json scripts:
```json
"test": "vitest run"
```
Do NOT add `vitest` as a separate script (we will use `pnpm test`).

Create `client/vitest.config.ts` with:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/renderer/{stores,hooks}/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```
  </action>
  <verify>
    <automated>
      cd /Users/kaka/Desktop/synclaw/client && pnpm add -D vitest@^2.2.0 @testing-library/react@^16.0.0 @testing-library/jest-dom@^6.6.0 jsdom@^25.0.0 && grep -q '"test": "vitest run"' package.json && test -f vitest.config.ts
    </automated>
  </verify>
  <done>
    vitest ^2.2, @testing-library/react, @testing-library/jest-dom, jsdom installed in client/; pnpm test runs vitest run
  </done>
</task>

<task type="auto">
  <name>Task 2: Create mock factories for window.openclaw and window.electronAPI</name>
  <files>client/src/test/mocks/openclaw.ts, client/src/test/mocks/electronAPI.ts</files>
  <read_first>
    client/src/renderer/types/electron.d.ts
  </read_first>
  <action>
Create directory `client/src/test/mocks/` (if not exists).

Create `client/src/test/mocks/openclaw.ts` using `vi.hoisted()` factory:
```typescript
import { vi } from 'vitest'
import type { ElectronAPI } from '../../renderer/types/electron'

export interface MockOpenClawOptions {
  modelsListResult?: { success: boolean; data?: unknown[] }
  avatarsListResult?: { success: boolean; data?: unknown[] }
  avatarsCreateResult?: { success: boolean; data?: unknown }
  avatarsUpdateResult?: { success: boolean }
  avatarsDeleteResult?: { success: boolean }
  chatHistoryResult?: { success: boolean; data?: unknown[] }
  chatAbortResult?: { success: boolean }
  execApprovalResolveResult?: { success: boolean }
  ttsStatusResult?: { success: boolean }
  ttsProvidersResult?: { success: boolean; data?: { providers: unknown[] } }
  ttsConvertResult?: { success: boolean; data?: { url: string } }
  onEventHandlers?: Map<string, (payload: unknown) => void>
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
    onEventHandlers = new Map(),
  } = opts

  const listeners: Map<string, (e: { event: string; payload: unknown }) => void> = new Map()
  const statusListeners: Array<(status: string) => void> = []

  const mock: MockOpenClawAPI = {
    getStatus: vi.fn().mockResolvedTo('ready'),
    connect: vi.fn().mockResolvedTo({ success: true }),
    disconnect: vi.fn().mockResolvedTo({ success: true }),
    reconnect: vi.fn().mockResolvedTo({ success: true }),
    onStatusChange: vi.fn((cb: (status: string) => void) => {
      statusListeners.push(cb)
      return () => {
        const idx = statusListeners.indexOf(cb)
        if (idx !== -1) statusListeners.splice(idx, 1)
      }
    }),
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
      onEventHandlers.forEach((handler, eventName) => {
        // Handlers registered
      })
      return () => listeners.delete(id)
    }),
  }

  // Helper to fire events from tests
  ;(mock as Record<string, unknown>)._fireEvent = (event: string, payload: unknown) => {
    listeners.forEach((cb) => cb({ event, payload }))
  }

  return mock as unknown as typeof window.openclaw & {
    _fireEvent: (event: string, payload: unknown) => void
  }
}

// Minimal mock when no options needed
export const mockOpenClaw = createMockOpenClaw()

interface MockOpenClawAPI {
  getStatus: () => Promise<string>
  connect: () => Promise<{ success: boolean }>
  disconnect: () => Promise<{ success: boolean }>
  reconnect: () => Promise<{ success: boolean }>
  onStatusChange: (cb: (status: string) => void) => () => void
  models: { list: () => Promise<{ success: boolean; data?: unknown[] }>; getCurrent: () => Promise<{ success: boolean }>; setCurrent: (p: { modelId: string }) => Promise<{ success: boolean }> }
  chat: { history: (p: { sessionKey: string; limit?: number }) => Promise<{ success: boolean; data?: unknown[] }>; abort: (p: { runId: string }) => Promise<{ success: boolean }>; send: (p: unknown) => Promise<{ success: boolean }> }
  avatars: { list: () => Promise<{ success: boolean; data?: unknown[] }>; create: (p: { name?: string; model?: string; personality?: string }) => Promise<{ success: boolean; data?: unknown }>; update: (p: { id?: string }) => Promise<{ success: boolean }>; delete: (p: { id: string }) => Promise<{ success: boolean }> }
  exec: { approval: { resolve: (p: { id: string; approved: boolean; decision: string }) => Promise<{ success: boolean }> } }
  tts: { status: () => Promise<{ success: boolean }>; providers: () => Promise<{ success: boolean; data?: { providers: unknown[] } }>; enable: () => Promise<{ success: boolean }>; disable: () => Promise<{ success: boolean }>; convert: (p: { text: string }) => Promise<{ success: boolean; data?: { url: string } }> }
  on: (cb: (e: { event: string; payload: unknown }) => void) => () => void
}
```

Create `client/src/test/mocks/electronAPI.ts`:
```typescript
import { vi } from 'vitest'

export interface MockElectronAPIOptions {
  settingsGetResult?: { success: boolean; data?: Partial<AppSettings> }
  settingsSetResult?: { success: boolean }
  settingsResetResult?: { success: boolean; data?: Partial<AppSettings> }
}

export function createMockElectronAPI(opts: MockElectronAPIOptions = {}) {
  const {
    settingsGetResult = {
      success: true,
      data: {
        theme: 'system',
        fontSize: 14,
        animationsEnabled: true,
        notificationsEnabled: true,
        compactMode: false,
        favorites: [],
        hasCompletedOnboarding: false,
        authorizedDirs: [],
        workspace: { limitAccess: true, autoSave: true, watch: true, heartbeat: '2h' as const },
        tts: { enabled: false, speed: 1.0, volume: 1.0, autoPlay: false, provider: null },
        stt: { enabled: true, autoStart: false },
        privacy: { optimizationPlan: false },
        web: { deviceToken: '', deviceId: '', deviceName: '', lastReportedAt: null },
      },
    },
    settingsSetResult = { success: true },
    settingsResetResult = { success: true, data: settingsGetResult.data },
  } = opts

  const changeListeners: Array<(d: { key: string; value: unknown; settings: AppSettings }) => void> = []

  const mock = {
    settings: {
      get: vi.fn().mockResolvedValue(settingsGetResult),
      set: vi.fn().mockResolvedValue(settingsSetResult),
      reset: vi.fn().mockResolvedValue(settingsResetResult),
      onChanged: vi.fn((cb: (d: { key: string; value: unknown; settings: AppSettings }) => void) => {
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
  }

  // Helper to fire onChanged events from tests
  ;(mock as Record<string, unknown>)._fireSettingsChange = (data: Partial<AppSettings>) => {
    const settings = { ...settingsGetResult.data, ...data } as AppSettings
    changeListeners.forEach((cb) => cb({ key: 'settings', value: settings, settings }))
  }

  return mock as typeof window.electronAPI & {
    _fireSettingsChange: (data: Partial<AppSettings>) => void
  }
}

export const mockElectronAPI = createMockElectronAPI()

interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  fontSize: number
  animationsEnabled: boolean
  notificationsEnabled: boolean
  compactMode: boolean
  favorites: string[]
  hasCompletedOnboarding: boolean
  authorizedDirs: string[]
  workspace: { limitAccess: boolean; autoSave: boolean; watch: boolean; heartbeat: '30m' | '1h' | '2h' | '4h' }
  tts: { enabled: boolean; speed: number; volume: number; autoPlay: boolean; provider: string | null }
  stt: { enabled: boolean; autoStart: boolean }
  privacy: { optimizationPlan: boolean }
  web: { deviceToken: string; deviceId: string; deviceName: string; lastReportedAt: string | null }
}
```
  </action>
  <verify>
    <automated>
      test -f /Users/kaka/Desktop/synclaw/client/src/test/mocks/openclaw.ts && test -f /Users/kaka/Desktop/synclaw/client/src/test/mocks/electronAPI.ts && grep -q "createMockOpenClaw" /Users/kaka/Desktop/synclaw/client/src/test/mocks/openclaw.ts && grep -q "createMockElectronAPI" /Users/kaka/Desktop/synclaw/client/src/test/mocks/electronAPI.ts
    </automated>
  </verify>
  <done>
    Mock factories exist and export createMockOpenClaw / createMockElectronAPI with vi.fn() spies
  </done>
</task>

<task type="auto">
  <name>Task 3: Write chatStore unit tests</name>
  <files>client/src/renderer/stores/chatStore.test.ts</files>
  <read_first>
    client/src/renderer/stores/chatStore.ts
    client/src/test/mocks/openclaw.ts
  </read_first>
  <action>
Create `client/src/renderer/stores/chatStore.test.ts`:

Use vi.hoisted() at the top level to create mocks before any imports:
```typescript
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

const mockOpenClaw = vi.hoisted(() => {
  const listeners = new Map<string, (e: { event: string; payload: unknown }) => void>()
  return {
    getStatus: vi.fn().mockResolvedTo('ready'),
    connect: vi.fn().mockResolvedValue({ success: true }),
    disconnect: vi.fn().mockResolvedValue({ success: true }),
    models: {
      list: vi.fn().mockResolvedValue({ success: true, data: [{ id: 'claude-3-5' }] }),
    },
    chat: {
      history: vi.fn().mockResolvedValue({ success: true, data: [] }),
      abort: vi.fn().mockResolvedValue({ success: true }),
    },
    agent: vi.fn().mockResolvedValue({ success: true, data: { runId: 'run-1' } }),
    on: vi.fn((cb: (e: { event: string; payload: unknown }) => void) => {
      const id = String(Date.now())
      listeners.set(id, cb)
      return () => listeners.delete(id)
    }),
    // Internal helper to fire events
    _fireEvent: (event: string, payload: unknown) => {
      listeners.forEach((cb) => cb({ event, payload }))
    },
  } as unknown as typeof window.openclaw & { _fireEvent: (e: string, p: unknown) => void }
})

vi.stubGlobal('window', {
  openclaw: mockOpenClaw,
  electronAPI: {
    settings: {
      get: vi.fn().mockResolvedValue({ success: true, data: {} }),
      set: vi.fn().mockResolvedValue({ success: true }),
      onChanged: vi.fn(() => () => {}),
    },
    notifications: { setEnabled: vi.fn().mockResolvedValue({ success: true }) },
  },
})

// Now import the store (after mocks are stubbed)
const { useChatStore } = await import('./chatStore')
```

Then write tests for these behaviors:

1. **addMessage adds message and returns id**:
   - Call `useChatStore.getState().addMessage({ role: 'user', content: 'hello' })`
   - Assert returned id is a non-empty string
   - Assert `useChatStore.getState().messages.length === 1`
   - Assert the message has correct role/content

2. **MAX_MESSAGES cap at 200**:
   - Add 250 user messages using addMessage in a loop
   - Assert `messages.length === 200`
   - Assert the last message is the 50th added (oldest trimmed)

3. **updateMessage updates existing message**:
   - Add a message, get its id
   - Call `updateMessage(id, { content: 'updated' })`
   - Assert the message content is 'updated'

4. **appendToMessage appends content**:
   - Add a message, get its id
   - Call `appendToMessage(id, ' more')`
   - Assert the message content is 'original more'

5. **sendMessage with valid API key adds user + assistant messages**:
   - Reset store state with `useChatStore.setState({ messages: [], sending: false })`
   - Mock models.list to return `{ success: true, data: [{ id: 'claude' }] }`
   - Mock agent to return `{ success: true, data: { runId: 'run-1' } }`
   - Call `sendMessage('hello')`
   - Assert messages length >= 2 (user + assistant placeholder)
   - Assert sending is true

6. **sendMessage without content trims and returns early**:
   - Reset store state
   - Call `sendMessage('  ')` with whitespace only
   - Assert no messages were added

7. **sendMessage with no API key shows error message**:
   - Reset store state
   - Mock models.list to return `{ success: true, data: [] }` (empty = no key)
   - Call `sendMessage('hello')`
   - Assert an assistant error message was added

8. **Gateway event 'content' appends to last assistant message**:
   - Reset store state
   - Mock agent to return `{ success: true, data: { runId: 'run-1' } }`
   - Add user + assistant messages
   - Fire `mockOpenClaw._fireEvent('agent', { type: 'content', content: ' response' })`
   - Assert the assistant message content ends with 'response'

9. **Gateway event 'done' clears thinking state**:
   - Reset store state
   - Mock agent
   - Add user + assistant (thinking: true) messages
   - Fire `mockOpenClaw._fireEvent('agent', { type: 'done' })`
   - Assert assistant message thinking === false

10. **Gateway event 'error' updates message with error**:
    - Reset store state
    - Mock agent
    - Add user + assistant messages
    - Fire `mockOpenClaw._fireEvent('agent', { type: 'error', error: 'something went wrong' })`
    - Assert assistant message content contains 'Error'

For each test, use `beforeEach` to reset store state:
```typescript
beforeEach(() => {
  useChatStore.setState({
    messages: [],
    sending: false,
    currentRunId: null,
    safetyTimeoutId: null,
    _initCleanup: null,
    sessionKey: 'default',
  })
})
```

Use `afterEach` to clear any pending timers:
```typescript
afterEach(() => {
  vi.clearAllTimers()
  vi.restoreAllMocks()
})
```
  </action>
  <verify>
    <automated>
      cd /Users/kaka/Desktop/synclaw/client && pnpm test -- chatStore.test.ts --reporter=verbose 2>&1 | tail -30
    </automated>
  </verify>
  <done>
    All chatStore tests pass: addMessage, MAX_MESSAGES cap, updateMessage, appendToMessage, sendMessage (API key check, empty content), Gateway events (content, done, error)
  </done>
</task>

<task type="auto">
  <name>Task 4: Write settingsStore unit tests</name>
  <files>client/src/renderer/stores/settingsStore.test.ts</files>
  <read_first>
    client/src/renderer/stores/settingsStore.ts
    client/src/test/mocks/electronAPI.ts
  </read_first>
  <action>
Create `client/src/renderer/stores/settingsStore.test.ts`:

```typescript
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

const mockSettingsData = {
  theme: 'dark',
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

const mockElectronAPI = vi.hoisted(() => {
  const changeListeners: Array<(d: { key: string; value: unknown; settings: typeof mockSettingsData }) => void> = []
  return {
    settings: {
      get: vi.fn().mockResolvedValue({ success: true, data: mockSettingsData }),
      set: vi.fn().mockResolvedValue({ success: true }),
      reset: vi.fn().mockResolvedValue({ success: true, data: { theme: 'system', fontSize: 14, animationsEnabled: true, notificationsEnabled: true, compactMode: false, favorites: [], hasCompletedOnboarding: false, authorizedDirs: [], workspace: { limitAccess: true, autoSave: true, watch: true, heartbeat: '2h' as const }, tts: { enabled: false, speed: 1.0, volume: 1.0, autoPlay: false, provider: null }, stt: { enabled: true, autoStart: false }, privacy: { optimizationPlan: false }, web: { deviceToken: '', deviceId: '', deviceName: '', lastReportedAt: null } } }),
      onChanged: vi.fn((cb: (d: { key: string; value: unknown; settings: typeof mockSettingsData }) => void) => {
        changeListeners.push(cb)
        return () => { const idx = changeListeners.indexOf(cb); if (idx !== -1) changeListeners.splice(idx, 1) }
      }),
    },
    notifications: { setEnabled: vi.fn().mockResolvedValue({ success: true }) },
    _fireChange: (data: Partial<typeof mockSettingsData>) => {
      const merged = { ...mockSettingsData, ...data } as typeof mockSettingsData
      changeListeners.forEach((cb) => cb({ key: 'settings', value: merged, settings: merged }))
    },
  }
})

vi.stubGlobal('window', { electronAPI: mockElectronAPI, openclaw: undefined })

const { useSettingsStore } = await import('./settingsStore')
```

Write these tests:

1. **Initial state uses defaults before loadSettings resolves**:
   - Assert initial theme is 'system'
   - Assert hasCompletedOnboarding is false
   - Assert fontSize is 14

2. **loadSettings loads from electron-store**:
   - Call `await useSettingsStore.getState().loadSettings()`
   - Assert theme is 'dark' (from mock data)
   - Assert hasCompletedOnboarding is true
   - Assert fontSize is 16

3. **setTheme updates state and calls electronAPI.settings.set**:
   - Call `await useSettingsStore.getState().setTheme('light')`
   - Assert `useSettingsStore.getState().theme === 'light'`
   - Assert `mockElectronAPI.settings.set` was called with 'theme', 'light'

4. **setHasCompletedOnboarding persists to electron-store**:
   - Call `await useSettingsStore.getState().setHasCompletedOnboarding(true)`
   - Assert `useSettingsStore.getState().hasCompletedOnboarding === true`
   - Assert `mockElectronAPI.settings.set` was called with 'hasCompletedOnboarding', true

5. **Cross-window sync via onChanged callback**:
   - Call `await useSettingsStore.getState().loadSettings()`
   - Fire `mockElectronAPI._fireChange({ theme: 'light', hasCompletedOnboarding: false })`
   - Assert `useSettingsStore.getState().theme === 'light'`
   - Assert `useSettingsStore.getState().hasCompletedOnboarding === false`

6. **Workspace settings persist nested keys**:
   - Call `await useSettingsStore.getState().setWorkspaceLimitAccess(false)`
   - Assert `mockElectronAPI.settings.set` was called with 'workspace.limitAccess', false

7. **TTS settings are clamped**:
   - Call `await useSettingsStore.getState().setTtsSpeed(5.0)`
   - Assert speed is clamped to 2.0
   - Call `await useSettingsStore.getState().setTtsVolume(-0.5)`
   - Assert volume is clamped to 0

8. **resetSettings restores defaults and calls reset API**:
   - First load settings, then call `await useSettingsStore.getState().resetSettings()`
   - Assert `mockElectronAPI.settings.reset` was called

For each test, use `beforeEach` to reset state:
```typescript
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
```
  </action>
  <verify>
    <automated>
      cd /Users/kaka/Desktop/synclaw/client && pnpm test -- settingsStore.test.ts --reporter=verbose 2>&1 | tail -30
    </automated>
  </verify>
  <done>
    All settingsStore tests pass: defaults, loadSettings, setTheme, hasCompletedOnboarding persistence, cross-window onChanged sync, workspace nested keys, TTS clamping, resetSettings
  </done>
</task>

<task type="auto">
  <name>Task 5: Write avatarStore and execApprovalStore unit tests</name>
  <files>client/src/renderer/stores/avatarStore.test.ts, client/src/renderer/stores/execApprovalStore.test.ts</files>
  <read_first>
    client/src/renderer/stores/avatarStore.ts
    client/src/renderer/stores/execApprovalStore.ts
  </read_first>
  <action>
### avatarStore.test.ts

```typescript
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

const mockOpenClaw = vi.hoisted(() => ({
  avatars: {
    list: vi.fn().mockResolvedValue({ success: true, data: [{ id: 'av-1', name: 'Avatar 1' }] }),
    create: vi.fn().mockResolvedValue({ success: true, data: { id: 'av-new', name: 'New Avatar' } }),
    update: vi.fn().mockResolvedValue({ success: true }),
    delete: vi.fn().mockResolvedValue({ success: true }),
  },
}))

vi.stubGlobal('window', { openclaw: mockOpenClaw })

const { useAvatarStore } = await import('./avatarStore')
```

Tests:

1. **loadAvatars with successful API loads avatars and demoMode=false**:
   - Call `await useAvatarStore.getState().loadAvatars()`
   - Assert avatars have at least one item
   - Assert demoMode is false

2. **loadAvatars with no openclaw falls back to demo mode with DEMO_AVATARS**:
   - Stub window.openclaw to undefined
   - Call `await useAvatarStore.getState().loadAvatars()`
   - Assert demoMode is true
   - Assert avatars has at least 2 demo avatars

3. **activateAvatar sets activeAvatarId and syncs to appStore**:
   - First load avatars
   - Mock dynamic import for appStore
   - Call `await useAvatarStore.getState().activateAvatar('av-1')`
   - Assert `useAvatarStore.getState().activeAvatarId === 'av-1'`

4. **activateAvatar with invalid id does nothing**:
   - Load avatars
   - Call `await activateAvatar('non-existent-id')`
   - Assert activeAvatarId is null

5. **createAvatar adds avatar to list**:
   - Call `await useAvatarStore.getState().createAvatar({ name: 'Test', personality: 'helpful' })`
   - Assert avatars includes new avatar

6. **deleteAvatar removes avatar and clears activeAvatarId if deleted**:
   - Load avatars, activate one
   - Call `await useAvatarStore.getState().deleteAvatar('av-1')`
   - Assert avatar is removed

7. **setDemoMode toggles demoMode**:
   - Call `useAvatarStore.getState().setDemoMode(true)`
   - Assert demoMode is true

Use `beforeEach`:
```typescript
beforeEach(async () => {
  useAvatarStore.setState({ avatars: [], activeAvatarId: null, loading: false, error: null, demoMode: false })
  vi.clearAllMocks()
  // Reset openclaw mock
  mockOpenClaw.avatars.list.mockResolvedValue({ success: true, data: [{ id: 'av-1', name: 'Avatar 1' }] })
  mockOpenClaw.avatars.create.mockResolvedValue({ success: true, data: { id: 'av-new', name: 'New Avatar' } })
  mockOpenClaw.avatars.update.mockResolvedValue({ success: true })
  mockOpenClaw.avatars.delete.mockResolvedValue({ success: true })
})
```

### execApprovalStore.test.ts

```typescript
import { vi, describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useExecApprovalStore } from './execApprovalStore'
```

Tests:

1. **enqueue adds approval to pending queue**:
   - Call `enqueue({ id: 'a1', command: 'rm -rf /', executable: 'rm', args: ['-rf', '/'] }, vi.fn())`
   - Assert pending.length === 1
   - Assert current is this entry

2. **resolveCurrent resolves front of queue and advances**:
   - Enqueue two approvals, resolve first with 'approved'
   - Assert pending.length === 1
   - Assert current.id is second approval id

3. **resolveById resolves specific approval regardless of position**:
   - Enqueue two approvals, resolve second by id
   - Assert pending.length === 1
   - Assert remaining approval is first one

4. **Timeout auto-denies after DEFAULT_TIMEOUT_MS**:
   - Enqueue approval with default timeout (vi.useFakeTimers() to control time)
   - Use `vi.advanceTimersByTime(5 * 60 * 1000 + 1)`
   - Run pending timers: `vi.runAllTimers()`
   - Assert pending is empty
   - Assert the resolve callback was called with 'denied'

5. **clearAll clears all timers and resets state**:
   - Enqueue two approvals
   - Call `clearAll()`
   - Assert pending.length === 0
   - Assert current is null

6. **hasPending returns correct boolean**:
   - Assert hasPending() is false initially
   - Enqueue approval
   - Assert hasPending() is true

7. **flushResolved returns resolved map and clears it**:
   - Enqueue and resolve approval
   - Call flushResolved()
   - Assert resolved map has the entry
   - Assert store resolved map is empty after flush

For timer tests, wrap in:
```typescript
beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })
```
  </action>
  <verify>
    <automated>
      cd /Users/kaka/Desktop/synclaw/client && pnpm test -- avatarStore.test.ts execApprovalStore.test.ts --reporter=verbose 2>&1 | tail -40
    </automated>
  </verify>
  <done>
    All avatarStore tests pass: loadAvatars (API + demo fallback), activateAvatar, createAvatar, deleteAvatar, setDemoMode
    All execApprovalStore tests pass: enqueue, resolveCurrent, resolveById, timeout auto-deny, clearAll, hasPending, flushResolved
  </done>
</task>

<task type="auto">
  <name>Task 6: Write useTTS hook unit tests</name>
  <files>client/src/renderer/hooks/useTTS.test.tsx</files>
  <read_first>
    client/src/renderer/hooks/useTTS.ts
    client/src/test/mocks/openclaw.ts
  </read_first>
  <action>
Create `client/src/renderer/hooks/useTTS.test.tsx`. This is a React hook test, so use `@testing-library/react`'s `renderHook`.

```typescript
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const mockOpenClaw = vi.hoisted(() => ({
  tts: {
    status: vi.fn().mockResolvedValue({ success: true }),
    providers: vi.fn().mockResolvedValue({ success: true, data: { providers: [{ id: 'p1', name: 'Provider 1' }] } }),
    enable: vi.fn().mockResolvedValue({ success: true }),
    disable: vi.fn().mockResolvedValue({ success: true }),
    convert: vi.fn().mockResolvedValue({ success: true, data: { url: 'data:audio/mp3;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2JkI2Ff3Z4gIaKjYuGgXx5fYKFi42LiIR/fH2AgYWIi4qGg4GEhoiKi4qIhoWEhoiJiomGhYWIioqJiIWEhoiJioiFhIWIioqIhYSEhoiJioiFhIWIioqIhYSEhoiJioiFhIWIioqIhYSEhoiJioiFhIWIioqIhYSEhoiJioiFhIWIioqIhYSEhoiJioiFhIWIioqIhYSEhoiJioiF' } }),
  },
  settings: {
    get: vi.fn().mockResolvedValue({ success: true, data: {} }),
    set: vi.fn().mockResolvedValue({ success: true }),
  },
}))

vi.stubGlobal('window', {
  openclaw: mockOpenClaw,
  electronAPI: {
    settings: { get: vi.fn().mockResolvedValue({ success: true, data: {} }), set: vi.fn().mockResolvedValue({ success: true }) },
  },
})

const { useTTS } = await import('./useTTS')
```

Tests:

1. **Initial state: isAvailable false, isPlaying false, currentWordIndex -1**:
   - Render hook and assert initial values
   - Use `await waitFor(() => { ... })` to wait for initialize() to complete

2. **speak starts playback and sets isPlaying true**:
   - Mock tts.convert to return valid audio URL
   - Render hook, wait for init
   - Call speak('hello world')
   - Wait for `isPlaying` to be true

3. **stop pauses audio, resets state, and clears currentWordIndex**:
   - After speak starts, call stop()
   - Assert isPlaying is false
   - Assert currentWordIndex is -1
   - Assert currentText is ''

4. **pause calls audio.pause()**:
   - After speak starts (and mock audio play resolves), call pause()
   - Assert isPlaying is false, isPaused is true

5. **resume calls audio.play()**:
   - After pause, call resume()
   - Assert isPlaying is true

6. **speak with empty text returns early without calling convert**:
   - Render hook, wait for init
   - Call speak('  ')
   - Assert tts.convert was NOT called

7. **speak when TTS unavailable sets error**:
   - Mock tts.status to return `{ success: false }`
   - Render hook, wait for init
   - Call speak('hello')
   - Assert error is not null

8. **currentWordIndex updates during playback**:
   - This is hard to test precisely with mocking Audio. Instead, verify that:
     - After speak(), the hook tracks words
     - stop() resets currentWordIndex to -1

For Audio mocking: Since we can't easily mock HTMLAudioElement in jsdom, the tests focus on the state transitions that the hook exposes. The actual Audio element integration is tested via E2E tests.

Wrap each renderHook in `afterEach(() => { result.unmount() })`.

For timing-related tests, use fake timers:
```typescript
beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }) })
afterEach(() => { vi.useRealTimers() })
```
  </action>
  <verify>
    <automated>
      cd /Users/kaka/Desktop/synclaw/client && pnpm test -- useTTS.test.tsx --reporter=verbose 2>&1 | tail -30
    </automated>
  </verify>
  <done>
    All useTTS tests pass: initial state, speak starts playback, stop resets state, pause/resume transitions, empty text guard, unavailable TTS error, currentWordIndex lifecycle
  </done>
</task>

</tasks>

<verification>
Run the full test suite to confirm all tests pass:

```bash
cd /Users/kaka/Desktop/synclaw/client && pnpm test
```

Expected output: All 5 test files pass with green checkmarks. No TypeScript errors. Coverage report shows the 5 target stores/hooks covered.
</verification>

<success_criteria>
1. `pnpm test` exits with code 0 and shows all tests passing
2. Coverage report includes chatStore, settingsStore, avatarStore, execApprovalStore, useTTS
3. No TypeScript errors from test files (run `pnpm typecheck` first if needed)
4. All 6 requirements (TEST-01 through TEST-06) are satisfied by passing tests
</success_criteria>

<output>
After completion, create `.planning/phases/10-test-unit/10-SUMMARY.md`
</output>

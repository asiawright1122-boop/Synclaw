import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// Don't mock execApprovalStore or Toast — Zustand stores are safe to import.
// Only stub window.openclaw (the real external dependency).
// Using plain object approach: assign vi.fn() mocks in beforeEach.
const openClawFns = {
  getStatus: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  reconnect: vi.fn(),
  onStatusChange: vi.fn(() => () => {}),
  agent: vi.fn(),
  models: {
    list: vi.fn(),
    getCurrent: vi.fn(),
    setCurrent: vi.fn(),
  },
  chat: {
    history: vi.fn(),
    abort: vi.fn(),
    send: vi.fn(),
  },
  avatars: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  exec: {
    approval: {
      resolve: vi.fn(),
    },
  },
  tts: {
    status: vi.fn(),
    providers: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    convert: vi.fn(),
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on: vi.fn<(...args: any[]) => () => void>(() => () => {}),
}

vi.stubGlobal('window', {
  openclaw: openClawFns,
  electronAPI: {
    settings: {
      get: vi.fn(),
      set: vi.fn(),
      onChanged: vi.fn(() => () => {}),
    },
    notifications: { setEnabled: vi.fn() },
  },
})

// Import the store AFTER mocks are set up
const { useChatStore } = await import('./chatStore')

describe('chatStore', () => {
  beforeEach(() => {
    useChatStore.setState({
      messages: [],
      sending: false,
      currentRunId: null,
      safetyTimeoutId: null,
      _initCleanup: null,
      sessionKey: 'default',
    })
    vi.resetAllMocks()
    // Set up default return values in beforeEach (after resetAllMocks)
    openClawFns.models.list.mockResolvedValue({ success: true, data: [{ id: 'claude' }] })
    openClawFns.agent.mockResolvedValue({ success: true, data: { runId: 'run-1' } })
    openClawFns.connect.mockResolvedValue({ success: true })
    openClawFns.disconnect.mockResolvedValue({ success: true })
    openClawFns.reconnect.mockResolvedValue({ success: true })
    openClawFns.models.getCurrent.mockResolvedValue({ success: true })
    openClawFns.models.setCurrent.mockResolvedValue({ success: true })
    openClawFns.chat.history.mockResolvedValue({ success: true, data: [] })
    openClawFns.chat.abort.mockResolvedValue({ success: true })
    openClawFns.chat.send.mockResolvedValue({ success: true })
    openClawFns.avatars.list.mockResolvedValue({ success: true, data: [] })
    openClawFns.avatars.create.mockResolvedValue({ success: true, data: {} })
    openClawFns.avatars.update.mockResolvedValue({ success: true })
    openClawFns.avatars.delete.mockResolvedValue({ success: true })
    openClawFns.exec.approval.resolve.mockResolvedValue({ success: true })
    openClawFns.tts.status.mockResolvedValue({ success: true })
    openClawFns.tts.providers.mockResolvedValue({ success: true, data: { providers: [] } })
    openClawFns.tts.enable.mockResolvedValue({ success: true })
    openClawFns.tts.disable.mockResolvedValue({ success: true })
    openClawFns.tts.convert.mockResolvedValue({ success: true, data: { url: '' } })
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.restoreAllMocks()
  })

  describe('addMessage', () => {
    it('adds a user message and returns a non-empty id', () => {
      const id = useChatStore.getState().addMessage({ role: 'user', content: 'hello' })
      expect(typeof id).toBe('string')
      expect(id.length).toBeGreaterThan(0)
      expect(useChatStore.getState().messages).toHaveLength(1)
      expect(useChatStore.getState().messages[0].role).toBe('user')
      expect(useChatStore.getState().messages[0].content).toBe('hello')
    })

    it('adds an assistant message', () => {
      useChatStore.getState().addMessage({ role: 'assistant', content: 'Hi there!' })
      expect(useChatStore.getState().messages).toHaveLength(1)
      expect(useChatStore.getState().messages[0].role).toBe('assistant')
    })
  })

  describe('MAX_MESSAGES cap', () => {
    it('caps messages at 200 and trims oldest', () => {
      for (let i = 0; i < 250; i++) {
        useChatStore.getState().addMessage({ role: 'user', content: `msg-${i}` })
      }
      expect(useChatStore.getState().messages).toHaveLength(200)
      expect(useChatStore.getState().messages[0].content).toBe('msg-50')
      expect(useChatStore.getState().messages[199].content).toBe('msg-249')
    })
  })

  describe('updateMessage', () => {
    it('updates an existing message', () => {
      const id = useChatStore.getState().addMessage({ role: 'user', content: 'original' })
      useChatStore.getState().updateMessage(id, { content: 'updated' })
      expect(useChatStore.getState().messages[0].content).toBe('updated')
    })

    it('updates thinking state', () => {
      const id = useChatStore.getState().addMessage({ role: 'assistant', content: 'thinking...' })
      useChatStore.getState().updateMessage(id, { thinking: false })
      expect(useChatStore.getState().messages[0].thinking).toBe(false)
    })
  })

  describe('appendToMessage', () => {
    it('appends content to an existing message', () => {
      const id = useChatStore.getState().addMessage({ role: 'assistant', content: 'part1' })
      useChatStore.getState().appendToMessage(id, ' part2')
      expect(useChatStore.getState().messages[0].content).toBe('part1 part2')
    })
  })

  describe('sendMessage', () => {
    it('adds user + assistant messages when API key is configured', async () => {
      openClawFns.models.list.mockResolvedValue({ success: true, data: [{ id: 'claude' }] })
      openClawFns.agent.mockResolvedValue({ success: true, data: { runId: 'run-1' } })
      await useChatStore.getState().sendMessage('hello')
      expect(useChatStore.getState().messages.length).toBeGreaterThanOrEqual(2)
      const lastMsg = useChatStore.getState().messages[useChatStore.getState().messages.length - 1]
      expect(lastMsg.role).toBe('assistant')
    })

    it('returns early when content is empty/whitespace', async () => {
      await useChatStore.getState().sendMessage('  ')
      expect(useChatStore.getState().messages).toHaveLength(0)
      expect(openClawFns.agent).not.toHaveBeenCalled()
    })

    it('shows error message when no API key is configured', async () => {
      openClawFns.models.list.mockResolvedValue({ success: true, data: [] })
      await useChatStore.getState().sendMessage('hello')
      const assistantMsgs = useChatStore.getState().messages.filter((m) => m.role === 'assistant')
      expect(assistantMsgs.length).toBeGreaterThan(0)
      expect(assistantMsgs[0].content).toContain('API Key')
    })
  })

  describe('Gateway events', () => {
    it("'content' event appends to last assistant message", async () => {
      const listeners: Array<(arg: unknown) => void> = []
      openClawFns.on.mockImplementation((cb: (arg: unknown) => void) => {
        listeners.push(cb)
        return () => {}
      })
      await useChatStore.getState().init()
      useChatStore.getState().addMessage({ role: 'user', content: 'hi' })
      const assistantId = useChatStore.getState().addMessage({ role: 'assistant', content: '' })
      listeners.forEach((cb) => cb({ event: 'agent', payload: { type: 'content', content: ' response' } }))
      const updated = useChatStore.getState().messages.find((m) => m.id === assistantId)
      expect(updated?.content).toBe(' response')
    })

    it("'done' event clears thinking state", async () => {
      const listeners: Array<(arg: unknown) => void> = []
      openClawFns.on.mockImplementation((cb: (arg: unknown) => void) => {
        listeners.push(cb)
        return () => {}
      })
      await useChatStore.getState().init()
      useChatStore.getState().addMessage({ role: 'user', content: 'hi' })
      const assistantId = useChatStore.getState().addMessage({ role: 'assistant', content: 'done', thinking: true })
      listeners.forEach((cb) => cb({ event: 'agent', payload: { type: 'done' } }))
      const updated = useChatStore.getState().messages.find((m) => m.id === assistantId)
      expect(updated?.thinking).toBe(false)
    })

    it("'error' event updates message with error content", async () => {
      const listeners: Array<(arg: unknown) => void> = []
      openClawFns.on.mockImplementation((cb: (arg: unknown) => void) => {
        listeners.push(cb)
        return () => {}
      })
      await useChatStore.getState().init()
      useChatStore.getState().addMessage({ role: 'user', content: 'hi' })
      const assistantId = useChatStore.getState().addMessage({ role: 'assistant', content: 'some content' })
      listeners.forEach((cb) => cb({ event: 'agent', payload: { type: 'error', error: 'something went wrong' } }))
      const updated = useChatStore.getState().messages.find((m) => m.id === assistantId)
      expect(updated?.content).toContain('Error')
    })
  })
})

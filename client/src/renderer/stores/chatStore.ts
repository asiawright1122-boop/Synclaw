/**
 * Chat Store - Manages conversation state with OpenClaw Gateway
 * Handles message history, streaming responses, and abort functionality
 */
import { create } from 'zustand'
import {
  useExecApprovalStore,
  type ApprovalDecisionReason,
  decisionOf,
  reasonOf,
} from './execApprovalStore'
import { useToastStore } from '../components/Toast'

// Development-only debug logger — silent in production builds
const debug = import.meta.env.DEV
  ? (label: string, ...args: unknown[]) => console.debug(`[ChatStore] ${label}`, ...args)
  : (_label: string, ..._args: unknown[]) => {}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  thinking?: boolean
  runId?: string
  attachments?: AttachmentFile[]
}

export interface AttachmentFile {
  id: string
  name: string
  size: number
  mimeType: string
  content: string // base64 data URL
}

interface AgentEvent {
  type: 'thinking' | 'tool' | 'content' | 'done' | 'error'
  content?: string
  tool?: {
    name: string
    input: Record<string, unknown>
  }
  error?: string
}

interface ExecApprovalEvent {
  id?: string
  command?: string
  nodeId?: string
  approved?: boolean
  decision?: 'allow-once' | 'allow-always' | 'deny'
}

interface DevicePairEvent {
  deviceId?: string
  deviceName?: string
  status?: string
}

interface NodePairEvent {
  nodeId?: string
  nodeName?: string
  status?: string
}

interface NodeInvokeEvent {
  nodeId?: string
  requestId?: string
  command?: string
}

interface ChatState {
  // State
  messages: ChatMessage[]
  sessionKey: string
  sending: boolean
  currentRunId: string | null

  // Actions
  setSessionKey: (key: string) => void
  switchSession: (key: string) => Promise<void>
  setSending: (sending: boolean) => void
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => string
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void
  appendToMessage: (id: string, content: string) => void
  removeMessage: (id: string) => void
  clearMessages: () => void

  // Async actions
  loadHistory: () => Promise<void>
  sendMessage: (content: string, model?: string, agentId?: string, attachments?: AttachmentFile[]) => Promise<void>
  abortRun: () => Promise<void>
  init: () => Promise<() => void>
}

const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  messages: [],
  sessionKey: 'default',
  sending: false,
  currentRunId: null,

  // Sync actions
  setSessionKey: (sessionKey) => set({ sessionKey }),

  // Switch session: update sessionKey, clear messages, and load history
  switchSession: async (sessionKey: string) => {
    set({ sessionKey, messages: [], currentRunId: null })
    await get().loadHistory()
  },

  setSending: (sending) => set({ sending }),

  addMessage: (message) => {
    const id = generateId()
    set((state) => ({
      messages: [...state.messages, {
        ...message,
        id,
        timestamp: Date.now(),
      }],
    }))
    return id
  },

  updateMessage: (id, updates) => set((state) => ({
    messages: state.messages.map((msg) =>
      msg.id === id ? { ...msg, ...updates } : msg
    ),
  })),

  appendToMessage: (id, content) => set((state) => ({
    messages: state.messages.map((msg) =>
      msg.id === id ? { ...msg, content: msg.content + content } : msg
    ),
  })),

  removeMessage: (id) => set((state) => ({
    messages: state.messages.filter((msg) => msg.id !== id),
  })),

  clearMessages: () => set({ messages: [] }),

  // Async actions
  // 对话历史由 OpenClaw Gateway 自动持久化到 transcript JSONL
  // 此处仅通过 Gateway API 加载历史
  loadHistory: async () => {
    if (!window.openclaw) return
    const { sessionKey } = get()
    try {
      const result = await window.openclaw.chat.history({ sessionKey, limit: 50 })
      if (result.success && result.data) {
        const history = result.data as Array<{
          id?: string
          role: 'user' | 'assistant' | 'system'
          content: string
          timestamp?: number
        }>
        const messages: ChatMessage[] = history.map((msg) => ({
          id: msg.id || generateId(),
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp || Date.now(),
        }))
        set({ messages })
      }
    } catch (error) {
      console.error('[ChatStore] Failed to load history from Gateway:', error)
    }
  },

  sendMessage: async (content, model, agentId, attachments) => {
    if (!window.openclaw) {
      console.warn('[ChatStore] Cannot send message: window.openclaw unavailable')
      return
    }
    const { addMessage, updateMessage, setSending, sessionKey } = get()

    if (!content.trim()) return

    // Optimistic user message (with attachments if any)
    addMessage({ role: 'user', content: content.trim(), attachments })
    setSending(true)

    // Create placeholder for assistant response
    const assistantMsgId = addMessage({
      role: 'assistant',
      content: '',
      thinking: true,
    })

    let currentRunId: string | null = null

    // Safety timeout — clear sending state after 5 minutes if done event never fires
    const safetyTimeout = setTimeout(() => {
      const messages = get().messages
      const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')
      if (lastAssistant) {
        const isEmpty = lastAssistant.content.trim() === ''
        const content = isEmpty
          ? '[响应超时，请重试]'
          : lastAssistant.content + '\n\n[响应超时]'
        get().updateMessage(lastAssistant.id, { content, thinking: false })
      }
      setSending(false)
      set({ currentRunId: null })
    }, 5 * 60 * 1000)

    try {
      // Build agent params with attachments
      const agentParams: Record<string, unknown> = {
        message: content.trim(),
        sessionKey,
        model,
        agentId,
      }
      if (attachments && attachments.length > 0) {
        // Pass attachments as structured data for the agent to handle
        agentParams.attachments = attachments.map(({ id, name, size, mimeType }) => ({
          id, name, size, mimeType,
        }))
        agentParams.attachmentData = attachments.map(({ name, mimeType, content: data }) => ({
          name, mimeType, data,
        }))
      }

      // Start agent
      const result = await window.openclaw.agent(agentParams)

      if (result.success && result.data) {
        const data = result.data as Record<string, unknown>
        currentRunId = (data.runId as string | undefined) ?? null
        set({ currentRunId: currentRunId ?? null })
        // Stream events will clear sending via the 'done' event in init()
      } else if (result.error) {
        clearTimeout(safetyTimeout)
        updateMessage(assistantMsgId, {
          content: `Error: ${result.error}`,
          thinking: false,
        })
        setSending(false)
        return
      } else {
        clearTimeout(safetyTimeout)
        // success=true but no data — treat as non-fatal, stop thinking state
        updateMessage(assistantMsgId, { thinking: false })
        setSending(false)
        return
      }
    } catch (error) {
      clearTimeout(safetyTimeout)
      console.error('[ChatStore] Agent error:', error)
      updateMessage(assistantMsgId, {
        content: 'Connection error. Please check if OpenClaw Gateway is running.',
        thinking: false,
      })
      setSending(false)
      return
    }

    // Update to show content is being processed
    updateMessage(assistantMsgId, { thinking: true })
    // Stream events will be handled by the event listener in init()
  },

  abortRun: async () => {
    if (!window.openclaw) return
    const { currentRunId, updateMessage, messages } = get()

    if (!currentRunId) return

    try {
      await window.openclaw.chat.abort({ runId: currentRunId })

      // Mark last assistant message as stopped
      const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')
      if (lastAssistant) {
        updateMessage(lastAssistant.id, {
          content: lastAssistant.content + '\n\n[Stopped]',
          thinking: false,
        })
      }
    } catch (error) {
      console.error('[ChatStore] Abort error:', error)
    } finally {
      set({ currentRunId: null, sending: false })
    }
  },

  init: async () => {
    if (!window.openclaw) {
      return () => {}
    }

    // Load chat history on init
    await get().loadHistory()

    // Listen for agent events
    const unsubAgent = window.openclaw.on((event) => {
      if (event.event === 'agent') {
        const payload = event.payload as AgentEvent

        switch (payload.type) {
          case 'thinking': {
            const messages = get().messages
            const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')
            if (lastAssistant && lastAssistant.content === '') {
              get().updateMessage(lastAssistant.id, {
                content: payload.content || 'Thinking...',
                thinking: true,
              })
            }
            break
          }

          case 'content': {
            if (payload.content) {
              const msgs = get().messages
              const lastAsst = [...msgs].reverse().find((m) => m.role === 'assistant')
              if (lastAsst) {
                get().appendToMessage(lastAsst.id, payload.content)
              }
            }
            break
          }

          case 'tool': {
            if (payload.tool) {
              const msgsArr = get().messages
              const lastAsstMsg = [...msgsArr].reverse().find((m) => m.role === 'assistant')
              if (lastAsstMsg) {
                get().appendToMessage(lastAsstMsg.id, `\n\n[Using ${payload.tool.name}]`)
              }
            }
            break
          }

          case 'done': {
            const msgList = get().messages
            const lastAsstFinal = [...msgList].reverse().find((m) => m.role === 'assistant')
            if (lastAsstFinal) {
              get().updateMessage(lastAsstFinal.id, { thinking: false })
            }
            get().setSending(false)
            set({ currentRunId: null })
            break
          }

          case 'error': {
            const finalMsgs = get().messages
            const errorTarget = [...finalMsgs].reverse().find((m) => m.role === 'assistant')
            if (errorTarget) {
              get().updateMessage(errorTarget.id, {
                content: errorTarget.content + `\n\nError: ${payload.error}`,
                thinking: false,
              })
            }
            get().setSending(false)
            set({ currentRunId: null })
            break
          }
        }
      }

      // Also handle chat events
      if (event.event === 'chat') {
        const chatPayload = event.payload as { role?: string; content?: string }
        if (chatPayload.role === 'assistant' && chatPayload.content) {
          const msgs = get().messages
          const lastAsst = [...msgs].reverse().find((m) => m.role === 'assistant')
          if (lastAsst) {
            get().appendToMessage(lastAsst.id, chatPayload.content)
          }
        }
      }

      // Exec approval events — delegate to execApprovalStore
      if (event.event === 'exec.approval.requested') {
        const payload = event.payload as ExecApprovalEvent

        // Build a human-readable command string
        const raw = payload.command ?? ''
        const cmd = raw.trim()
          || `${payload.nodeId ?? 'exec'}: run a command`

        // Enqueue the approval; the modal will show via execApprovalStore
        useExecApprovalStore.getState().enqueue(
          {
            id: payload.id ?? `approval-${Date.now()}`,
            command: cmd,
            executable: cmd.split(' ')[0] ?? cmd,
            args: cmd.includes(' ') ? cmd.split(' ').slice(1) : [],
            nodeId: payload.nodeId,
            reason: undefined,
          },
          (v: ApprovalDecisionReason) => {
            // Called when user resolves or timeout fires — forward to Gateway
            if (!window.openclaw) return
            const decision = decisionOf(v)
            const approved = decision === 'approved'
            window.openclaw.exec.approval.resolve({
              id: payload.id,
              approved,
              decision: decision === 'denied' ? 'deny' : 'allow-once',
              reason: reasonOf(v),
            }).catch((err) => {
              console.error('[ChatStore] exec.approval.resolve failed:', err)
            })
            // Notify via toast
            useToastStore.getState().addToast({
              type: approved ? 'success' : 'warning',
              message: approved
                ? '命令已批准执行'
                : '命令已拒绝',
              duration: 2000,
            })
          }
        )
      }
      if (event.event === 'exec.approval.resolved') {
        const payload = event.payload as ExecApprovalEvent
        debug('Exec approval resolved:', payload)
        // Clean up any stale entries for this id
        const store = useExecApprovalStore.getState()
        if (payload.id && store.pending.find((e) => e.id === payload.id)) {
          store.resolveById(payload.id, payload.approved ? 'approved' : 'denied')
        }
      }

      // Device pair events
      if (event.event === 'device.pair.requested') {
        const payload = event.payload as DevicePairEvent
        debug('Device pair requested:', payload)
      }
      if (event.event === 'device.pair.resolved') {
        const payload = event.payload as DevicePairEvent
        debug('Device pair resolved:', payload)
      }

      // Node pair events
      if (event.event === 'node.pair.requested') {
        const payload = event.payload as NodePairEvent
        debug('Node pair requested:', payload)
      }
      if (event.event === 'node.pair.resolved') {
        const payload = event.payload as NodePairEvent
        debug('Node pair resolved:', payload)
      }

      // Node invoke request events
      if (event.event === 'node.invoke.request') {
        const payload = event.payload as NodeInvokeEvent
        debug('Node invoke request:', payload)
      }

      // Heartbeat / presence events
      if (event.event === 'tick' || event.event === 'presence' || event.event === 'heartbeat') {
        // Connection alive
      }
    })

    // Listen for tick events to keep connection alive
    const unsubTick = window.openclaw.on((event) => {
      if (event.event === 'tick') {
        // Connection is alive
      }
    })

    // Return cleanup function
    return () => {
      unsubAgent()
      unsubTick()
    }
  },
}))

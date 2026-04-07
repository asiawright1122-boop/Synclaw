/**
 * execApprovalStore.ts — Zustand store for exec approval queue.
 * Manages pending approvals, timeout timers, and resolution callbacks.
 */
import { create } from 'zustand'

export type ApprovalDecision = 'approved' | 'approved-once' | 'denied' | 'deny-all'
export type ApprovalDecisionReason = ApprovalDecision | { decision: ApprovalDecision; reason: string }

/** Extract decision string from a plain decision or a decision-with-reason */
export function decisionOf(v: ApprovalDecisionReason): ApprovalDecision {
  if (typeof v === 'string') return v
  return v.decision
}

/** Extract reason string from a plain decision or a decision-with-reason */
export function reasonOf(v: ApprovalDecisionReason): string | undefined {
  if (typeof v === 'string') return undefined
  return v.reason || undefined
}

export interface ExecApprovalRequest {
  /** Unique approval ID from the Gateway */
  id: string
  /** Human-readable command description */
  command: string
  /** Full executable path */
  executable: string
  /** Command arguments */
  args?: string[]
  /** Environment variables (optional, sensitive values masked) */
  env?: Record<string, string>
  /** Which node triggered this, if any */
  nodeId?: string
  /** Node name for display */
  nodeName?: string
  /** Context: what the agent is trying to do */
  reason?: string
  /** ISO timestamp when request arrived */
  receivedAt: number
  /** Auto-dismiss timeout in ms (default 5 minutes) */
  timeoutMs: number
}

interface ExecApprovalEntry extends ExecApprovalRequest {
  /** setTimeout handle for this approval's auto-dismiss */
  timer: ReturnType<typeof setTimeout>
  /** Called when user resolves or times out */
  resolve: (v: ApprovalDecisionReason) => void
}

interface ExecApprovalState {
  /** Pending approvals in order of arrival (queue) */
  pending: ExecApprovalEntry[]
  /** Currently displayed approval (front of queue) */
  current: ExecApprovalEntry | null
  /** Whether the modal is visible */
  isVisible: boolean
  /** Resolved decisions that haven't been flushed yet */
  resolved: Map<string, ApprovalDecisionReason>

  /** Enqueue a new approval request */
  enqueue: (req: { id: string; command: string; executable: string; args?: string[]; env?: Record<string, string>; nodeId?: string; nodeName?: string; reason?: string; timeoutMs?: number }, resolve: (v: ApprovalDecisionReason) => void) => string
  /** Resolve the current (oldest) approval */
  resolveCurrent: (v: ApprovalDecisionReason) => void
  /** Resolve by specific approval ID */
  resolveById: (id: string, v: ApprovalDecisionReason) => void
  /** Flush resolved decisions (called after sending to Gateway) */
  flushResolved: () => Map<string, ApprovalDecisionReason>
  /** Prune stale resolved entries older than 1 hour */
  _pruneResolved: () => void
  /** Check if any approvals are pending */
  hasPending: () => boolean
  /** Dismiss timeout */
  clearAll: () => void
}

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

export const useExecApprovalStore = create<ExecApprovalState>((set, get) => ({
  pending: [],
  current: null,
  isVisible: false,
  resolved: new Map(),

  enqueue: (req, resolve) => {
    const id = req.id ?? `approval-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const timeoutMs = req.timeoutMs ?? DEFAULT_TIMEOUT_MS

    const timer = setTimeout(() => {
      // Auto-deny on timeout
      const state = get()
      const entry = state.pending.find((e) => e.id === id)
      if (entry) {
        clearTimeout(entry.timer)
        const timeoutMinutes = Math.round((req.timeoutMs ?? DEFAULT_TIMEOUT_MS) / 60000)
        entry.resolve({ decision: 'denied', reason: `自动拒绝：审批超时（${timeoutMinutes} 分钟）` })
        set((s) => ({
          pending: s.pending.filter((e) => e.id !== id),
          current: s.current?.id === id ? null : s.current,
          // After removing this entry, keep modal visible if there are remaining pending entries
          isVisible: s.pending.length > 1,
        }))
      }
    }, timeoutMs)

    const entry: ExecApprovalEntry = {
      ...req,
      id,
      receivedAt: Date.now(),
      timeoutMs,
      timer,
      resolve,
    }

    set((state) => {
      const newPending = [...state.pending, entry]
      // If nothing is showing, make this the current one
      const newCurrent = state.current ?? entry
      const newIsVisible = state.isVisible || newPending.length > 0
      return { pending: newPending, current: newCurrent, isVisible: newIsVisible }
    })

    return id
  },

  resolveCurrent: (v) => {
    const { current, _pruneResolved } = get()
    if (!current) return

    clearTimeout(current.timer)
    current.resolve(v)

    set((state) => {
      const remaining = state.pending.filter((e) => e.id !== current.id)
      const nextCurrent = remaining[0] ?? null
      const newResolved = new Map(state.resolved)
      newResolved.set(current.id, v)
      return {
        pending: remaining,
        current: nextCurrent,
        isVisible: nextCurrent !== null,
        resolved: newResolved,
      }
    })
    _pruneResolved()
  },

  resolveById: (id, v) => {
    const { _pruneResolved } = get()
    const entry = get().pending.find((e) => e.id === id)
    if (!entry) return

    clearTimeout(entry.timer)
    entry.resolve(v)

    set((s) => {
      const remaining = s.pending.filter((e) => e.id !== id)
      const newResolved = new Map(s.resolved)
      newResolved.set(id, v)
      const nextCurrent = s.current?.id === id
        ? remaining[0] ?? null
        : s.current
      return {
        pending: remaining,
        current: nextCurrent,
        isVisible: nextCurrent !== null,
        resolved: newResolved,
      }
    })
    _pruneResolved()
  },

  flushResolved: () => {
    const resolved = get().resolved
    // Return and clear immediately — caller is responsible for reporting to Gateway
    set({ resolved: new Map() })
    return resolved
  },

  // Auto-cleanup: cap resolved Map at 50 entries to prevent unbounded growth
  // Callers should invoke flushResolved() after reporting to Gateway
  _pruneResolved: () => {
    const state = get()
    if (state.resolved.size <= 50) return
    // Remove oldest entries (Map maintains insertion order)
    const entries = [...state.resolved.entries()]
    const toKeep = entries.slice(-50)
    set({ resolved: new Map(toKeep) })
  },

  hasPending: () => get().pending.length > 0,

  clearAll: () => {
    const { pending } = get()
    pending.forEach((e) => clearTimeout(e.timer))
    set({ pending: [], current: null, isVisible: false, resolved: new Map() })
  },
}))

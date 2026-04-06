/**
 * EventBus — Unified event bus for SynClaw renderer.
 *
 * Single source of truth for all Gateway event subscriptions.
 * Components should use `useEventBus()` from `contexts/EventBusContext`
 * rather than directly importing this module.
 */

// ── Type-safe Event Map ──────────────────────────────────────────────────────

export interface AgentEvent {
  type: 'thinking' | 'tool' | 'content' | 'done' | 'error'
  content?: string
  tool?: { name: string; input: Record<string, unknown> }
  error?: string
}

export interface ChatEvent {
  role?: string
  content?: string
}

export interface ExecApprovalEvent {
  id?: string
  command?: string
  nodeId?: string
  approved?: boolean
  decision?: 'allow-once' | 'allow-always' | 'deny'
}

export interface DevicePairEvent {
  deviceId?: string
  deviceName?: string
}

export interface NodePairEvent {
  nodeId?: string
  nodeName?: string
}

export interface NodeInvokeEvent {
  nodeId?: string
  taskId?: string
}

/** All known Gateway event types with their payload shapes. */
export interface EventMap {
  // Agent / Chat events
  'agent': AgentEvent
  'chat': ChatEvent
  // Exec approval events
  'exec.approval.requested': ExecApprovalEvent
  'exec.approval.resolved': ExecApprovalEvent
  // Device pair events
  'device.pair.requested': DevicePairEvent
  'device.pair.resolved': DevicePairEvent
  // Node pair events
  'node.pair.requested': NodePairEvent
  'node.pair.resolved': NodePairEvent
  'node.invoke.request': NodeInvokeEvent
  // Heartbeat / presence
  'tick': Record<string, never>
  'presence': Record<string, never>
  'heartbeat': Record<string, never>
  // Cron events (from Gateway)
  'cron.triggered': Record<string, unknown>
  'cron.completed': Record<string, unknown>
  // Skill events (from Gateway)
  'skill.installed': Record<string, unknown>
  'skill.status-changed': Record<string, unknown>
  // Task events (from Gateway)
  'task.status-changed': Record<string, unknown>
}

// ── Internal implementation ───────────────────────────────────────────────────

type EventHandler = (payload: unknown) => void

interface ListenerEntry {
  handler: EventHandler
}

class EventBusImpl {
  /** Maps event name → list of listener entries (with stable identity for removal). */
  private listeners = new Map<string, Set<ListenerEntry>>()

  /**
   * Subscribe to an event. Returns an unsubscribe function.
   */
  on<K extends keyof EventMap>(event: K, handler: (payload: EventMap[K]) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    const entry: ListenerEntry = { handler: handler as EventHandler }
    this.listeners.get(event)!.add(entry)
    return () => this.off(event, handler)
  }

  /**
   * Unsubscribe a specific handler from an event.
   */
  off<K extends keyof EventMap>(event: K, handler: (payload: EventMap[K]) => void): void {
    const entries = this.listeners.get(event)
    if (!entries) return
    for (const entry of entries) {
      // Match by identity (same function reference)
      const fn = entry.handler as unknown as (payload: EventMap[K]) => void
      if (fn === handler) {
        entries.delete(entry)
        return
      }
    }
  }

  /**
   * Subscribe to an event for exactly one emission.
   */
  once<K extends keyof EventMap>(event: K, handler: (payload: EventMap[K]) => void): void {
    const unsub = this.on(event, (payload) => {
      unsub()
      handler(payload)
    })
  }

  /**
   * Emit an event to all subscribers.
   */
  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    const entries = this.listeners.get(event)
    if (!entries) return
    for (const entry of entries) {
      try {
        entry.handler(payload)
      } catch (err) {
        console.error(`[EventBus] Handler error for event "${event}":`, err)
      }
    }
  }

  /**
   * Remove all handlers for an event.
   */
  clear(event: keyof EventMap): void {
    this.listeners.delete(event)
  }

  /**
   * Remove all handlers for all events.
   */
  clearAll(): void {
    this.listeners.clear()
  }
}

/** Singleton event bus instance — shared across the entire renderer. */
export const eventBus = new EventBusImpl()

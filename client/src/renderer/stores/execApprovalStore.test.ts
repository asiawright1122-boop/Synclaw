import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useExecApprovalStore } from './execApprovalStore'

// DEFAULT_TIMEOUT_MS = 5 * 60 * 1000
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000

describe('execApprovalStore', () => {
  beforeEach(() => {
    useExecApprovalStore.setState({ pending: [], current: null, isVisible: false, resolved: new Map() })
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('enqueue', () => {
    it('adds approval to pending queue', () => {
      const resolve = vi.fn()
      useExecApprovalStore.getState().enqueue(
        { id: 'a1', command: 'ls', executable: 'ls', args: [] },
        resolve,
      )
      expect(useExecApprovalStore.getState().pending).toHaveLength(1)
      expect(useExecApprovalStore.getState().current).not.toBeNull()
    })

    it('makes first entry the current', () => {
      const resolve1 = vi.fn()
      const resolve2 = vi.fn()
      useExecApprovalStore.getState().enqueue(
        { id: 'a1', command: 'ls', executable: 'ls', args: [] },
        resolve1,
      )
      useExecApprovalStore.getState().enqueue(
        { id: 'a2', command: 'pwd', executable: 'pwd', args: [] },
        resolve2,
      )
      expect(useExecApprovalStore.getState().pending).toHaveLength(2)
      expect(useExecApprovalStore.getState().current?.id).toBe('a1')
    })
  })

  describe('resolveCurrent', () => {
    it('resolves front of queue and advances to next', () => {
      const resolve1 = vi.fn()
      const resolve2 = vi.fn()
      useExecApprovalStore.getState().enqueue(
        { id: 'a1', command: 'ls', executable: 'ls', args: [] },
        resolve1,
      )
      useExecApprovalStore.getState().enqueue(
        { id: 'a2', command: 'pwd', executable: 'pwd', args: [] },
        resolve2,
      )
      useExecApprovalStore.getState().resolveCurrent('approved')
      expect(resolve1).toHaveBeenCalledWith('approved')
      expect(useExecApprovalStore.getState().pending).toHaveLength(1)
      expect(useExecApprovalStore.getState().current?.id).toBe('a2')
    })
  })

  describe('resolveById', () => {
    it('resolves specific approval regardless of position', () => {
      const resolve1 = vi.fn()
      const resolve2 = vi.fn()
      useExecApprovalStore.getState().enqueue(
        { id: 'a1', command: 'ls', executable: 'ls', args: [] },
        resolve1,
      )
      useExecApprovalStore.getState().enqueue(
        { id: 'a2', command: 'pwd', executable: 'pwd', args: [] },
        resolve2,
      )
      useExecApprovalStore.getState().resolveById('a2', 'denied')
      expect(resolve2).toHaveBeenCalledWith('denied')
      expect(useExecApprovalStore.getState().pending).toHaveLength(1)
      expect(useExecApprovalStore.getState().pending[0].id).toBe('a1')
    })
  })

  describe('timeout auto-deny', () => {
    it('auto-denies after DEFAULT_TIMEOUT_MS', () => {
      const resolve = vi.fn()
      useExecApprovalStore.getState().enqueue(
        { id: 'a1', command: 'ls', executable: 'ls', args: [], timeoutMs: DEFAULT_TIMEOUT_MS },
        resolve,
      )
      // Advance past the timeout
      vi.advanceTimersByTime(DEFAULT_TIMEOUT_MS + 1)
      vi.runAllTimers()
      expect(resolve).toHaveBeenCalled()
      // The resolve callback is called with { decision: 'denied', reason: '...' }
      const arg = resolve.mock.calls[0][0]
      expect(arg).toHaveProperty('decision', 'denied')
      expect(useExecApprovalStore.getState().pending).toHaveLength(0)
    })
  })

  describe('clearAll', () => {
    it('clears all timers and resets state', () => {
      const resolve1 = vi.fn()
      const resolve2 = vi.fn()
      useExecApprovalStore.getState().enqueue(
        { id: 'a1', command: 'ls', executable: 'ls', args: [] },
        resolve1,
      )
      useExecApprovalStore.getState().enqueue(
        { id: 'a2', command: 'pwd', executable: 'pwd', args: [] },
        resolve2,
      )
      useExecApprovalStore.getState().clearAll()
      expect(useExecApprovalStore.getState().pending).toHaveLength(0)
      expect(useExecApprovalStore.getState().current).toBeNull()
    })
  })

  describe('hasPending', () => {
    it('returns true when pending approvals exist', () => {
      expect(useExecApprovalStore.getState().hasPending()).toBe(false)
      useExecApprovalStore.getState().enqueue(
        { id: 'a1', command: 'ls', executable: 'ls', args: [] },
        vi.fn(),
      )
      expect(useExecApprovalStore.getState().hasPending()).toBe(true)
    })
  })

  describe('flushResolved', () => {
    it('returns resolved map and clears it', () => {
      const resolve1 = vi.fn()
      useExecApprovalStore.getState().enqueue(
        { id: 'a1', command: 'ls', executable: 'ls', args: [] },
        resolve1,
      )
      useExecApprovalStore.getState().resolveCurrent('approved')
      const flushed = useExecApprovalStore.getState().flushResolved()
      expect(flushed.size).toBe(1)
      expect(useExecApprovalStore.getState().resolved.size).toBe(0)
    })
  })
})

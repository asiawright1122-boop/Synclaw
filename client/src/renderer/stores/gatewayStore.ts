/**
 * gatewayStore.ts — Unified Gateway connection state management.
 *
 * Single source of truth for Gateway connection status throughout the app.
 * Provides both raw store access and a React hook for component consumption.
 */

import { create } from 'zustand'

export type GatewayStatus = 'idle' | 'starting' | 'ready' | 'connected' | 'disconnected' | 'error'

interface GatewayState {
  // Connection status
  status: GatewayStatus
  // Last error message
  lastError: string | null
  // OpenClaw version from gateway.identity.get
  openClawVersion: string | null
  // WebSocket connection URL
  connectionUrl: string | null
  // Is ping verification in progress
  isPinging: boolean
  // Ping result: true=ok, false=failed, null=not run
  pingResult: boolean | null

  // Synchronous actions
  setStatus: (status: GatewayStatus) => void
  setLastError: (error: string | null) => void
  setOpenClawVersion: (version: string | null) => void
  setConnectionUrl: (url: string | null) => void
  setIsPinging: (pinging: boolean) => void
  setPingResult: (result: boolean | null) => void

  // Async actions
  reconnect: () => Promise<void>
  ping: () => Promise<void>
  loadIdentity: () => Promise<void>
}

let statusUnsubscribe: (() => void) | null = null

export const useGatewayStore = create<GatewayState>((set, get) => {
  // Subscribe to window.openclaw status changes (once)
  const ensureStatusSubscription = () => {
    if (statusUnsubscribe) return
    if (typeof window === 'undefined' || !window.openclaw) return

    statusUnsubscribe = window.openclaw.onStatusChange((newStatus: GatewayStatus) => {
      set({ status: newStatus })
    })
  }

  // Subscribe immediately on store creation
  if (typeof window !== 'undefined') {
    setTimeout(ensureStatusSubscription, 0)
  }

  return {
    status: 'disconnected',
    lastError: null,
    openClawVersion: null,
    connectionUrl: null,
    isPinging: false,
    pingResult: null,

    setStatus: (status) => set({ status }),
    setLastError: (lastError) => set({ lastError }),
    setOpenClawVersion: (openClawVersion) => set({ openClawVersion }),
    setConnectionUrl: (connectionUrl) => set({ connectionUrl }),
    setIsPinging: (isPinging) => set({ isPinging }),
    setPingResult: (pingResult) => set({ pingResult }),

    reconnect: async () => {
      set({ lastError: null })
      try {
        await window.openclaw?.reconnect()
      } catch (err) {
        set({ lastError: err instanceof Error ? err.message : String(err) })
      }
    },

    ping: async () => {
      if (!window.openclaw) return
      set({ isPinging: true, pingResult: null, lastError: null })
      try {
        const result = await window.openclaw.gateway.ping()
        if (result.success && result.data) {
          const data = result.data as { ok: boolean; status: string }
          set({ pingResult: data.ok })
          if (!data.ok) {
            set({ lastError: 'Gateway ping failed' })
          }
        } else {
          set({ pingResult: false, lastError: result.error ?? 'Ping failed' })
        }
      } catch (err) {
        set({ pingResult: false, lastError: err instanceof Error ? err.message : String(err) })
      } finally {
        set({ isPinging: false })
      }
    },

    loadIdentity: async () => {
      if (!window.openclaw) return
      try {
        const result = await window.openclaw.gateway.identity()
        if (result.success && result.data) {
          const data = result.data as Record<string, unknown>
          const version = data.version as string | undefined
          if (version) {
            set({ openClawVersion: version })
          }
        }
      } catch {
        // Silently fail - identity is optional info
      }
    },
  }
})

/**
 * EventBusContext — React Context wrapper for the global EventBus.
 *
 * Provides the unified EventBus via `useOpenClaw()` hook.
 */
import { createContext, useContext } from 'react'
import { eventBus, type EventMap } from '../lib/eventBus'

export type EventBusApi = Pick<typeof eventBus, 'on' | 'off' | 'once' | 'emit' | 'clear' | 'clearAll'>

export const EventBusContext = createContext<EventBusApi | null>(null)

/** Direct access to the event bus without React context. */
export { eventBus }

/** Type helper for consumers to get typed event names. */
export type { EventMap }

/**
 * Hook to access the global EventBus.
 * Throws if used outside of EventBusProvider.
 */
export function useOpenClaw(): EventBusApi {
  const ctx = useContext(EventBusContext)
  if (!ctx) {
    throw new Error('useOpenClaw must be used within EventBusProvider')
  }
  return ctx
}

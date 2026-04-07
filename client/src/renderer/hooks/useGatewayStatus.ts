/**
 * useGatewayStatus.ts — React hook for Gateway status subscription.
 *
 * Wraps gatewayStore for component consumption with derived convenience booleans.
 */

import { useEffect } from 'react'
import { useGatewayStore } from '../stores/gatewayStore'

export function useGatewayStatus() {
  const status = useGatewayStore((s) => s.status)
  const lastError = useGatewayStore((s) => s.lastError)
  const openClawVersion = useGatewayStore((s) => s.openClawVersion)
  const connectionUrl = useGatewayStore((s) => s.connectionUrl)
  const isPinging = useGatewayStore((s) => s.isPinging)
  const pingResult = useGatewayStore((s) => s.pingResult)
  const reconnect = useGatewayStore((s) => s.reconnect)
  const ping = useGatewayStore((s) => s.ping)
  const loadIdentity = useGatewayStore((s) => s.loadIdentity)

  // Auto-load identity when connected
  useEffect(() => {
    if (status === 'connected' || status === 'ready') {
      loadIdentity()
    }
  }, [status, loadIdentity])

  // Derived convenience booleans
  const isConnected = status === 'connected' || status === 'ready'
  const isDisconnected = status === 'disconnected' || status === 'error'
  const isConnecting = status === 'starting'

  return {
    status,
    isConnected,
    isDisconnected,
    isConnecting,
    lastError,
    openClawVersion,
    connectionUrl,
    isPinging,
    pingResult,
    reconnect,
    ping,
    loadIdentity,
  }
}

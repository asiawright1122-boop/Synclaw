/**
 * useGatewayStatusToast.ts — Listen to Gateway status changes and show Toast notifications.
 *
 * Shows toast when connection status changes:
 * - Connected/ready: success toast
 * - Disconnected/error: error toast
 */

import { useEffect, useRef } from 'react'
import { useGatewayStore } from '../stores/gatewayStore'
import { useToast } from '../components/Toast'

export function useGatewayStatusToast() {
  const status = useGatewayStore((s) => s.status)
  const lastStatus = useRef<typeof status>(status)
  const toast = useToast()
  const loadIdentity = useGatewayStore((s) => s.loadIdentity)
  const loadConnectionUrl = useGatewayStore((s) => s.loadConnectionUrl)

  useEffect(() => {
    if (lastStatus.current === status) return

    if (status === 'connected' || status === 'ready') {
      toast.success('Gateway 已连接', 2000)
      // Populate store with connection metadata (was defined but never called)
      loadIdentity()
      loadConnectionUrl()
    } else if (status === 'disconnected' || status === 'error') {
      toast.error('Gateway 连接断开', 3000)
    }

    lastStatus.current = status
  }, [status, toast, loadIdentity, loadConnectionUrl])
}

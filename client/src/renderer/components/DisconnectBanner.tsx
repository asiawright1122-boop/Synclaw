/**
 * DisconnectBanner — Gateway disconnection notification banner.
 *
 * Appears at the top of ChatView when Gateway is disconnected.
 * Features slide-down animation, error styling, and reconnect button.
 */
import { motion } from 'framer-motion'
import { WifiOff, RefreshCw } from 'lucide-react'
import { useGatewayStatus } from '../hooks/useGatewayStatus'
import { t } from '../i18n'

export function DisconnectBanner() {
  const { isDisconnected, isConnecting, reconnect, lastError } = useGatewayStatus()

  if (!isDisconnected) return null

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="overflow-hidden"
      style={{
        background: 'rgba(239, 68, 68, 0.12)',
        borderBottom: '1px solid rgba(239, 68, 68, 0.25)',
      }}
    >
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-2.5">
          <WifiOff className="w-4 h-4 flex-shrink-0" style={{ color: '#ef4444' }} />
          <div>
            <span className="text-sm font-medium" style={{ color: '#ef4444' }}>
              {t('gateway.banner.disconnected')}
            </span>
            {lastError && (
              <span className="ml-2 text-xs" style={{ color: 'var(--text-ter)' }}>
                {lastError}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => reconnect()}
          disabled={isConnecting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          style={{
            background: '#ef4444',
            color: 'white',
            opacity: isConnecting ? 0.6 : 1,
          }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isConnecting ? 'animate-spin' : ''}`} />
          {isConnecting ? t('gateway.banner.reconnecting') : t('gateway.banner.reconnect')}
        </button>
      </div>
    </motion.div>
  )
}

/**
 * GatewayPanel.tsx — Gateway 连接状态与控制面板
 */
import { useState, useEffect } from 'react'
import { Card, Row, Spinner } from '../ui'
import { pillBtn } from './shared/pillBtn'
import { Wifi, RefreshCw, WifiOff, ExternalLink, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { useGatewayStatus } from '../../hooks/useGatewayStatus'

function GatewayPanel() {
  const {
    status,
    isConnected,
    isDisconnected,
    isConnecting,
    openClawVersion,
    connectionUrl,
    reconnect,
  } = useGatewayStatus()

  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [health, setHealth] = useState<Record<string, unknown> | null>(null)

  const loadGateway = async () => {
    setLoading(true)
    try {
      const healthRes = await Promise.allSettled([
        window.openclaw?.gateway.health(),
      ])

      if (healthRes?.[0]?.status === 'fulfilled' && healthRes[0]?.value?.success) {
        setHealth(healthRes[0].value.data as typeof health)
      }
    } catch {
      // keep empty
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadGateway()
    // subscription is handled by useGatewayStatus hook
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleConnect = async () => {
    setActionLoading('connect')
    try {
      await window.openclaw?.connect()
      await loadGateway()
    } finally {
      setActionLoading(null)
    }
  }

  const handleDisconnect = async () => {
    setActionLoading('disconnect')
    try {
      await window.openclaw?.disconnect()
      await loadGateway()
    } finally {
      setActionLoading(null)
    }
  }

  const handleReconnect = async () => {
    setActionLoading('reconnect')
    try {
      await reconnect()
      await loadGateway()
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="pb-10">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
            Gateway 状态
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-sec)' }}>
            管理 OpenClaw Gateway 连接与健康状态。
          </p>
        </div>
        <button
          type="button"
          onClick={loadGateway}
          className={pillBtn(false)}
          style={{ borderColor: 'var(--border)', color: 'var(--text-sec)' }}
          disabled={loading}
        >
          {loading ? <Spinner size={14} /> : '刷新'}
        </button>
      </div>

      {/* Status */}
      <Card className="mb-4">
        <Row label="连接状态" border={false}>
          <div className="flex items-center gap-2">
            {isConnected && (
              <>
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: 'var(--success)' }}
                />
                <CheckCircle className="w-3.5 h-3.5" style={{ color: 'var(--success)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--success)' }}>
                  已连接
                </span>
              </>
            )}
            {isDisconnected && (
              <>
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: 'var(--danger)' }}
                />
                <XCircle className="w-3.5 h-3.5" style={{ color: 'var(--danger)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--danger)' }}>
                  已断开
                </span>
              </>
            )}
            {isConnecting && (
              <>
                <span
                  className="w-2.5 h-2.5 rounded-full animate-pulse"
                  style={{ background: '#eab308' }}
                />
                <AlertCircle className="w-3.5 h-3.5" style={{ color: '#eab308' }} />
                <span className="text-sm font-medium" style={{ color: '#eab308' }}>
                  连接中
                </span>
              </>
            )}
            <span className="text-xs" style={{ color: 'var(--text-ter)' }}>
              ({status})
            </span>
          </div>
        </Row>

        {/* OpenClaw version */}
        {openClawVersion && (
          <Row label="OpenClaw 版本" border={false}>
            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              {openClawVersion}
            </span>
          </Row>
        )}

        {/* Connection address */}
        {connectionUrl && (
          <Row label="连接地址" border={false}>
            <span className="text-xs font-mono" style={{ color: 'var(--text-sec)' }}>
              {connectionUrl}
            </span>
          </Row>
        )}
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mb-6">
        {!isConnected ? (
          <button
            type="button"
            onClick={handleConnect}
            disabled={actionLoading !== null}
            className={`${pillBtn(true)} flex items-center gap-1.5`}
            style={{ background: 'var(--accent1)' }}
          >
            {actionLoading === 'connect' && <Spinner size={14} />}
            <Wifi className="w-3.5 h-3.5" />
            连接
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={handleReconnect}
              disabled={actionLoading !== null}
              className={`${pillBtn(false)} flex items-center gap-1.5`}
              style={{ borderColor: 'var(--border)', color: 'var(--text-sec)' }}
            >
              {actionLoading === 'reconnect' && <Spinner size={14} />}
              <RefreshCw className="w-3.5 h-3.5" />
              重连
            </button>
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={actionLoading !== null}
              className={`${pillBtn(false)} flex items-center gap-1.5`}
              style={{ borderColor: 'var(--border)', color: 'var(--text-sec)' }}
            >
              {actionLoading === 'disconnect' && <Spinner size={14} />}
              <WifiOff className="w-3.5 h-3.5" />
              断开
            </button>
            <button
              type="button"
              onClick={() => window.electronAPI?.shell.openExternal('http://localhost:18789/openclaw')}
              className={`${pillBtn(false)} flex items-center gap-1.5`}
              style={{ borderColor: 'var(--accent1)', color: 'var(--accent1)' }}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              控制面板
            </button>
          </>
        )}
      </div>

      {/* Health */}
      {health && (
        <Card className="mb-4">
          <div className="px-5 py-4">
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
              健康检查
            </p>
            <div className="space-y-2 text-xs" style={{ color: 'var(--text-sec)' }}>
              {Object.entries(health).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <span>{k}</span>
                  <span className="font-medium" style={{ color: 'var(--text)' }}>
                    {String(v)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

export { GatewayPanel }

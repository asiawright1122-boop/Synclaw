/**
 * AboutPanel.tsx — 关于面板
 */
import { useState, useEffect } from 'react'
import { Card } from '../ui'
import { RefreshCw } from 'lucide-react'

function AboutPanel() {
  const [appVersion, setAppVersion] = useState<string>('加载中…')
  const [gatewayInfo, setGatewayInfo] = useState<Record<string, unknown> | null>(null)
  const [gatewayLoading, setGatewayLoading] = useState(true)

  useEffect(() => {
    if (window.electronAPI?.app) {
      window.electronAPI.app.getVersion().then(v => setAppVersion(v)).catch(() => setAppVersion('未知'))
    }
    window.openclaw?.gateway.identity().then(res => {
      setGatewayLoading(false)
      if (res?.success && res.data) {
        setGatewayInfo(res.data as typeof gatewayInfo)
      }
    }).catch(() => {
      setGatewayLoading(false)
    })
  }, [])

  return (
    <div className="pb-10 flex flex-col items-center text-center max-w-md mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold"
          style={{ background: '#111' }}
        >
          S
        </div>
        <div className="text-left">
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
            SynClaw
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-sec)' }}>
            版本 {appVersion}
          </p>
        </div>
      </div>

      {gatewayLoading ? (
        <Card className="w-full mb-4">
          <div className="px-5 py-4 text-left">
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
              OpenClaw Gateway
            </p>
            <p className="text-xs" style={{ color: 'var(--text-sec)' }}>加载中…</p>
          </div>
        </Card>
      ) : gatewayInfo ? (
        <Card className="w-full mb-4">
          <div className="px-5 py-4 text-left">
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
              OpenClaw Gateway
            </p>
            <div className="space-y-2 text-xs" style={{ color: 'var(--text-sec)' }}>
              {Object.entries(gatewayInfo).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <span>{k}</span>
                  <span className="font-medium break-all" style={{ color: 'var(--text)' }}>
                    {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      ) : (
        <Card className="w-full mb-4">
          <div className="px-5 py-4 text-left">
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>
              OpenClaw Gateway
            </p>
            <p className="text-xs" style={{ color: 'var(--text-sec)' }}>
              Gateway 未连接，无法获取信息
            </p>
          </div>
        </Card>
      )}

      <Card className="w-full">
        <div className="px-5 py-4 flex items-center justify-between gap-4">
          <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            检查更新
          </span>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white"
            style={{ background: 'var(--accent1)' }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            检查更新
          </button>
        </div>
      </Card>

      <p className="text-xs mt-12" style={{ color: 'var(--text-ter)' }}>
        © 2026 SynClaw · 本地 Agent 客户端
      </p>
    </div>
  )
}

export { AboutPanel }

/**
 * AboutPanel.tsx — 关于面板
 */
import { useState, useEffect } from 'react'
import { Card } from '../ui'
import { RefreshCw, Shield, AlertTriangle, Info } from 'lucide-react'

type SigningStatus = 'signed' | 'unsigned' | 'not_macos' | 'unknown'

function AboutPanel() {
  const [appVersion, setAppVersion] = useState<string>('加载中…')
  const [gatewayInfo, setGatewayInfo] = useState<Record<string, unknown> | null>(null)
  const [gatewayLoading, setGatewayLoading] = useState(true)
  const [signingStatus, setSigningStatus] = useState<{ status: SigningStatus; teamId?: string } | null>(null)
  const [signingLoading, setSigningLoading] = useState(true)

  useEffect(() => {
    if (window.electronAPI?.app) {
      window.electronAPI.app.getVersion().then(v => setAppVersion(v)).catch(() => setAppVersion('未知'))
    }
    window.openclaw?.gateway.identity().then(res => {
      setGatewayLoading(false)
      if (res?.success && res.data) {
        setGatewayInfo(res.data as Record<string, unknown>)
      }
    }).catch(() => {
      setGatewayLoading(false)
    })
  }, [])

  useEffect(() => {
    window.electronAPI?.app.getSigningStatus().then(res => {
      setSigningLoading(false)
      if (res && 'success' in res && res.success && 'data' in res && res.data) {
        setSigningStatus(res.data as { status: SigningStatus; teamId?: string })
      }
    }).catch(() => {
      setSigningLoading(false)
    })
  }, [])

  const openSigningGuide = () => {
    window.electronAPI?.shell.openExternal(
      'https://github.com/synclaw/synclaw#macos-分发与公证签名'
    ).catch(() => {})
  }

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

      {/* macOS 签名状态 */}
      {!signingLoading && signingStatus && signingStatus.status !== 'unknown' && (
        <Card className="w-full mb-4">
          <div className="px-5 py-4 text-left">
            <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>
              macOS 签名状态
            </p>
            {signingStatus.status === 'signed' && (
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(34,197,94,0.1)' }}
                >
                  <Shield className="w-4 h-4" style={{ color: '#22c55e' }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium" style={{ color: '#22c55e' }}>已签名</span>
                    {signingStatus.teamId && (
                      <span className="text-xs" style={{ color: 'var(--text-sec)' }}>Team: {signingStatus.teamId}</span>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-sec)' }}>已签名 · 公证在 CI 构建时完成（需配置 Apple ID）</p>
                </div>
              </div>
            )}
            {signingStatus.status === 'unsigned' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(234,179,8,0.1)' }}
                  >
                    <AlertTriangle className="w-4 h-4" style={{ color: '#eab308' }} />
                  </div>
                  <div>
                    <span className="text-xs font-medium" style={{ color: '#eab308' }}>未签名</span>
                    <p className="text-xs" style={{ color: 'var(--text-sec)' }}>用户运行时会看到"来自不明开发者"警告</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={openSigningGuide}
                  className="w-full mt-1 px-3 py-2 rounded-lg text-xs font-medium transition-opacity hover:opacity-90"
                  style={{ background: 'rgba(234,179,8,0.1)', color: '#eab308', border: '1px solid rgba(234,179,8,0.3)' }}
                >
                  查看签名配置指南 →
                </button>
              </div>
            )}
            {signingStatus.status === 'not_macos' && (
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4" style={{ color: 'var(--text-ter)' }} />
                <p className="text-xs" style={{ color: 'var(--text-ter)' }}>
                  签名状态检测仅在 macOS 上可用
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

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

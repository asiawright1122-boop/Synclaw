/**
 * Web 登录面板 - 用于扫码登录（OAuth/QR Code）
 * 支持飞书、企业微信等渠道的网页授权登录
 */
import { useEffect, useState } from 'react'
import { useToastStore } from './Toast'
import { QrCode, RefreshCw, CheckCircle, XCircle, Loader2 } from 'lucide-react'

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border backdrop-blur-sm ${className}`} style={{ borderColor: 'var(--border)', background: 'var(--bg-container)' }}>
      {children}
    </div>
  )
}

export interface WebLoginResult {
  connected: boolean
  accountId?: string
  userInfo?: {
    name?: string
    avatar?: string
  }
}

export function WebLoginPanel({ channel, onSuccess, onClose }: {
  channel: string
  onSuccess?: (result: WebLoginResult) => void
  onClose?: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'waiting' | 'success' | 'error'>('idle')
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const addToast = useToastStore(s => s.addToast)

  const channelLabels: Record<string, string> = {
    feishu: '飞书',
    wecom: '企业微信',
    dingtalk: '钉钉',
    slack: 'Slack',
    discord: 'Discord',
  }

  const startLogin = async () => {
    setLoading(true)
    setError(null)
    setStatus('idle')

    try {
      // 启动 Web 登录，获取二维码
      const startRes = await window.openclaw?.webLogin.start({
        force: false,
        accountId: undefined,
      })

      if (!startRes?.success) {
        setError(startRes?.error || '启动登录失败')
        setStatus('error')
        setLoading(false)
        return
      }

      const data = startRes.data as Record<string, unknown>
      // 部分渠道会直接返回二维码 URL
      if (data.qrCodeUrl) {
        setQrCodeUrl(data.qrCodeUrl as string)
      }

      setStatus('waiting')
      setLoading(false)

      // 开始轮询等待登录完成
      pollLogin()
    } catch (err) {
      setError(String(err))
      setStatus('error')
      setLoading(false)
    }
  }

  const pollLogin = async () => {
    try {
      const waitRes = await window.openclaw?.webLogin.wait({
        timeoutMs: 120000, // 2分钟超时
      })

      if (waitRes?.success) {
        const data = waitRes.data as Record<string, unknown>
        if (data.connected) {
          setStatus('success')
          addToast({ type: 'success', message: `${channelLabels[channel] || channel} 登录成功`, duration: 3000 })
          onSuccess?.({
            connected: true,
            accountId: data.accountId as string | undefined,
            userInfo: data.userInfo as WebLoginResult['userInfo'],
          })
        } else {
          // 未连接，可能超时或取消
          setStatus('idle')
        }
      } else {
        setError(waitRes?.error || '登录超时')
        setStatus('error')
      }
    } catch (err) {
      setError(String(err))
      setStatus('error')
    }
  }

  useEffect(() => {
    // 组件挂载时自动开始登录
    startLogin()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Card className="w-full max-w-sm mx-auto">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent1, #fc5d1e)' }}>
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                {channelLabels[channel] || channel} 登录
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-sec)' }}>
                扫描二维码登录
              </p>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-black/[0.04] transition-colors"
              style={{ color: 'var(--text-ter)' }}
            >
              ✕
            </button>
          )}
        </div>

        {/* QR Code Area */}
        <div className="flex flex-col items-center justify-center py-8">
          {status === 'idle' && !qrCodeUrl && (
            <>
              <div className="w-48 h-48 rounded-xl flex items-center justify-center mb-4" style={{ background: 'var(--bg-subtle)' }}>
                <QrCode className="w-20 h-20" style={{ color: 'var(--text-ter)' }} />
              </div>
              <p className="text-xs" style={{ color: 'var(--text-sec)' }}>
                点击下方按钮获取登录二维码
              </p>
            </>
          )}

          {loading && (
            <>
              <div className="w-48 h-48 rounded-xl flex items-center justify-center mb-4" style={{ background: 'var(--bg-subtle)' }}>
                <Loader2 className="w-16 h-16 animate-spin" style={{ color: 'var(--accent1, #fc5d1e)' }} />
              </div>
              <p className="text-xs" style={{ color: 'var(--text-sec)' }}>
                正在生成二维码...
              </p>
            </>
          )}

          {status === 'waiting' && (
            <>
              {qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt="登录二维码"
                  className="w-48 h-48 rounded-xl mb-4"
                />
              ) : (
                <div className="w-48 h-48 rounded-xl flex items-center justify-center mb-4" style={{ background: 'var(--bg-subtle)' }}>
                  <QrCode className="w-20 h-20" style={{ color: 'var(--text-ter)' }} />
                </div>
              )}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--success, #2f9d5e)' }} />
                <p className="text-xs" style={{ color: 'var(--success, #2f9d5e)' }}>
                  请使用 {channelLabels[channel] || channel} App 扫码
                </p>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-ter)' }}>
                二维码有效期 5 分钟
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-48 h-48 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(47,158,94,0.1)' }}>
                <CheckCircle className="w-20 h-20" style={{ color: 'var(--success, #2f9d5e)' }} />
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--success, #2f9d5e)' }}>
                登录成功
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-48 h-48 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(231,76,60,0.1)' }}>
                <XCircle className="w-20 h-20" style={{ color: 'var(--danger, #e74c3c)' }} />
              </div>
              <p className="text-sm" style={{ color: 'var(--danger, #e74c3c)' }}>
                {error || '登录失败'}
              </p>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {status === 'idle' && !qrCodeUrl && (
            <button
              type="button"
              onClick={startLogin}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ background: 'var(--accent1, #fc5d1e)' }}
            >
              获取二维码
            </button>
          )}

          {(status === 'waiting' || status === 'error') && (
            <button
              type="button"
              onClick={startLogin}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              style={{ background: 'var(--bg-subtle)', color: 'var(--text)' }}
            >
              <RefreshCw className="w-4 h-4" />
              刷新二维码
            </button>
          )}

          {status === 'success' && (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ background: 'var(--success, #2f9d5e)' }}
            >
              完成
            </button>
          )}
        </div>

        {/* Help Text */}
        <p className="text-xs text-center mt-4" style={{ color: 'var(--text-ter)' }}>
          登录即表示同意 SynClaw 服务条款
        </p>
      </div>
    </Card>
  )
}

/**
 * SecurityPanel.tsx — 安全性面板
 *
 * 负责：
 * - 显示 electron-store 加密状态（未加密警告 / 已加密）
 * - 生成加密密钥并提供操作指引
 * - 配置 WEB_API_BASE（环境变量优先，支持 UI 配置）
 */
import { useState, useEffect, useCallback } from 'react'
import { Card } from '../ui'
import { Shield, Lock, AlertTriangle, CheckCircle2, Copy, Check, ExternalLink } from 'lucide-react'

interface SecurityStatus {
  encryptionEnabled: boolean
  encryptionKeySetAt: string | null
  webApiBaseConfigured: boolean
  webApiBase: string
  webApiBaseFromEnv: boolean
}

interface GenerateKeyResult {
  key: string
  setAt: string
  instructions: string
}

function SecurityPanel() {
  const [status, setStatus] = useState<SecurityStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [keyResult, setKeyResult] = useState<GenerateKeyResult | null>(null)
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [webApiInput, setWebApiInput] = useState('')
  const [webApiSaving, setWebApiSaving] = useState(false)
  const [webApiSaved, setWebApiSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  const loadStatus = useCallback(async () => {
    try {
      const res = await window.electronAPI?.security.getStatus()
      if (res && 'success' in res && res.success && 'data' in res && res.data) {
        const data = res.data as SecurityStatus
        setStatus(data)
        setWebApiInput(data.webApiBase)
      }
    } catch {
      // non-fatal
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  const handleGenerateKey = async () => {
    setGenerating(true)
    try {
      const res = await window.electronAPI?.security.generateKey()
      if (res && 'success' in res && res.success && 'data' in res && res.data) {
        setKeyResult(res.data as GenerateKeyResult)
        setShowKeyModal(true)
        await loadStatus()
      }
    } catch {
      // non-fatal
    } finally {
      setGenerating(false)
    }
  }

  const handleSaveWebApiBase = async () => {
    setWebApiSaving(true)
    try {
      const res = await window.electronAPI?.security.setWebApiBase(webApiInput.trim())
      if (res?.success) {
        setWebApiSaved(true)
        setTimeout(() => setWebApiSaved(false), 2000)
        await loadStatus()
      }
    } catch {
      // non-fatal
    } finally {
      setWebApiSaving(false)
    }
  }

  const handleCopyKey = async () => {
    if (!keyResult?.key) return
    try {
      await navigator.clipboard.writeText(keyResult.key)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard not available
    }
  }

  const handleCloseKeyModal = () => {
    setShowKeyModal(false)
    setKeyResult(null)
    setCopied(false)
  }

  if (loading) {
    return (
      <div className="pb-10">
        <div className="h-4 w-32 rounded animate-pulse mb-4" style={{ background: 'var(--border)' }} />
        <div className="h-24 rounded-xl animate-pulse" style={{ background: 'var(--border)' }} />
      </div>
    )
  }

  const encEnabled = status?.encryptionEnabled ?? false
  const webConfigured = status?.webApiBaseConfigured ?? false
  const webFromEnv = status?.webApiBaseFromEnv ?? false

  return (
    <div className="pb-10">
      <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
        安全性
      </h1>
      <p className="text-sm mt-1 mb-6" style={{ color: 'var(--text-sec)' }}>
        管理数据加密和 API 配置
      </p>

      {/* ── Section A: 数据加密 ── */}
      <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
        数据加密
      </h2>
      <Card>
        <div className="px-4 py-4">
          {encEnabled ? (
            /* ── Encrypted state ── */
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'rgba(34,197,94,0.1)' }}
              >
                <CheckCircle2 className="w-5 h-5" style={{ color: '#22c55e' }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                  已启用加密存储
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-sec)' }}>
                  API Key、授权目录等敏感数据已加密存储。
                  {status?.encryptionKeySetAt && (
                    <> 启用于 {new Date(status.encryptionKeySetAt).toLocaleDateString('zh-CN')}</>
                  )}
                </p>
              </div>
            </div>
          ) : (
            /* ── Unencrypted warning ── */
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'rgba(234,179,8,0.1)' }}
              >
                <AlertTriangle className="w-5 h-5" style={{ color: '#eab308' }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>
                  数据未加密
                </p>
                <p className="text-xs" style={{ color: 'var(--text-sec)' }}>
                  API Key、授权目录、Session Token 等敏感数据以明文存储在本机。
                  启用加密后，这些数据将使用 AES-256 加密保护。
                </p>
                <button
                  type="button"
                  className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                  style={{ background: '#eab308' }}
                  onClick={handleGenerateKey}
                  disabled={generating}
                >
                  {generating ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full animate-spin" style={{ border: '1.5px solid rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
                      生成中…
                    </>
                  ) : (
                    <>
                      <Shield className="w-3.5 h-3.5" />
                      启用加密存储
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ── Section B: Web API 配置 ── */}
      <h2 className="text-sm font-semibold mb-3 mt-6" style={{ color: 'var(--text)' }}>
        Web API 配置
      </h2>
      <Card>
        <div className="px-4 py-4 space-y-4">
          <div>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
              WEB_API_BASE
            </p>
            <p className="text-xs mb-3" style={{ color: 'var(--text-sec)' }}>
              用于 SynClaw 云端同步功能。若未配置，同步功能将跳过。
            </p>
            <div className="flex gap-2">
              <input
                type="url"
                value={webApiInput}
                onChange={(e) => {
                  setWebApiInput(e.target.value)
                  setWebApiSaved(false)
                }}
                placeholder="https://api.yoursite.com/api"
                disabled={webFromEnv}
                className="flex-1 px-3 py-2 rounded-lg text-sm border outline-none transition-colors"
                style={{
                  background: 'var(--bg-subtle)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)',
                  opacity: webFromEnv ? 0.6 : 1,
                }}
              />
              {webFromEnv ? (
                <span
                  className="px-3 py-2 rounded-lg text-xs font-medium"
                  style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}
                >
                  环境变量
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleSaveWebApiBase}
                  disabled={webApiSaving || !webApiInput.trim()}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity"
                  style={{
                    background: webApiSaved ? '#22c55e' : 'var(--accent1)',
                    opacity: webApiSaving || !webApiInput.trim() ? 0.5 : 1,
                  }}
                >
                  {webApiSaved ? '已保存' : webApiSaving ? '保存中…' : '保存'}
                </button>
              )}
            </div>
            {webConfigured && !webFromEnv && (
              <p className="text-xs mt-1.5" style={{ color: '#22c55e' }}>
                已配置：{status?.webApiBase}
              </p>
            )}
            {webConfigured && webFromEnv && (
              <p className="text-xs mt-1.5" style={{ color: 'var(--text-ter)' }}>
                当前值：{status?.webApiBase}（来自环境变量）
              </p>
            )}
          </div>

          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
            style={{ background: 'var(--bg-subtle)', color: 'var(--text-sec)' }}
          >
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>WEB_API_BASE 支持环境变量设置（优先）或此处手动配置</span>
          </div>
        </div>
      </Card>

      {/* ── Section C: 安全建议 ── */}
      <h2 className="text-sm font-semibold mb-3 mt-6" style={{ color: 'var(--text)' }}>
        安全建议
      </h2>
      <Card>
        <div className="px-4 py-4 space-y-3">
          {[
            { tip: '启用数据加密', desc: '为存储的敏感数据启用 AES-256 加密保护' },
            { tip: '定期备份授权目录', desc: '避免在系统重装后丢失授权目录配置' },
            { tip: '保护 API Key', desc: 'API Key 仅存储在本机，不要分享给他人' },
          ].map(({ tip, desc }) => (
            <div key={tip} className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#22c55e' }} />
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--text)' }}>{tip}</p>
                <p className="text-xs" style={{ color: 'var(--text-sec)' }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Key Generation Modal ── */}
      {showKeyModal && keyResult && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.48)' }}
          role="dialog"
          aria-modal="true"
          aria-label="加密密钥"
          onMouseDown={(e) => { if (e.target === e.currentTarget) handleCloseKeyModal() }}
        >
          <div
            className="w-full max-w-md rounded-2xl overflow-hidden border shadow-2xl"
            style={{ background: 'var(--bg-container)', borderColor: 'var(--border)' }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" style={{ color: '#eab308' }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>启用加密存储</span>
              </div>
              <button
                type="button"
                onClick={handleCloseKeyModal}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-black/5"
                style={{ color: 'var(--text-sec)' }}
              >
                ✕
              </button>
            </div>
            {/* Body */}
            <div className="px-5 py-4 space-y-4">
              <div
                className="flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs"
                style={{ background: 'rgba(234,179,8,0.08)', color: 'var(--text-sec)' }}
              >
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#eab308' }} />
                <span>重启应用后加密生效。请妥善保存密钥，丢失将无法恢复加密数据。</span>
              </div>

              <div>
                <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-sec)' }}>加密密钥（32位 HEX）</p>
                <div className="flex items-center gap-2">
                  <code
                    className="flex-1 px-3 py-2 rounded-lg text-sm font-mono break-all"
                    style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  >
                    {keyResult.key}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyKey}
                    className="p-2 rounded-lg border transition-colors shrink-0"
                    style={{ borderColor: 'var(--border)', color: copied ? '#22c55e' : 'var(--text-sec)' }}
                    title="复制密钥"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-sec)' }}>操作步骤</p>
                <div className="space-y-1.5">
                  {keyResult.instructions.split('\n').filter(Boolean).map((line, i) => (
                    <p key={i} className="text-xs" style={{ color: 'var(--text-sec)' }}>{line}</p>
                  ))}
                </div>
              </div>
            </div>
            {/* Footer */}
            <div className="flex justify-end gap-2 px-5 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
              <button
                type="button"
                onClick={handleCloseKeyModal}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: 'var(--bg-subtle)', color: 'var(--text)' }}
              >
                关闭
              </button>
              <a
                href="https://github.com/sindresorhus/envsub"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{ background: 'var(--accent1)' }}
              >
                查看文档
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export { SecurityPanel }

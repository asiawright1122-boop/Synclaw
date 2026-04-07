/**
 * IM 频道面板 - 管理飞书、企业微信、Slack、Discord、Telegram 等 IM 渠道连接
 */
import { useEffect, useState } from 'react'
import { useToastStore } from './Toast'

function pillBtn(primary?: boolean) {
  return `px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
    primary
      ? 'text-white'
      : 'bg-transparent'
  }`
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border backdrop-blur-sm ${className}`} style={{ borderColor: 'var(--border)', background: 'var(--bg-container)' }}>
      {children}
    </div>
  )
}

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg
      className="animate-spin"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ animationDuration: '0.6s' }}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="32"
        strokeDashoffset="12"
        opacity={0.3}
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}

export interface IMChannel {
  id?: string
  platform?: string
  channel?: string
  name?: string
  enabled?: boolean
  status?: string
  description?: string
  accountId?: string
}

export function ImPanel() {
  const [loading, setLoading] = useState(false)
  const [channels, setChannels] = useState<IMChannel[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [addingType, setAddingType] = useState<string>('feishu')
  const [formToken, setFormToken] = useState('')
  const [formWebhookUrl, setFormWebhookUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null)
  const addToast = useToastStore(s => s.addToast)

  const platformMeta: Record<string, { label: string; desc: string; color: string; icon: string }> = {
    feishu: { label: '飞书', desc: '连接飞书群机器人，通过 Webhook 接收和回复消息', color: '#3370ff', icon: '📮' },
    wecom: { label: '企业微信', desc: '连接企业微信应用，通过 Webhook 收发消息', color: '#07c160', icon: '💬' },
    slack: { label: 'Slack', desc: '通过 Slack Bot API 连接工作区频道', color: '#4a154b', icon: '🔵' },
    discord: { label: 'Discord', desc: '通过 Discord Bot 连接服务器频道', color: '#5865f2', icon: '🎮' },
    telegram: { label: 'Telegram', desc: '通过 Bot API 连接 Telegram Bot', color: '#0088cc', icon: '✈️' },
  }

  const loadChannels = async () => {
    setLoading(true)
    try {
      const res = await window.openclaw?.channels.status()
      if (res?.success) {
        const data = res.data
        if (Array.isArray(data)) {
          setChannels(data as IMChannel[])
        } else if (data && typeof data === 'object' && 'channels' in (data as Record<string, unknown>)) {
          setChannels(((data as Record<string, unknown>).channels as IMChannel[]) ?? [])
        } else {
          setChannels([])
        }
      } else {
        setChannels([])
      }
    } catch {
      setChannels([])
    } finally {
      setLoading(false)
    }
  }

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const patch: Record<string, unknown> = { channels: {} }
      const chConfig: Record<string, unknown> = { enabled: true }

      if (addingType === 'feishu' || addingType === 'wecom') {
        Object.assign(chConfig, { type: 'webhook', webhookUrl: formWebhookUrl.trim() })
      } else {
        Object.assign(chConfig, { type: 'bot', botToken: formToken.trim() })
      }

      (patch.channels as Record<string, unknown>)[addingType] = chConfig

      const res = await window.openclaw?.config.patch(patch)
      if (res?.success) {
        await window.openclaw?.config.apply()
        setFormToken('')
        setFormWebhookUrl('')
        setShowAddForm(false)
        addToast({ type: 'success', message: `${platformMeta[addingType]?.label} 配置成功`, duration: 2000 })
        loadChannels()
      } else {
        addToast({ type: 'error', message: '配置失败', duration: 3000 })
      }
    } catch {
      addToast({ type: 'error', message: '配置失败', duration: 3000 })
    } finally {
      setSaving(false)
    }
  }

  const handleDisconnect = async (ch: IMChannel) => {
    const id = ch.id || ch.channel || ch.platform || ''
    if (!id) return
    setDisconnectingId(id)
    try {
      const res = await window.openclaw?.channels.disconnect({ channel: id, accountId: ch.accountId })
      if (res?.success) {
        setChannels(prev => prev.filter(c => (c.id || c.channel || c.platform || '') !== id))
        addToast({ type: 'success', message: '已断开连接', duration: 2000 })
      } else {
        addToast({ type: 'error', message: '断开失败', duration: 3000 })
      }
    } catch {
      addToast({ type: 'error', message: '断开失败', duration: 3000 })
    } finally {
      setDisconnectingId(null)
    }
  }

  useEffect(() => {
    loadChannels()
  }, [])

  const getMeta = (platform?: string) => platformMeta[platform || ''] || { label: platform || '未知', desc: '', color: '#999', icon: '📡' }

  return (
    <div className="pb-10">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>IM 频道</h1>
          <p className="text-sm mt-1 max-w-xl" style={{ color: 'var(--text-sec)' }}>
            通过 IM 渠道与 SynClaw 交互。在 IM 中发送消息，Agent 自动处理并回复。
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button type="button" className={pillBtn(false)} style={{ borderColor: 'var(--border)', color: 'var(--text-sec)' }} onClick={loadChannels} disabled={loading}>
            {loading ? <Spinner size={14} /> : '刷新'}
          </button>
          <button type="button" className={pillBtn(true)} style={{ background: 'var(--accent1)' }} onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? '取消' : '添加频道'}
          </button>
        </div>
      </div>

      {showAddForm && (
        <Card className="mb-6">
          <div className="px-5 py-4">
            <p className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>添加 IM 频道</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {Object.entries(platformMeta).map(([key, meta]) => (
                <button key={key} type="button" onClick={() => setAddingType(key)} className="text-left px-4 py-3 rounded-[10px] border transition-all"
                  style={{
                    borderColor: addingType === key ? meta.color : 'var(--border)',
                    background: addingType === key ? `${meta.color}10` : 'var(--bg-subtle)',
                  }}
                  title={meta.desc}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{meta.icon}</span>
                    <span className="text-sm font-semibold" style={{ color: addingType === key ? meta.color : 'var(--text)' }}>{meta.label}</span>
                    {addingType === key && <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: meta.color, color: '#fff' }}>已选择</span>}
                  </div>
                </button>
              ))}
            </div>

            {(addingType === 'feishu' || addingType === 'wecom') && (
              <form onSubmit={handleAddChannel} className="space-y-3">
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-sec)' }}>Webhook URL</label>
                  <input type="url" value={formWebhookUrl} onChange={e => setFormWebhookUrl(e.target.value)}
                    placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/xxx" required
                    className="w-full text-sm px-3 py-2 rounded-lg border"
                    style={{ borderColor: 'var(--border)', color: 'var(--text)', background: 'var(--bg-container)' }} />
                  <p className="text-xs mt-1" style={{ color: 'var(--text-ter)' }}>在飞书/企业微信群设置中获取自定义机器人 Webhook 地址</p>
                </div>
                <button type="submit" disabled={saving} className={pillBtn(true)} style={{ background: 'var(--accent1)', opacity: saving ? 0.5 : 1 }}>
                  {saving ? <Spinner size={14} /> : '确认添加'}
                </button>
              </form>
            )}

            {(addingType === 'telegram' || addingType === 'slack' || addingType === 'discord') && (
              <form onSubmit={handleAddChannel} className="space-y-3">
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-sec)' }}>Bot Token</label>
                  <input type="password" value={formToken} onChange={e => setFormToken(e.target.value)}
                    placeholder={addingType === 'slack' ? 'xoxb-...' : 'MTIz...'} required
                    className="w-full text-sm px-3 py-2 rounded-lg border"
                    style={{ borderColor: 'var(--border)', color: 'var(--text)', background: 'var(--bg-container)' }} />
                  <p className="text-xs mt-1" style={{ color: 'var(--text-ter)' }}>
                    {addingType === 'telegram' ? '从 @BotFather 获取 Bot Token' :
                     addingType === 'slack' ? '在 Slack App 设置中获取 Bot User OAuth Token' :
                     '在 Discord Developer Portal 获取 Bot Token'}
                  </p>
                </div>
                <button type="submit" disabled={saving} className={pillBtn(true)} style={{ background: 'var(--accent1)', opacity: saving ? 0.5 : 1 }}>
                  {saving ? <Spinner size={14} /> : '确认添加'}
                </button>
              </form>
            )}
          </div>
        </Card>
      )}

      {channels.length > 0 && (
        <div className="rounded-[10px] border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          {channels.map((ch, idx) => {
            const id = ch.id || ch.channel || ch.platform || ''
            const meta = getMeta(ch.platform || ch.channel)
            return (
              <div
                key={id}
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: idx < channels.length - 1 ? '1px solid var(--border)' : undefined }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
                  style={{ background: `${meta.color}15` }}>{meta.icon}</div>
                <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{ch.name || meta.label}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: `${meta.color}15`, color: meta.color }}>{meta.label}</span>
                  {ch.enabled !== undefined && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                      style={{ background: ch.enabled ? 'rgba(47,158,91,0.15)' : 'rgba(0,0,0,0.06)', color: ch.enabled ? 'var(--success)' : 'var(--text-ter)' }}>
                      {ch.enabled ? '已启用' : '已禁用'}
                    </span>
                  )}
                  {ch.status && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
                      {ch.status}
                    </span>
                  )}
                </div>
                <button type="button" className={`${pillBtn(false)} text-xs shrink-0`}
                  style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
                  onClick={() => handleDisconnect(ch)} disabled={disconnectingId === id}>
                  {disconnectingId === id ? <Spinner size={12} /> : '断开'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {channels.length === 0 && !loading && (
        <div className="rounded-[12px] border py-16 px-6 text-center" style={{ borderColor: 'var(--border)' }}>
          <button type="button" className={pillBtn(true)} style={{ background: 'var(--accent1)' }}
            onClick={() => setShowAddForm(true)}>
            添加第一个频道
          </button>
          <p className="text-sm font-medium mt-4" style={{ color: 'var(--text)' }}>连接 IM 渠道</p>
          <p className="text-xs mt-2 max-w-sm mx-auto" style={{ color: 'var(--text-ter)' }}>
            连接飞书、企业微信、Slack 或 Discord，随时随地与 SynClaw 对话
          </p>
        </div>
      )}
    </div>
  )
}

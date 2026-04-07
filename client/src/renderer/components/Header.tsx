/**
 * 顶部标题栏：与系统红黄绿同一行（macOS hiddenInset）
 * 布局：[红黄绿留白] [收起][+] | [标题] [积分|文件|Agent]
 */
import { useEffect, useRef, useState } from 'react'
import { ShoppingCart, FolderOpen, Bot, PanelLeftClose, PanelLeft, Plus, ChevronDown, Settings, MessageSquare, Clock, Loader2 } from 'lucide-react'
import { useAppStore, type AvatarItem } from '../stores/appStore'
import { t } from '../i18n'

const SIDEBAR_WIDTH = 260
const SIDEBAR_COLLAPSED_WIDTH = 52

/** macOS 红黄绿占位宽度（hiddenInset 时与系统控件同一行） */
const TITLE_BAR_INSET_LEFT = 72
const TITLE_BAR_HEIGHT = 38

function isMac(): boolean {
  if (typeof navigator === 'undefined') return false
  return navigator.platform === 'MacIntel' || /Mac/i.test(navigator.userAgent)
}

// ── New Dropdown ──────────────────────────────────────────────────────────────

/** 新建下拉菜单：新建会话 / 新建分身 / 新建定时任务 */
function NewDropdown({
  onNewChat,
  onNewAvatar,
  onNewTask,
}: {
  onNewChat: () => void
  onNewAvatar: () => void
  onNewTask: () => void
}) {
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handle = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [open])

  const handleNewTask = async () => {
    setCreating(true)
    try {
      onNewTask()
    } finally {
      setCreating(false)
      setOpen(false)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        className="flex items-center gap-0.5 p-1.5 rounded-lg hover:bg-black/[0.04] transition-colors"
        style={{ color: open ? 'var(--accent1)' : 'var(--text)' }}
        title="新建"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Plus className="w-4 h-4" />
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-1 w-48 rounded-xl border shadow-xl z-50 py-1 overflow-hidden"
          style={{
            background: 'var(--bg-container)',
            borderColor: 'var(--border)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          }}
          onMouseDown={e => e.stopPropagation()}
        >
          <button
            type="button"
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-black/[0.04]"
            style={{ color: 'var(--text)' }}
            onClick={() => { onNewChat(); setOpen(false) }}
          >
            <MessageSquare className="w-4 h-4 shrink-0" style={{ color: 'var(--accent1)' }} />
            <span>新建会话</span>
          </button>
          <button
            type="button"
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-black/[0.04]"
            style={{ color: 'var(--text)' }}
            onClick={() => { onNewAvatar(); setOpen(false) }}
          >
            <Bot className="w-4 h-4 shrink-0" style={{ color: 'var(--accent1)' }} />
            <span>新建分身</span>
          </button>
          <button
            type="button"
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-black/[0.04]"
            style={{ color: 'var(--text)' }}
            onClick={handleNewTask}
            disabled={creating}
          >
            {creating ? (
              <Loader2 className="w-4 h-4 shrink-0 animate-spin" style={{ color: 'var(--accent1)' }} />
            ) : (
              <Clock className="w-4 h-4 shrink-0" style={{ color: 'var(--accent1)' }} />
            )}
            <span>新建定时任务</span>
          </button>
        </div>
      )}
    </div>
  )
}

// ── Types ──────────────────────────────────────────────────────────────────────

// AvatarItem and AppState are imported from appStore via type alias above

// ── Sub-components ─────────────────────────────────────────────────────────────

/** 连接状态指示器 */
function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    connected: 'var(--success, #2f9d5e)',
    ready: 'var(--success, #2f9d5e)',
    starting: 'var(--accent1, #fc5d1e)',
    idle: 'var(--text-ter, #999)',
    disconnected: 'var(--danger, #e74c3c)',
    error: 'var(--danger, #e74c3c)',
  }
  const labelKeys: Record<string, string> = {
    connected: 'status.connected',
    ready: 'status.ready',
    starting: 'status.starting',
    idle: 'status.idle',
    disconnected: 'status.disconnected',
    error: 'status.error',
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="w-2 h-2 rounded-full"
        style={{ background: colors[status] ?? '#999' }}
      />
      <span className="text-xs" style={{ color: 'var(--text-sec)' }}>
        {t(labelKeys[status] ?? status)}
      </span>
    </span>
  )
}

/** 积分余额按钮 */
function PointsBadge({ points }: { points: number | null }) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowMenu(v => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium hover:bg-black/[0.04] transition-colors"
        style={{ color: 'var(--text)' }}
      >
        <ShoppingCart className="w-3.5 h-3.5" style={{ color: 'var(--text-sec)' }} />
        <span>
          <span className="tabular-nums">{points !== null ? points.toLocaleString() : '—'}</span>
          <span style={{ color: 'var(--text-ter)' }}> | </span>
          <span style={{ color: 'var(--accent1)' }}>{t('header.points.recharge')}</span>
        </span>
        <ChevronDown className="w-3 h-3" style={{ color: 'var(--text-ter)' }} />
      </button>
      {showMenu && (
        <div
          className="absolute right-0 top-full mt-1 w-48 rounded-lg border shadow-lg z-50 py-1"
          style={{ background: 'var(--bg-container)', borderColor: 'var(--border)' }}
        >
          <button
            type="button"
            onClick={() => setShowMenu(false)}
            className="w-full px-4 py-2 text-xs text-left hover:bg-black/[0.04] transition-colors"
            style={{ color: 'var(--text-sec)' }}
          >
            {t('header.points.view')}
          </button>
          <button
            type="button"
            onClick={() => setShowMenu(false)}
            className="w-full px-4 py-2 text-xs text-left hover:bg-black/[0.04] transition-colors"
            style={{ color: 'var(--accent1)' }}
          >
            {t('header.points.recharge')}
          </button>
        </div>
      )}
    </div>
  )
}

/** 头像/分身选择下拉 */
function AvatarSelector({ selectedId, avatars, onChange }: {
  selectedId: AvatarItem | null
  avatars: AvatarItem[]
  onChange: (avatar: AvatarItem | null) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const current = avatars.find(a => a.id === selectedId?.id)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs hover:bg-black/[0.04] transition-colors"
        style={{ color: 'var(--text)' }}
      >
        <Bot className="w-3.5 h-3.5" style={{ color: 'var(--text-sec)' }} />
        <span className="max-w-[80px] truncate">{current?.name ?? t('header.avatar.select')}</span>
        <ChevronDown className="w-3 h-3" style={{ color: 'var(--text-ter)' }} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-56 rounded-lg border shadow-lg z-50 py-1 max-h-64 overflow-y-auto"
          style={{ background: 'var(--bg-container)', borderColor: 'var(--border)' }}
        >
          {avatars.length === 0 && (
            <div className="px-4 py-3 text-xs" style={{ color: 'var(--text-ter)' }}>
              {t('header.avatar.none')}
            </div>
          )}
          {avatars.map(avatar => (
            <button
              key={avatar.id}
              type="button"
              onClick={() => { onChange(avatar); setOpen(false) }}
              className="w-full flex items-center gap-3 px-4 py-2 text-xs text-left hover:bg-black/[0.04] transition-colors"
              style={{ color: avatar.id === selectedId?.id ? 'var(--accent1)' : 'var(--text)' }}
            >
              <Bot className="w-4 h-4 shrink-0" />
              <div className="min-w-0">
                <div className="font-medium truncate">{avatar.name}</div>
                {avatar.model && (
                  <div className="text-[10px] truncate" style={{ color: 'var(--text-ter)' }}>
                    {avatar.model}
                  </div>
                )}
              </div>
              {avatar.id === selectedId?.id && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--accent1)' }} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** 模型选择下拉 */
function ModelSelector({ currentModel, models, onChange }: {
  currentModel: string | null
  models: { id: string; name: string }[]
  onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setConfigOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs hover:bg-black/[0.04] transition-colors"
        style={{ color: 'var(--text)' }}
      >
        <span className="max-w-[100px] truncate">{currentModel ?? t('header.model.select')}</span>
        <ChevronDown className="w-3 h-3 shrink-0" style={{ color: 'var(--text-ter)' }} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-64 rounded-lg border shadow-lg z-50 py-1 max-h-64 overflow-y-auto"
          style={{ background: 'var(--bg-container)', borderColor: 'var(--border)' }}
        >
          {models.length === 0 && (
            <div className="px-4 py-3 text-xs" style={{ color: 'var(--text-ter)' }}>
              {t('generic.loading')}
            </div>
          )}
          {models.map(model => (
            <button
              key={model.id}
              type="button"
              onClick={() => { onChange(model.id); setOpen(false) }}
              className="w-full flex items-center gap-3 px-4 py-2 text-xs text-left hover:bg-black/[0.04] transition-colors"
              style={{ color: model.id === currentModel ? 'var(--accent1)' : 'var(--text)' }}
            >
              <span className="flex-1 truncate">{model.name}</span>
              {model.id === currentModel && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(252,93,30,0.12)', color: 'var(--accent1)' }}
                >
                  {t('header.model.current')}
                </span>
              )}
            </button>
          ))}
          <div className="border-t my-1" style={{ borderColor: 'var(--border)' }} />
          <button
            type="button"
            onClick={() => { setConfigOpen(true); setOpen(false) }}
            className="w-full flex items-center gap-2 px-4 py-2 text-xs text-left hover:bg-black/[0.04] transition-colors"
            style={{ color: 'var(--text-sec)' }}
          >
            <Settings className="w-3.5 h-3.5" />
            {t('header.model.configure')}
          </button>
        </div>
      )}
      {configOpen && <ModelConfigPanel onClose={() => setConfigOpen(false)} />}
    </div>
  )
}

/** 模型配置面板 */
function ModelConfigPanel({ onClose }: { onClose: () => void }) {
  const [temperature, setTemperature] = useState(0.7)
  const [topP, setTopP] = useState(0.9)
  const [topK, setTopK] = useState(40)
  const [maxTokens, setMaxTokens] = useState(4096)
  const [thinking, setThinking] = useState(true)
  const [thinkingBudget, setThinkingBudget] = useState(1024)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!window.openclaw) return
    window.openclaw.config.get().then(res => {
      if (res.success && res.data) {
        const data = res.data as Record<string, unknown>
        if (data.model) {
          const m = data.model as Record<string, unknown>
          if (typeof m.temperature === 'number') setTemperature(m.temperature)
          if (typeof m.topP === 'number') setTopP(m.topP)
          if (typeof m.topK === 'number') setTopK(m.topK)
          if (typeof m.maxTokens === 'number') setMaxTokens(m.maxTokens)
          if (typeof m.thinking === 'boolean') setThinking(m.thinking)
          if (typeof m.thinkingBudget === 'number') setThinkingBudget(m.thinkingBudget)
        }
      }
    })
  }, [])

  const handleSave = async () => {
    if (!window.openclaw) return
    await window.openclaw.models.configure({
      temperature,
      topP,
      topK,
      maxTokens,
      thinking,
      thinkingBudget,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div
      className="absolute right-0 top-full mt-1 w-72 rounded-lg border shadow-lg z-[60] p-4"
      style={{ background: 'var(--bg-container)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium" style={{ color: 'var(--text)' }}>
          {t('header.model.configure')}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-xs px-2 py-1 rounded hover:bg-black/[0.04] transition-colors"
          style={{ color: 'var(--text-sec)' }}
        >
          ✕
        </button>
      </div>
      <div className="space-y-3">
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-xs" style={{ color: 'var(--text-sec)' }}>{t('header.model.temperature')}</label>
            <span className="text-xs tabular-nums" style={{ color: 'var(--text-ter)' }}>{temperature.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={temperature}
            onChange={e => setTemperature(parseFloat(e.target.value))}
            className="w-full h-1 rounded-full appearance-none cursor-pointer"
            style={{ accentColor: 'var(--accent1)' }}
          />
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-xs" style={{ color: 'var(--text-sec)' }}>{t('header.model.topP')}</label>
            <span className="text-xs tabular-nums" style={{ color: 'var(--text-ter)' }}>{topP.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={topP}
            onChange={e => setTopP(parseFloat(e.target.value))}
            className="w-full h-1 rounded-full appearance-none cursor-pointer"
            style={{ accentColor: 'var(--accent1)' }}
          />
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-xs" style={{ color: 'var(--text-sec)' }}>{t('header.model.maxTokens')}</label>
            <span className="text-xs tabular-nums" style={{ color: 'var(--text-ter)' }}>{maxTokens}</span>
          </div>
          <input
            type="range"
            min="256"
            max="32768"
            step="256"
            value={maxTokens}
            onChange={e => setMaxTokens(parseInt(e.target.value))}
            className="w-full h-1 rounded-full appearance-none cursor-pointer"
            style={{ accentColor: 'var(--accent1)' }}
          />
        </div>
        <div className="flex items-center justify-between">
          <label className="text-xs" style={{ color: 'var(--text-sec)' }}>{t('header.model.thinking')}</label>
          <button
            type="button"
            onClick={() => setThinking(v => !v)}
            className="relative w-9 h-5 rounded-full transition-colors"
            style={{ background: thinking ? 'var(--accent1)' : 'var(--bg-layout)' }}
          >
            <span
              className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
              style={{ transform: thinking ? 'translateX(16px)' : 'translateX(0)' }}
            />
          </button>
        </div>
        {thinking && (
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-xs" style={{ color: 'var(--text-sec)' }}>{t('header.model.thinkingBudget')}</label>
              <span className="text-xs tabular-nums" style={{ color: 'var(--text-ter)' }}>{thinkingBudget}</span>
            </div>
            <input
              type="range"
              min="256"
              max="4096"
              step="128"
              value={thinkingBudget}
              onChange={e => setThinkingBudget(parseInt(e.target.value))}
              className="w-full h-1 rounded-full appearance-none cursor-pointer"
              style={{ accentColor: 'var(--accent1)' }}
            />
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={handleSave}
        className="w-full mt-4 py-2 rounded-lg text-xs font-medium transition-colors"
        style={{
          background: saved ? 'var(--success, #2f9d5e)' : 'var(--accent-gradient)',
          color: '#fff',
        }}
      >
        {saved ? t('header.model.saved') : '保存'}
      </button>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function Header() {
  // Precise selectors — only re-render when these specific values change
  const activeTab = useAppStore(s => s.activeTab)
  const selectedAvatar = useAppStore(s => s.selectedAvatar)
  const setSelectedAvatar = useAppStore(s => s.setSelectedAvatar)
  const setActiveTab = useAppStore(s => s.setActiveTab)
  const sidebarCollapsed = useAppStore(s => s.sidebarCollapsed)
  const toggleSidebarCollapsed = useAppStore(s => s.toggleSidebarCollapsed)

  // ── Real API data ────────────────────────────────────────────────────────
  const [status, setStatus] = useState<string>('idle')
  const [points, setPoints] = useState<number | null>(null)
  const [avatars, setAvatars] = useState<AvatarItem[]>([])
  const [models, setModels] = useState<{ id: string; name: string }[]>([])
  const [currentModel, setCurrentModel] = useState<string | null>(null)

  // ── Load initial data ────────────────────────────────────────────────────
  useEffect(() => {
    if (!window.openclaw) return

    // Load status
    window.openclaw.getStatus().then(res => {
      setStatus(res)
    }).catch(() => {})

    // Load points
    window.openclaw.user.getPoints().then(res => {
      if (res.success && res.data !== undefined) {
        setPoints(typeof res.data === 'number' ? res.data : (res.data as Record<string, unknown>)?.points as number ?? null)
      }
    }).catch(() => {})

    // Load avatars
    window.openclaw.avatars.list().then(res => {
      if (res.success && Array.isArray(res.data)) {
        setAvatars(res.data as AvatarItem[])
      }
    }).catch(() => {})

    // Load models
    window.openclaw.models.list().then(res => {
      if (res.success && Array.isArray(res.data)) {
        setModels(res.data as { id: string; name: string }[])
      }
    }).catch(() => {})

    // Get current model
    window.openclaw.models.getCurrent().then(res => {
      if (res.success && res.data !== undefined) {
        const data = res.data as Record<string, unknown>
        setCurrentModel((data?.id ?? data?.modelId ?? data?.model ?? null) as string | null)
      }
    }).catch(() => {})
  }, [])

  // ── Subscribe to events ──────────────────────────────────────────────────
  useEffect(() => {
    if (!window.openclaw) return

    // Status changes
    const unsubStatus = window.openclaw.onStatusChange(newStatus => {
      setStatus(newStatus)
    })

    // Points changes
    const unsubEvents = window.openclaw.on(e => {
      if (e.event === 'user:points-changed') {
        const payload = e.payload as Record<string, unknown>
        if (typeof payload.points === 'number') {
          setPoints(payload.points)
        }
      }
      if (e.event === 'avatar:created' || e.event === 'avatar:deleted' || e.event === 'avatar:status-changed') {
        // Reload avatars
        window.openclaw!.avatars.list().then(res => {
          if (res.success && Array.isArray(res.data)) {
            setAvatars(res.data as AvatarItem[])
          }
        }).catch(() => {})
      }
    })

    return () => {
      unsubStatus()
      unsubEvents()
    }
  }, [])

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleNewChat = () => {
    setActiveTab('chat')
  }

  const handleSwitchModel = async (modelId: string) => {
    setCurrentModel(modelId)
    if (window.openclaw) {
      const res = await window.openclaw.models.setCurrent({ modelId })
      if (!res.success) {
        // Revert on failure
        window.openclaw.models.getCurrent().then(r => {
          if (r.success && r.data) {
            const data = r.data as Record<string, unknown>
            setCurrentModel((data?.id ?? data?.modelId ?? data?.model ?? null) as string | null)
          }
        }).catch(() => {})
      }
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  const mac = isMac()
  const title =
    activeTab === 'avatar'
      ? (selectedAvatar ? avatars.find(a => a.id === selectedAvatar?.id)?.name ?? t('header.title.avatar') : t('header.title.avatar'))
      : t(
          activeTab === 'chat'
            ? 'header.title.im'
            : 'header.title.task'
        )

  const leftWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH

  return (
    <header
      className="flex-shrink-0 flex items-center w-full border-b title-bar-drag"
      style={{
        background: 'var(--bg-container)',
        borderColor: 'var(--border-secondary)',
        height: mac ? TITLE_BAR_HEIGHT : 44,
        paddingLeft: mac ? TITLE_BAR_INSET_LEFT : 0,
      }}
    >
      {/* 左侧：与侧栏同宽，收起 + 加号（与红黄绿同一行） */}
      <div
        className="flex-shrink-0 flex items-center gap-1 px-1 h-full title-bar-no-drag"
        style={{ width: leftWidth }}
      >
        <button
          type="button"
          onClick={toggleSidebarCollapsed}
          className="p-1.5 rounded-lg hover:bg-black/[0.04] transition-colors"
          style={{ color: 'var(--text-sec)' }}
          title={sidebarCollapsed ? '展开侧栏' : '收起侧栏'}
        >
          {sidebarCollapsed ? (
            <PanelLeft className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
        <NewDropdown
          onNewChat={handleNewChat}
          onNewAvatar={() => setActiveTab('avatar')}
          onNewTask={() => setActiveTab('task')}
        />
      </div>

      {/* 右侧：标题（可拖拽）+ 操作按钮（no-drag） */}
      <div className="flex-1 flex items-center justify-between min-w-0 px-4">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-sm font-semibold truncate pr-4" style={{ color: 'var(--text)' }}>
            {title}
          </h1>
          <StatusDot status={status} />
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 title-bar-no-drag">
          {/* 模型选择 */}
          <ModelSelector
            currentModel={currentModel}
            models={models}
            onChange={handleSwitchModel}
          />

          {/* 分身选择 */}
          <AvatarSelector
            selectedId={selectedAvatar}
            avatars={avatars}
            onChange={setSelectedAvatar}
          />

          {/* 积分 */}
          <PointsBadge points={points} />

          <button
            type="button"
            className="p-2 rounded-lg hover:bg-black/[0.04] transition-colors"
            style={{ color: 'var(--text-sec)' }}
            title="文件"
          >
            <FolderOpen className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  )
}

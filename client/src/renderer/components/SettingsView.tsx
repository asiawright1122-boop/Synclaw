/**
 * AutoClaw 风格设置 — 左侧导航 + 右侧详情（完整复刻参考 UI）
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppStore } from '../stores/appStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useToastStore } from './Toast'
import { FeedbackPanel } from './FeedbackPanel'
import { ImPanel } from './IMPanel'
import { AuthorizedDirsPanel } from './AuthorizedDirsPanel'
import {
  ArrowLeft,
  Pencil,
  BarChart3,
  Coins,
  Cpu,
  Plug,
  BookOpen,
  MessageCircle,
  FolderOpen,
  Shield,
  Lock,
  MessageSquarePlus,
  Info,
  RefreshCw,
  Wifi,
  WifiOff,
  Server,
  Brain,
  Zap,
} from 'lucide-react'

type SettingsSection =
  | 'general'
  | 'usage'
  | 'points'
  | 'models'
  | 'memory'
  | 'hooks'
  | 'mcp'
  | 'skills'
  | 'im'
  | 'security'
  | 'workspace'
  | 'privacy'
  | 'feedback'
  | 'about'
  | 'gateway'

const NAV: { id: SettingsSection; label: string; icon: typeof Pencil }[] = [
  { id: 'general', label: '通用', icon: Pencil },
  { id: 'usage', label: '用量统计', icon: BarChart3 },
  { id: 'points', label: '积分详情', icon: Coins },
  { id: 'models', label: '模型与 API', icon: Cpu },
  { id: 'memory', label: '记忆管理', icon: Brain },
  { id: 'hooks', label: '自动化', icon: Zap },
  { id: 'mcp', label: 'MCP 服务', icon: Plug },
  { id: 'skills', label: '技能', icon: BookOpen },
  { id: 'im', label: 'IM 频道', icon: MessageCircle },
  { id: 'security', label: '文件安全', icon: Lock },
  { id: 'workspace', label: '工作区', icon: FolderOpen },
  { id: 'gateway', label: 'Gateway', icon: Server },
  { id: 'privacy', label: '数据与隐私', icon: Shield },
  { id: 'feedback', label: '提交反馈', icon: MessageSquarePlus },
  { id: 'about', label: '关于', icon: Info },
]

/* ─── 基础样式组件 ─── */

function pillBtn(primary?: boolean) {
  return `px-3.5 py-1.5 rounded-full text-sm font-medium transition-opacity shrink-0 ${
    primary
      ? 'text-white border-0'
      : 'border bg-white'
  }`
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[10px] border overflow-hidden ${className}`}
      style={{ background: 'var(--bg-container)', borderColor: 'var(--border)' }}
    >
      {children}
    </div>
  )
}

function Row({
  label,
  desc,
  children,
  border = true,
}: {
  label: string
  desc?: string
  children?: React.ReactNode
  border?: boolean
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 px-5 py-3.5"
      style={{ borderBottom: border ? '1px solid var(--border-secondary)' : undefined }}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
          {label}
        </p>
        {desc ? (
          <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-sec)' }}>
            {desc}
          </p>
        ) : null}
      </div>
      {children}
    </div>
  )
}

/** 参考图：长条开关，开为橙色 */
function ToggleStrip({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="w-11 h-6 rounded-full relative shrink-0 transition-colors"
      style={{ background: on ? 'var(--accent1)' : '#e0e0e0' }}
    >
      <span
        className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200"
        style={{ left: on ? 22 : 2 }}
      />
    </button>
  )
}

/** 参考图部分页面：小圆点式关状态 */
function ToggleDot({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border transition-colors"
      style={{
        borderColor: on ? 'var(--accent1)' : '#ddd',
        background: on ? 'rgba(252,93,30,0.12)' : '#f5f5f5',
      }}
    >
      <span
        className="w-4 h-4 rounded-full"
        style={{ background: on ? 'var(--accent1)' : '#ccc' }}
      />
    </button>
  )
}

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <RefreshCw
      className="animate-spin"
      style={{ width: size, height: size, color: 'var(--text-sec)' }}
    />
  )
}

/* ─── 各面板 ─── */

function GeneralPanel() {
  const settings = useSettingsStore()
  const [phone, setPhone] = useState<string>('加载中…')

  useEffect(() => {
    if (!window.openclaw) return
    window.openclaw.config.get().then(res => {
      if (res.success && res.data) {
        const data = res.data as Record<string, unknown>
        const user = data.user as Record<string, unknown> | undefined
        if (user?.phone) setPhone(String(user.phone))
      }
    }).catch(() => {
      setPhone('获取失败')
    })
  }, [])

  return (
    <div className="pb-10">
      <h1 className="text-xl font-bold mb-6" style={{ color: 'var(--text)' }}>
        通用
      </h1>

      <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
        账号与安全
      </p>
      <Card className="mb-6">
        <Row label="手机号" border>
          <span className="text-sm tabular-nums" style={{ color: 'var(--text-sec)' }}>
            {phone}
          </span>
        </Row>
        <div className="px-5 py-3.5 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              注销账号
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-sec)' }}>
              注销账号将删除您的账户和所有数据
            </p>
          </div>
          <button
            type="button"
            className="px-3 py-1 rounded-lg text-sm font-medium shrink-0 border"
            style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
          >
            注销
          </button>
        </div>
      </Card>

      <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
        外观与行为
      </p>
      <Card>
        <Row
          label="主题模式"
          desc="选择橙白浅色或 Neon Noir 深色模式。"
          border
        >
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => settings.setTheme('light')}
              className="w-9 h-9 rounded-full p-0.5"
              style={{
                boxShadow: settings.theme === 'light' ? '0 0 0 2px var(--accent1)' : '0 0 0 1px #ddd',
              }}
              title="浅色"
            >
              <span
                className="block w-full h-full rounded-full overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, #fc5d1e 50%, #fff 50%)',
                }}
              />
            </button>
            <button
              type="button"
              onClick={() => settings.setTheme('dark')}
              className="w-9 h-9 rounded-full p-0.5"
              style={{
                boxShadow: settings.theme === 'dark' ? '0 0 0 2px var(--accent1)' : '0 0 0 1px #ddd',
              }}
              title="Neon Noir"
            >
              <span
                className="block w-full h-full rounded-full"
                style={{
                  background: 'linear-gradient(160deg, #6366f1 0%, #1e1b4b 45%, #0a0a0a 100%)',
                }}
              />
            </button>
            <button
              type="button"
              onClick={() => settings.setTheme('system')}
              className="w-9 h-9 rounded-full p-0.5 flex items-center justify-center text-xs font-medium border"
              style={{
                boxShadow: settings.theme === 'system' ? '0 0 0 2px var(--accent1)' : '0 0 0 1px #ddd',
                borderColor: settings.theme === 'system' ? 'var(--accent1)' : '#ddd',
                color: 'var(--text-sec)',
              }}
              title="跟随系统"
            >
              Aa
            </button>
          </div>
        </Row>
        <Row label="动画" desc="界面动画和过渡效果。" border>
          <ToggleDot
            on={settings.animationsEnabled}
            onChange={settings.setAnimationsEnabled}
          />
        </Row>
        <Row label="通知" desc="接收系统通知。" border>
          <ToggleDot
            on={settings.notificationsEnabled}
            onChange={settings.setNotificationsEnabled}
          />
        </Row>
        <Row label="紧凑模式" desc="减少界面元素间距，节省屏幕空间。" border={false}>
          <ToggleDot
            on={settings.compactMode}
            onChange={settings.setCompactMode}
          />
        </Row>
      </Card>

      <div className="flex justify-center mt-10">
        <button
          type="button"
          className="text-sm"
          style={{ color: 'var(--text-ter)' }}
        >
          退出登录
        </button>
      </div>
    </div>
  )
}

function UsagePanel() {
  const [loading, setLoading] = useState(false)
  const [usageData, setUsageData] = useState<{
    sessions?: number
    messages?: number
    inputTokens?: number
    outputTokens?: number
    models?: Array<{
      name: string
      messages: number
      inputTokens: number
      outputTokens: number
    }>
  } | null>(null)

  const loadUsage = async () => {
    setLoading(true)
    try {
      const [statusRes, costRes] = await Promise.allSettled([
        window.openclaw?.usage.status(),
        window.openclaw?.usage.cost(),
      ])

      if (statusRes?.status === 'fulfilled' && statusRes.value?.success) {
        const data = statusRes.value.data as Record<string, unknown>
        setUsageData(data as typeof usageData)
      } else {
        // Try cost data
        if (costRes?.status === 'fulfilled' && costRes.value?.success) {
          const data = costRes.value.data as Record<string, unknown>
          setUsageData(data as typeof usageData)
        }
      }
    } catch {
      // keep empty
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsage()
  }, [])

  const totalTokens = (usageData?.inputTokens ?? 0) + (usageData?.outputTokens ?? 0)
  const tokenDisplay = totalTokens > 1000
    ? `${(totalTokens / 1000).toFixed(1)} k`
    : String(totalTokens)

  return (
    <div className="pb-10">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
            用量统计
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-sec)' }}>
            本设备所有已保存对话的 Token 用量汇总。
          </p>
        </div>
        <button
          type="button"
          onClick={loadUsage}
          className={pillBtn(false)}
          style={{ borderColor: 'var(--border)', color: 'var(--text-sec)' }}
          disabled={loading}
        >
          {loading ? <Spinner size={14} /> : '刷新'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-6 mb-8">
        {[
          { n: usageData?.sessions ?? '—', l: '会话数' },
          { n: usageData?.messages ?? '—', l: '消息数' },
          { n: tokenDisplay, l: '总 Token' },
        ].map((x) => (
          <div
            key={x.l}
            className="rounded-[10px] px-4 py-5 text-center border"
            style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-secondary)' }}
          >
            <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text)' }}>
              {x.n}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-sec)' }}>
              {x.l}
            </p>
          </div>
        ))}
      </div>

      <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
        按模型
      </p>
      {(usageData?.models ?? []).length > 0 ? usageData!.models!.map((m) => {
        const total = m.inputTokens + m.outputTokens
        const inputPct = total > 0 ? (m.inputTokens / total) * 100 : 50
        return (
          <div key={m.name}>
            <div
              className="rounded-[10px] border p-4 mb-3"
              style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-secondary)' }}
            >
              <div className="flex justify-between text-sm mb-3">
                <span className="font-medium" style={{ color: 'var(--text)' }}>
                  {m.name}
                </span>
                <span style={{ color: 'var(--text-sec)' }}>{m.messages} 条消息</span>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden flex mb-3" style={{ background: '#eee' }}>
                <div className="h-full" style={{ width: `${inputPct}%`, background: 'var(--accent1)' }} />
                <div className="h-full flex-1" style={{ background: '#ffd4c4' }} />
              </div>
              <div className="flex justify-between text-xs" style={{ color: 'var(--text-sec)' }}>
                <span>输入: {m.inputTokens.toLocaleString()}</span>
                <span>输出: {m.outputTokens.toLocaleString()}</span>
                <span>总计: {total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )
      }) : (
        <div
          className="rounded-[10px] border p-4 text-center text-sm"
          style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-secondary)', color: 'var(--text-ter)' }}
        >
          暂无用量数据
        </div>
      )}
      <div className="flex gap-4 mt-3 text-xs" style={{ color: 'var(--text-sec)' }}>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'var(--accent1)' }} />
          输入 Token
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#ffd4c4' }} />
          输出 Token
        </span>
      </div>
    </div>
  )
}

function PointsPanel() {
  const [tab, setTab] = useState<'all' | 'use' | 'earn'>('all')
  const [loading, setLoading] = useState(false)
  const [pointsData, setPointsData] = useState<{
    total?: number
    general?: number
    activity?: number
  } | null>(null)
  const [history, setHistory] = useState<Array<{ amount: number; time: string; desc: string }>>([])

  const tabs: { id: typeof tab; label: string }[] = [
    { id: 'all', label: '全部' },
    { id: 'use', label: '消耗' },
    { id: 'earn', label: '获得' },
  ]

  const loadPoints = async () => {
    setLoading(true)
    try {
      const [pointsRes, historyRes] = await Promise.allSettled([
        window.openclaw?.user.getPoints(),
        window.openclaw?.user.getPointsHistory({ limit: 20 }),
      ])

      if (pointsRes?.status === 'fulfilled' && pointsRes.value?.success) {
        const data = pointsRes.value.data
        if (typeof data === 'number') {
          setPointsData({ total: data, general: data, activity: 0 })
        } else if (data && typeof data === 'object') {
          const d = data as Record<string, unknown>
          setPointsData({
            total: d.total as number ?? (d.points as number),
            general: d.general as number ?? (d.points as number),
            activity: d.activity as number ?? 0,
          })
        }
      }

      if (historyRes?.status === 'fulfilled' && historyRes.value?.success) {
        const data = historyRes.value.data
        if (Array.isArray(data)) {
          setHistory(data.map((item: Record<string, unknown>) => ({
            amount: item.amount as number ?? 0,
            time: item.time as string ?? (item.createdAt as string) ?? '',
            desc: item.desc as string ?? (item.description as string) ?? '积分变动',
          })))
        }
      }
    } catch {
      // keep empty
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPoints()
  }, [])

  const filteredHistory = useMemo(() => {
    if (tab === 'all') return history
    if (tab === 'use') return history.filter(r => r.amount < 0)
    return history.filter(r => r.amount >= 0)
  }, [tab, history])

  return (
    <div className="pb-10">
      <div className="flex items-start justify-between gap-4 mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
          积分
        </h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={loadPoints}
            className={pillBtn(false)}
            style={{ borderColor: 'var(--border)', color: 'var(--text-sec)' }}
            disabled={loading}
          >
            {loading ? <Spinner size={14} /> : '刷新'}
          </button>
          <button
            type="button"
            className={pillBtn(true)}
            style={{ background: 'var(--accent1)' }}
          >
            去充值
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-center gap-2 sm:gap-4 mb-2 py-4">
        <div className="text-center px-2">
          <p className="text-xs mb-1" style={{ color: 'var(--text-sec)' }}>
            总积分
          </p>
          <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text)' }}>
            {pointsData?.total?.toLocaleString() ?? '—'}
          </p>
        </div>
        <span className="text-xl font-light pb-1" style={{ color: 'var(--text-ter)' }}>
          =
        </span>
        <div className="text-center px-2">
          <p className="text-xs mb-1" style={{ color: 'var(--text-sec)' }}>
            通用积分
          </p>
          <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text)' }}>
            {pointsData?.general?.toLocaleString() ?? '—'}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-ter)' }}>
            永久有效
          </p>
        </div>
        <span className="text-xl font-light pb-1" style={{ color: 'var(--text-ter)' }}>
          +
        </span>
        <div className="text-center px-2">
          <p className="text-xs mb-1" style={{ color: 'var(--text-sec)' }}>
            活动积分
          </p>
          <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text)' }}>
            {pointsData?.activity?.toLocaleString() ?? '—'}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-ter)' }}>
            周期有效
          </p>
        </div>
      </div>
      <p className="text-center text-xs mb-6" style={{ color: 'var(--text-ter)' }}>
        消耗顺位：活动积分(本周期) &gt; 通用积分(永久)
      </p>

      <div
        className="inline-flex rounded-full p-0.5 mb-6 border"
        style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-secondary)' }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
            style={{
              background: tab === t.id ? 'var(--bg-container)' : 'transparent',
              color: tab === t.id ? 'var(--text)' : 'var(--text-sec)',
              boxShadow: tab === t.id ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-0 border rounded-[10px] overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        {filteredHistory.length === 0 && (
          <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-ter)' }}>
            暂无记录
          </div>
        )}
        {filteredHistory.map((r, i) => (
          <div
            key={i}
            className="flex justify-between items-center px-4 py-3.5"
            style={{
              borderBottom: i < filteredHistory.length - 1 ? '1px solid var(--border-secondary)' : undefined,
            }}
          >
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                {r.desc}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-ter)' }}>
                {r.time}
              </p>
            </div>
            <span className="text-sm tabular-nums" style={{ color: r.amount < 0 ? 'var(--danger)' : 'var(--success)' }}>
              {r.amount > 0 ? `+${r.amount}` : r.amount}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ModelsPanel({ currentModel }: { currentModel: string | null }) {
  const [loading, setLoading] = useState(false)
  const [models, setModels] = useState<Array<{ id: string; name: string; description?: string }>>([])
  const [current, setCurrent] = useState<string | null>(currentModel)
  const [switching, setSwitching] = useState<string | null>(null)

  // 模型参数配置状态
  const [showParams, setShowParams] = useState(false)
  const [params, setParams] = useState({
    temperature: 0.7,
    topP: 0.9,
    topK: 40,
    maxTokens: 4096,
    thinking: true,
    thinkingBudget: 16000,
  })
  const [savingParams, setSavingParams] = useState(false)
  const addToast = useToastStore(s => s.addToast)

  const loadModels = async () => {
    setLoading(true)
    try {
      const [listRes, currentRes] = await Promise.allSettled([
        window.openclaw?.models.list(),
        window.openclaw?.models.getCurrent(),
      ])

      if (listRes?.status === 'fulfilled' && listRes.value?.success && Array.isArray(listRes.value.data)) {
        setModels(listRes.value.data as typeof models)
      }

      if (currentRes?.status === 'fulfilled' && currentRes.value?.success) {
        const data = currentRes.value.data as Record<string, unknown>
        setCurrent((data?.id ?? data?.modelId ?? data?.model ?? null) as string | null)
      }
    } catch {
      // keep empty
    } finally {
      setLoading(false)
    }
  }

  // 加载当前模型参数
  const loadParams = async () => {
    if (!window.openclaw) return
    try {
      const res = await window.openclaw.config.get()
      if (res?.success && res.data) {
        const cfg = res.data as Record<string, unknown>
        const agentDefaults = cfg.agents as Record<string, unknown> | undefined
        const defaults = (agentDefaults?.defaults ?? agentDefaults) as Record<string, unknown> | undefined
        if (defaults) {
          setParams({
            temperature: typeof defaults.temperature === 'number' ? defaults.temperature : 0.7,
            topP: typeof defaults.topP === 'number' ? defaults.topP : 0.9,
            topK: typeof defaults.topK === 'number' ? defaults.topK : 40,
            maxTokens: typeof defaults.maxTokens === 'number' ? defaults.maxTokens : 4096,
            thinking: defaults.thinking !== false,
            thinkingBudget: typeof defaults.thinkingBudget === 'number' ? defaults.thinkingBudget : 16000,
          })
        }
      }
    } catch {
      // use defaults
    }
  }

  useEffect(() => {
    loadModels()
    loadParams()
  }, [])

  const handleSwitch = async (modelId: string) => {
    setSwitching(modelId)
    try {
      const res = await window.openclaw?.models.setCurrent({ modelId })
      if (res?.success) {
        setCurrent(modelId)
        addToast({ type: 'success', message: `已切换至 ${modelId}`, duration: 2000 })
      }
    } finally {
      setSwitching(null)
    }
  }

  const handleSaveParams = async () => {
    if (!window.openclaw) return
    setSavingParams(true)
    try {
      const res = await window.openclaw.config.patch({
        raw: {
          agents: {
            defaults: {
              model: { primary: current || undefined },
              temperature: params.temperature,
              topP: params.topP,
              topK: params.topK,
              maxTokens: params.maxTokens,
              thinking: params.thinking,
              thinkingBudget: params.thinkingBudget,
            },
          },
        },
      })
      if (res?.success) {
        await window.openclaw.config.apply()
        addToast({ type: 'success', message: '参数已保存', duration: 2000 })
      } else {
        addToast({ type: 'error', message: '保存失败', duration: 3000 })
      }
    } catch {
      addToast({ type: 'error', message: '保存失败', duration: 3000 })
    } finally {
      setSavingParams(false)
    }
  }

  const updateParam = (key: keyof typeof params, value: number | boolean) => {
    setParams(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="pb-10">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
          模型与 API
        </h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setShowParams(!showParams); if (!showParams) loadParams() }}
            className={`${pillBtn(!showParams)}`}
            style={{ borderColor: showParams ? 'var(--accent1)' : 'var(--border)', color: showParams ? 'var(--accent1)' : 'var(--text-sec)' }}
          >
            参数配置
          </button>
          <button
            type="button"
            onClick={loadModels}
            className={pillBtn(false)}
            style={{ borderColor: 'var(--border)', color: 'var(--text-sec)' }}
            disabled={loading}
          >
            {loading ? <Spinner size={14} /> : '刷新'}
          </button>
        </div>
      </div>

      {/* 参数配置面板 */}
      {showParams && (
        <Card className="mb-6">
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                模型参数配置
              </p>
              <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--bg-subtle)', color: 'var(--text-ter)' }}>
                当前: {current || '—'}
              </span>
            </div>
            <div className="space-y-5">

              {/* Temperature */}
              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>Temperature</label>
                  <span className="text-xs tabular-nums" style={{ color: 'var(--text-sec)' }}>{params.temperature}</span>
                </div>
                <input
                  type="range" min="0" max="2" step="0.05"
                  value={params.temperature}
                  onChange={e => updateParam('temperature', parseFloat(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: 'var(--accent1)' }}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--text-ter)' }}>
                  控制随机性。较低 = 更确定性，较高 = 更有创意
                </p>
              </div>

              {/* Top P */}
              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>Top P</label>
                  <span className="text-xs tabular-nums" style={{ color: 'var(--text-sec)' }}>{params.topP}</span>
                </div>
                <input
                  type="range" min="0" max="1" step="0.05"
                  value={params.topP}
                  onChange={e => updateParam('topP', parseFloat(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: 'var(--accent1)' }}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--text-ter)' }}>
                  核采样。限制令牌选择范围，通常与 Temperature 二选一
                </p>
              </div>

              {/* Top K */}
              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>Top K</label>
                  <span className="text-xs tabular-nums" style={{ color: 'var(--text-sec)' }}>{params.topK}</span>
                </div>
                <input
                  type="range" min="1" max="100" step="1"
                  value={params.topK}
                  onChange={e => updateParam('topK', parseInt(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: 'var(--accent1)' }}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--text-ter)' }}>
                  从概率最高的 K 个词中采样
                </p>
              </div>

              {/* Max Tokens */}
              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>Max Tokens</label>
                  <span className="text-xs tabular-nums" style={{ color: 'var(--text-sec)' }}>{params.maxTokens}</span>
                </div>
                <input
                  type="range" min="256" max="32768" step="256"
                  value={params.maxTokens}
                  onChange={e => updateParam('maxTokens', parseInt(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: 'var(--accent1)' }}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--text-ter)' }}>
                  单次响应最大 Token 数
                </p>
              </div>

              {/* Thinking */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>思维链 (Thinking)</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-ter)' }}>启用 AI 思考过程（Extended Thinking）</p>
                </div>
                <ToggleDot
                  on={params.thinking}
                  onChange={v => updateParam('thinking', v)}
                />
              </div>

              {/* Thinking Budget */}
              {params.thinking && (
                <div>
                  <div className="flex justify-between mb-1.5">
                    <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>思考预算 (Budget)</label>
                    <span className="text-xs tabular-nums" style={{ color: 'var(--text-sec)' }}>{params.thinkingBudget} tokens</span>
                  </div>
                  <input
                    type="range" min="1024" max="32000" step="512"
                    value={params.thinkingBudget}
                    onChange={e => updateParam('thinkingBudget', parseInt(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{ accentColor: 'var(--accent1)' }}
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--text-ter)' }}>
                    分配给 AI 思考过程的 Token 预算
                  </p>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSaveParams}
                  disabled={savingParams}
                  className={`${pillBtn(true)} w-full`}
                  style={{ background: 'var(--accent1)' }}
                >
                  {savingParams ? <Spinner size={14} /> : '保存参数'}
                </button>
              </div>
            </div>
          </div>
        </Card>
      )}

      <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>
        可用模型
      </p>
      {models.length === 0 && !loading && (
        <div
          className="rounded-[10px] border px-4 py-8 text-center text-sm mb-6"
          style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-secondary)', color: 'var(--text-ter)' }}
        >
          暂无可用模型
        </div>
      )}
      {models.map(m => (
        <div
          key={m.id}
          className="rounded-[10px] border px-4 py-3 flex justify-between items-center mb-2"
          style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-secondary)' }}
        >
          <div className="min-w-0">
            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              {m.name}
            </span>
            {m.description && (
              <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-ter)' }}>
                {m.description}
              </p>
            )}
          </div>
          {m.id === current ? (
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-md shrink-0"
              style={{ background: 'rgba(47,158,91,0.15)', color: 'var(--success)' }}
            >
              当前选择
            </span>
          ) : (
            <button
              type="button"
              onClick={() => handleSwitch(m.id)}
              disabled={switching !== null}
              className="text-xs px-3 py-1 rounded-md border shrink-0 transition-colors"
              style={{ borderColor: 'var(--accent1)', color: 'var(--accent1)' }}
            >
              {switching === m.id ? <Spinner size={12} /> : '切换'}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

interface MemoryEntry {
  key: string
  type?: string
  content?: string
  text?: string
  summary?: string
  tags?: string[]
  createdAt?: string | number
  updatedAt?: string | number
  score?: number
  [key: string]: unknown
}

function MemoryPanel() {
  const [loading, setLoading] = useState(false)
  const [entries, setEntries] = useState<MemoryEntry[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [deletingKey, setDeletingKey] = useState<string | null>(null)
  const [detailEntry, setDetailEntry] = useState<MemoryEntry | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveContent, setSaveContent] = useState('')
  const [saveType, setSaveType] = useState('note')
  const addToast = useToastStore(s => s.addToast)

  const loadEntries = async (query?: string) => {
    setLoading(true)
    try {
      let res
      if (query && query.trim()) {
        res = await window.openclaw?.memory.search({ query: query.trim(), limit: 50 })
      } else {
        res = await window.openclaw?.memory.list({ limit: 50 })
      }
      if (res?.success) {
        const data = res.data
        if (Array.isArray(data)) {
          setEntries(data as MemoryEntry[])
        } else if (data && typeof data === 'object' && 'results' in (data as Record<string, unknown>)) {
          setEntries(((data as Record<string, unknown>).results as MemoryEntry[]) ?? [])
        } else {
          setEntries([])
        }
      }
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchQuery(searchInput)
    loadEntries(searchInput)
  }

  const handleDelete = async (entry: MemoryEntry) => {
    if (!window.openclaw) return
    const key = entry.key || (entry as Record<string, unknown>).id as string
    if (!key) return
    setDeletingKey(key)
    try {
      const res = await window.openclaw.memory.delete({ key })
      if (res?.success) {
        setEntries(prev => prev.filter(e => (e.key || (e as Record<string, unknown>).id as string) !== key))
        addToast({ type: 'success', message: '记忆已删除', duration: 2000 })
        if (detailEntry && (detailEntry.key || (detailEntry as Record<string, unknown>).id as string) === key) {
          setDetailEntry(null)
        }
      } else {
        addToast({ type: 'error', message: '删除失败', duration: 3000 })
      }
    } catch {
      addToast({ type: 'error', message: '删除失败', duration: 3000 })
    } finally {
      setDeletingKey(null)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!saveContent.trim()) return
    setSaving(true)
    try {
      const res = await window.openclaw?.memory.store({
        type: saveType,
        content: saveContent.trim(),
      })
      if (res?.success) {
        setSaveContent('')
        addToast({ type: 'success', message: '记忆已保存', duration: 2000 })
        loadEntries(searchQuery)
      } else {
        addToast({ type: 'error', message: '保存失败', duration: 3000 })
      }
    } catch {
      addToast({ type: 'error', message: '保存失败', duration: 3000 })
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    loadEntries()
  }, [])

  const filteredEntries = filterType === 'all'
    ? entries
    : entries.filter(e => e.type === filterType)

  const types = Array.from(new Set(entries.map(e => e.type).filter(Boolean))) as string[]

  const formatDate = (v: string | number | undefined) => {
    if (!v) return '—'
    const d = typeof v === 'number' ? new Date(v * 1000) : new Date(v)
    return isNaN(d.getTime()) ? '—' : d.toLocaleString('zh-CN')
  }

  const displayContent = (entry: MemoryEntry) => {
    return entry.content || entry.text || entry.summary || ''
  }

  return (
    <div className="pb-10">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
            记忆管理
          </h1>
          <p className="text-sm mt-1 max-w-xl" style={{ color: 'var(--text-sec)' }}>
            AI 长期记忆中的所有条目。支持搜索、浏览和删除。
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadEntries(searchQuery)}
          className={pillBtn(false)}
          style={{ borderColor: 'var(--border)', color: 'var(--text-sec)' }}
          disabled={loading}
        >
          {loading ? <Spinner size={14} /> : '刷新'}
        </button>
      </div>

      {/* 保存新记忆 */}
      <Card className="mb-6 mt-6">
        <div className="px-5 py-4">
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
            保存新记忆
          </p>
          <form onSubmit={handleSave} className="flex gap-2">
            <select
              value={saveType}
              onChange={e => setSaveType(e.target.value)}
              className="text-xs px-2 py-2 rounded-lg border shrink-0"
              style={{ borderColor: 'var(--border)', color: 'var(--text-sec)', background: 'var(--bg-container)' }}
            >
              <option value="note">笔记</option>
              <option value="fact">事实</option>
              <option value="preference">偏好</option>
              <option value="todo">待办</option>
              <option value="summary">摘要</option>
            </select>
            <textarea
              value={saveContent}
              onChange={e => setSaveContent(e.target.value)}
              placeholder="输入要保存的记忆内容…"
              rows={2}
              className="flex-1 text-sm px-3 py-2 rounded-lg border resize-none min-w-0"
              style={{
                borderColor: 'var(--border)',
                color: 'var(--text)',
                background: 'var(--bg-container)',
              }}
            />
            <button
              type="submit"
              disabled={saving || !saveContent.trim()}
              className={`${pillBtn(true)} shrink-0`}
              style={{ background: 'var(--accent1)', opacity: saving || !saveContent.trim() ? 0.5 : 1 }}
            >
              {saving ? <Spinner size={14} /> : '保存'}
            </button>
          </form>
        </div>
      </Card>

      {/* 搜索栏 */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="搜索记忆…"
            className="w-full text-sm px-4 py-2.5 pl-10 rounded-[10px] border"
            style={{ borderColor: 'var(--border)', color: 'var(--text)', background: 'var(--bg-container)' }}
          />
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-xs"
            style={{ color: 'var(--text-ter)' }}
          >
            🔍
          </span>
        </div>
        <button type="submit" className={`${pillBtn(true)} shrink-0`} style={{ background: 'var(--accent1)' }}>
          搜索
        </button>
      </form>

      {/* 过滤器 */}
      {types.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              filterType === 'all' ? 'text-white border-transparent' : ''
            }`}
            style={
              filterType === 'all'
                ? { background: 'var(--accent1)' }
                : { borderColor: 'var(--border)', color: 'var(--text-sec)', background: 'var(--bg-container)' }
            }
          >
            全部 ({entries.length})
          </button>
          {types.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setFilterType(t)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                filterType === t ? 'text-white border-transparent' : ''
              }`}
              style={
                filterType === t
                  ? { background: 'var(--accent1)' }
                  : { borderColor: 'var(--border)', color: 'var(--text-sec)', background: 'var(--bg-container)' }
              }
            >
              {t} ({entries.filter(e => e.type === t).length})
            </button>
          ))}
        </div>
      )}

      {/* 记忆列表 */}
      {loading && entries.length === 0 ? (
        <div className="text-center py-12 text-sm" style={{ color: 'var(--text-sec)' }}>
          <Spinner size={24} />
          <p className="mt-3">加载中…</p>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div
          className="rounded-[12px] border py-12 px-6 text-center"
          style={{ borderColor: 'var(--border)' }}
        >
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            {searchQuery ? '未找到匹配的记忆' : '暂无记忆数据'}
          </p>
          <p className="text-xs mt-2" style={{ color: 'var(--text-ter)' }}>
            {searchQuery ? '尝试其他关键词，或先保存新记忆' : '在对话框中与 AI 对话，AI 会自动保存重要信息到记忆'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredEntries.map((entry, i) => {
            const key = entry.key || `entry-${i}`
            const content = displayContent(entry)
            const isOpen = detailEntry && (detailEntry.key || `detail-${i}`) === key

            return (
              <Card key={key}>
                <div className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {entry.type && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                            style={{
                              background: 'rgba(99,102,241,0.1)',
                              color: '#6366f1',
                            }}
                          >
                            {entry.type}
                          </span>
                        )}
                        {entry.score !== undefined && (
                          <span className="text-[10px]" style={{ color: 'var(--text-ter)' }}>
                            相关度 {Math.round(entry.score * 100)}%
                          </span>
                        )}
                        <span className="text-[10px]" style={{ color: 'var(--text-ter)' }}>
                          {formatDate(entry.createdAt || (entry as Record<string, unknown>).createdAt as string | number)}
                        </span>
                      </div>
                      <p
                        className="text-sm leading-relaxed line-clamp-2"
                        style={{ color: 'var(--text)' }}
                      >
                        {content || <span style={{ color: 'var(--text-ter)' }}>（无内容）</span>}
                      </p>
                      {entry.tags && entry.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {entry.tags.map(tag => (
                            <span
                              key={tag}
                              className="text-[10px] px-1.5 py-0.5 rounded"
                              style={{ background: 'var(--bg-subtle)', color: 'var(--text-ter)' }}
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setDetailEntry(isOpen ? null : entry)}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs transition-colors"
                        style={{ background: 'var(--bg-subtle)', color: 'var(--text-sec)' }}
                        title="查看详情"
                      >
                        {isOpen ? '−' : '+'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(entry)}
                        disabled={deletingKey === key}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs transition-colors"
                        style={{ color: deletingKey === key ? 'var(--text-ter)' : 'var(--danger)' }}
                        title="删除"
                      >
                        {deletingKey === key ? <Spinner size={12} /> : '×'}
                      </button>
                    </div>
                  </div>

                  {/* 详情展开 */}
                  {isOpen && (
                    <div
                      className="mt-3 pt-3 text-sm leading-relaxed"
                      style={{ borderTop: '1px solid var(--border-secondary)', color: 'var(--text-sec)' }}
                    >
                      <pre
                        className="whitespace-pre-wrap break-all text-xs"
                        style={{ fontFamily: 'monospace' }}
                      >
                        {content || '（无内容）'}
                      </pre>
                      {entry.updatedAt && (
                        <p className="text-[10px] mt-2" style={{ color: 'var(--text-ter)' }}>
                          更新于：{formatDate(entry.updatedAt)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface HookEntry {
  id?: string
  key?: string
  event?: string
  prompt?: string
  enabled?: boolean
  createdAt?: string | number
  updatedAt?: string | number
}

interface HookRun {
  id?: string
  hookId?: string
  triggeredAt?: string | number
  duration?: number
  success?: boolean
  error?: string
}

function HooksPanel() {
  const [loading, setLoading] = useState(false)
  const [hooks, setHooks] = useState<HookEntry[]>([])
  const [runs, setRuns] = useState<HookRun[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [formEvent, setFormEvent] = useState('agent.completed')
  const [formPrompt, setFormPrompt] = useState('')
  const [formId, setFormId] = useState('')
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [expandedRun, setExpandedRun] = useState<string | null>(null)
  const addToast = useToastStore(s => s.addToast)

  // OpenClaw 支持的事件类型
  const eventTypes = [
    { value: 'agent.started', label: 'agent.started', desc: 'Agent 开始运行时触发' },
    { value: 'agent.completed', label: 'agent.completed', desc: 'Agent 完成运行时触发' },
    { value: 'agent.error', label: 'agent.error', desc: 'Agent 运行出错时触发' },
    { value: 'chat.received', label: 'chat.received', desc: '收到新消息时触发' },
    { value: 'chat.sent', label: 'chat.sent', desc: '发送消息时触发' },
    { value: 'session.created', label: 'session.created', desc: '创建新会话时触发' },
    { value: 'session.deleted', label: 'session.deleted', desc: '删除会话时触发' },
    { value: 'cron.triggered', label: 'cron.triggered', desc: '定时任务触发时' },
    { value: 'cron.completed', label: 'cron.completed', desc: '定时任务完成时' },
    { value: 'gateway.started', label: 'gateway.started', desc: 'Gateway 启动时' },
    { value: 'gateway.stopped', label: 'gateway.stopped', desc: 'Gateway 停止时' },
  ]

  const loadHooks = async () => {
    setLoading(true)
    try {
      const [hooksRes, runsRes] = await Promise.allSettled([
        window.openclaw?.hooks.list(),
        window.openclaw?.hooks.runs({ limit: 30 }),
      ])

      if (hooksRes?.status === 'fulfilled' && hooksRes.value?.success) {
        const data = hooksRes.value.data
        if (Array.isArray(data)) {
          setHooks(data as HookEntry[])
        } else if (data && typeof data === 'object' && 'hooks' in (data as Record<string, unknown>)) {
          setHooks(((data as Record<string, unknown>).hooks as HookEntry[]) ?? [])
        } else {
          setHooks([])
        }
      } else {
        setHooks([])
      }

      if (runsRes?.status === 'fulfilled' && runsRes.value?.success) {
        const data = runsRes.value.data
        if (Array.isArray(data)) {
          setRuns(data as HookRun[])
        } else if (data && typeof data === 'object' && 'runs' in (data as Record<string, unknown>)) {
          setRuns(((data as Record<string, unknown>).runs as HookRun[]) ?? [])
        } else {
          setRuns([])
        }
      }
    } catch {
      setHooks([])
      setRuns([])
    } finally {
      setLoading(false)
    }
  }

  const handleAddHook = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formEvent) return
    setSaving(true)
    try {
      const res = await window.openclaw?.hooks.add({
        id: formId.trim() || undefined,
        event: formEvent,
        prompt: formPrompt.trim() || undefined,
        enabled: true,
      })
      if (res?.success) {
        setFormEvent('agent.completed')
        setFormPrompt('')
        setFormId('')
        setShowAddForm(false)
        addToast({ type: 'success', message: '自动化规则添加成功', duration: 2000 })
        loadHooks()
      } else {
        addToast({ type: 'error', message: '添加失败', duration: 3000 })
      }
    } catch {
      addToast({ type: 'error', message: '添加失败', duration: 3000 })
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveHook = async (hook: HookEntry) => {
    const id = hook.id || hook.key
    if (!id) return
    setRemovingId(id)
    try {
      const res = await window.openclaw?.hooks.remove({ id })
      if (res?.success) {
        setHooks(prev => prev.filter(h => (h.id || h.key) !== id))
        addToast({ type: 'success', message: '自动化规则已删除', duration: 2000 })
      } else {
        addToast({ type: 'error', message: '删除失败', duration: 3000 })
      }
    } catch {
      addToast({ type: 'error', message: '删除失败', duration: 3000 })
    } finally {
      setRemovingId(null)
    }
  }

  useEffect(() => {
    loadHooks()
  }, [])

  const formatDate = (v: string | number | undefined) => {
    if (!v) return '—'
    const d = typeof v === 'number' ? new Date(v * 1000) : new Date(v)
    return isNaN(d.getTime()) ? '—' : d.toLocaleString('zh-CN')
  }

  const formatDuration = (ms?: number) => {
    if (ms === undefined) return '—'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  return (
    <div className="pb-10">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
            自动化
          </h1>
          <p className="text-sm mt-1 max-w-xl" style={{ color: 'var(--text-sec)' }}>
            配置事件驱动的自动化规则。Hook 在指定事件触发时自动执行 AI 指令。
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={loadHooks}
            className={pillBtn(false)}
            style={{ borderColor: 'var(--border)', color: 'var(--text-sec)' }}
            disabled={loading}
          >
            {loading ? <Spinner size={14} /> : '刷新'}
          </button>
          <button
            type="button"
            className={pillBtn(true)}
            style={{ background: 'var(--accent1)' }}
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? '取消' : '添加规则'}
          </button>
        </div>
      </div>

      {/* 添加规则表单 */}
      {showAddForm && (
        <Card className="mb-6 mt-4">
          <div className="px-5 py-4">
            <p className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>
              添加自动化规则
            </p>
            <form onSubmit={handleAddHook} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-sec)' }}>
                    规则 ID（可选，用于引用）
                  </label>
                  <input
                    type="text"
                    value={formId}
                    onChange={e => setFormId(e.target.value)}
                    placeholder="例如: notify-on-complete"
                    className="w-full text-sm px-3 py-2 rounded-lg border"
                    style={{ borderColor: 'var(--border)', color: 'var(--text)', background: 'var(--bg-container)' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-sec)' }}>
                    触发事件 <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <select
                    value={formEvent}
                    onChange={e => setFormEvent(e.target.value)}
                    required
                    className="w-full text-sm px-3 py-2 rounded-lg border"
                    style={{ borderColor: 'var(--border)', color: 'var(--text)', background: 'var(--bg-container)' }}
                  >
                    {eventTypes.map(ev => (
                      <option key={ev.value} value={ev.value}>{ev.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 事件说明 */}
              {(() => {
                const ev = eventTypes.find(e => e.value === formEvent)
                return ev ? (
                  <p className="text-xs" style={{ color: 'var(--text-ter)' }}>
                    {ev.desc}
                  </p>
                ) : null
              })()}

              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-sec)' }}>
                  自动化指令（prompt，可选）
                </label>
                <textarea
                  value={formPrompt}
                  onChange={e => setFormPrompt(e.target.value)}
                  placeholder="事件触发时执行的指令，例如：总结对话并保存到记忆 / 发送通知"
                  rows={3}
                  className="w-full text-sm px-3 py-2 rounded-lg border resize-none"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)', background: 'var(--bg-container)' }}
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saving || !formEvent}
                  className={pillBtn(true)}
                  style={{ background: 'var(--accent1)', opacity: saving || !formEvent ? 0.5 : 1 }}
                >
                  {saving ? <Spinner size={14} /> : '创建规则'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className={pillBtn(false)}
                  style={{ borderColor: 'var(--border)', color: 'var(--text-sec)' }}
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </Card>
      )}

      {/* Hook 列表 */}
      {hooks.length > 0 && (
        <>
          <p className="text-sm font-semibold mb-3 mt-4" style={{ color: 'var(--text)' }}>
            已配置的规则 ({hooks.length})
          </p>
          <div className="space-y-2">
            {hooks.map((hook, i) => {
              const id = hook.id || hook.key || `hook-${i}`
              return (
                <Card key={id}>
                  <div className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {hook.id && (
                            <span className="text-sm font-mono font-semibold" style={{ color: 'var(--text)' }}>
                              {hook.id}
                            </span>
                          )}
                          <span
                            className="text-[10px] px-2 py-0.5 rounded font-mono font-medium"
                            style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}
                          >
                            {hook.event || '—'}
                          </span>
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                            style={{
                              background: hook.enabled !== false ? 'rgba(47,158,91,0.15)' : 'rgba(0,0,0,0.06)',
                              color: hook.enabled !== false ? 'var(--success)' : 'var(--text-ter)',
                            }}
                          >
                            {hook.enabled !== false ? '已启用' : '已禁用'}
                          </span>
                        </div>
                        {hook.prompt && (
                          <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--text-sec)' }}>
                            {hook.prompt}
                          </p>
                        )}
                        <p className="text-[10px] mt-1" style={{ color: 'var(--text-ter)' }}>
                          创建于: {formatDate(hook.createdAt || (hook as Record<string, unknown>).createdAt as string | number)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveHook(hook)}
                        disabled={removingId === id}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 transition-colors"
                        style={{ color: removingId === id ? 'var(--text-ter)' : 'var(--danger)' }}
                        title="删除规则"
                      >
                        {removingId === id ? <Spinner size={12} /> : '×'}
                      </button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {/* 空状态 */}
      {hooks.length === 0 && !loading && (
        <div
          className="mt-8 rounded-[12px] border py-16 px-6 text-center"
          style={{ borderColor: 'var(--border)' }}
        >
          <button
            type="button"
            className={pillBtn(true)}
            style={{ background: 'var(--accent1)' }}
            onClick={() => setShowAddForm(true)}
          >
            添加第一条规则
          </button>
          <p className="text-sm font-medium mt-4" style={{ color: 'var(--text)' }}>
            尚未配置自动化规则
          </p>
          <p className="text-xs mt-2 max-w-sm mx-auto" style={{ color: 'var(--text-ter)' }}>
            自动化规则会在指定事件发生时自动执行，例如：Agent 完成时保存摘要、定时任务触发时通知等。
          </p>
        </div>
      )}

      {/* 执行历史 */}
      {runs.length > 0 && (
        <>
          <p className="text-sm font-semibold mb-3 mt-8" style={{ color: 'var(--text)' }}>
            执行历史 ({runs.length})
          </p>
          <div className="space-y-2">
            {runs.map((run, i) => {
              const id = run.id || `run-${i}`
              const isExpanded = expandedRun === id
              return (
                <Card key={id}>
                  <div className="px-4 py-3">
                    <button
                      type="button"
                      className="w-full flex items-start gap-3 text-left"
                      onClick={() => setExpandedRun(isExpanded ? null : id)}
                    >
                      <span
                        className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                        style={{ background: run.success !== false ? 'var(--success)' : 'var(--danger)' }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-medium" style={{ color: 'var(--text)' }}>
                            {run.hookId || '—'}
                          </span>
                          <span className="text-[10px]" style={{ color: 'var(--text-ter)' }}>
                            {formatDate(run.triggeredAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                            style={{
                              background: run.success !== false ? 'rgba(47,158,91,0.1)' : 'rgba(239,68,68,0.1)',
                              color: run.success !== false ? 'var(--success)' : 'var(--danger)',
                            }}
                          >
                            {run.success !== false ? '成功' : '失败'}
                          </span>
                          <span className="text-[10px]" style={{ color: 'var(--text-ter)' }}>
                            耗时: {formatDuration(run.duration)}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs shrink-0 mt-0.5" style={{ color: 'var(--text-ter)' }}>
                        {isExpanded ? '−' : '+'}
                      </span>
                    </button>

                    {isExpanded && (
                      <div
                        className="mt-3 pt-3"
                        style={{ borderTop: '1px solid var(--border-secondary)' }}
                      >
                        {run.error ? (
                          <pre
                            className="text-xs whitespace-pre-wrap break-all"
                            style={{ color: 'var(--danger)', fontFamily: 'monospace' }}
                          >
                            {run.error}
                          </pre>
                        ) : (
                          <p className="text-xs" style={{ color: 'var(--text-sec)' }}>
                            执行成功，无错误信息
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function McpPanel() {
  const [loading, setLoading] = useState(false)
  const [tools, setTools] = useState<Array<{ name: string; description?: string; enabled?: boolean; source?: string }>>([])
  const [servers, setServers] = useState<Array<{ name: string; type: string; url?: string; command?: string[]; args?: string[]; enabled?: boolean }>>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [addingType, setAddingType] = useState<'sse' | 'stdio'>('sse')
  const [formName, setFormName] = useState('')
  const [formUrl, setFormUrl] = useState('')
  const [formCommand, setFormCommand] = useState('')
  const [formArgs, setFormArgs] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingServer, setDeletingServer] = useState<string | null>(null)
  const [expandedServer, setExpandedServer] = useState<string | null>(null)
  const addToast = useToastStore(s => s.addToast)

  const loadTools = async () => {
    setLoading(true)
    try {
      const [toolRes, configRes] = await Promise.allSettled([
        window.openclaw?.tools.catalog({ includePlugins: true }),
        window.openclaw?.config.get(),
      ])

      if (toolRes?.status === 'fulfilled' && toolRes.value?.success && Array.isArray(toolRes.value.data)) {
        setTools(toolRes.value.data as typeof tools)
      }

      if (configRes?.status === 'fulfilled' && configRes.value?.success) {
        const cfg = configRes.value.data as Record<string, unknown>
        const mcpServers = (cfg.mcp as Record<string, unknown>) ?? {}
        const serverList = Object.entries(mcpServers).map(([name, val]) => {
          const v = val as Record<string, unknown>
          return {
            name,
            type: v.type as string ?? (v.command ? 'stdio' : 'sse'),
            url: v.url as string | undefined,
            command: v.command as string[] | undefined,
            args: v.args as string[] | undefined,
            enabled: v.enabled as boolean ?? true,
          }
        })
        setServers(serverList)
      }
    } catch {
      // keep empty
    } finally {
      setLoading(false)
    }
  }

  const handleAddServer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) return
    setSaving(true)
    try {
      const res = await window.openclaw?.config.get()
      if (res?.success && res.data) {
        const cfg = res.data as Record<string, unknown>
        const mcpServers = { ...((cfg.mcp as Record<string, unknown>) ?? {}) }

        if (addingType === 'sse') {
          mcpServers[formName.trim()] = {
            type: 'sse',
            url: formUrl.trim(),
            enabled: true,
          }
        } else {
          const argsArr = formArgs.trim()
            ? formArgs.trim().split(/\s+/)
            : []
          mcpServers[formName.trim()] = {
            type: 'stdio',
            command: formCommand.trim().split(/\s+/),
            args: argsArr,
            enabled: true,
          }
        }

        const patchRes = await window.openclaw?.config.patch({ raw: { mcp: mcpServers } })
        if (patchRes?.success) {
          await window.openclaw?.config.apply()
          setFormName('')
          setFormUrl('')
          setFormCommand('')
          setFormArgs('')
          setShowAddForm(false)
          addToast({ type: 'success', message: `MCP 服务 "${formName.trim()}" 添加成功`, duration: 2000 })
          loadTools()
        } else {
          addToast({ type: 'error', message: '保存配置失败', duration: 3000 })
        }
      }
    } catch {
      addToast({ type: 'error', message: '添加 MCP 服务失败', duration: 3000 })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteServer = async (name: string) => {
    setDeletingServer(name)
    try {
      const res = await window.openclaw?.config.get()
      if (res?.success && res.data) {
        const cfg = res.data as Record<string, unknown>
        const mcpServers = { ...((cfg.mcp as Record<string, unknown>) ?? {}) }
        delete mcpServers[name]
        const patchRes = await window.openclaw?.config.patch({ raw: { mcp: mcpServers } })
        if (patchRes?.success) {
          await window.openclaw?.config.apply()
          setServers(prev => prev.filter(s => s.name !== name))
          addToast({ type: 'success', message: `已删除 ${name}`, duration: 2000 })
        } else {
          addToast({ type: 'error', message: '删除失败', duration: 3000 })
        }
      }
    } catch {
      addToast({ type: 'error', message: '删除失败', duration: 3000 })
    } finally {
      setDeletingServer(null)
    }
  }

  useEffect(() => {
    loadTools()
  }, [])

  // 快速模板
  const quickTemplates = [
    {
      id: 'filesystem',
      name: 'File System',
      type: 'stdio' as const,
      command: 'npx',
      args: '-y @modelcontextprotocol/server-filesystem',
      desc: '访问本地文件系统',
    },
    {
      id: 'brave-search',
      name: 'Brave Search',
      type: 'http' as const,
      url: '',
      command: 'npx',
      args: '-y @modelcontextprotocol/server-brave-search',
      desc: '网页搜索',
    },
    {
      id: 'sqlite',
      name: 'SQLite',
      type: 'stdio' as const,
      command: 'npx',
      args: '-y @modelcontextprotocol/server-sqlite',
      desc: '本地 SQLite 数据库',
    },
    {
      id: 'fetch',
      name: 'Web Fetch',
      type: 'stdio' as const,
      command: 'npx',
      args: '-y @modelcontextprotocol/server-fetch',
      desc: '获取网页内容',
    },
  ]

  const handleQuickAdd = async (tpl: typeof quickTemplates[0]) => {
    setSaving(true)
    try {
      const res = await window.openclaw?.config.get()
      if (res?.success && res.data) {
        const cfg = res.data as Record<string, unknown>
        const mcpServers = { ...((cfg.mcp as Record<string, unknown>) ?? {}) }
        const argsArr = tpl.args.split(/\s+/)

        if (tpl.type === 'http') {
          mcpServers[tpl.name] = { type: 'sse', url: tpl.url || 'http://localhost:8080/sse', enabled: true }
        } else {
          mcpServers[tpl.name] = {
            type: 'stdio',
            command: [tpl.command, ...argsArr.slice(1)],
            enabled: true,
          }
        }

        const patchRes = await window.openclaw?.config.patch({ raw: { mcp: mcpServers } })
        if (patchRes?.success) {
          await window.openclaw?.config.apply()
          addToast({ type: 'success', message: `${tpl.name} 添加成功，请配置 API Key`, duration: 3000 })
          loadTools()
        }
      }
    } catch {
      addToast({ type: 'error', message: '添加失败', duration: 3000 })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="pb-10">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
            MCP 服务
          </h1>
          <p className="text-sm mt-1 max-w-xl" style={{ color: 'var(--text-sec)' }}>
            MCP（模型上下文协议）服务为 Agent 扩展外部工具 — 文件系统、数据库、网页搜索等。
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={loadTools}
            className={pillBtn(false)}
            style={{ borderColor: 'var(--border)', color: 'var(--text-sec)' }}
            disabled={loading}
          >
            {loading ? <Spinner size={14} /> : '刷新'}
          </button>
          <button
            type="button"
            className={pillBtn(true)}
            style={{ background: 'var(--accent1)' }}
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? '取消' : '添加服务'}
          </button>
        </div>
      </div>

      {/* 添加服务表单 */}
      {showAddForm && (
        <Card className="mb-6 mt-4">
          <div className="px-5 py-4">
            <p className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>
              添加 MCP 服务
            </p>

            {/* 类型选择 */}
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setAddingType('sse')}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${addingType === 'sse' ? 'text-white border-transparent' : ''}`}
                style={addingType === 'sse' ? { background: 'var(--accent1)' } : { borderColor: 'var(--border)', color: 'var(--text-sec)' }}
              >
                HTTP/SSE（远程服务）
              </button>
              <button
                type="button"
                onClick={() => setAddingType('stdio')}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${addingType === 'stdio' ? 'text-white border-transparent' : ''}`}
                style={addingType === 'stdio' ? { background: 'var(--accent1)' } : { borderColor: 'var(--border)', color: 'var(--text-sec)' }}
              >
                Stdio（本地进程）
              </button>
            </div>

            <form onSubmit={handleAddServer} className="space-y-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-sec)' }}>服务名称</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="例如: my-filesystem"
                  required
                  className="w-full text-sm px-3 py-2 rounded-lg border"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)', background: 'var(--bg-container)' }}
                />
              </div>

              {addingType === 'sse' ? (
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-sec)' }}>服务 URL</label>
                  <input
                    type="url"
                    value={formUrl}
                    onChange={e => setFormUrl(e.target.value)}
                    placeholder="https://your-mcp-server.com/sse"
                    required
                    className="w-full text-sm px-3 py-2 rounded-lg border"
                    style={{ borderColor: 'var(--border)', color: 'var(--text)', background: 'var(--bg-container)' }}
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--text-ter)' }}>
                    MCP SSE 服务器的 URL，协议为 HTTP GET /sse 端点
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-sec)' }}>命令</label>
                    <input
                      type="text"
                      value={formCommand}
                      onChange={e => setFormCommand(e.target.value)}
                      placeholder="npx / uvx / python"
                      required
                      className="w-full text-sm px-3 py-2 rounded-lg border"
                      style={{ borderColor: 'var(--border)', color: 'var(--text)', background: 'var(--bg-container)' }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-sec)' }}>参数（空格分隔）</label>
                    <input
                      type="text"
                      value={formArgs}
                      onChange={e => setFormArgs(e.target.value)}
                      placeholder="-y @modelcontextprotocol/server-filesystem ~/projects"
                      className="w-full text-sm px-3 py-2 rounded-lg border"
                      style={{ borderColor: 'var(--border)', color: 'var(--text)', background: 'var(--bg-container)' }}
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--text-ter)' }}>
                      例如: -y @modelcontextprotocol/server-filesystem /home/user
                    </p>
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving || !formName.trim()}
                  className={pillBtn(true)}
                  style={{ background: 'var(--accent1)', opacity: saving || !formName.trim() ? 0.5 : 1 }}
                >
                  {saving ? <Spinner size={14} /> : '添加服务'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className={pillBtn(false)}
                  style={{ borderColor: 'var(--border)', color: 'var(--text-sec)' }}
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </Card>
      )}

      {/* 已配置的服务列表 */}
      {servers.length > 0 && (
        <>
          <p className="text-sm font-semibold mb-3 mt-6" style={{ color: 'var(--text)' }}>
            已配置的服务 ({servers.length})
          </p>
          <div className="space-y-2">
            {servers.map(server => (
              <Card key={server.name}>
                <div className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                          {server.name}
                        </span>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                          style={{
                            background: server.type === 'sse' ? 'rgba(99,102,241,0.1)' : 'rgba(47,158,91,0.1)',
                            color: server.type === 'sse' ? '#6366f1' : 'var(--success)',
                          }}
                        >
                          {server.type === 'sse' ? 'HTTP/SSE' : 'Stdio'}
                        </span>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                          style={{
                            background: server.enabled ? 'rgba(47,158,91,0.15)' : 'rgba(0,0,0,0.06)',
                            color: server.enabled ? 'var(--success)' : 'var(--text-ter)',
                          }}
                        >
                          {server.enabled ? '运行中' : '已禁用'}
                        </span>
                      </div>
                      {server.type === 'sse' ? (
                        <p className="text-xs truncate" style={{ color: 'var(--text-ter)' }}>
                          {server.url || '—'}
                        </p>
                      ) : (
                        <p className="text-xs truncate font-mono" style={{ color: 'var(--text-ter)' }}>
                          {(server.command ?? []).join(' ')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setExpandedServer(expandedServer === server.name ? null : server.name)}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs transition-colors"
                        style={{ background: 'var(--bg-subtle)', color: 'var(--text-sec)' }}
                        title="详情"
                      >
                        {expandedServer === server.name ? '−' : '+'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteServer(server.name)}
                        disabled={deletingServer === server.name}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs transition-colors"
                        style={{ color: deletingServer === server.name ? 'var(--text-ter)' : 'var(--danger)' }}
                        title="删除"
                      >
                        {deletingServer === server.name ? <Spinner size={12} /> : '×'}
                      </button>
                    </div>
                  </div>

                  {expandedServer === server.name && (
                    <div
                      className="mt-3 pt-3 space-y-1"
                      style={{ borderTop: '1px solid var(--border-secondary)' }}
                    >
                      {server.type === 'sse' ? (
                        <p className="text-xs" style={{ color: 'var(--text-sec)' }}>
                          <span className="font-medium">URL:</span> {server.url}
                        </p>
                      ) : (
                        <>
                          <p className="text-xs" style={{ color: 'var(--text-sec)' }}>
                            <span className="font-medium">Command:</span> {server.command?.join(' ')}
                          </p>
                          {server.args && server.args.length > 0 && (
                            <p className="text-xs" style={{ color: 'var(--text-sec)' }}>
                              <span className="font-medium">Args:</span> {server.args.join(' ')}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* 工具列表 */}
      {tools.length > 0 && (
        <>
          <p className="text-sm font-semibold mb-3 mt-8" style={{ color: 'var(--text)' }}>
            可用工具 ({tools.length})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {tools.map(tool => (
              <Card key={tool.name}>
                <div className="px-3 py-2.5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                      {tool.name}
                    </span>
                    {tool.enabled !== undefined && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0"
                        style={{
                          background: tool.enabled ? 'rgba(47,158,91,0.15)' : 'rgba(0,0,0,0.06)',
                          color: tool.enabled ? 'var(--success)' : 'var(--text-ter)',
                        }}
                      >
                        {tool.enabled ? '已启用' : '已禁用'}
                      </span>
                    )}
                  </div>
                  {tool.description && (
                    <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--text-sec)' }}>
                      {tool.description}
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* 空状态 */}
      {servers.length === 0 && tools.length === 0 && !loading && (
        <div
          className="mt-8 rounded-[12px] border py-16 px-6 text-center"
          style={{ borderColor: 'var(--border)' }}
        >
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            尚未配置 MCP 服务
          </p>
          <p className="text-xs mt-2 max-w-sm mx-auto" style={{ color: 'var(--text-ter)' }}>
            点击「添加服务」连接你的第一个 MCP 工具提供方。
          </p>
        </div>
      )}

      {/* 快速添加模板 */}
      <p className="text-sm font-semibold mt-10 mb-1" style={{ color: 'var(--text)' }}>
        快速添加模板
      </p>
      <p className="text-xs mb-4" style={{ color: 'var(--text-ter)' }}>
        一键添加常用 MCP 服务
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {quickTemplates.map(tpl => (
          <Card key={tpl.id}>
            <div className="px-4 py-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                    {tpl.name}
                  </span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                    style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}
                  >
                    {tpl.type === 'stdio' ? 'Stdio' : 'HTTP'}
                  </span>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-sec)' }}>
                  {tpl.desc}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleQuickAdd(tpl)}
                disabled={saving || servers.some(s => s.name === tpl.name)}
                className={`${pillBtn(true)} text-xs shrink-0`}
                style={{
                  background: servers.some(s => s.name === tpl.name) ? 'var(--success)' : 'var(--accent1)',
                  opacity: saving ? 0.5 : 1,
                }}
              >
                {servers.some(s => s.name === tpl.name) ? '已添加' : saving ? <Spinner size={12} /> : '+ 添加'}
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

/**
 * Static fallback data for SkillsPanel — rendered ONLY when the real API
 * is unavailable (e.g., Gateway disconnected). In normal operation the panel
 * loads skills from openclaw.skills.status() and this data is ignored.
 */
const FALLBACK_SKILLS = [
  {
    name: '1password',
    badge: '内置',
    desc: '配置 1Password CLI（op）并与桌面应用集成，供 Agent 安全读取密钥片段。',
    warn: null as string | null,
  },
  {
    name: 'session-logs',
    badge: '内置',
    desc: '使用 jq 等工具检索、分析会话日志，便于排查问题。',
    warn: '缺少可执行文件: rg',
  },
  {
    name: 'skill-creator',
    badge: '内置',
    desc: '指导为 Claude 编写高质量 Skill 的说明与模板。',
    warn: null,
  },
  {
    name: 'tmux',
    badge: '内置',
    desc: '远程控制 tmux 会话并抓取 pane 输出。',
    warn: null,
  },
]

interface SkillItem {
  name: string
  badge: string
  desc: string
  warn: string | null
}

function SkillsPanel() {
  const [filter, setFilter] = useState<'all' | 'avail' | 'installed' | 'paid'>('all')
  const [skills, setSkills] = useState<SkillItem[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)

  const pills: { id: typeof filter; label: string }[] = [
    { id: 'all', label: '全部' },
    { id: 'avail', label: '可用' },
    { id: 'installed', label: '已安装' },
    { id: 'paid', label: '消耗积分' },
  ]

  const reloadSkills = () => {
    if (!window.openclaw) {
      setSkills(FALLBACK_SKILLS)
      setLoading(false)
      return
    }
    setLoading(true)
    window.openclaw.skills.status().then((res) => {
      if (res.success && Array.isArray(res.data)) {
        const data = res.data as Array<{
          name?: string
          skillKey?: string
          description?: string
          enabled?: boolean
          category?: string
        }>
        setSkills(
          data.map((s) => ({
            name: s.skillKey || s.name || '未知',
            badge: s.enabled ? '已启用' : '已禁用',
            desc: s.description || '',
            warn: null,
          }))
        )
      } else {
        setSkills(FALLBACK_SKILLS)
      }
      setLoading(false)
    }).catch(() => {
      setSkills(FALLBACK_SKILLS)
      setLoading(false)
    })
  }

  async function toggleSkill(skill: SkillItem) {
    if (!window.openclaw || toggling) return
    const isEnabled = skill.badge === '已启用'
    setToggling(skill.name)
    try {
      await window.openclaw.skills.update({ skillKey: skill.name, enabled: !isEnabled })
      await reloadSkills()
    } catch (err) {
      console.error('切换技能失败:', err)
    } finally {
      setToggling(null)
    }
  }

  useEffect(() => {
    if (!window.openclaw) {
      setSkills(FALLBACK_SKILLS)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    window.openclaw.skills.status().then((res) => {
      if (cancelled) return
      if (res.success && Array.isArray(res.data)) {
        const data = res.data as Array<{
          name?: string
          skillKey?: string
          description?: string
          enabled?: boolean
          category?: string
        }>
        setSkills(
          data.map((s) => ({
            name: s.skillKey || s.name || '未知',
            badge: s.enabled ? '已启用' : '已禁用',
            desc: s.description || '',
            warn: null,
          }))
        )
      } else {
        setSkills(FALLBACK_SKILLS)
      }
      setLoading(false)
    }).catch(() => {
      if (!cancelled) setSkills(FALLBACK_SKILLS)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const filteredSkills = skills.filter((s) => {
    if (filter === 'installed') return s.badge === '已启用'
    if (filter === 'avail') return s.badge === '已禁用'
    if (filter === 'paid') return s.warn !== null
    return true
  })

  return (
    <div className="pb-10">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
            技能
          </h1>
          <p className="text-sm mt-2 max-w-2xl leading-relaxed" style={{ color: 'var(--text-sec)' }}>
            技能为 AI 提供专业能力（网页搜索、图像生成等）。关闭不常用的技能有助于节省积分消耗。
          </p>
        </div>
        <button
          type="button"
          className={pillBtn(false)}
          style={{ borderColor: 'var(--border)', color: 'var(--text-sec)' }}
          onClick={reloadSkills}
        >
          刷新
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mt-6 mb-5">
        {pills.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setFilter(p.id)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filter === p.id ? 'text-white border-transparent' : ''
            }`}
            style={
              filter === p.id
                ? { background: 'var(--accent1)' }
                : { borderColor: 'var(--border)', color: 'var(--text-sec)', background: 'var(--bg-container)' }
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-sm" style={{ color: 'var(--text-sec)' }}>
            加载中...
          </div>
        ) : filteredSkills.length === 0 ? (
          <div className="text-center py-8 text-sm" style={{ color: 'var(--text-sec)' }}>
            暂无技能数据
          </div>
        ) : (
          filteredSkills.map((s) => (
            <Card key={s.name}>
              <div className="px-4 py-4 flex gap-4 items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                      {s.name}
                    </span>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                      style={{ background: 'var(--bg-subtle)', color: 'var(--text-sec)' }}
                    >
                      {s.badge}
                    </span>
                  </div>
                  <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--text-sec)' }}>
                    {s.desc}
                  </p>
                  {s.warn ? (
                    <p className="text-xs mt-2" style={{ color: 'var(--accent1)' }}>
                      {s.warn}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className={`${pillBtn(true)} text-xs shrink-0`}
                  style={s.badge === '已启用' ? { background: 'var(--accent1)' } : { background: 'var(--bg-subtle)', color: 'var(--text-sec)' }}
                  onClick={() => toggleSkill(s)}
                  disabled={toggling === s.name}
                >
                  {toggling === s.name ? '...' : s.badge === '已启用' ? '禁用' : '启用'}
                </button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}


function WorkspacePanel() {
  const limitAccess = useSettingsStore(s => s.workspace.limitAccess)
  const autoSave = useSettingsStore(s => s.workspace.autoSave)
  const watch = useSettingsStore(s => s.workspace.watch)
  const heartbeat = useSettingsStore(s => s.workspace.heartbeat)
  const setLimitAccess = useSettingsStore(s => s.setWorkspaceLimitAccess)
  const setAutoSave = useSettingsStore(s => s.setWorkspaceAutoSave)
  const setWatch = useSettingsStore(s => s.setWorkspaceWatch)
  const setHeartbeat = useSettingsStore(s => s.setWorkspaceHeartbeat)
  const syncFromGateway = useSettingsStore(s => s.syncWorkspaceFromGateway)
  const [saving, setSaving] = useState(false)
  const addToast = useToastStore(s => s.addToast)

  // Sync workspace config from Gateway → local electron-store on first mount
  useEffect(() => {
    syncFromGateway().catch(() => {})
  }, [syncFromGateway])

  const handleLimitAccess = useCallback((val: boolean) => {
    setSaving(true)
    setLimitAccess(val).finally(() => setSaving(false))
  }, [setLimitAccess])

  const handleAutoSave = useCallback((val: boolean) => {
    setSaving(true)
    setAutoSave(val).finally(() => setSaving(false))
  }, [setAutoSave])

  const handleWatch = useCallback((val: boolean) => {
    setSaving(true)
    setWatch(val).finally(() => setSaving(false))
  }, [setWatch])

  const handleHeartbeat = useCallback((val: '30m' | '1h' | '2h' | '4h') => {
    setSaving(true)
    setHeartbeat(val).finally(() => setSaving(false))
  }, [setHeartbeat])

  return (
    <div className="pb-10">
      <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
        工作区
        {saving && <span className="text-xs" style={{ color: 'var(--accent1)' }}>保存中...</span>}
      </h1>
      <p className="text-sm mt-1 mb-6" style={{ color: 'var(--text-sec)' }}>
        配置本地项目目录与上下文持久化行为。
      </p>

      <Card className="mb-4">
        <div className="px-5 py-4">
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            默认项目目录
          </p>
          <p className="text-xs mt-1 mb-3" style={{ color: 'var(--text-sec)' }}>
            SynClaw 项目和上下文文件的保存位置。
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              className="flex-1 min-w-0 px-3 py-2 rounded-lg text-sm border"
              style={{ borderColor: 'var(--border)', background: 'var(--input-bg)' }}
              value="~/.openclaw-synclaw/workspace"
            />
            <button
              type="button"
              className={pillBtn(false)}
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              onClick={() => {
                addToast({ type: 'info', message: '正在打开工作区目录...', duration: 2000 })
                window.electronAPI?.shell?.expandTilde?.('~/.openclaw-synclaw/workspace').then((expanded) => {
                  const resolvedPath = expanded ?? '~/.openclaw-synclaw/workspace'
                  window.electronAPI?.shell?.openPath?.(resolvedPath).catch(() => {
                    addToast({ type: 'warning', message: '无法打开目录，请确认路径是否存在', duration: 3000 })
                  })
                })
              }}
            >
              浏览
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <Row
          label="限制文件访问范围"
          desc="将 Agent 可访问目录限制在工作区内，降低误操作工作区外文件的风险。"
          border
        >
          <ToggleStrip on={limitAccess} onChange={handleLimitAccess} />
        </Row>
        <Row label="自动保存上下文" desc="自动将会话与产物保存到本地工作区。" border>
          <ToggleStrip on={autoSave} onChange={handleAutoSave} />
        </Row>
        <Row label="文件监听" desc="监听本地文件变更，实时刷新 Agent 上下文。" border>
          <ToggleStrip on={watch} onChange={handleWatch} />
        </Row>
        <div
          className="px-5 py-3.5"
          style={{ borderBottom: '1px solid var(--border-secondary)' }}
        >
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            Agent 心跳频率
          </p>
          <p className="text-xs mt-1 mb-3" style={{ color: 'var(--text-sec)' }}>
            周期性心跳会消耗积分，降低频率可节省积分；修改后需重启生效。
          </p>
          <div className="flex flex-wrap gap-2">
            {(['30m', '1h', '2h', '4h'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => handleHeartbeat(k)}
                className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
                style={
                  heartbeat === k
                    ? {
                        background: 'var(--accent1)',
                        color: '#fff',
                        borderColor: 'var(--accent1)',
                      }
                    : { borderColor: 'var(--border)', color: 'var(--text-sec)', background: 'transparent' }
                }
              >
                {k}
              </button>
            ))}
          </div>
        </div>
        <div className="px-5 py-3.5 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              从 OpenClaw 迁移
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-sec)' }}>
              迁移配置、聊天记录与技能到 SynClaw。
            </p>
          </div>
          <button
            type="button"
            className={pillBtn(false)}
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            onClick={() => addToast({ type: 'info', message: '迁移功能即将推出，请稍候', duration: 3000 })}
          >
            开始迁移
          </button>
        </div>
      </Card>
    </div>
  )
}

function GatewayPanel() {
  const [status, setStatus] = useState<string>('idle')
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [identity, setIdentity] = useState<Record<string, unknown> | null>(null)
  const [health, setHealth] = useState<Record<string, unknown> | null>(null)

  const loadGateway = async () => {
    setLoading(true)
    try {
      const [statusRes, identityRes, healthRes] = await Promise.allSettled([
        window.openclaw?.getStatus(),
        window.openclaw?.gateway.identity(),
        window.openclaw?.gateway.health(),
      ])

      if (statusRes?.status === 'fulfilled') {
        setStatus(statusRes.value as string)
      }
      if (identityRes?.status === 'fulfilled' && identityRes.value?.success) {
        setIdentity(identityRes.value.data as typeof identity)
      }
      if (healthRes?.status === 'fulfilled' && healthRes.value?.success) {
        setHealth(healthRes.value.data as typeof health)
      }
    } catch {
      // keep empty
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadGateway()
    // Subscribe to status changes
    const unsub = window.openclaw?.onStatusChange(s => setStatus(s))
    return () => { unsub?.() }
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
      await window.openclaw?.reconnect()
      await loadGateway()
    } finally {
      setActionLoading(null)
    }
  }

  const isConnected = status === 'connected' || status === 'ready'

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
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: isConnected ? 'var(--success)' : 'var(--danger)' }}
            />
            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              {isConnected ? '已连接' : '未连接'}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-ter)' }}>
              ({status})
            </span>
          </div>
        </Row>
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

      {/* Identity */}
      {identity && (
        <Card>
          <div className="px-5 py-4">
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
              版本信息
            </p>
            <div className="space-y-2 text-xs" style={{ color: 'var(--text-sec)' }}>
              {Object.entries(identity).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <span>{k}</span>
                  <span className="font-medium break-all text-right" style={{ color: 'var(--text)' }}>
                    {typeof v === 'object' ? JSON.stringify(v) : String(v)}
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

function PrivacyPanel() {
  const [plan, setPlanState] = useState(false)

  // Load persisted preference on mount
  useEffect(() => {
    window.openclaw?.settings.get().then((res) => {
      if (res?.success && res.data) {
        const privacy = (res.data as { privacy?: { optimizationPlan?: boolean } }).privacy
        if (privacy && typeof privacy.optimizationPlan === 'boolean') {
          setPlanState(privacy.optimizationPlan)
        }
      }
    }).catch(() => {})
  }, [])

  const handlePlanChange = (next: boolean) => {
    setPlanState(next)
    window.openclaw?.settings.set('privacy.optimizationPlan', next).catch(() => {})
  }

  return (
    <div className="pb-10">
      <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
        数据与隐私
      </h1>
      <p className="text-sm mt-1 mb-6" style={{ color: 'var(--text-sec)' }}>
        查看数据存储位置与 SynClaw 的网络出站范围。
      </p>

      <Card className="mb-4">
        <div className="px-5 py-4">
          <p className="text-sm mb-2" style={{ color: 'var(--text-sec)' }}>
            本地数据路径
          </p>
          <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--text-sec)' }}>
            所有工作区文件、对话记录和 Agent 输出均存储在此本地目录。
          </p>
          <div
            className="px-3 py-2 rounded-lg text-sm font-mono border"
            style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-secondary)' }}
          >
            ~/.openclaw-synclaw/workspace
          </div>
        </div>
      </Card>

      <Card className="mb-4">
        <div className="px-5 py-4 flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>
              优化计划
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-sec)' }}>
              开启后，经过去标识化处理的用户输入与部分使用数据可能用于模型与产品体验优化。你可随时关闭，不影响正常使用。
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <ToggleStrip on={plan} onChange={handlePlanChange} />
            <span className="text-[10px]" style={{ color: 'var(--text-ter)' }}>
              {plan ? '开' : '关'}
            </span>
          </div>
        </div>
      </Card>

      <Card>
        <div className="px-5 py-4">
          <p className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>
            备案信息
          </p>
          <div className="grid gap-3 text-xs" style={{ color: 'var(--text-sec)' }}>
            <div>
              <span className="font-medium" style={{ color: 'var(--text)' }}>
                ICP 备案/许可证号：
              </span>
              京 ICP 备 20011824 号 -21（示例）
            </div>
            <div>
              <span className="font-medium block mb-1" style={{ color: 'var(--text)' }}>
                算法备案
              </span>
              智谱 ChatGLM 生成算法（示例备案号） · 智谱 ChatGLM 搜索算法（示例备案号）
            </div>
            <div>
              <span className="font-medium" style={{ color: 'var(--text)' }}>
                大模型备案登记：
              </span>
              Beijing-AutoGLM-20250606S0053（示例）
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mt-6 text-sm">
            <a href="#" className="inline-flex items-center gap-1 font-medium" style={{ color: 'var(--accent1)' }}>
              隐私政策 <ExternalLinkMini />
            </a>
            <a href="#" className="inline-flex items-center gap-1 font-medium" style={{ color: 'var(--accent1)' }}>
              用户协议 <ExternalLinkMini />
            </a>
          </div>
        </div>
      </Card>
    </div>
  )
}

function ExternalLinkMini() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

function FeedbackPanelWrapper() {
  const addToast = useToastStore(s => s.addToast)
  return (
    <FeedbackPanel
      onSuccess={() => {
        addToast({ type: 'success', message: '反馈已提交，感谢你的建议！', duration: 3000 })
      }}
    />
  )
}

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

/* ─── 主视图 ─── */

export function SettingsView() {
  const { currentModel, setSettingsModalOpen, settingsSection } = useAppStore()
  const [section, setSection] = useState<SettingsSection>('general')

  // 同步来自 command palette 的 section 切换
  useEffect(() => {
    if (settingsSection) {
      setSection(settingsSection as SettingsSection)
    }
  }, [settingsSection])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSettingsModalOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setSettingsModalOpen])

  const content = useMemo(() => {
    switch (section) {
      case 'general':
        return <GeneralPanel />
      case 'usage':
        return <UsagePanel />
      case 'points':
        return <PointsPanel />
      case 'models':
        return <ModelsPanel currentModel={currentModel} />
      case 'memory':
        return <MemoryPanel />
      case 'hooks':
        return <HooksPanel />
      case 'mcp':
        return <McpPanel />
      case 'skills':
        return <SkillsPanel />
      case 'im':
        return <ImPanel />
      case 'security':
        return <AuthorizedDirsPanel />
      case 'workspace':
        return <WorkspacePanel />
      case 'gateway':
        return <GatewayPanel />
      case 'privacy':
        return <PrivacyPanel />
      case 'feedback':
        return <FeedbackPanelWrapper />
      case 'about':
        return <AboutPanel />
      default:
        return <GeneralPanel />
    }
  }, [section, currentModel])

  return (
    <div className="h-full flex overflow-hidden" style={{ background: '#f0f0f0' }}>
      {/* 左侧设置导航 */}
      <aside
        className="w-[220px] shrink-0 flex flex-col py-3 pl-2 pr-1 overflow-y-auto border-r"
        style={{
          background: '#f5f5f5',
          borderColor: 'var(--border-secondary)',
        }}
      >
        <button
          type="button"
          onClick={() => setSettingsModalOpen(false)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-2 text-left w-full transition-colors hover:bg-black/5"
          style={{ color: 'var(--text-sec)' }}
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          返回应用
        </button>
        <nav className="flex flex-col gap-0.5">
          {NAV.map((item) => {
            const Icon = item.icon
            const active = section === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left w-full transition-colors"
                style={{
                  background: active ? 'rgba(0,0,0,0.06)' : 'transparent',
                  color: active ? 'var(--text)' : 'var(--text-sec)',
                  fontWeight: active ? 500 : 400,
                }}
              >
                <Icon className="w-4 h-4 shrink-0 opacity-80" />
                {item.label}
              </button>
            )
          })}
        </nav>
      </aside>

      {/* 右侧内容 */}
      <main
        className="flex-1 overflow-y-auto min-w-0"
        style={{ background: '#fafafa' }}
      >
        <div className="max-w-3xl mx-auto px-10 py-8">{content}</div>
      </main>
    </div>
  )
}

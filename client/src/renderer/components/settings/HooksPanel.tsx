/**
 * HooksPanel.tsx — 自动化 Hooks 面板
 */
import { useState, useEffect } from 'react'
import { Card } from '../ui'
import { pillBtn } from './shared/pillBtn'
import { useToastStore } from '../../stores/toastStore'
import { Spinner } from '../ui'

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

export { HooksPanel }

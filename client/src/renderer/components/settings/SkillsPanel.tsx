/**
 * SkillsPanel.tsx — 技能管理面板
 */
import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { Card } from '../ui'
import { pillBtn } from './shared/pillBtn'
import { useToastStore } from '../../stores/toastStore'

interface SkillItem {
  name: string
  badge: string
  desc: string
  warn: string | null
  installing?: boolean
  installProgress?: number
  installMessage?: string
}

const FALLBACK_SKILLS: SkillItem[] = [
  {
    name: '1password',
    badge: '内置',
    desc: '配置 1Password CLI（op）并与桌面应用集成，供 Agent 安全读取密钥片段。',
    warn: null,
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

function SkillsPanel() {
  const addToast = useToastStore(s => s.addToast)
  const [filter, setFilter] = useState<'all' | 'avail' | 'installed' | 'paid'>('all')
  const [skills, setSkills] = useState<SkillItem[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  // skillKey → 安装进度信息
  const [installingSkills, setInstallingSkills] = useState<Record<string, { progress?: number; message?: string }>>({})

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
      const res = await window.openclaw.skills.update({ skillKey: skill.name, enabled: !isEnabled })
      if (res?.success) {
        addToast({ type: 'success', message: isEnabled ? `"${skill.name}" 已禁用` : `"${skill.name}" 已启用` })
      } else {
        addToast({ type: 'error', message: `${isEnabled ? '禁用' : '启用'}失败：${res?.error ?? '未知错误'}` })
      }
      await reloadSkills()
    } catch (err) {
      console.error('切换技能失败:', err)
      addToast({ type: 'error', message: `${isEnabled ? '禁用' : '启用'}失败：${err instanceof Error ? err.message : String(err)}` })
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

    const unsub = window.openclaw.on((e) => {
      if (e.event === 'skill:installed' || e.event === 'skill:status-changed') {
        reloadSkills()
      }
    })

    return () => {
      cancelled = true
      unsub?.()
    }
  }, [])

  const filteredSkills = skills.filter((s) => {
    if (filter === 'installed') return s.badge === '已启用'
    if (filter === 'avail') return s.badge === '已禁用' || !!installingSkills[s.name]
    if (filter === 'paid') return s.warn !== null
    return true
  }).map((s) => ({
    ...s,
    installing: !!installingSkills[s.name],
    installProgress: installingSkills[s.name]?.progress,
    installMessage: installingSkills[s.name]?.message,
  }))

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

export { SkillsPanel }

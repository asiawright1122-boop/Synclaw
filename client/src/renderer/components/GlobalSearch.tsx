/**
 * GlobalSearch — 全局搜索面板
 * 触发: Cmd/Ctrl + Shift + F
 * 搜索范围: 会话 / 分身 / 定时任务 / 设置
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '../stores/appStore'
import {
  Search,
  MessageSquare,
  Bot,
  Clock,
  Settings,
  Loader2,
  ChevronRight,
} from 'lucide-react'

type ResultType = 'session' | 'avatar' | 'task' | 'setting'

interface SearchResult {
  id: string
  type: ResultType
  label: string
  description: string
  action: () => void
}

interface GlobalSearchProps {
  isOpen: boolean
  onClose: () => void
}

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const { setSettingsModalOpen, setSettingsSection } = useAppStore()

  const TYPE_CONFIG: Record<ResultType, { icon: React.ElementType; color: string; label: string }> = {
    session: { icon: MessageSquare, color: '#fc5d1e', label: '会话' },
    avatar: { icon: Bot, color: '#6366f1', label: '分身' },
    task: { icon: Clock, color: '#2f9d5e', label: '任务' },
    setting: { icon: Settings, color: '#a78bfa', label: '设置' },
  }

  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    const results: SearchResult[] = []
    const lower = q.toLowerCase()
    const openclaw = window.openclaw

    try {
      // Search sessions
      if (openclaw) {
        try {
          const sessionsRes = await openclaw.sessions.list({ limit: 20 })
          if (sessionsRes?.success && Array.isArray(sessionsRes.data)) {
            const sessions = sessionsRes.data as Array<{ id?: string; title?: string; preview?: string }>
            sessions.forEach(s => {
              const title = s.title || ''
              if (title.toLowerCase().includes(lower) || (s.preview || '').toLowerCase().includes(lower)) {
                results.push({
                  id: `session-${s.id || title}`,
                  type: 'session',
                  label: title || '未命名会话',
                  description: s.preview || '',
                  action: () => {
                    if (s.id) {
                      useAppStore.getState().setSelectedSession(s.id)
                      useAppStore.getState().setActiveView('chat')
                      useAppStore.getState().setActiveTab('chat')
                    }
                    onClose()
                  },
                })
              }
            })
          }
        } catch { /* ignore */ }

        // Search avatars
        try {
          const avatarsRes = await openclaw.avatars.list()
          if (avatarsRes?.success && Array.isArray(avatarsRes.data)) {
            const avatars = avatarsRes.data as Array<{ id?: string; name?: string; description?: string }>
            avatars.forEach(a => {
              const name = a.name || ''
              if (name.toLowerCase().includes(lower) || (a.description || '').toLowerCase().includes(lower)) {
                results.push({
                  id: `avatar-${a.id || name}`,
                  type: 'avatar',
                  label: name,
                  description: a.description || '',
                  action: () => {
                    useAppStore.getState().setActiveTab('avatar')
                    onClose()
                  },
                })
              }
            })
          }
        } catch { /* ignore */ }

        // Search cron tasks
        try {
          const tasksRes = await openclaw.cron.list()
          if (tasksRes?.success && Array.isArray(tasksRes.data)) {
            const tasks = tasksRes.data as Array<{ id?: string; message?: string; schedule?: string }>
            tasks.forEach(t => {
              const msg = t.message || ''
              if (msg.toLowerCase().includes(lower) || (t.schedule || '').toLowerCase().includes(lower)) {
                results.push({
                  id: `task-${t.id || msg}`,
                  type: 'task',
                  label: msg || '定时任务',
                  description: t.schedule || '',
                  action: () => {
                    useAppStore.getState().setActiveTab('task')
                    onClose()
                  },
                })
              }
            })
          }
        } catch { /* ignore */ }
      }

      // Search settings sections
      const settingSections = [
        { id: 'general', label: '通用设置', desc: '主题、动画、通知', keywords: ['主题', '动画', '通知', 'general'] },
        { id: 'models', label: '模型与 API', desc: '切换模型、配置 API 参数', keywords: ['模型', 'api', 'models', '参数'] },
        { id: 'usage', label: '用量统计', desc: 'Token 用量与积分消耗', keywords: ['用量', 'token', '统计', 'usage'] },
        { id: 'points', label: '积分充值', desc: '积分余额和充值入口', keywords: ['积分', '充值', 'points', '余额'] },
        { id: 'skills', label: '技能管理', desc: '查看、安装、配置技能', keywords: ['技能', 'skills', '安装'] },
        { id: 'memory', label: '记忆管理', desc: '浏览、搜索、删除 AI 记忆', keywords: ['记忆', 'memory', 'ai'] },
        { id: 'hooks', label: '自动化钩子', desc: '配置事件触发钩子', keywords: ['钩子', 'hooks', '自动'] },
        { id: 'mcp', label: 'MCP 服务', desc: '管理 MCP 工具服务', keywords: ['mcp', '工具', '服务'] },
        { id: 'im', label: 'IM 频道', desc: '飞书、企业微信、Slack 等', keywords: ['im', '飞书', 'slack', '频道'] },
        { id: 'gateway', label: 'Gateway 设置', desc: 'Gateway 连接状态与配置', keywords: ['gateway', '连接', '状态'] },
        { id: 'privacy', label: '数据与隐私', desc: '本地数据与隐私选项', keywords: ['隐私', 'privacy', '数据'] },
        { id: 'feedback', label: '提交反馈', desc: '报告问题或建议新功能', keywords: ['反馈', 'feedback', '问题'] },
        { id: 'about', label: '关于', desc: '版本信息与版权', keywords: ['关于', 'about', '版本'] },
      ]
      settingSections.forEach(s => {
        if (s.label.toLowerCase().includes(lower) || s.desc.toLowerCase().includes(lower) ||
            s.keywords.some(k => k.toLowerCase().includes(lower))) {
          results.push({
            id: `setting-${s.id}`,
            type: 'setting',
            label: s.label,
            description: s.desc,
            action: () => {
              setSettingsModalOpen(true)
              setSettingsSection(s.id)
              onClose()
            },
          })
        }
      })

      setResults(results)
      setSelectedIndex(0)
    } finally {
      setLoading(false)
    }
  }, [onClose, setSettingsModalOpen, setSettingsSection])

  // Debounced search
  useEffect(() => {
    if (!isOpen || !query.trim()) {
      setResults([])
      return
    }
    const timer = setTimeout(() => performSearch(query), 200)
    return () => clearTimeout(timer)
  }, [query, isOpen, performSearch])

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setResults([])
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (results[selectedIndex]) {
        results[selectedIndex].action()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }, [results, selectedIndex, onClose])

  // Scroll selected into view
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const item = list.children[selectedIndex] as HTMLElement
    if (item) item.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[300] flex items-start justify-center pt-[12vh]"
      onMouseDown={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: -8 }}
        transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-lg rounded-[14px] overflow-hidden border shadow-2xl"
        style={{
          background: 'var(--bg-container)',
          borderColor: 'var(--border)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
        }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div
          className="flex items-center gap-3 px-4 py-4 border-b"
          style={{ borderColor: 'var(--border-secondary)' }}
        >
          <Search className="w-5 h-5 shrink-0" style={{ color: 'var(--accent1)' }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索会话、分身、任务或设置..."
            className="flex-1 text-base outline-none bg-transparent"
            style={{ color: 'var(--text)' }}
          />
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: 'var(--text-ter)' }} />
          ) : (
            <kbd
              className="text-xs px-1.5 py-0.5 rounded border shrink-0"
              style={{ borderColor: 'var(--border)', color: 'var(--text-ter)' }}
            >
              Esc
            </kbd>
          )}
        </div>

        {/* Results */}
        <div
          ref={listRef}
          className="max-h-72 overflow-y-auto py-2"
        >
          {query.trim() && results.length === 0 && !loading && (
            <div className="text-center py-10 text-sm" style={{ color: 'var(--text-ter)' }}>
              未找到相关结果
            </div>
          )}

          {results.length > 0 && (
            <>
              {/* Group by type */}
              {(['session', 'avatar', 'task', 'setting'] as ResultType[]).map(type => {
                const typeResults = results.filter(r => r.type === type)
                if (typeResults.length === 0) return null
                const config = TYPE_CONFIG[type]

                return (
                  <div key={type}>
                    <div
                      className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--text-ter)' }}
                    >
                      {config.label}
                      <span className="ml-1 font-normal normal-case tracking-normal opacity-60">
                        {typeResults.length}
                      </span>
                    </div>
                    {typeResults.map((result) => {
                      const globalIdx = results.indexOf(result)
                      const isSelected = globalIdx === selectedIndex
                      return (
                        <button
                          key={result.id}
                          type="button"
                          onClick={result.action}
                          onMouseEnter={() => setSelectedIndex(globalIdx)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                          style={{
                            background: isSelected ? 'rgba(0,0,0,0.05)' : 'transparent',
                          }}
                        >
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: `${config.color}20` }}
                          >
                            <config.icon className="w-4 h-4" style={{ color: config.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                              {result.label}
                            </p>
                            {result.description && (
                              <p className="text-xs truncate" style={{ color: 'var(--text-sec)' }}>
                                {result.description}
                              </p>
                            )}
                          </div>
                          {isSelected && (
                            <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--text-ter)' }} />
                          )}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </>
          )}

          {!query.trim() && (
            <div className="px-4 py-6 text-center text-sm" style={{ color: 'var(--text-ter)' }}>
              <p>输入关键词开始搜索</p>
              <p className="text-xs mt-1 opacity-60">↑↓ 导航 · ↵ 打开 · Esc 关闭</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div
            className="flex items-center gap-4 px-4 py-2 border-t text-[10px]"
            style={{ borderColor: 'var(--border-secondary)', color: 'var(--text-ter)' }}
          >
            <span>↑↓ 导航</span>
            <span>↵ 打开</span>
            <span>Esc 关闭</span>
            <span className="ml-auto">{results.length} 个结果</span>
          </div>
        )}
      </motion.div>
    </div>
  )
}

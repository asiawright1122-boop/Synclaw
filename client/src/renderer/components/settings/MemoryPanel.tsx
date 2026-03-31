/**
 * MemoryPanel.tsx — 记忆管理面板
 */
import { useState, useEffect } from 'react'
import { Card } from '../ui'
import { pillBtn } from './shared/pillBtn'
import { useToastStore } from '../../stores/toastStore'
import { Spinner } from '../ui'

interface MemoryEntry {
  key?: string
  id?: string
  type?: string
  content?: string
  text?: string
  summary?: string
  score?: number
  tags?: string[]
  createdAt?: string | number
  updatedAt?: string | number
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

export { MemoryPanel }

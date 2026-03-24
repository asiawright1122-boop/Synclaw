/**
 * 右侧栏：由顶栏「文件」「Agent」按钮控制收起/展开
 * 收起时不占位（无窄条），点击顶栏 Agent 按钮展开
 *
 * 已接入 OpenClaw Gateway：
 * - mount 时调用 agentIdentity() 获取当前分身信息
 * - "重要教训" 调用 memory.search({ query: 'lesson' })
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../stores/appStore'
import { useToastStore } from './Toast'
import {
  ChevronRight,
  Bot,
  User,
  Lightbulb,
  BookOpen,
  Loader2,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
} from 'lucide-react'

const PANEL_WIDTH = 320

interface IdentityInfo {
  name?: string
  description?: string
  style?: string
  preferences?: string
  notes?: string
}

interface Lesson {
  id: string
  content: string
  timestamp?: number
}

interface NoteItem {
  id: string
  title: string
  content?: string
}

interface UserContext {
  name?: string
  role?: string
  timezone?: string
  focus?: string
  notes?: string
}

export function RightPanel() {
  const { rightPanelOpen, toggleRightPanel } = useAppStore()
  const addToast = useToastStore(s => s.addToast)
  const [identity, setIdentity] = useState<IdentityInfo | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [userContext, setUserContext] = useState<UserContext | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Notes CRUD state
  const [showAddNote, setShowAddNote] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteTitleInput, setNoteTitleInput] = useState('')
  const [noteContentInput, setNoteContentInput] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  // Load identity and memory when panel opens
  useEffect(() => {
    if (!rightPanelOpen) return
    const openclaw = window.openclaw!
    if (!openclaw) return

    let cancelled = false
    setLoading(true)
    setError(null)

    const loadData = async () => {
      try {
        // Load agent identity
        const identityResult = await openclaw.agentIdentity()
        if (!cancelled && identityResult.success && identityResult.data) {
          const data = identityResult.data as Record<string, unknown>
          setIdentity({
            name: data.name as string | undefined,
            description: data.description as string | undefined,
            style: data.style as string | undefined,
            preferences: data.preferences as string | undefined,
            notes: data.notes as string | undefined,
          })
        }

        // Load user context from memory
        const userResult = await openclaw.memory.search({
          query: 'user context',
          limit: 5,
          type: 'user',
        })
        if (!cancelled && userResult.success && userResult.data) {
          const userData = userResult.data as Array<{
            id?: string
            content?: string
            metadata?: Record<string, unknown>
          }>
          if (userData.length > 0) {
            const first = userData[0]
            const metadata = first.metadata || {}
            setUserContext({
              name: metadata.name as string | undefined,
              role: metadata.role as string | undefined,
              timezone: metadata.timezone as string | undefined,
              focus: metadata.focus as string | undefined,
              notes: first.content || metadata.notes as string | undefined,
            })
          }
        }

        // Load important lessons
        const lessonsResult = await openclaw.memory.search({
          query: 'lesson important',
          limit: 10,
          type: 'lesson',
        })
        if (!cancelled && lessonsResult.success && lessonsResult.data) {
          const lessonsData = lessonsResult.data as Array<{
            id?: string
            content?: string
            timestamp?: number
          }>
          setLessons(
            lessonsData.map((l) => ({
              id: l.id || String(Math.random()),
              content: l.content || '',
              timestamp: l.timestamp,
            }))
          )
        }

        // Load notes
        const notesResult = await openclaw.memory.search({
          query: 'note project workflow tool',
          limit: 8,
        })
        if (!cancelled && notesResult.success && notesResult.data) {
          const notesData = notesResult.data as Array<{
            id?: string
            content?: string
            metadata?: Record<string, unknown>
          }>
          setNotes(
            notesData.map((n, idx) => ({
              id: n.id || String(idx),
              title: (n.metadata?.title as string) || (n.content?.split('\n')[0] || '').slice(0, 32),
              content: n.content,
            }))
          )
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[RightPanel] Failed to load data:', err)
          setError('加载失败')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [rightPanelOpen])

  // ── Notes CRUD ────────────────────────────────────────────────────────────
  const startAddNote = () => {
    setNoteTitleInput('')
    setNoteContentInput('')
    setEditingNoteId(null)
    setShowAddNote(true)
  }

  const startEditNote = (note: NoteItem) => {
    setNoteTitleInput(note.title)
    setNoteContentInput(note.content || '')
    setEditingNoteId(note.id)
    setShowAddNote(true)
  }

  const cancelNoteEdit = () => {
    setShowAddNote(false)
    setEditingNoteId(null)
    setNoteTitleInput('')
    setNoteContentInput('')
  }

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!noteTitleInput.trim() && !noteContentInput.trim()) return
    setSavingNote(true)
    try {
      const openclaw = window.openclaw
      if (!openclaw) { cancelNoteEdit(); return }

      const content = noteTitleInput.trim() + (noteContentInput.trim() ? '\n\n' + noteContentInput.trim() : '')
      const res = await openclaw.memory.store({
        type: 'note',
        content,
        metadata: { title: noteTitleInput.trim() || noteContentInput.slice(0, 32) },
      })

      if (res?.success) {
        addToast({ type: 'success', message: editingNoteId ? '笔记已更新' : '笔记已添加', duration: 2000 })
        cancelNoteEdit()
        // Reload notes
        if (openclaw) {
          const notesResult = await openclaw.memory.search({ query: 'note project workflow tool', limit: 8 })
          if (notesResult.success && notesResult.data) {
            const notesData = notesResult.data as Array<{ id?: string; content?: string; metadata?: Record<string, unknown> }>
            setNotes(notesData.map((n, idx) => ({
              id: n.id || String(idx),
              title: (n.metadata?.title as string) || (n.content?.split('\n')[0] || '').slice(0, 32),
              content: n.content,
            })))
          }
        }
      } else {
        addToast({ type: 'error', message: '保存失败', duration: 3000 })
      }
    } catch {
      addToast({ type: 'error', message: '保存失败', duration: 3000 })
    } finally {
      setSavingNote(false)
    }
  }

  const handleDeleteNote = async (note: NoteItem) => {
    const openclaw = window.openclaw
    if (!openclaw) return
    const id = note.id
    if (!id) return
    try {
      const res = await openclaw.memory.delete({ id, key: id })
      if (res?.success) {
        setNotes(prev => prev.filter(n => n.id !== id))
        addToast({ type: 'success', message: '笔记已删除', duration: 2000 })
      }
    } catch {
      addToast({ type: 'error', message: '删除失败', duration: 3000 })
    }
  }

  return (
    <AnimatePresence>
      {rightPanelOpen && (
        <motion.aside
          key="right-panel"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: PANEL_WIDTH, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className="flex-shrink-0 h-full flex flex-col border-l border-aurora-border bg-aurora-surface overflow-hidden"
          aria-label="Agent 上下文"
        >
          {/* 顶部：收起按钮（与顶栏 Agent 按钮一致，点击即收起） */}
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-aurora-border">
            <span className="text-xs font-medium text-slate-500">上下文</span>
            <button
              type="button"
              onClick={toggleRightPanel}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/50"
              aria-label="收起面板"
              title="点击收起"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <p className="text-xs text-slate-500">{error}</p>
              </div>
            ) : (
              <>
                {/* Avatar header */}
                <div className="flex flex-col items-center text-center pb-4 border-b border-aurora-border">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent-cyan to-accent-violet flex items-center justify-center shadow-glow-cyan mb-3">
                    <Bot className="w-7 h-7 text-white" aria-hidden />
                  </div>
                  <span className="font-display font-semibold text-white text-base">
                    {identity?.name || 'SynClaw'}
                  </span>
                  <span className="text-xs text-slate-500 mt-0.5">
                    {identity?.description || '代码助手'}
                  </span>
                </div>

                {/* 关于我 */}
                <section>
                  <h3 className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    <User className="w-4 h-4" aria-hidden />
                    关于我
                  </h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex justify-between items-center text-slate-400">
                      <span>风格</span>
                      <span className="text-slate-500 truncate max-w-[160px]">
                        {identity?.style || '—'}
                      </span>
                    </li>
                    <li className="flex justify-between items-center text-slate-400">
                      <span>偏好</span>
                      <span className="text-slate-500 truncate max-w-[160px]">
                        {identity?.preferences || '—'}
                      </span>
                    </li>
                    <li className="flex justify-between items-center text-slate-400">
                      <span>备注</span>
                      <span className="text-slate-500 truncate max-w-[160px]">
                        {identity?.notes || '—'}
                      </span>
                    </li>
                  </ul>
                </section>

                {/* 我眼中的你 */}
                <section>
                  <h3 className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    <User className="w-4 h-4" aria-hidden />
                    我眼中的你
                  </h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex justify-between items-center text-slate-400">
                      <span>称呼</span>
                      <span className="text-slate-500">
                        {userContext?.name || '—'}
                      </span>
                    </li>
                    <li className="flex justify-between items-center text-slate-400">
                      <span>角色</span>
                      <span className="text-slate-500">
                        {userContext?.role || '—'}
                      </span>
                    </li>
                    <li className="flex justify-between items-center text-slate-400">
                      <span>时区</span>
                      <span className="text-slate-500">
                        {userContext?.timezone || '—'}
                      </span>
                    </li>
                    <li className="flex justify-between items-center text-slate-400">
                      <span>当前专注</span>
                      <span className="text-slate-500 truncate max-w-[160px]">
                        {userContext?.focus || '—'}
                      </span>
                    </li>
                    <li className="flex justify-between items-center text-slate-400">
                      <span>备注</span>
                      <span className="text-slate-500 truncate max-w-[160px]">
                        {userContext?.notes || '—'}
                      </span>
                    </li>
                  </ul>
                </section>

                {/* 我的笔记 */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      <BookOpen className="w-4 h-4" aria-hidden />
                      我的笔记
                    </h3>
                    <button
                      type="button"
                      onClick={startAddNote}
                      className="p-1 rounded text-slate-500 hover:text-accent-cyan hover:bg-white/5 transition-colors"
                      title="添加笔记"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Add / Edit form */}
                  <AnimatePresence>
                    {showAddNote && (
                      <motion.form
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onSubmit={handleSaveNote}
                        className="overflow-hidden mb-3"
                      >
                        <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                          <input
                            type="text"
                            value={noteTitleInput}
                            onChange={e => setNoteTitleInput(e.target.value)}
                            placeholder="标题"
                            maxLength={80}
                            className="w-full bg-transparent text-sm font-medium outline-none placeholder-slate-600"
                            style={{ color: 'var(--text)' }}
                            autoFocus
                          />
                          <textarea
                            value={noteContentInput}
                            onChange={e => setNoteContentInput(e.target.value)}
                            placeholder="写下你的笔记内容..."
                            rows={3}
                            className="w-full bg-transparent text-xs outline-none resize-none placeholder-slate-600"
                            style={{ color: 'var(--text-sec)' }}
                          />
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={cancelNoteEdit}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            <button
                              type="submit"
                              disabled={savingNote}
                              className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium text-white transition-colors disabled:opacity-50"
                              style={{ background: 'var(--accent1)' }}
                            >
                              {savingNote ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                              保存
                            </button>
                          </div>
                        </div>
                      </motion.form>
                    )}
                  </AnimatePresence>

                  {/* Notes list */}
                  {notes.length > 0 ? (
                    <ul className="space-y-2 text-sm">
                      {notes.map((note) => (
                        <li
                          key={note.id}
                          className="group rounded-lg p-2 hover:bg-white/[0.03] transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <span className="font-medium truncate block" style={{ color: 'var(--text-sec)' }}>
                                {note.title}
                              </span>
                              {note.content && (
                                <span className="text-slate-600 truncate block text-xs mt-0.5">
                                  {note.content.slice(0, 60)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <button
                                type="button"
                                onClick={() => startEditNote(note)}
                                className="p-1 rounded text-slate-500 hover:text-accent-cyan hover:bg-white/5 transition-colors"
                                title="编辑"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteNote(note)}
                                className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-white/5 transition-colors"
                                title="删除"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : !showAddNote ? (
                    <p className="text-sm text-slate-600 text-center py-4">暂无笔记，点击 + 添加</p>
                  ) : null}
                </section>

                {/* 重要教训 */}
                <section>
                  <h3 className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    <Lightbulb className="w-4 h-4" aria-hidden />
                    重要教训
                  </h3>
                  {lessons.length > 0 ? (
                    <ol className="space-y-2 text-sm text-slate-400 list-decimal list-inside">
                      {lessons.map((lesson) => (
                        <li key={lesson.id}>{lesson.content}</li>
                      ))}
                    </ol>
                  ) : (
                    <ul className="space-y-2 text-sm text-slate-400 list-decimal list-inside">
                      <li>保持回复简洁，必要时再展开</li>
                      <li>修改代码前先确认当前文件与分支</li>
                      <li>涉及安全与密钥时仅给出步骤说明</li>
                    </ul>
                  )}
                </section>
              </>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

/**
 * AutoClaw 主界面侧栏
 * 收起/加号已移至顶部标题栏；此处为：分段 + 列表 + 底栏
 * 分段：分身 / IM 频道 / 定时任务
 * 列表：分身条目（标题、副标题、右侧时间或置顶）
 * 底：头像 + 手机号掩码 | 反馈 + 设置（打开设置弹窗）
 *
 * 已接入 OpenClaw Gateway：
 * - AvatarTab: 实时加载分身列表，监听 avatar:status-changed 事件
 * - TaskTab: 实时加载 Cron 任务，监听 cron:triggered/cron:completed 事件
 */
import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '../stores/appStore'
import { useChatStore } from '../stores/chatStore'
import { useAvatarStore, type Avatar } from '../stores/avatarStore'
import { t } from '../i18n'
import {
  Plus,
  MessageSquare,
  Clock,
  MessageCircle,
  SlidersHorizontal,
  Bot,
  Loader2,
  RefreshCw,
  Search,
  X,
  Info,
} from 'lucide-react'
import { AvatarListPanel } from './AvatarListPanel'

interface CronTask {
  id: string
  schedule: string
  message?: string
  agentId?: string
  enabled?: boolean
  lastRun?: string
  nextRun?: string
}

interface Session {
  id: string
  title: string
  preview: string
  time: string
  unread: number
}

const TABS = [
  { id: 'avatar' as const, icon: Bot, labelKey: 'sidebar.tab.avatar' },
  { id: 'chat' as const, icon: MessageSquare, labelKey: 'sidebar.tab.chat' },
  { id: 'task' as const, icon: Clock, labelKey: 'sidebar.tab.task' },
]

/** Reusable About button — avoids duplicating markup in collapsed bar and footer */
function AboutButton({ landingAvailable, onClick, className }: {
  landingAvailable: boolean
  onClick: () => void
  className?: string
}) {
  if (!landingAvailable) return null
  return (
    <button
      type="button"
      onClick={onClick}
      className={className ?? 'w-9 h-9 rounded-xl flex items-center justify-center hover:bg-black/5'}
      style={{ color: 'var(--text-sec)' }}
      title="About"
    >
      <Info className="w-4 h-4" />
    </button>
  )
}

export function Sidebar() {
  const {
    sidebarCollapsed,
    activeTab,
    setActiveTab,
    selectedAvatar,
    setSelectedAvatar,
    selectedSession,
    setSelectedSession,
    settingsModalOpen,
    setSettingsModalOpen,
    activeView,
    setActiveView,
  } = useAppStore()
  const { avatars } = useAvatarStore()

  // Landing page (About) state
  const [landingAvailable, setLandingAvailable] = useState(false)

  // Check landing page availability on mount
  useEffect(() => {
    const checkLanding = async () => {
      try {
        const result = await window.electronAPI?.landing?.isAvailable()
        if (result?.success) {
          setLandingAvailable(result.data ?? false)
        }
      } catch (error) {
        console.error('[Sidebar] Failed to check landing page:', error)
      }
    }
    checkLanding()
  }, [])

  const handleOpenAbout = useCallback(async () => {
    if (!window.electronAPI?.landing) return
    try {
      await window.electronAPI.landing.show()
    } catch (error) {
      console.error('[Sidebar] Failed to open landing page:', error)
    }
  }, [])

  // Task tab state
  const [cronTasks, setCronTasks] = useState<CronTask[]>([])
  const [tasksLoading, setTasksLoading] = useState(false)
  const [tasksError, setTasksError] = useState<string | null>(null)
  const [taskSearch, setTaskSearch] = useState('')

  // Sessions — IM channels. Loads from OpenClaw sessions API.
  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionSearch, setSessionSearch] = useState('')

  // Load sessions from OpenClaw
  const loadSessions = useCallback(async () => {
    if (!window.openclaw) return
    try {
      const result = await window.openclaw.sessions.list({ label: 'im' })
      if (result.success && result.data) {
        const data = result.data as Array<{
          id?: string
          title?: string
          preview?: string
          time?: string
          unread?: number
        }>
        const loadedSessions: Session[] = (Array.isArray(data) ? data : []).map((s, index) => ({
          id: s.id || String(index),
          title: s.title || '未命名会话',
          preview: s.preview || '',
          time: s.time || '',
          unread: s.unread || 0,
        }))
        setSessions(loadedSessions)
      }
    } catch (error) {
      console.error('[Sidebar] Failed to load sessions:', error)
    }
  }, [])

  // Select a session: load its conversation in the chat view
  const handleSelectSession = useCallback(async (sessionId: string) => {
    setSelectedSession(sessionId)
    if (activeView !== 'chat') {
      setActiveView('chat')
    }
    // Switch to the new session in chatStore (clears messages and loads history)
    await useChatStore.getState().switchSession(sessionId)
  }, [setSelectedSession, activeView, setActiveView])

  // Load sessions when chat tab is active
  useEffect(() => {
    if (activeTab === 'chat') {
      loadSessions()
    }
  }, [activeTab, loadSessions])

  // Load cron tasks from OpenClaw
  const loadCronTasks = useCallback(async () => {
    if (!window.openclaw) return
    setTasksLoading(true)
    setTasksError(null)
    try {
      const result = await window.openclaw.cron.list()
      if (result.success && result.data) {
        const data = result.data as Array<{
          id: string
          schedule?: string
          message?: string
          agentId?: string
          enabled?: boolean
          lastRun?: string
          nextRun?: string
        }>
        const loadedTasks: CronTask[] = data.map((t) => ({
          id: t.id,
          schedule: t.schedule || '未设置',
          message: t.message,
          agentId: t.agentId,
          enabled: t.enabled ?? true,
          lastRun: t.lastRun,
          nextRun: t.nextRun,
        }))
        setCronTasks(loadedTasks)
      }
    } catch (error) {
      console.error('[Sidebar] Failed to load cron tasks:', error)
      setTasksError('加载任务失败')
    } finally {
      setTasksLoading(false)
    }
  }, [])

  // Subscribe to cron events
  useEffect(() => {
    if (!window.openclaw) return
    const unsubCron = window.openclaw.on((event) => {
      if (event.event === 'cron:triggered' || event.event === 'cron:completed') {
        // Reload cron tasks to get updated status
        loadCronTasks()
      }
    })

    return () => {
      unsubCron()
    }
  }, [loadCronTasks])

  // Load data when tab changes — reset search on tab switch
  useEffect(() => {
    setSessionSearch('')
    setTaskSearch('')
    if (activeTab === 'task') {
      loadCronTasks()
    }
  }, [activeTab, loadCronTasks])

  // Handle toggle cron task
  const handleToggleTask = useCallback(async (task: CronTask) => {
    if (!window.openclaw) return
    try {
      const result = await window.openclaw.cron.update({
        id: task.id,
        enabled: !task.enabled,
      })
      if (result.success) {
        loadCronTasks()
      }
    } catch (error) {
      console.error('[Sidebar] Failed to toggle task:', error)
    }
  }, [loadCronTasks])

  // Handle delete cron task
  const handleDeleteTask = useCallback(async (id: string) => {
    if (!window.openclaw) return
    try {
      const result = await window.openclaw.cron.remove({ id })
      if (result.success) {
        loadCronTasks()
      }
    } catch (error) {
      console.error('[Sidebar] Failed to delete task:', error)
    }
  }, [loadCronTasks])

  // Handle run cron task immediately
  const handleRunTask = useCallback(async (id: string) => {
    if (!window.openclaw) return
    try {
      await window.openclaw.cron.run({ id })
    } catch (error) {
      console.error('[Sidebar] Failed to run task:', error)
    }
  }, [])

  // Handle avatar click in collapsed sidebar
  const handleAvatarClick = useCallback((avatar: Avatar) => {
    setSelectedAvatar(avatar)
  }, [setSelectedAvatar])

  if (sidebarCollapsed) {
    return (
      <div
        className="h-full flex flex-col items-center py-3 gap-2"
        style={{ width: 52, background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border)' }}
      >
        {/* 展开/收起已在顶部标题栏 */}
        {avatars.slice(0, 5).map((av) => (
          <button
            key={av.id}
            type="button"
            onClick={() => handleAvatarClick(av)}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer ring-2 ring-transparent"
            style={{
              background: av.color,
              boxShadow: selectedAvatar?.id === av.id ? '0 0 0 2px var(--accent1)' : undefined,
            }}
            title={av.name}
          >
            {av.emoji ? (
              <span className="text-base leading-none">{av.emoji}</span>
            ) : (
              <Bot className="w-4 h-4 text-white" />
            )}
          </button>
        ))}
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setSettingsModalOpen(true)}
          className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer"
          style={{ color: 'var(--text-sec)', background: settingsModalOpen ? 'var(--bg-subtle)' : 'transparent' }}
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
        <AboutButton landingAvailable={landingAvailable} onClick={handleOpenAbout} />
      </div>
    )
  }

  return (
    <aside
      className="h-full flex flex-col overflow-hidden"
      style={{ width: 260, background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border)' }}
    >
      {/* 收起/加号已在顶部标题栏，侧栏直接为分段 */}
      {/* 分段控制 */}
      <div
        className="flex-shrink-0 flex gap-1 px-3 py-2"
        style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-secondary)' }}
      >
        {TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer flex-1 justify-center min-w-0"
              style={
                activeTab === tab.id
                  ? { background: 'var(--bg-elevated)', color: 'var(--text)', boxShadow: 'var(--shadow-secondary)' }
                  : { background: 'transparent', color: 'var(--text-sec)' }
              }
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{t(tab.labelKey)}</span>
            </button>
          )
        })}
      </div>

      {/* 列表区 */}
      <div className="flex-1 overflow-y-auto">
        {/* Avatar Tab - Use dedicated AvatarListPanel */}
        {activeTab === 'avatar' && <AvatarListPanel />}

        {/* Chat Tab (IM Channels) */}
        {activeTab === 'chat' && (
          <div className="px-2 space-y-0.5">
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl mb-1 mx-1"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-ter)' }}>
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                value={sessionSearch}
                onChange={e => setSessionSearch(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-xs min-w-0"
                style={{ color: 'var(--text)' }}
                placeholder={t('sidebar.chat.search')}
              />
              {sessionSearch && (
                <button
                  type="button"
                  onClick={() => setSessionSearch('')}
                  className="p-0.5 rounded hover:bg-white/5 transition-colors"
                  style={{ color: 'var(--text-ter)' }}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            {(() => {
              const filtered = sessionSearch.trim()
                ? sessions.filter(s =>
                    s.title.toLowerCase().includes(sessionSearch.toLowerCase()) ||
                    (s.preview || '').toLowerCase().includes(sessionSearch.toLowerCase())
                  )
                : sessions
              return filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8">
                  <MessageSquare className="w-8 h-8" style={{ color: 'var(--text-ter)' }} />
                  <p className="text-xs" style={{ color: 'var(--text-sec)' }}>
                    {sessionSearch ? '未找到匹配的会话' : t('sidebar.chat.empty')}
                  </p>
                </div>
              ) : (
                filtered.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelectSession(s.id)}
                    className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-left transition-colors"
                    style={{
                      background: selectedSession === s.id ? 'var(--bg-subtle)' : undefined,
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--accent-gradient)' }}
                    >
                      <MessageSquare className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                          {s.title}
                        </p>
                        <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-ter)' }}>
                          {s.time}
                        </span>
                      </div>
                      <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-sec)' }}>
                        {s.preview}
                      </p>
                    </div>
                    {s.unread > 0 ? (
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0"
                        style={{ background: 'var(--accent1)' }}
                      >
                        {s.unread}
                      </span>
                    ) : null}
                  </button>
                ))
              )
            })()}
          </div>
        )}

        {/* Task Tab (Cron Jobs) */}
        {activeTab === 'task' && (
          <div className="px-2 space-y-0.5">
            {/* Search bar */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl mb-1 mx-1"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
            >
              <Search className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-ter)' }} />
              <input
                value={taskSearch}
                onChange={e => setTaskSearch(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-xs min-w-0"
                style={{ color: 'var(--text)' }}
                placeholder="搜索任务..."
              />
              {taskSearch && (
                <button
                  type="button"
                  onClick={() => setTaskSearch('')}
                  className="p-0.5 rounded hover:bg-white/5 transition-colors"
                  style={{ color: 'var(--text-ter)' }}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
              style={{ color: 'var(--accent1)' }}
            >
              <Plus className="w-4 h-4" />
              <span>{t('sidebar.task.new')}</span>
            </button>

            {tasksLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-sec)' }} />
              </div>
            ) : tasksError ? (
              <div className="flex flex-col items-center gap-2 py-4">
                <p className="text-xs" style={{ color: 'var(--text-sec)' }}>{tasksError}</p>
                <button
                  type="button"
                  onClick={loadCronTasks}
                  className="flex items-center gap-1 text-xs cursor-pointer"
                  style={{ color: 'var(--accent1)' }}
                >
                  <RefreshCw className="w-3 h-3" />
                  {t('sidebar.task.retry')}
                </button>
              </div>
            ) : (() => {
              const filtered = taskSearch.trim()
                ? cronTasks.filter(t =>
                    (t.message || '').toLowerCase().includes(taskSearch.toLowerCase()) ||
                    (t.schedule || '').toLowerCase().includes(taskSearch.toLowerCase())
                  )
                : cronTasks
              return filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8">
                  <Clock className="w-8 h-8" style={{ color: 'var(--text-ter)' }} />
                  <p className="text-xs" style={{ color: 'var(--text-sec)' }}>
                    {taskSearch ? '未找到匹配的任务' : t('sidebar.task.empty')}
                  </p>
                </div>
              ) : (
                filtered.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleRunTask(t.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-left group"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: t.enabled ? 'rgba(47,158,91,0.12)' : 'var(--bg-subtle)' }}
                    >
                      <Clock className="w-4 h-4" style={{ color: t.enabled ? 'var(--success)' : 'var(--text-ter)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                        {t.message || '定时任务'}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-sec)' }}>
                        {t.schedule}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Toggle switch */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleTask(t)
                        }}
                        className="w-9 h-5 rounded-full relative transition-colors cursor-pointer"
                        style={{ background: t.enabled ? 'var(--success)' : 'var(--border)' }}
                      >
                        <span
                          className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
                          style={{ left: t.enabled ? 18 : 2 }}
                        />
                      </button>
                      {/* Delete button on hover */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteTask(t.id)
                        }}
                        className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded flex items-center justify-center transition-opacity"
                        style={{ color: 'var(--text-ter)' }}
                        title="删除"
                      >
                        ×
                      </button>
                    </div>
                  </button>
                ))
              )
            })()}
          </div>
        )}
      </div>

      {/* 底栏：用户 + 反馈 + 设置 */}
      <div
        className="flex-shrink-0 flex items-center justify-between gap-2 px-3 py-3"
        style={{ borderTop: '1px solid var(--border-secondary)' }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
            style={{ background: 'var(--accent-gradient)' }}
          >
            U
          </div>
          <p className="text-xs font-medium truncate" style={{ color: 'var(--text-sec)' }}>
            {window.openclaw ? t('sidebar.user.loading') : t('sidebar.user.disconnected')}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-black/5"
            style={{ color: 'var(--text-sec)' }}
            title={t('sidebar.feedback')}
          >
            <MessageCircle className="w-4 h-4" />
          </button>
          <AboutButton landingAvailable={landingAvailable} onClick={handleOpenAbout} />
          <button
            type="button"
            onClick={() => setSettingsModalOpen(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-black/5"
            style={{
              color: 'var(--text-sec)',
              background: settingsModalOpen ? 'var(--bg-subtle)' : 'transparent',
            }}
            title={t('sidebar.settings')}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}

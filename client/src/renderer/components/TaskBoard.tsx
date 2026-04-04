import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTaskStore, Task, TaskStatus } from '../stores/taskStore'
import { useTaskEvents } from '../hooks/useTaskEvents'
import { Plus, MoreVertical, Clock, CheckCircle2, Circle, AlertCircle, Play } from 'lucide-react'
import { ClipboardList } from 'lucide-react'

interface TaskBoardProps {
  fullView?: boolean
}

const statusColumns: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'pending', label: '待处理', color: 'slate' },
  { id: 'planning', label: '规划中', color: 'violet' },
  { id: 'in_progress', label: '进行中', color: 'cyan' },
  { id: 'ai_review', label: 'AI 审核', color: 'amber' },
  { id: 'human_review', label: '人工审核', color: 'rose' },
  { id: 'completed', label: '已完成', color: 'emerald' }
]

const statusColors: Record<TaskStatus, string> = {
  pending: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  planning: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  in_progress: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  ai_review: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  human_review: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
}

export function TaskBoard({ fullView = false }: TaskBoardProps) {
  const {
    tasks,
    selectedTaskId,
    loading,
    loadTasks,
    createTask,
    updateTaskStatus,
    deleteTask,
    setSelectedTaskId
  } = useTaskStore()

  // Subscribe to Gateway task events (React lifecycle managed, prevents listener leaks)
  useTaskEvents()

  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [showNewTaskInput, setShowNewTaskInput] = useState(false)
  const [draggedTask, setDraggedTask] = useState<string | null>(null)

  // Load tasks on mount
  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  // Listen for task status changes
  useEffect(() => {
    const unsub = window.openclaw?.on((e) => {
      if (e.event === 'task:status-changed') {
        loadTasks()
      }
    })
    return () => unsub?.()
  }, [loadTasks])

  const getTasksByStatus = useMemo(() => {
    const cache: Partial<Record<TaskStatus, Task[]>> = {}
    return (status: TaskStatus): Task[] => {
      if (!cache[status]) {
        cache[status] = tasks.filter(t => t.status === status)
      }
      return cache[status]
    }
  }, [tasks])

  const handleDragStart = (taskId: string) => {
    setDraggedTask(taskId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (status: TaskStatus) => {
    if (draggedTask) {
      updateTaskStatus(draggedTask, status)
      setDraggedTask(null)
    }
  }

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return
    await createTask({
      title: newTaskTitle.trim(),
      description: '',
      status: 'pending'
    })
    setNewTaskTitle('')
    setShowNewTaskInput(false)
  }

  const handleTaskClick = (task: Task) => {
    setSelectedTaskId(task.id)
  }

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'pending': return <Circle className="w-4 h-4" />
      case 'planning': return <Clock className="w-4 h-4" />
      case 'in_progress': return <Play className="w-4 h-4" />
      case 'ai_review': return <AlertCircle className="w-4 h-4" />
      case 'human_review': return <AlertCircle className="w-4 h-4" />
      case 'completed': return <CheckCircle2 className="w-4 h-4" />
    }
  }

  if (fullView) {
    // Full view: show all columns in a horizontal scrollable area
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-aurora-border flex items-center justify-between">
          <h2 className="text-base font-display font-semibold text-white">任务看板</h2>
          <motion.button
            type="button"
            onClick={() => setShowNewTaskInput(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-accent-cyan to-accent-violet text-white text-sm font-medium cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/50 min-h-[44px]"
            whileTap={{ scale: 0.98 }}
          >
            <Plus className="w-4 h-4" />
            <span>添加任务</span>
          </motion.button>
        </div>

        {/* New task input */}
        <AnimatePresence>
          {showNewTaskInput && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-aurora-border overflow-hidden"
            >
              <div className="p-3 bg-aurora-surface/80">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateTask()}
                  placeholder="输入任务标题..."
                  autoFocus
                  className="w-full px-3 py-2.5 rounded-xl bg-aurora-bg border border-aurora-border text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-cyan/40 text-sm"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={handleCreateTask}
                    className="px-3.5 py-2 rounded-xl bg-accent-cyan text-white text-sm font-medium cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/50"
                  >
                    创建
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewTaskInput(false)}
                    className="px-3.5 py-2 rounded-xl bg-white/10 text-slate-400 text-sm cursor-pointer hover:bg-white/15 transition-colors"
                  >
                    取消
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Kanban columns */}
        <div className="flex-1 overflow-x-auto p-4">
          {/* Full-view empty state: shown when no tasks exist at all */}
          {!loading && tasks.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full w-full gap-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,211,238,0.1)' }}>
                <ClipboardList className="w-8 h-8" style={{ color: '#22d3ee' }} />
              </div>
              <div className="text-center">
                <p className="text-base font-semibold mb-1" style={{ color: 'var(--text)' }}>
                  开启你的第一个任务
                </p>
                <p className="text-sm" style={{ color: 'var(--text-sec)' }}>
                  描述你的目标，SynClaw 会帮你规划并执行
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewTaskInput(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
                style={{ background: 'linear-gradient(135deg, #22d3ee, #818cf8)' }}
              >
                <Plus className="w-4 h-4" />
                创建任务
              </button>
            </div>
          )}
          {(!loading || tasks.length > 0) && (
          <div className="flex gap-3 h-full min-w-max">
            {statusColumns.map((column) => (
              <div
                key={column.id}
                className="w-72 flex flex-col rounded-2xl bg-aurora-surface/80 border border-aurora-border"
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(column.id)}
              >
                <div className="p-3 border-b border-aurora-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${statusColors[column.id]}`}>
                      {getStatusIcon(column.id)}
                    </span>
                    <span className="text-sm font-medium text-white">{column.label}</span>
                  </div>
                  <span className="text-xs text-slate-500 bg-white/10 px-2 py-0.5 rounded-full">
                    {getTasksByStatus(column.id).length}
                  </span>
                </div>

                {/* Tasks */}
                <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                  {loading && getTasksByStatus(column.id).length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-6 h-6 border-2 border-accent-cyan/30 border-t-accent-cyan rounded-full animate-spin" />
                    </div>
                  ) : (
                    getTasksByStatus(column.id).map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        isSelected={selectedTaskId === task.id}
                        onDragStart={() => handleDragStart(task.id)}
                        onClick={() => handleTaskClick(task)}
                        onDelete={() => deleteTask(task.id)}
                      />
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      </div>
    )
  }

  // Compact view (in chat sidebar)
  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-aurora-border flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">任务列表</h3>
        <span className="text-xs text-slate-500">{tasks.length} 个任务</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {loading && tasks.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-accent-cyan/30 border-t-accent-cyan rounded-full animate-spin" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(34,211,238,0.1)' }}
            >
              <ClipboardList className="w-6 h-6" style={{ color: '#22d3ee' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              开启你的第一个任务
            </p>
            <button
              type="button"
              onClick={() => setShowNewTaskInput(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #22d3ee, #818cf8)' }}
            >
              <Plus className="w-3.5 h-3.5" />
              创建任务
            </button>
          </div>
        ) : (
          tasks.slice(0, 5).map((task) => (
            <motion.div
              key={task.id}
              role="button"
              tabIndex={0}
              onClick={() => handleTaskClick(task)}
              onKeyDown={(e) => e.key === 'Enter' && handleTaskClick(task)}
              className="p-3 rounded-xl bg-aurora-surface/80 border border-aurora-border hover:bg-white/5 cursor-pointer transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/50"
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-2">
                <span className={`text-xs ${statusColors[task.status].split(' ')[1]}`}>
                  {getStatusIcon(task.status)}
                </span>
                <span className="text-sm text-slate-200 truncate flex-1">{task.title}</span>
              </div>
              {task.progress > 0 && (
                <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-accent-cyan to-accent-violet"
                    initial={{ width: 0 }}
                    animate={{ width: `${task.progress}%` }}
                  />
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
      
      {tasks.length > 5 && (
        <div className="p-2 border-t border-aurora-border">
          <button
            type="button"
            className="w-full text-center text-xs text-accent-cyan hover:text-accent-cyan/80 cursor-pointer py-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            查看全部 {tasks.length} 个任务
          </button>
        </div>
      )}
    </div>
  )
}

function TaskCard({
  task,
  isSelected,
  onDragStart,
  onClick,
  onDelete
}: {
  task: Task
  isSelected: boolean
  onDragStart: () => void
  onClick: () => void
  onDelete: () => void
}) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <motion.div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={`p-3 rounded-xl border transition-colors duration-200 group focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/50 ${
        isSelected
          ? 'bg-gradient-to-r from-accent-cyan/10 to-accent-violet/10 border-accent-cyan/30'
          : 'bg-aurora-surface/80 border-aurora-border hover:bg-white/5 cursor-pointer'
      }`}
      whileTap={{ scale: 0.98 }}
      layout
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-white truncate">{task.title}</h4>
          {task.description && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{task.description}</p>
          )}
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(!showMenu)
            }}
            className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all cursor-pointer focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/50 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="任务菜单"
          >
            <MoreVertical className="w-4 h-4 text-slate-400" />
          </button>
          
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute right-0 top-8 w-32 py-1 rounded-lg bg-aurora-bg border border-aurora-border shadow-lg z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowMenu(false)
                    onDelete()
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-rose-400 hover:bg-rose-500/10 cursor-pointer rounded-lg transition-colors"
                >
                  删除任务
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Progress bar */}
      {task.progress > 0 && (
        <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-accent-cyan to-accent-violet"
            initial={{ width: 0 }}
            animate={{ width: `${task.progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}
      
      {/* Meta info */}
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>{task.subtasks.length} 个子任务</span>
        <span>{task.progress}%</span>
      </div>
    </motion.div>
  )
}

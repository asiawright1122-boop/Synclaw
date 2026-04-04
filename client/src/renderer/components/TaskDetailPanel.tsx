import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useTaskStore, TaskStatus } from '../stores/taskStore'
import { X, Clock, Play, CheckCircle2, AlertCircle, FileCode, Terminal, Sparkles, Loader2 } from 'lucide-react'

const statusConfig: Record<TaskStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { 
    label: '待处理', 
    color: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    icon: <Clock className="w-4 h-4" />
  },
  planning: { 
    label: '规划中', 
    color: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    icon: <AlertCircle className="w-4 h-4" />
  },
  in_progress: { 
    label: '进行中', 
    color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    icon: <Play className="w-4 h-4" />
  },
  ai_review: { 
    label: 'AI 审核', 
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    icon: <Sparkles className="w-4 h-4" />
  },
  human_review: { 
    label: '人工审核', 
    color: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    icon: <AlertCircle className="w-4 h-4" />
  },
  completed: { 
    label: '已完成', 
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    icon: <CheckCircle2 className="w-4 h-4" />
  }
}

const statusOrder: TaskStatus[] = ['pending', 'planning', 'in_progress', 'ai_review', 'human_review', 'completed']

export function TaskDetailPanel() {
  const {
    tasks,
    selectedTaskId,
    taskLogs,
    updateTask,
    updateTaskStatus,
    setSelectedTaskId,
    appendLog,
    clearLogs
  } = useTaskStore()

  const selectedTask = tasks.find(t => t.id === selectedTaskId) || null
  const logs = selectedTaskId ? (taskLogs.get(selectedTaskId) || []) : []
  const [isExecuting, setIsExecuting] = useState(false)
  const [editingTitle, setEditingTitle] = useState('')
  const [editingDescription, setEditingDescription] = useState('')
  const logsEndRef = useRef<HTMLDivElement>(null)

  // Sync editing state with selected task
  useEffect(() => {
    if (selectedTask) {
      setEditingTitle(selectedTask.title)
      setEditingDescription(selectedTask.description)
    }
  }, [selectedTask?.id])

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs.length])

  // Listen for log events for the selected task
  useEffect(() => {
    if (!selectedTaskId) return

    const unsub = window.openclaw?.on((e) => {
      const { event, payload } = e

      switch (event) {
        case 'task:log-line': {
          const data = payload as { id?: string; line?: string; timestamp?: number }
          if (data.id === selectedTaskId && data.line) {
            appendLog(selectedTaskId, data.line, data.timestamp)
          }
          break
        }

        case 'task:completed': {
          const data = payload as { id?: string }
          if (data.id === selectedTaskId) {
            appendLog(selectedTaskId, '✅ 任务执行完成')
            setIsExecuting(false)
          }
          break
        }

        case 'task:error': {
          const data = payload as { id?: string; error?: string }
          if (data.id === selectedTaskId) {
            appendLog(selectedTaskId, `❌ 错误: ${data.error || '未知错误'}`)
            setIsExecuting(false)
          }
          break
        }

        case 'task:status-changed': {
          const data = payload as { id?: string; status?: TaskStatus }
          if (data.id === selectedTaskId) {
            // Status is already updated in store via the event listener
          }
          break
        }
      }
    })

    return () => unsub?.()
  }, [selectedTaskId, appendLog])

  // Debounced saves — use separate refs so title and description don't cancel each other
  const titleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const descTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  if (!selectedTask) return null

  const handleTitleChange = (value: string) => {
    setEditingTitle(value)

    if (titleTimeoutRef.current) clearTimeout(titleTimeoutRef.current)
    titleTimeoutRef.current = setTimeout(() => {
      if (selectedTask) updateTask(selectedTask.id, { title: value })
    }, 500)
  }

  const handleDescriptionChange = (value: string) => {
    setEditingDescription(value)

    if (descTimeoutRef.current) clearTimeout(descTimeoutRef.current)
    descTimeoutRef.current = setTimeout(() => {
      if (selectedTask) updateTask(selectedTask.id, { description: value })
    }, 500)
  }

  const handleStatusChange = (newStatus: TaskStatus) => {
    updateTaskStatus(selectedTask.id, newStatus)
  }

  const handleStartExecution = async () => {
    if (!selectedTask.title.trim()) return
    
    setIsExecuting(true)
    appendLog(selectedTask.id, `🚀 开始执行任务: ${selectedTask.title}`)
    
    try {
      // Update status to in_progress
      await updateTaskStatus(selectedTask.id, 'in_progress')
      
      // Start agent execution
      const response = await window.openclaw?.agent({
        sessionKey: selectedTask.id,
        message: selectedTask.title
      })
      
      if (response?.success) {
        appendLog(selectedTask.id, '📡 Agent 已接收任务请求')
      } else {
        appendLog(selectedTask.id, `⚠️ Agent 响应: ${response?.error || '未知错误'}`)
        setIsExecuting(false)
        await updateTaskStatus(selectedTask.id, 'pending')
      }
    } catch (error) {
      appendLog(selectedTask.id, `❌ 执行失败: ${error instanceof Error ? error.message : '未知错误'}`)
      setIsExecuting(false)
      await updateTaskStatus(selectedTask.id, 'pending')
    }
  }

  const handleClearLogs = () => {
    if (selectedTaskId) {
      clearLogs(selectedTaskId)
    }
  }

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 400, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="h-full border-l border-aurora-border bg-aurora-bg/80 flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-aurora-border flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">任务详情</h3>
        <button
          onClick={() => setSelectedTaskId(null)}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Title & Description */}
        <div>
          <input
            type="text"
            value={editingTitle}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="w-full text-lg font-medium text-white bg-transparent border-0 focus:outline-none focus:ring-0"
            placeholder="任务标题"
          />
          <textarea
            value={editingDescription}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            className="w-full mt-2 text-sm text-slate-400 bg-transparent border-0 focus:outline-none focus:ring-0 resize-none"
            placeholder="添加任务描述..."
            rows={3}
          />
        </div>

        {/* Status */}
        <div>
          <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">状态</h4>
          <div className="flex flex-wrap gap-2">
            {statusOrder.map((status) => {
              const config = statusConfig[status]
              const isActive = selectedTask.status === status
              return (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    isActive 
                      ? config.color 
                      : 'bg-white/5 text-slate-400 border-aurora-border hover:bg-white/10'
                  }`}
                >
                  {config.icon}
                  <span>{config.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider">进度</h4>
            <span className="text-xs text-slate-400">{selectedTask.progress}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-accent-cyan to-accent-violet"
              initial={{ width: 0 }}
              animate={{ width: `${selectedTask.progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={selectedTask.progress}
            onChange={(e) => updateTask(selectedTask.id, { progress: parseInt(e.target.value) })}
            className="w-full mt-2 accent-accent-cyan"
          />
        </div>

        {/* Subtasks */}
        <div>
          <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
            子任务 ({selectedTask.subtasks.filter(s => s.completed).length}/{selectedTask.subtasks.length})
          </h4>
          {selectedTask.subtasks.length === 0 ? (
            <p className="text-sm text-slate-500 italic">暂无子任务</p>
          ) : (
            <div className="space-y-2">
              {selectedTask.subtasks.map((subtask) => (
                <div
                  key={subtask.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-white/5"
                >
                  <button
                    onClick={() => {
                      const newSubtasks = selectedTask.subtasks.map(s =>
                        s.id === subtask.id ? { ...s, completed: !s.completed } : s
                      )
                      updateTask(selectedTask.id, { subtasks: newSubtasks })
                    }}
                    className={`w-4 h-4 rounded border flex items-center justify-center ${
                      subtask.completed 
                        ? 'bg-accent-cyan border-accent-cyan' 
                        : 'border-slate-500'
                    }`}
                  >
                    {subtask.completed && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </button>
                  <span className={`text-sm ${subtask.completed ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                    {subtask.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Logs */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              运行日志
            </h4>
            {logs.length > 0 && (
              <button
                onClick={handleClearLogs}
                className="text-xs text-slate-500 hover:text-slate-400 transition-colors"
              >
                清空
              </button>
            )}
          </div>
          <div className="h-48 rounded-lg bg-[#1a1a2e] p-3 overflow-y-auto font-mono text-xs">
            {logs.length === 0 ? (
              <p className="text-slate-500 italic">暂无日志</p>
            ) : (
              logs.map((entry, i) => (
                <div key={i} className="text-slate-400 py-0.5">
                  <span className="text-slate-600">[{new Date(entry.timestamp).toLocaleTimeString('zh-CN')}]</span> {entry.message}
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <motion.button
            onClick={handleStartExecution}
            disabled={isExecuting || selectedTask.status === 'completed'}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              isExecuting || selectedTask.status === 'completed'
                ? 'bg-white/5 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-accent-cyan to-accent-violet text-white hover:opacity-90'
            }`}
            whileHover={!isExecuting && selectedTask.status !== 'completed' ? { scale: 1.02 } : {}}
            whileTap={!isExecuting && selectedTask.status !== 'completed' ? { scale: 0.98 } : {}}
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>执行中...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>开始执行</span>
              </>
            )}
          </motion.button>
          <motion.button
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-slate-300 text-sm hover:bg-white/15 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Terminal className="w-4 h-4" />
          </motion.button>
          <motion.button
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-slate-300 text-sm hover:bg-white/15 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <FileCode className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

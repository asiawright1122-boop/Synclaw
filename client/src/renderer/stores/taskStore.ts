import { create } from 'zustand'

// Task types matching the appStore Task interface
export type TaskStatus = 'pending' | 'planning' | 'in_progress' | 'ai_review' | 'human_review' | 'completed'

export interface SubTask {
  id: string
  title: string
  completed: boolean
}

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  progress: number
  subtasks: SubTask[]
  logs: LogEntry[]
  createdAt: number
  updatedAt: number
}

export interface LogEntry {
  message: string
  timestamp: number
}

// OpenClaw session config structure
interface SessionConfig {
  status?: TaskStatus
  title?: string
  description?: string
  progress?: number
  subtasks?: SubTask[]
  label?: string
}

// OpenClaw session response
interface Session {
  id: string
  label?: string
  config?: SessionConfig
  createdAt?: string
  updatedAt?: string
}

interface TaskState {
  // State
  tasks: Task[]
  selectedTaskId: string | null
  taskLogs: Map<string, LogEntry[]>
  loading: boolean
  error: string | null

  // Actions
  loadTasks: () => Promise<void>
  createTask: (params: { title: string; description?: string; status?: TaskStatus }) => Promise<void>
  updateTask: (id: string, updates: Partial<Pick<Task, 'title' | 'description' | 'progress' | 'subtasks'>>) => Promise<void>
  updateTaskStatus: (id: string, status: TaskStatus) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  setSelectedTaskId: (id: string | null) => void
  appendLog: (taskId: string, log: string, timestamp?: number) => void
  clearLogs: (taskId: string) => void

  // Internal
  _updateTaskFromEvent: (taskId: string, updates: Partial<Task>) => void
}

// Convert OpenClaw session to Task
function sessionToTask(session: Session): Task {
  const config = session.config || {}
  return {
    id: session.id,
    title: config.title || 'Untitled Task',
    description: config.description || '',
    status: config.status || 'pending',
    progress: config.progress || 0,
    subtasks: config.subtasks || [],
    logs: [],
    createdAt: session.createdAt ? new Date(session.createdAt).getTime() : Date.now(),
    updatedAt: session.updatedAt ? new Date(session.updatedAt).getTime() : Date.now(),
  }
}

export const useTaskStore = create<TaskState>((set, get) => ({
  // Initial state
  tasks: [],
  selectedTaskId: null,
  taskLogs: new Map(),
  loading: false,
  error: null,

  // Load all tasks from OpenClaw sessions
  loadTasks: async () => {
    set({ loading: true, error: null })
    try {
      const response = await window.openclaw?.sessions.list({ label: 'task' })
      if (response?.success && response.data) {
        const sessions = response.data as Session[]
        const tasks = sessions
          .map(sessionToTask)
          .sort((a, b) => b.createdAt - a.createdAt)

        // Merge existing logs
        const currentLogs = get().taskLogs
        const tasksWithLogs = tasks.map(task => ({
          ...task,
          logs: currentLogs.get(task.id) || [],
        }))

        set({ tasks: tasksWithLogs, loading: false })
      } else {
        set({ loading: false })
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '加载任务失败', loading: false })
    }
  },

  // Create new task
  createTask: async ({ title, description = '', status = 'pending' }) => {
    const tempId = `temp-${Date.now()}`

    // Optimistic update
    const optimisticTask: Task = {
      id: tempId,
      title,
      description,
      status,
      progress: 0,
      subtasks: [],
      logs: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    set((state) => ({ tasks: [optimisticTask, ...state.tasks] }))

    try {
      const response = await window.openclaw?.sessions.patch({
        label: 'task',
        config: { title, description, status, label: 'task' },
      })

      if (response?.success && response.data) {
        const session = response.data as Session
        const newTask = sessionToTask(session)

        // Replace optimistic task with real task
        set((state) => ({
          tasks: state.tasks.map(t => t.id === tempId ? newTask : t),
        }))
      } else {
        // Rollback on failure
        set((state) => ({
          tasks: state.tasks.filter(t => t.id !== tempId),
          error: response?.error || '创建任务失败',
        }))
      }
    } catch (error) {
      // Rollback on error
      set((state) => ({
        tasks: state.tasks.filter(t => t.id !== tempId),
        error: error instanceof Error ? error.message : '创建任务失败',
      }))
    }
  },

  // Update task metadata
  updateTask: async (id, updates) => {
    // Capture original state BEFORE optimistic update for proper rollback
    const originalTask = get().tasks.find(t => t.id === id)
    const originalSnapshot = originalTask ? { ...originalTask } : null

    // Optimistic update
    set((state) => ({
      tasks: state.tasks.map(t =>
        t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t
      ),
    }))

    try {
      const task = get().tasks.find(t => t.id === id)
      if (!task) return

      await window.openclaw?.sessions.patch({
        id,
        config: {
          title: updates.title ?? task.title,
          description: updates.description ?? task.description,
          progress: updates.progress ?? task.progress,
          subtasks: updates.subtasks ?? task.subtasks,
        },
      })
    } catch (error) {
      // Rollback to exact original state
      if (originalSnapshot) {
        set((state) => ({
          tasks: state.tasks.map(t => t.id === id ? originalSnapshot : t),
          error: error instanceof Error ? error.message : '更新任务失败',
        }))
      }
    }
  },

  // Update task status
  updateTaskStatus: async (id, status) => {
    // Capture original state BEFORE optimistic update
    const originalTask = get().tasks.find(t => t.id === id)
    const originalSnapshot = originalTask ? { ...originalTask } : null

    // Optimistic update
    set((state) => ({
      tasks: state.tasks.map(t =>
        t.id === id ? { ...t, status, updatedAt: Date.now() } : t
      ),
    }))

    try {
      await window.openclaw?.sessions.patch({
        id,
        config: { status },
      })
    } catch (error) {
      // Rollback to exact original state
      if (originalSnapshot) {
        set((state) => ({
          tasks: state.tasks.map(t => t.id === id ? originalSnapshot : t),
          error: error instanceof Error ? error.message : '更新状态失败',
        }))
      }
    }
  },

  // Delete task
  deleteTask: async (id) => {
    const taskToDelete = get().tasks.find(t => t.id === id)

    // Optimistic update
    set((state) => ({
      tasks: state.tasks.filter(t => t.id !== id),
      selectedTaskId: state.selectedTaskId === id ? null : state.selectedTaskId,
    }))

    try {
      await window.openclaw?.sessions.delete({ id })
    } catch (error) {
      // Rollback
      if (taskToDelete) {
        set((state) => ({
          tasks: [...state.tasks, taskToDelete],
          error: error instanceof Error ? error.message : '删除任务失败',
        }))
      }
    }
  },

  // Select task
  setSelectedTaskId: (id) => {
    set({ selectedTaskId: id })
  },

  // Append log to task
  appendLog: (taskId, log, timestamp = Date.now()) => {
    const entry: LogEntry = { message: log, timestamp }
    set((state) => {
      const newLogs = new Map(state.taskLogs)
      const existing = newLogs.get(taskId) || []
      newLogs.set(taskId, [...existing, entry])

      // Also update task's logs array
      const updatedTasks = state.tasks.map(t =>
        t.id === taskId ? { ...t, logs: [...t.logs, entry] } : t
      )

      return { taskLogs: newLogs, tasks: updatedTasks }
    })
  },

  // Clear logs for task
  clearLogs: (taskId) => {
    set((state) => {
      const newLogs = new Map(state.taskLogs)
      newLogs.set(taskId, [])
      const updatedTasks = state.tasks.map(t =>
        t.id === taskId ? { ...t, logs: [] } : t
      )
      return { taskLogs: newLogs, tasks: updatedTasks }
    })
  },

  // Internal: update task from event (called by useTaskEvents hook)
  _updateTaskFromEvent: (taskId, updates) => {
    set((state) => ({
      tasks: state.tasks.map(t =>
        t.id === taskId ? { ...t, ...updates, updatedAt: Date.now() } : t
      ),
    }))
  },
}))

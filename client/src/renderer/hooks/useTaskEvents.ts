/**
 * useTaskEvents.ts
 *
 * 将 task:* Gateway 事件订阅集中在 React 生命周期内管理，
 * 避免在 Zustand store 模块级别订阅导致监听器泄漏。
 *
 * 原理：
 * - useEffect 在组件挂载时订阅，卸载时清理（返回 unsubscribe）
 * - Zustand store 只负责状态更新（_updateTaskFromEvent）
 * - 所有 TaskBoard/TaskDetailPanel 共享同一份监听器，通过 ref 协调
 */

import { useEffect, useRef, useCallback } from 'react'
import { useTaskStore, TaskStatus } from '../stores/taskStore'

interface SessionConfig {
  status?: TaskStatus
  title?: string
  description?: string
  progress?: number
  subtasks?: Array<{ id: string; title: string; completed: boolean }>
  label?: string
}

interface Session {
  id: string
  label?: string
  config?: SessionConfig
  createdAt?: string
  updatedAt?: string
}

function sessionToTask(session: Session) {
  const config = session.config || {}
  return {
    id: session.id,
    title: config.title || 'Untitled Task',
    description: config.description || '',
    status: config.status || 'pending',
    progress: config.progress || 0,
    subtasks: config.subtasks || [],
    logs: [] as Array<{ message: string; timestamp: number }>,
    createdAt: session.createdAt ? new Date(session.createdAt).getTime() : Date.now(),
    updatedAt: session.updatedAt ? new Date(session.updatedAt).getTime() : Date.now(),
  }
}

// 共享监听器引用 — 确保多个组件共享同一份监听器（单例模式）
const sharedUnsubRef: { current: (() => void) | null } = { current: null }

// 是否已订阅（防止重复订阅）
let isSubscribed = false

export function useTaskEvents() {
  const _updateTask = useTaskStore(s => s._updateTaskFromEvent)
  const appendLog = useTaskStore(s => s.appendLog)

  const updateTask = useRef(_updateTask)
  const appendLogRef = useRef(appendLog)
  updateTask.current = _updateTask
  appendLogRef.current = appendLog

  const setupListeners = useCallback(() => {
    if (isSubscribed && sharedUnsubRef.current) return

    const unsub = window.openclaw?.on?.((evt: { event: string; payload: unknown }) => {
      const { event: eventName, payload } = evt

      switch (eventName) {
        case 'task:created':
        case 'task:updated': {
          const data = payload as { id?: string; session?: Session }
          if (data.session) {
            const task = sessionToTask(data.session)
            useTaskStore.setState(state => ({
              tasks: state.tasks.some(t => t.id === task.id)
                ? state.tasks.map(t => t.id === task.id ? { ...t, ...task } : t)
                : [...state.tasks, task],
            }))
          }
          break
        }

        case 'task:status-changed': {
          const data = payload as { id?: string; status?: TaskStatus }
          if (data.id && data.status) {
            useTaskStore.setState(state => ({
              tasks: state.tasks.map(t =>
                t.id === data.id ? { ...t, status: data.status!, updatedAt: Date.now() } : t
              ),
            }))
          }
          break
        }

        case 'task:log-line': {
          const data = payload as { id?: string; line?: string; timestamp?: number }
          if (data.id && data.line) {
            appendLogRef.current(data.id, data.line, data.timestamp)
          }
          break
        }

        case 'task:completed': {
          const data = payload as { id?: string }
          if (data.id) {
            appendLogRef.current(data.id, '✅ 任务执行完成', Date.now())
            useTaskStore.setState(state => ({
              tasks: state.tasks.map(t =>
                t.id === data.id ? { ...t, status: 'completed' as TaskStatus, progress: 100, updatedAt: Date.now() } : t
              ),
            }))
          }
          break
        }

        case 'task:error': {
          const data = payload as { id?: string; error?: string }
          if (data.id) {
            appendLogRef.current(data.id, `❌ 错误: ${data.error || '未知错误'}`, Date.now())
          }
          break
        }
      }
    })

    if (unsub) {
      sharedUnsubRef.current = unsub
      isSubscribed = true
    }

    return unsub
  }, [])

  useEffect(() => {
    setupListeners()
    return () => {
      // 不主动 unsubscribe — 保持监听器活跃，因为 store 状态需要持续更新
      // 监听器在页面关闭时随 renderer 进程一起销毁
    }
  }, [setupListeners])

  return { setupListeners }
}

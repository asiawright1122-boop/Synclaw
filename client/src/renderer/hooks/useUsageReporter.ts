/**
 * useUsageReporter.ts
 *
 * 监听 OpenClaw Gateway 事件，将 AI 用量上报到 web 平台。
 *
 * 工作原理：
 * 1. 监听 Gateway `session.start` 事件 → 记录 sessionId
 * 2. 监听 Gateway `chat` 事件中的 token 信息 → 累计 input/output tokens
 * 3. 监听 Gateway `agent.done` 事件 → 批量上报
 *
 * 非致命：web 平台未注册时自动跳过，不影响核心对话功能。
 */

import { useEffect, useRef, useCallback } from 'react'

export interface UsageEvent {
  eventType: 'SESSION_START' | 'MESSAGE_SENT' | 'TOKENS_CONSUMED'
  model?: string
  inputTokens?: number
  outputTokens?: number
  sessionId?: string
  messageCount?: number
  metadata?: Record<string, unknown>
}

// Gateway event payload types (inferred from OpenClaw Gateway)
interface SessionStartPayload {
  sessionId?: string
  model?: string
  [key: string]: unknown
}

interface ChatPayload {
  model?: string
  inputTokens?: number
  outputTokens?: number
  [key: string]: unknown
}

interface ErrorPayload {
  id?: string
  error?: string
  [key: string]: unknown
}

const REPORT_INTERVAL_MS = 30_000 // 每 30 秒强制上报一次（防止事件丢失）
const BATCH_SIZE = 50              // 超过 50 条立即上报

export function useUsageReporter() {
  const eventsRef = useRef<UsageEvent[]>([])
  const sessionIdRef = useRef<string | null>(null)
  const modelRef = useRef<string | null>(null)
  const reportTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isRegisteredRef = useRef(false)

  // ── 实际上报 ──────────────────────────────────────────────────────

  const flush = useCallback(async () => {
    if (eventsRef.current.length === 0) return
    const batch = eventsRef.current.splice(0, BATCH_SIZE)
    try {
      const res = await window.openclaw?.web?.reportUsage(batch)
      if (res?.success) {
        console.debug(`[useUsageReporter] 上报成功: ${batch.length} events`)
      } else if (res && 'skipped' in res && (res as { skipped?: boolean }).skipped) {
        // 未注册，跳过（正常状态）
      } else {
        console.warn('[useUsageReporter] 上报失败:', res)
      }
    } catch (err) {
      // 非致命，忽略
      console.warn('[useUsageReporter] 上报异常:', err)
    }
  }, [])

  // ── 注册 Gateway 事件监听 ─────────────────────────────────────

  useEffect(() => {
    // 检查是否已注册设备（从 electron-store 读取）
    const checkRegistration = async () => {
      try {
        const settings = await window.openclaw?.settings?.get()
        isRegisteredRef.current = !!(settings?.data?.web?.deviceToken)
      } catch {
        isRegisteredRef.current = false
      }
    }
    checkRegistration()

    // 监听 Gateway 事件
    const unsubscribe = window.openclaw?.on?.((evt: { event: string; payload: unknown }) => {
      if (!isRegisteredRef.current) return
      const { event, payload } = evt

      if (event === 'session.start' || event === 'session.started') {
        const data = payload as SessionStartPayload
        sessionIdRef.current = data?.sessionId ?? null
        modelRef.current = data?.model ?? null
        eventsRef.current.push({
          eventType: 'SESSION_START',
          sessionId: sessionIdRef.current ?? undefined,
          model: modelRef.current ?? undefined,
        })
        return
      }

      if (event === 'chat') {
        const p = payload as ChatPayload
        if (p?.model) modelRef.current = p.model
        const inputTokens = typeof p?.inputTokens === 'number' ? p.inputTokens : 0
        const outputTokens = typeof p?.outputTokens === 'number' ? p.outputTokens : 0
        if (inputTokens > 0 || outputTokens > 0) {
          eventsRef.current.push({
            eventType: 'TOKENS_CONSUMED',
            model: modelRef.current ?? undefined,
            sessionId: sessionIdRef.current ?? undefined,
            inputTokens,
            outputTokens,
          })
        }
        eventsRef.current.push({
          eventType: 'MESSAGE_SENT',
          sessionId: sessionIdRef.current ?? undefined,
          messageCount: 1,
        })
        // 超过批量大小立即上报
        if (eventsRef.current.length >= BATCH_SIZE) flush()
        return
      }

      if (event === 'task:log-line') {
        // task:log-line 事件，仅追加日志不产生用量事件
        void event
        return
      }

      if (event === 'task:error') {
        const data = payload as ErrorPayload
        if (data?.id) {
          void data
        }
        return
      }

      if (event === 'agent.done' || event === 'agent.end') {
        // Agent 完成，上报剩余事件
        flush()
        sessionIdRef.current = null
        return
      }
    })

    // 定时上报，防止事件泄漏
    reportTimerRef.current = setInterval(flush, REPORT_INTERVAL_MS)

    return () => {
      unsubscribe?.()
      if (reportTimerRef.current) clearInterval(reportTimerRef.current)
      // 组件卸载前最后flush一次
      flush()
    }
  }, [flush])

  return {
    /** 手动触发上报（可用于页面关闭时调用） */
    flush,
    /**
     * 注册桌面设备到 web 平台。
     * @param apiToken - 用户登录 web 后获取的 JWT token
     */
    register: async (apiToken: string) => {
      const res = await window.openclaw?.web?.register(apiToken)
      isRegisteredRef.current = !!(res?.success)
      return res
    },
    /**
     * 撤销桌面设备。
     */
    revoke: async () => {
      const res = await window.openclaw?.web?.revoke()
      isRegisteredRef.current = false
      return res
    },
  }
}

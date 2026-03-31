/**
 * UsagePanel.tsx — 用量统计面板
 */
import { useState, useEffect } from 'react'
import { Spinner } from '../ui'
import { pillBtn } from './shared/pillBtn'

function UsagePanel() {
  const [loading, setLoading] = useState(false)
  const [usageData, setUsageData] = useState<{
    sessions?: number
    messages?: number
    inputTokens?: number
    outputTokens?: number
    models?: Array<{
      name: string
      messages: number
      inputTokens: number
      outputTokens: number
    }>
  } | null>(null)

  const loadUsage = async () => {
    setLoading(true)
    try {
      const [statusRes, costRes] = await Promise.allSettled([
        window.openclaw?.usage.status(),
        window.openclaw?.usage.cost(),
      ])

      if (statusRes?.status === 'fulfilled' && statusRes.value?.success) {
        const data = statusRes.value.data as Record<string, unknown>
        setUsageData(data as typeof usageData)
      } else {
        if (costRes?.status === 'fulfilled' && costRes.value?.success) {
          const data = costRes.value.data as Record<string, unknown>
          setUsageData(data as typeof usageData)
        }
      }
    } catch {
      // keep empty
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsage()
  }, [])

  const totalTokens = (usageData?.inputTokens ?? 0) + (usageData?.outputTokens ?? 0)
  const tokenDisplay = totalTokens > 1000
    ? `${(totalTokens / 1000).toFixed(1)} k`
    : String(totalTokens)

  return (
    <div className="pb-10">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
            用量统计
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-sec)' }}>
            本设备所有已保存对话的 Token 用量汇总。
          </p>
        </div>
        <button
          type="button"
          onClick={loadUsage}
          className={pillBtn(false)}
          style={{ borderColor: 'var(--border)', color: 'var(--text-sec)' }}
          disabled={loading}
        >
          {loading ? <Spinner size={14} /> : '刷新'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-6 mb-8">
        {[
          { n: usageData?.sessions ?? '—', l: '会话数' },
          { n: usageData?.messages ?? '—', l: '消息数' },
          { n: tokenDisplay, l: '总 Token' },
        ].map((x) => (
          <div
            key={x.l}
            className="rounded-[10px] px-4 py-5 text-center border"
            style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-secondary)' }}
          >
            <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text)' }}>
              {x.n}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-sec)' }}>
              {x.l}
            </p>
          </div>
        ))}
      </div>

      <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
        按模型
      </p>
      {(usageData?.models ?? []).length > 0 ? usageData!.models!.map((m) => {
        const total = m.inputTokens + m.outputTokens
        const inputPct = total > 0 ? (m.inputTokens / total) * 100 : 50
        return (
          <div key={m.name}>
            <div
              className="rounded-[10px] border p-4 mb-3"
              style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-secondary)' }}
            >
              <div className="flex justify-between text-sm mb-3">
                <span className="font-medium" style={{ color: 'var(--text)' }}>
                  {m.name}
                </span>
                <span style={{ color: 'var(--text-sec)' }}>{m.messages} 条消息</span>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden flex mb-3" style={{ background: '#eee' }}>
                <div className="h-full" style={{ width: `${inputPct}%`, background: 'var(--accent1)' }} />
                <div className="h-full flex-1" style={{ background: '#ffd4c4' }} />
              </div>
              <div className="flex justify-between text-xs" style={{ color: 'var(--text-sec)' }}>
                <span>输入: {m.inputTokens.toLocaleString()}</span>
                <span>输出: {m.outputTokens.toLocaleString()}</span>
                <span>总计: {total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )
      }) : (
        <div
          className="rounded-[10px] border p-4 text-center text-sm"
          style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-secondary)', color: 'var(--text-ter)' }}
        >
          暂无用量数据
        </div>
      )}
      <div className="flex gap-4 mt-3 text-xs" style={{ color: 'var(--text-sec)' }}>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'var(--accent1)' }} />
          输入 Token
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#ffd4c4' }} />
          输出 Token
        </span>
      </div>
    </div>
  )
}

export { UsagePanel }

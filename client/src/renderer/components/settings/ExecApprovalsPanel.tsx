/**
 * ExecApprovalsPanel.tsx — 命令执行审批历史面板
 */
import { useState, useEffect, useCallback } from 'react'
import { Check, Ban, Terminal, RefreshCw, Loader2, Inbox } from 'lucide-react'
import { pillBtn } from './shared/pillBtn'

interface ApprovalRecord {
  id: string
  request: {
    command: string
    commandPreview?: string | null
    cwd?: string | null
    nodeId?: string | null
  }
  createdAtMs: number
  resolvedAtMs?: number
  decision?: 'allow-once' | 'allow-always' | 'deny'
  resolvedBy?: string | null
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  const now = Date.now()
  const diffMs = now - ts
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin} 分钟前`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour} 小时前`
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function DecisionBadge({ decision }: { decision?: string }) {
  if (!decision) return null
  if (decision === 'allow-once' || decision === 'allow-always') {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
        style={{ background: 'rgba(0,200,83,0.12)', color: 'var(--accent-green, #00c853)' }}
      >
        <Check className="w-3 h-3" />
        {decision === 'allow-once' ? '已批准（本次）' : '已批准（永久）'}
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: 'rgba(252,93,30,0.12)', color: 'var(--accent1)' }}
    >
      <Ban className="w-3 h-3" />
      已拒绝
    </span>
  )
}

function ExecApprovalsPanel() {
  const [loading, setLoading] = useState(false)
  const [records, setRecords] = useState<ApprovalRecord[]>([])

  const loadRecords = useCallback(async () => {
    setLoading(true)
    try {
      const res = await window.openclaw?.exec.approvals.get()
      if (res?.success) {
        const data = (res.data as { approvals?: ApprovalRecord[] }) ?? {}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setRecords(Array.isArray(data.approvals) ? data.approvals : (data as any))
      } else {
        // API may return raw array directly
        setRecords(Array.isArray(res?.data) ? res.data as ApprovalRecord[] : [])
      }
    } catch {
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  return (
    <div className="pb-10">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
            执行审批
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-sec)' }}>
            查看已批准或拒绝的命令历史。
          </p>
        </div>
        <button
          type="button"
          onClick={loadRecords}
          className={pillBtn(false)}
          style={{ borderColor: 'var(--border)', color: 'var(--text-sec)' }}
          disabled={loading}
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          刷新
        </button>
      </div>

      {records.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <Inbox className="w-7 h-7" style={{ color: 'var(--text-ter)' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-sec)' }}>
            暂无审批记录
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-ter)' }}>
            当 AI 需要执行 shell 命令时，这里会显示审批历史。
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {records.slice().reverse().map((record) => (
            <div
              key={record.id}
              className="rounded-xl px-4 py-3 border transition-colors"
              style={{
                background: 'var(--bg-subtle)',
                borderColor: 'var(--border-secondary)',
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: 'rgba(252,93,30,0.1)' }}
                >
                  <Terminal className="w-4 h-4" style={{ color: 'var(--accent1)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <DecisionBadge decision={record.decision} />
                    <span className="text-xs" style={{ color: 'var(--text-ter)' }}>
                      {formatTime(record.resolvedAtMs ?? record.createdAtMs)}
                    </span>
                  </div>
                  <p
                    className="text-sm font-mono truncate"
                    style={{ color: 'var(--text)' }}
                    title={record.request.command}
                  >
                    {record.request.commandPreview ?? record.request.command}
                  </p>
                  {record.request.cwd && (
                    <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-ter)' }}>
                      {record.request.cwd}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export { ExecApprovalsPanel }

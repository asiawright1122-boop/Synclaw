/**
 * PointsPanel.tsx — 积分详情面板
 */
import { useState, useEffect, useMemo } from 'react'
import { Spinner } from '../ui'
import { pillBtn } from './shared/pillBtn'

function PointsPanel() {
  const [tab, setTab] = useState<'all' | 'use' | 'earn'>('all')
  const [loading, setLoading] = useState(false)
  const [pointsData, setPointsData] = useState<{
    total?: number
    general?: number
    activity?: number
  } | null>(null)
  const [history, setHistory] = useState<Array<{ amount: number; time: string; desc: string }>>([])

  const tabs: { id: typeof tab; label: string }[] = [
    { id: 'all', label: '全部' },
    { id: 'use', label: '消耗' },
    { id: 'earn', label: '获得' },
  ]

  const loadPoints = async () => {
    setLoading(true)
    try {
      const [pointsRes, historyRes] = await Promise.allSettled([
        window.openclaw?.user.getPoints(),
        window.openclaw?.user.getPointsHistory({ limit: 20 }),
      ])

      if (pointsRes?.status === 'fulfilled' && pointsRes.value?.success) {
        const data = pointsRes.value.data
        if (typeof data === 'number') {
          setPointsData({ total: data, general: data, activity: 0 })
        } else if (data && typeof data === 'object') {
          const d = data as Record<string, unknown>
          setPointsData({
            total: d.total as number ?? (d.points as number),
            general: d.general as number ?? (d.points as number),
            activity: d.activity as number ?? 0,
          })
        }
      }

      if (historyRes?.status === 'fulfilled' && historyRes.value?.success) {
        const data = historyRes.value.data
        if (Array.isArray(data)) {
          setHistory(data.map((item: Record<string, unknown>) => ({
            amount: item.amount as number ?? 0,
            time: item.time as string ?? (item.createdAt as string) ?? '',
            desc: item.desc as string ?? (item.description as string) ?? '积分变动',
          })))
        }
      }
    } catch {
      // keep empty
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPoints()
  }, [])

  const filteredHistory = useMemo(() => {
    if (tab === 'all') return history
    if (tab === 'use') return history.filter(r => r.amount < 0)
    return history.filter(r => r.amount >= 0)
  }, [tab, history])

  return (
    <div className="pb-10">
      <div className="flex items-start justify-between gap-4 mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
          积分
        </h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={loadPoints}
            className={pillBtn(false)}
            style={{ borderColor: 'var(--border)', color: 'var(--text-sec)' }}
            disabled={loading}
          >
            {loading ? <Spinner size={14} /> : '刷新'}
          </button>
          <button
            type="button"
            className={pillBtn(true)}
            style={{ background: 'var(--accent1)' }}
          >
            去充值
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-center gap-2 sm:gap-4 mb-2 py-4">
        <div className="text-center px-2">
          <p className="text-xs mb-1" style={{ color: 'var(--text-sec)' }}>
            总积分
          </p>
          <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text)' }}>
            {pointsData?.total?.toLocaleString() ?? '—'}
          </p>
        </div>
        <span className="text-xl font-light pb-1" style={{ color: 'var(--text-ter)' }}>
          =
        </span>
        <div className="text-center px-2">
          <p className="text-xs mb-1" style={{ color: 'var(--text-sec)' }}>
            通用积分
          </p>
          <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text)' }}>
            {pointsData?.general?.toLocaleString() ?? '—'}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-ter)' }}>
            永久有效
          </p>
        </div>
        <span className="text-xl font-light pb-1" style={{ color: 'var(--text-ter)' }}>
          +
        </span>
        <div className="text-center px-2">
          <p className="text-xs mb-1" style={{ color: 'var(--text-sec)' }}>
            活动积分
          </p>
          <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text)' }}>
            {pointsData?.activity?.toLocaleString() ?? '—'}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-ter)' }}>
            周期有效
          </p>
        </div>
      </div>
      <p className="text-center text-xs mb-6" style={{ color: 'var(--text-ter)' }}>
        消耗顺位：活动积分(本周期) &gt; 通用积分(永久)
      </p>

      <div
        className="inline-flex rounded-full p-0.5 mb-6 border"
        style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-secondary)' }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
            style={{
              background: tab === t.id ? 'var(--bg-container)' : 'transparent',
              color: tab === t.id ? 'var(--text)' : 'var(--text-sec)',
              boxShadow: tab === t.id ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-0 border rounded-[10px] overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        {filteredHistory.length === 0 && (
          <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-ter)' }}>
            暂无记录
          </div>
        )}
        {filteredHistory.map((r, i) => (
          <div
            key={i}
            className="flex justify-between items-center px-4 py-3.5"
            style={{
              borderBottom: i < filteredHistory.length - 1 ? '1px solid var(--border-secondary)' : undefined,
            }}
          >
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                {r.desc}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-ter)' }}>
                {r.time}
              </p>
            </div>
            <span className="text-sm tabular-nums" style={{ color: r.amount < 0 ? 'var(--danger)' : 'var(--success)' }}>
              {r.amount > 0 ? `+${r.amount}` : r.amount}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export { PointsPanel }

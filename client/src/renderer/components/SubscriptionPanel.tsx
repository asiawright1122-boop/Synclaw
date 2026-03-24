/**
 * 订阅状态面板
 * 显示用户当前订阅计划、状态、到期时间
 */
import { useEffect, useState } from 'react'
import {
  Crown,
  Calendar,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  Loader2,
  CreditCard,
  ArrowUpRight,
} from 'lucide-react'
import {
  getSubscription,
  formatPlanName,
  formatStatus,
  getPlanFeatures,
  type Subscription,
  type SubscriptionPlan,
  type SubscriptionStatus,
} from '../services/subscription'

function PlanBadge({ plan }: { plan: SubscriptionPlan }) {
  const colors: Record<SubscriptionPlan, { bg: string; text: string; border: string }> = {
    FREE: { bg: '#f3f4f6', text: '#6b7280', border: '#e5e7eb' },
    STARTER: { bg: '#eff6ff', text: '#3b82f6', border: '#bfdbfe' },
    PRO: { bg: 'rgba(252,93,30,0.1)', text: '#fc5d1e', border: 'rgba(252,93,30,0.3)' },
    TEAM: { bg: 'rgba(139,92,246,0.1)', text: '#8b5cf6', border: 'rgba(139,92,246,0.3)' },
    BYOK: { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
  }
  const style = colors[plan] || colors.FREE

  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ background: style.bg, color: style.text, border: `1px solid ${style.border}` }}
    >
      {plan === 'PRO' && <Crown className="w-3 h-3" />}
      {formatPlanName(plan)}
    </span>
  )
}

function StatusBadge({ status }: { status: SubscriptionStatus }) {
  const config: Record<SubscriptionStatus, { icon: typeof CheckCircle; color: string; bg: string }> = {
    ACTIVE: { icon: CheckCircle, color: '#16a34a', bg: '#f0fdf4' },
    PAST_DUE: { icon: AlertCircle, color: '#d97706', bg: '#fffbeb' },
    CANCELED: { icon: XCircle, color: '#6b7280', bg: '#f9fafb' },
    INCOMPLETE: { icon: AlertCircle, color: '#d97706', bg: '#fffbeb' },
    INCOMPLETE_EXPIRED: { icon: XCircle, color: '#dc2626', bg: '#fef2f2' },
    TRIALING: { icon: Clock, color: '#3b82f6', bg: '#eff6ff' },
    UNPAID: { icon: AlertCircle, color: '#dc2626', bg: '#fef2f2' },
  }
  const { icon: Icon, color, bg } = config[status] || config.ACTIVE

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs"
      style={{ background: bg, color }}
    >
      <Icon className="w-3 h-3" />
      {formatStatus(status)}
    </span>
  )
}

function Card({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-xl border ${className}`}
      style={{ borderColor: 'var(--border)', background: 'var(--bg-container)', ...style }}
    >
      {children}
    </div>
  )
}

function PlanFeatures({ plan }: { plan: SubscriptionPlan }) {
  const features = getPlanFeatures(plan)

  return (
    <div className="space-y-2">
      {features.map((feature, i) => (
        <div key={i} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-sec)' }}>
          <CheckCircle className="w-3.5 h-3.5" style={{ color: 'var(--success)' }} />
          {feature}
        </div>
      ))}
    </div>
  )
}

export function SubscriptionPanel({ onManage }: { onManage?: () => void }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)

  useEffect(() => {
    loadSubscription()
  }, [])

  const loadSubscription = async () => {
    setLoading(true)
    setError(null)

    const res = await getSubscription()

    if (res.success && res.data) {
      setSubscription(res.data)
    } else {
      setError(res.error || '获取订阅信息失败')
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-ter)' }} />
        </div>
      </Card>
    )
  }

  if (error || !subscription) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <AlertCircle className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--danger)' }} />
          <p className="text-sm" style={{ color: 'var(--text-sec)' }}>
            {error || '无法加载订阅信息'}
          </p>
          <button
            onClick={loadSubscription}
            className="mt-3 px-4 py-2 rounded-lg text-xs font-medium transition-colors"
            style={{ background: 'var(--bg-subtle)', color: 'var(--text)' }}
          >
            重试
          </button>
        </div>
      </Card>
    )
  }

  const periodEnd = subscription.stripeCurrentPeriodEnd
    ? new Date(subscription.stripeCurrentPeriodEnd).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  return (
    <div className="space-y-4">
      {/* 当前计划 */}
      <Card className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs mb-1.5" style={{ color: 'var(--text-ter)' }}>
              当前计划
            </p>
            <PlanBadge plan={subscription.plan} />
          </div>
          <StatusBadge status={subscription.status} />
        </div>

        <PlanFeatures plan={subscription.plan} />

        {periodEnd && (
          <div className="flex items-center gap-2 mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            <Calendar className="w-4 h-4" style={{ color: 'var(--text-ter)' }} />
            <span className="text-xs" style={{ color: 'var(--text-sec)' }}>
              下次扣款: {periodEnd}
            </span>
          </div>
        )}

        {onManage && (
          <button
            onClick={onManage}
            className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{ background: 'var(--accent1)', color: '#fff' }}
          >
            <CreditCard className="w-4 h-4" />
            管理订阅
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        )}
      </Card>

      {/* 升级提示（如果是免费版） */}
      {subscription.plan === 'FREE' && (
        <Card className="p-5" style={{ borderColor: 'var(--accent1)', background: 'rgba(252,93,30,0.05)' }}>
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--accent1)' }}
            >
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
                升级到 Pro
              </p>
              <p className="text-xs mb-3" style={{ color: 'var(--text-sec)' }}>
                解锁无限对话、全部 IM 渠道、优先支持
              </p>
              {onManage && (
                <button
                  onClick={onManage}
                  className="px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                  style={{ background: 'var(--accent1)', color: '#fff' }}
                >
                  立即升级
                </button>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

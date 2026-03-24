/**
 * 积分管理面板
 * 显示积分余额、交易历史、充值入口
 */
import { useEffect, useState } from 'react'
import {
  Coins,
  TrendingUp,
  TrendingDown,
  Calendar,
  Loader2,
  AlertCircle,
  RefreshCw,
  Plus,
  ArrowRight,
} from 'lucide-react'
import {
  getSubscription,
  getCreditsHistory,
  purchaseCredits,
  formatCredits,
  type Subscription,
  type CreditsTransaction,
} from '../services/subscription'

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border ${className}`}
      style={{ borderColor: 'var(--border)', background: 'var(--bg-container)' }}
    >
      {children}
    </div>
  )
}

function TransactionItem({ transaction }: { transaction: CreditsTransaction }) {
  const isPositive = transaction.amount > 0

  return (
    <div className="flex items-center gap-3 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: isPositive ? 'rgba(22,163,74,0.1)' : 'rgba(239,68,68,0.1)' }}
      >
        {isPositive ? (
          <TrendingUp className="w-4 h-4" style={{ color: '#16a34a' }} />
        ) : (
          <TrendingDown className="w-4 h-4" style={{ color: '#ef4444' }} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate" style={{ color: 'var(--text)' }}>
          {transaction.description}
        </p>
        <p className="text-xs" style={{ color: 'var(--text-ter)' }}>
          {new Date(transaction.createdAt).toLocaleDateString('zh-CN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>

      <div className="text-right flex-shrink-0">
        <p
          className="text-sm font-medium tabular-nums"
          style={{ color: isPositive ? '#16a34a' : '#ef4444' }}
        >
          {isPositive ? '+' : ''}
          {transaction.amount}
        </p>
      </div>
    </div>
  )
}

function TransactionTypeFilter({
  selected,
  onChange,
}: {
  selected: string
  onChange: (type: string) => void
}) {
  const types = [
    { value: 'all', label: '全部' },
    { value: 'PURCHASE', label: '充值' },
    { value: 'CONSUMPTION', label: '消费' },
    { value: 'PROMO', label: '赠送' },
    { value: 'REFUND', label: '退款' },
  ]

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {types.map((type) => (
        <button
          key={type.value}
          onClick={() => onChange(type.value)}
          className="px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors"
          style={
            selected === type.value
              ? { background: 'var(--accent1)', color: '#fff' }
              : { background: 'var(--bg-subtle)', color: 'var(--text-sec)' }
          }
        >
          {type.label}
        </button>
      ))}
    </div>
  )
}

const RECHARGE_OPTIONS = [
  { amount: 1000, price: 9, label: '1,000 积分' },
  { amount: 3000, price: 25, label: '3,000 积分', bonus: 200, popular: true },
  { amount: 5000, price: 39, label: '5,000 积分', bonus: 500 },
  { amount: 10000, price: 75, label: '10,000 积分', bonus: 1500 },
]

export function CreditsPanel({ onRecharge }: { onRecharge?: () => void }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [transactions, setTransactions] = useState<CreditsTransaction[]>([])
  const [filter, setFilter] = useState('all')
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [purchasing, setPurchasing] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)

    // 并行加载订阅和交易历史
    const [subRes, historyRes] = await Promise.all([getSubscription(), getCreditsHistory({ limit: 20 })])

    if (subRes.success && subRes.data) {
      setSubscription(subRes.data)
    }

    if (historyRes.success && historyRes.data) {
      setTransactions(historyRes.data.transactions || [])
      setHasMore(!!historyRes.data.nextCursor)
    } else if (historyRes.error) {
      setError(historyRes.error)
    }

    setLoading(false)
  }

  const loadMore = async () => {
    if (!hasMore || loadingMore) return

    setLoadingMore(true)
    const res = await getCreditsHistory({ limit: 20 })

    if (res.success && res.data) {
      setTransactions((prev) => [...prev, ...(res.data?.transactions || [])])
      setHasMore(!!res.data?.nextCursor)
    }

    setLoadingMore(false)
  }

  const handlePurchase = async (amount: number) => {
    if (purchasing) return

    setPurchasing(true)
    const res = await purchaseCredits(amount)

    if (res.success && res.data?.url) {
      // 打开支付页面
      window.open(res.data.url, '_blank')
    } else {
      setError(res.error || '创建订单失败')
    }

    setPurchasing(false)
  }

  const filteredTransactions = transactions.filter((t) => {
    if (filter === 'all') return true
    if (filter === 'PURCHASE') return t.type === 'PURCHASE' || t.type === 'SUBSCRIPTION_BONUS'
    return t.type === filter
  })

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-ter)' }} />
        </div>
      </Card>
    )
  }

  const creditsBalance = subscription?.creditsBalance ?? 0
  const expireAt = subscription?.creditsExpireAt
    ? new Date(subscription.creditsExpireAt).toLocaleDateString('zh-CN')
    : null

  return (
    <div className="space-y-6">
      {/* 积分余额卡片 */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--text-ter)' }}>
              当前余额
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tabular-nums" style={{ color: 'var(--text)' }}>
                {formatCredits(creditsBalance)}
              </span>
              <span className="text-sm" style={{ color: 'var(--text-ter)' }}>
                积分
              </span>
            </div>
          </div>
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(252,93,30,0.1)' }}
          >
            <Coins className="w-6 h-6" style={{ color: 'var(--accent1)' }} />
          </div>
        </div>

        {expireAt && (
          <div
            className="flex items-center gap-2 py-2 px-3 rounded-lg text-xs"
            style={{ background: 'var(--bg-subtle)', color: 'var(--text-sec)' }}
          >
            <Calendar className="w-3.5 h-3.5" />
            积分有效期至 {expireAt}
          </div>
        )}

        {onRecharge && (
          <button
            onClick={onRecharge}
            className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-colors"
            style={{ background: 'var(--accent1)', color: '#fff' }}
          >
            <Plus className="w-4 h-4" />
            充值积分
          </button>
        )}
      </Card>

      {/* 充值套餐 */}
      <div>
        <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text)' }}>
          充值套餐
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {RECHARGE_OPTIONS.map((option) => (
            <Card key={option.amount} className="p-4 relative">
              {option.popular && (
                <div
                  className="absolute -top-2 left-3 px-2 py-0.5 rounded text-xs font-medium text-white"
                  style={{ background: 'var(--accent1)' }}
                >
                  推荐
                </div>
              )}
              <p className="text-lg font-bold" style={{ color: 'var(--text)' }}>
                {option.label}
              </p>
              {option.bonus && (
                <p className="text-xs mt-0.5" style={{ color: '#16a34a' }}>
                  +{option.bonus} 赠送
                </p>
              )}
              <p className="text-sm mt-2" style={{ color: 'var(--text-sec)' }}>
                ¥{option.price}
              </p>
              <button
                onClick={() => handlePurchase(option.amount)}
                disabled={purchasing}
                className="w-full mt-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                style={{ background: 'var(--bg-subtle)', color: 'var(--text)' }}
              >
                {purchasing ? '处理中...' : '购买'}
              </button>
            </Card>
          ))}
        </div>
      </div>

      {/* 交易历史 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            交易记录
          </h3>
          <button
            onClick={loadData}
            className="p-1.5 rounded-lg transition-colors hover:bg-black/[0.04]"
            style={{ color: 'var(--text-ter)' }}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <Card>
          <div className="p-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <TransactionTypeFilter selected={filter} onChange={setFilter} />
          </div>

          {error && (
            <div className="p-4 text-center">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--danger)' }} />
              <p className="text-xs" style={{ color: 'var(--text-sec)' }}>
                {error}
              </p>
            </div>
          )}

          {!error && filteredTransactions.length === 0 && (
            <div className="p-8 text-center">
              <Coins className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-ter)' }} />
              <p className="text-xs" style={{ color: 'var(--text-sec)' }}>
                暂无交易记录
              </p>
            </div>
          )}

          {filteredTransactions.length > 0 && (
            <>
              <div className="p-3 max-h-64 overflow-y-auto">
                {filteredTransactions.map((tx) => (
                  <TransactionItem key={tx.id} transaction={tx} />
                ))}
              </div>

              {hasMore && (
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full py-3 text-xs font-medium transition-colors flex items-center justify-center gap-2"
                  style={{ borderTop: '1px solid var(--border)', color: 'var(--accent1)' }}
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      加载中...
                    </>
                  ) : (
                    <>
                      加载更多
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

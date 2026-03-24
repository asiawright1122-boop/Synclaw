/**
 * 订阅与积分 API 服务
 * 桌面端通过此模块与 SynClaw 后端通信
 */

// ── Types ──────────────────────────────────────────────────────────────────

export type SubscriptionPlan = 'FREE' | 'STARTER' | 'PRO' | 'TEAM' | 'BYOK'
export type SubscriptionStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'INCOMPLETE' | 'INCOMPLETE_EXPIRED' | 'TRIALING' | 'UNPAID'

export interface Subscription {
  id: string
  plan: SubscriptionPlan
  status: SubscriptionStatus
  stripeCurrentPeriodEnd: string | null
  stripePriceId: string | null
  creditsBalance: number
  creditsExpireAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CreditsTransaction {
  id: string
  amount: number
  type: 'PURCHASE' | 'CONSUMPTION' | 'REFERRAL' | 'PROMO' | 'REFUND' | 'SUBSCRIPTION_BONUS'
  description: string
  createdAt: string
}

export interface UsageStats {
  period: 'daily' | 'weekly' | 'monthly' | 'yearly'
  creditsUsed: number
  apiCalls: number
  activeDays: number
  sessionsCount: number
}

// ── API Base URL ────────────────────────────────────────────────────────────

const API_BASE = '/api'

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`,
      }
    }

    return {
      success: true,
      data,
    }
  } catch (err) {
    return {
      success: false,
      error: String(err),
    }
  }
}

// ── Subscription API ────────────────────────────────────────────────────────

export async function getSubscription(): Promise<ApiResponse<Subscription>> {
  return apiRequest<Subscription>('/subscription')
}

export async function cancelSubscription(reason?: string): Promise<ApiResponse<Subscription>> {
  return apiRequest<Subscription>('/subscription', {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export async function createSubscriptionCheckout(priceId: string): Promise<ApiResponse<{ url: string }>> {
  return apiRequest<{ url: string }>('/subscription/checkout', {
    method: 'POST',
    body: JSON.stringify({ priceId }),
  })
}

// ── Credits API ─────────────────────────────────────────────────────────────

export async function getCreditsBalance(): Promise<ApiResponse<number>> {
  return apiRequest<number>('/subscription')
}

export async function getCreditsHistory(params?: {
  limit?: number
  cursor?: string
}): Promise<ApiResponse<{
  transactions: CreditsTransaction[]
  nextCursor?: string
  total: number
}>> {
  const searchParams = new URLSearchParams()
  if (params?.limit) searchParams.set('limit', String(params.limit))
  if (params?.cursor) searchParams.set('cursor', params.cursor)

  const query = searchParams.toString()
  return apiRequest(`/credits/history${query ? `?${query}` : ''}`)
}

export async function purchaseCredits(amount: number): Promise<ApiResponse<{ url: string }>> {
  return apiRequest<{ url: string }>('/credits/purchase', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  })
}

// ── Usage API ────────────────────────────────────────────────────────────────

export async function getUsageStats(params?: {
  period?: 'daily' | 'weekly' | 'monthly' | 'yearly'
  startDate?: string
  endDate?: string
}): Promise<ApiResponse<UsageStats>> {
  const searchParams = new URLSearchParams()
  if (params?.period) searchParams.set('period', params.period)
  if (params?.startDate) searchParams.set('startDate', params.startDate)
  if (params?.endDate) searchParams.set('endDate', params.endDate)

  const query = searchParams.toString()
  return apiRequest<UsageStats>(`/usage${query ? `?${query}` : ''}`)
}

// ── User API ────────────────────────────────────────────────────────────────

export async function getUserProfile(): Promise<ApiResponse<{
  id: string
  email: string
  name: string | null
  image: string | null
}>> {
  return apiRequest('/user/profile')
}

// ── Helpers ─────────────────────────────────────────────────────────────────

export function formatCredits(credits: number): string {
  if (credits >= 10000) {
    return `${(credits / 10000).toFixed(1)}万`
  }
  return credits.toLocaleString()
}

export function formatPlanName(plan: SubscriptionPlan): string {
  const names: Record<SubscriptionPlan, string> = {
    FREE: '免费版',
    STARTER: '入门版',
    PRO: 'Pro',
    TEAM: '团队版',
    BYOK: 'BYOK',
  }
  return names[plan] || plan
}

export function formatStatus(status: SubscriptionStatus): string {
  const names: Record<SubscriptionStatus, string> = {
    ACTIVE: '已激活',
    PAST_DUE: '逾期',
    CANCELED: '已取消',
    INCOMPLETE: '未完成',
    INCOMPLETE_EXPIRED: '已过期',
    TRIALING: '试用中',
    UNPAID: '未支付',
  }
  return names[status] || status
}

export function getPlanFeatures(plan: SubscriptionPlan): string[] {
  const features: Record<SubscriptionPlan, string[]> = {
    FREE: ['基础 AI 对话', '每日 10 次', '基础技能'],
    STARTER: ['AI 对话', '每日 100 次', '3 个分身', '基础 IM 渠道'],
    PRO: ['AI 对话', '无限次数', '10 个分身', '全部 IM 渠道', '优先支持'],
    TEAM: ['团队协作', '共享积分池', '管理后台', 'SSO'],
    BYOK: ['自带 API Key', '完全控制', '按量计费'],
  }
  return features[plan] || []
}

// ── API Response Type ───────────────────────────────────────────────────────

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

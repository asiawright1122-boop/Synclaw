/**
 * 订阅相关前端配置
 * 前端展示用 BYOK/PRO/ULTRA，与后端 SubscriptionPlan (FREE/STARTER/PRO/TEAM/BYOK) 分离
 */

import type { SubscriptionFeatures } from '../types/subscription'
import type { Subscription as BackendSubscription } from '../types/subscription'
import { api } from './api'

// 前端展示用的套餐 ID（与后端 SubscriptionPlan 不同）
export type Plan = 'BYOK' | 'PRO' | 'ULTRA'
export type SubscriptionStatus = 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'TRIALING' | 'INACTIVE'

// 前端订阅类型：后端数据 + 前端特性映射
export interface Subscription extends BackendSubscription {
  features: SubscriptionFeatures
}

export interface PlanDetails {
  id: Plan
  name: string
  description: string
  price: number
  features: SubscriptionFeatures
  isPopular?: boolean
}

export const PLANS: PlanDetails[] = [
  {
    id: 'BYOK',
    name: 'BYOK',
    description: '自备 API Key，免费使用基础功能',
    price: 0,
    features: {
      imChannels: 1,
      monthlyCredits: null,
      cloudSync: false,
      prioritySupport: false,
      maxAgents: 1,
    },
  },
  {
    id: 'PRO',
    name: 'Pro',
    description: '适合个人用户解锁全部能力',
    price: 99,
    features: {
      imChannels: 3,
      monthlyCredits: 10000,
      cloudSync: true,
      prioritySupport: false,
      maxAgents: 5,
      advancedAnalytics: false,
    },
  },
  {
    id: 'ULTRA',
    name: 'Ultra',
    description: '适合团队和企业用户',
    price: 299,
    features: {
      imChannels: -1, // unlimited
      monthlyCredits: 50000,
      cloudSync: true,
      prioritySupport: true,
      maxAgents: -1,
      advancedAnalytics: true,
    },
  },
]

export function getPlanDetails(plan: Plan): PlanDetails | undefined {
  return PLANS.find(p => p.id === plan)
}

// 后端 Subscription → 前端 Subscription（补充 features）
export function toFrontendSubscription(backend: BackendSubscription): Subscription {
  // 前端 BYOK/PRO/ULTRA 与后端 FREE/STARTER/PRO/TEAM/BYOK 的映射
  const planNameMap: Record<string, Plan> = {
    BYOK: 'BYOK',
    FREE: 'BYOK',
    STARTER: 'BYOK',
    PRO: 'PRO',
    TEAM: 'ULTRA',
  }
  const planId = planNameMap[backend.plan] || 'BYOK'
  const details = getPlanDetails(planId)
  return {
    ...backend,
    features: details?.features ?? PLANS[0].features,
  }
}

export function getPlanDisplayName(plan: Plan): string {
  return getPlanDetails(plan)?.name || plan
}

export function getPlanPrice(plan: Plan): number {
  return getPlanDetails(plan)?.price || 0
}

export function formatStatus(status: SubscriptionStatus): string {
  const statusMap: Record<SubscriptionStatus, string> = {
    ACTIVE: '已激活',
    CANCELED: '已取消',
    PAST_DUE: '待支付',
    TRIALING: '试用中',
    INACTIVE: '未激活',
  }
  return statusMap[status] || status
}

export function getStatusColor(status: SubscriptionStatus): string {
  const colorMap: Record<SubscriptionStatus, string> = {
    ACTIVE: 'var(--success)',
    CANCELED: 'var(--text-ter)',
    PAST_DUE: 'var(--danger)',
    TRIALING: 'var(--accent1)',
    INACTIVE: 'var(--text-ter)',
  }
  return colorMap[status] || 'var(--text-sec)'
}

export function isSubscriptionActive(subscription: Subscription | null): boolean {
  return subscription?.status === 'ACTIVE' || subscription?.status === 'TRIALING'
}

export function hasFeatureEnabled(
  subscription: Subscription | null,
  feature: keyof SubscriptionFeatures
): boolean {
  if (!subscription) return false
  const value = subscription.features[feature]
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value > 0 || value === -1
  return false
}

export function getImChannelLimit(subscription: Subscription | null): number {
  return subscription?.features.imChannels ?? 1
}

export function getMonthlyCredits(subscription: Subscription | null): number | null {
  return subscription?.features.monthlyCredits ?? null
}

class SubscriptionService {
  async getSubscription(): Promise<Subscription | null> {
    try {
      const response = await api.user.getSubscription()
      if (response.success && response.data) {
        return toFrontendSubscription(response.data)
      }
    } catch (error) {
      console.error('获取订阅信息失败:', error)
    }
    return null
  }

  async updateSubscription(plan: Plan): Promise<Subscription | null> {
    const response = await api.user.updateSubscription(plan)
    if (response.success && response.data) {
      return toFrontendSubscription(response.data)
    }
    throw new Error(response.error || '更新订阅失败')
  }

  async cancelSubscription(): Promise<void> {
    const response = await api.user.cancelSubscription()
    if (!response.success) {
      throw new Error(response.error || '取消订阅失败')
    }
  }

  async checkUpgradeAvailable(currentPlan: Plan, targetPlan: Plan): Promise<boolean> {
    const planOrder: Record<Plan, number> = { BYOK: 0, PRO: 1, ULTRA: 2 }
    return planOrder[targetPlan] > planOrder[currentPlan]
  }

  getRecommendedPlan(currentPlan: Plan): Plan {
    if (currentPlan === 'BYOK') return 'PRO'
    if (currentPlan === 'PRO') return 'ULTRA'
    return 'ULTRA'
  }
}

export const subscriptionService = new SubscriptionService()

export default subscriptionService

/**
 * SynClaw 订阅与积分类型 — 统一来源
 * 与 web/prisma/schema.prisma 保持一致
 */

export type SubscriptionPlan = 'FREE' | 'STARTER' | 'PRO' | 'TEAM' | 'BYOK'
export type SubscriptionStatus =
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'INCOMPLETE'
  | 'INCOMPLETE_EXPIRED'
  | 'TRIALING'
  | 'UNPAID'

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

export interface CreditsBalance {
  total: number
  general: number
  activity: number
  lifetimeValue?: number
}

export interface SubscriptionFeatures {
  imChannels: number
  monthlyCredits: number | null
  cloudSync: boolean
  prioritySupport: boolean
  maxAgents?: number
  advancedAnalytics?: boolean
}

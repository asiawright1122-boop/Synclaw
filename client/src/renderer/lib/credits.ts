/**
 * 积分相关 API
 */

import { api, CreditsBalance, CreditsHistoryItem } from './api'

export interface CreditsFilter {
  type?: 'all' | 'use' | 'earn'
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

export function formatCredits(amount: number): string {
  if (amount >= 10000) {
    return `${(amount / 10000).toFixed(1)}w`
  }
  return amount.toLocaleString()
}

export function formatCreditsDetail(amount: number): string {
  return amount.toLocaleString()
}

export function isCreditsExpiringSoon(balance: CreditsBalance | null, _daysThreshold = 7): boolean {
  if (!balance) return false
  if (balance.activity <= 0) return false
  return true // In real impl, check expiry date
}

export function getCreditsBreakdown(balance: CreditsBalance | null): {
  label: string
  value: number
  color: string
  note?: string
}[] {
  if (!balance) return []

  const breakdown = []

  if (balance.general > 0) {
    breakdown.push({
      label: '通用积分',
      value: balance.general,
      color: 'var(--accent1)',
      note: '永久有效',
    })
  }

  if (balance.activity > 0) {
    breakdown.push({
      label: '活动积分',
      value: balance.activity,
      color: '#22c55e',
      note: '周期有效',
    })
  }

  return breakdown
}

export function getCreditsUsageTypeLabel(type: CreditsHistoryItem['type']): string {
  const labels: Record<CreditsHistoryItem['type'], string> = {
    earn: '获得',
    use: '消耗',
    refund: '退款',
    bonus: '奖励',
    subscription: '订阅',
    skill: '技能',
    im_channel: 'IM频道',
  }
  return labels[type] || type
}

export function getCreditsUsageTypeColor(type: CreditsHistoryItem['type']): string {
  if (type === 'use' || type === 'skill' || type === 'im_channel') {
    return 'var(--danger)'
  }
  return 'var(--success)'
}

class CreditsService {
  async getBalance(): Promise<CreditsBalance | null> {
    try {
      const response = await api.user.getCredits()
      if (response.success && response.data) {
        return response.data
      }
    } catch (error) {
      console.error('获取积分余额失败:', error)
    }
    return null
  }

  async getHistory(filter?: CreditsFilter): Promise<CreditsHistoryItem[]> {
    try {
      const params: { limit?: number; offset?: number; type?: 'all' | 'use' | 'earn' } = {}
      if (filter?.limit) params.limit = filter.limit
      if (filter?.offset) params.offset = filter.offset
      if (filter?.type && filter.type !== 'all') params.type = filter.type

      const response = await api.user.getCreditsHistory(params)
      if (response.success && response.data) {
        return response.data
      }
    } catch (error) {
      console.error('获取积分历史失败:', error)
    }
    return []
  }

  async estimateUsage(periodDays = 30): Promise<{
    averageDaily: number
    projectedMonthly: number
    remainingDays: number
  }> {
    try {
      const history = await this.getHistory({ limit: 100, type: 'use' })
      
      const now = Date.now()
      const thirtyDaysAgo = now - periodDays * 24 * 60 * 60 * 1000
      
      const recentUsage = history.filter(item => {
        const itemTime = new Date(item.createdAt).getTime()
        return itemTime >= thirtyDaysAgo && item.amount < 0
      })
      
      const totalUsed = recentUsage.reduce((sum, item) => sum + Math.abs(item.amount), 0)
      const averageDaily = totalUsed / periodDays
      const projectedMonthly = averageDaily * 30
      
      return {
        averageDaily,
        projectedMonthly,
        remainingDays: periodDays,
      }
    } catch {
      return {
        averageDaily: 0,
        projectedMonthly: 0,
        remainingDays: periodDays,
      }
    }
  }

  estimateDaysUntilDepletion(balance: CreditsBalance, usagePerDay: number): number | null {
    if (usagePerDay <= 0) return null
    const total = balance.general + balance.activity
    return Math.floor(total / usagePerDay)
  }
}

export const creditsService = new CreditsService()

export default creditsService

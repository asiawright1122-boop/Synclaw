/**
 * SynClaw API 客户端
 * 与后端 API 集成，支持认证、订阅、积分、API Key 管理
 */

import type { Subscription, SubscriptionPlan, SubscriptionStatus, CreditsBalance } from '../types/subscription'

export type { Subscription, SubscriptionPlan, SubscriptionStatus, CreditsBalance }

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api';

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface ApiError {
  message: string
  code?: string
  status?: number
}

class ApiClient {
  private token: string | null = null

  setToken(token: string | null) {
    this.token = token
  }

  getToken(): string | null {
    return this.token
  }

  clearToken() {
    this.token = null
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }
    return headers
  }

  async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options?.headers,
      },
    })

    const json = await response.json().catch(() => ({}))

    if (!response.ok) {
      const errorData = json as Record<string, unknown>
      const error: ApiError = {
        message: (errorData as Record<string, unknown>).message as string || (errorData as Record<string, unknown>).error as string || `API Error: ${response.status}`,
        code: (errorData as Record<string, unknown>).code as string | undefined,
        status: response.status,
      }
      throw new Error(error.message)
    }

    // Normalize: if backend doesn't wrap { success, data }, wrap it here.
    if (json && typeof json === 'object' && 'success' in (json as Record<string, unknown>)) {
      return json as T
    }
    return ({ success: true, data: json } as T)
  }

  // 认证相关
  auth = {
    login: (email: string, password: string) =>
      this.request<ApiResponse<{ token: string; user: User }>>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),

    register: (email: string, password: string, name?: string) =>
      this.request<ApiResponse<{ token: string; user: User }>>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      }),

    logout: () =>
      this.request<ApiResponse>('/auth/logout', { method: 'POST' }),

    refreshToken: (refreshToken: string) =>
      this.request<ApiResponse<{ token: string }>>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }),

    me: () => this.request<ApiResponse<User>>('/auth/me'),
  }

  // 用户相关
  user = {
    getSubscription: () =>
      this.request<ApiResponse<Subscription>>('/subscription'),

    updateSubscription: (plan: string) =>
      this.request<ApiResponse<Subscription>>('/subscription', {
        method: 'PUT',
        body: JSON.stringify({ plan }),
      }),

    cancelSubscription: () =>
      this.request<ApiResponse>('/subscription', { method: 'POST' }),

    getCredits: async () => {
      const res = await this.request<ApiResponse<Subscription>>('/subscription')
      if (res.success && res.data) {
        return {
          success: true,
          data: {
            total: res.data.creditsBalance,
            general: res.data.creditsBalance,
            activity: 0,
          },
        } as ApiResponse<CreditsBalance>
      }
      return res as unknown as ApiResponse<CreditsBalance>
    },

    getCreditsHistory: async (params?: { limit?: number; offset?: number; type?: 'all' | 'use' | 'earn' }) => {
      const search = new URLSearchParams()
      if (params?.limit) search.set('limit', String(params.limit))
      if (params?.offset) {
        const page = Math.max(1, Math.floor(params.offset / (params.limit || 20)) + 1)
        search.set('page', String(page))
      }
      if (params?.type && params.type !== 'all') search.set('type', params.type)
      const query = search.toString()
      const res = await this.request<ApiResponse<{ items: CreditsHistoryItem[] }>>(`/credits/history${query ? `?${query}` : ''}`)
      if (res.success && (res.data as { items?: CreditsHistoryItem[] })?.items) {
        return { success: true, data: (res.data as { items: CreditsHistoryItem[] }).items } as unknown as ApiResponse<CreditsHistoryItem[]>
      }
      return res as unknown as ApiResponse<CreditsHistoryItem[]>
    },

    getApiKeys: () =>
      this.request<ApiResponse<{ items: ApiKey[] }>>('/api-keys').then((res) => {
        if (res.success && (res.data as { items?: ApiKey[] })?.items) {
          return { success: true, data: (res.data as { items: ApiKey[] }).items } as unknown as ApiResponse<ApiKey[]>
        }
        return res as unknown as ApiResponse<ApiKey[]>
      }),

    createApiKey: (name: string, permissions?: string[]) =>
      this.request<ApiResponse<{ key: string; apiKey: ApiKey }>>('/api-keys', {
        method: 'POST',
        body: JSON.stringify({ name, permissions }),
      }).then((res) => {
        if (res.success && res.data && (res.data as any).key) {
          const d = res.data as any
          return {
            success: true,
            data: {
              key: d.key,
              apiKey: {
                id: d.id,
                name: d.name,
                key: d.key,
                prefix: d.prefix ?? '',
                permissions: d.permissions ?? [],
                usageCount: d.usageCount ?? 0,
                usageLimit: d.usageLimit,
                lastUsedAt: d.lastUsedAt,
                createdAt: d.createdAt,
                expiresAt: d.expiresAt,
                isActive: d.revokedAt == null,
              },
            },
          } as ApiResponse<{ key: string; apiKey: ApiKey }>
        }
        return res as ApiResponse<{ key: string; apiKey: ApiKey }>
      }),

    deleteApiKey: (id: string) =>
      this.request<ApiResponse>(`/api-keys/${id}`, { method: 'DELETE' }),

    revokeApiKey: (id: string) =>
      this.request<ApiResponse>(`/api-keys/${id}`, { method: 'DELETE' }),

    getUsageStats: () => {
      return this.request<Record<string, unknown>>('/usage').then((res) => {
        if (res.success && res.data) {
          const d = res.data as unknown as Record<string, unknown>
          const summary = ((d['summary'] as Record<string, unknown>) ?? {}) as Record<string, unknown>
          const byModel = ((d['byModel'] as Array<Record<string, unknown>>) ?? []) as Array<Record<string, unknown>>
          return {
            success: true,
            data: {
              sessions: (summary['totalSessions'] as number) ?? 0,
              messages: (summary['totalMessages'] as number) ?? 0,
              inputTokens: 0,
              outputTokens: (summary['totalConsumption'] as number) ?? 0,
              models: byModel.map((m) => ({
                id: m['model'] as string,
                name: m['model'] as string,
                messages: (m['messages'] as number) ?? 0,
                inputTokens: 0,
                outputTokens: (m['tokens'] as number) ?? 0,
              })),
              period: {
                start: '',
                end: '',
              },
            },
          } as ApiResponse<UsageStats>
        }
        return res as unknown as ApiResponse<UsageStats>
      })
    },
    getProfile: () =>
      this.request<ApiResponse<UserProfile>>('/user/profile').then((res) => res),

    updateProfile: (data: Partial<UserProfile>) =>
      this.request<ApiResponse<UserProfile>>('/user/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  }
}

export interface User {
  id: string
  email: string
  name?: string
  phone?: string
  avatar?: string
  createdAt: string
  updatedAt: string
}

export interface UserProfile extends User {
  bio?: string
  company?: string
  website?: string
}

export interface CreditsHistoryItem {
  id: string
  amount: number
  type: 'earn' | 'use' | 'refund' | 'bonus' | 'subscription' | 'skill' | 'im_channel'
  description: string
  createdAt: string
  metadata?: Record<string, unknown>
}

export interface ApiKey {
  id: string
  name: string
  key: string
  prefix: string
  permissions: string[]
  usageCount: number
  usageLimit?: number
  lastUsedAt?: string
  createdAt: string
  expiresAt?: string
  isActive: boolean
}

export interface UsageStats {
  sessions: number
  messages: number
  inputTokens: number
  outputTokens: number
  models: ModelUsage[]
  period: {
    start: string
    end: string
  }
}

export interface ModelUsage {
  id: string
  name: string
  messages: number
  inputTokens: number
  outputTokens: number
}

export const api = new ApiClient()

export default api

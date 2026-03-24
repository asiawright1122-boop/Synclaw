/**
 * SynClaw API 客户端
 * 与后端 API 集成，支持认证、订阅、积分、API Key 管理
 */

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

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const error: ApiError = {
        message: errorData.message || errorData.error || `API Error: ${response.status}`,
        code: errorData.code,
        status: response.status,
      }
      throw new Error(error.message)
    }

    return response.json()
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
      this.request<ApiResponse<Subscription>>('/user/subscription'),

    updateSubscription: (plan: string) =>
      this.request<ApiResponse<Subscription>>('/user/subscription', {
        method: 'PUT',
        body: JSON.stringify({ plan }),
      }),

    cancelSubscription: () =>
      this.request<ApiResponse>('/user/subscription/cancel', { method: 'POST' }),

    getCredits: () =>
      this.request<ApiResponse<CreditsBalance>>('/user/credits'),

    getCreditsHistory: (params?: { limit?: number; offset?: number; type?: 'all' | 'use' | 'earn' }) =>
      this.request<ApiResponse<CreditsHistoryItem[]>>('/user/credits/history', {
        method: 'GET',
        ...(params && { headers: { 'X-Query': JSON.stringify(params) } }),
      }),

    getApiKeys: () =>
      this.request<ApiResponse<ApiKey[]>>('/user/api-keys'),

    createApiKey: (name: string, permissions?: string[]) =>
      this.request<ApiResponse<{ key: string; apiKey: ApiKey }>>('/user/api-keys', {
        method: 'POST',
        body: JSON.stringify({ name, permissions }),
      }),

    deleteApiKey: (id: string) =>
      this.request<ApiResponse>(`/user/api-keys/${id}`, { method: 'DELETE' }),

    revokeApiKey: (id: string) =>
      this.request<ApiResponse>(`/user/api-keys/${id}/revoke`, { method: 'POST' }),

    getUsageStats: () =>
      this.request<ApiResponse<UsageStats>>('/user/usage'),

    getProfile: () =>
      this.request<ApiResponse<UserProfile>>('/user/profile'),

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

export type Plan = 'BYOK' | 'PRO' | 'ULTRA'
export type SubscriptionStatus = 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'TRIALING' | 'INACTIVE'

export interface Subscription {
  plan: Plan
  status: SubscriptionStatus
  currentPeriodStart: string
  currentPeriodEnd?: string
  cancelAtPeriodEnd?: boolean
  features: SubscriptionFeatures
  trialEndsAt?: string
}

export interface SubscriptionFeatures {
  imChannels: number
  monthlyCredits: number | null
  cloudSync: boolean
  prioritySupport: boolean
  maxAgents?: number
  advancedAnalytics?: boolean
}

export interface CreditsBalance {
  total: number
  general: number
  activity: number
  lifetimeValue?: number
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

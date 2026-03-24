/**
 * 认证相关工具函数
 */

import { api, User } from './api'

const AUTH_TOKEN_KEY = 'synclaw_auth_token'
const REFRESH_TOKEN_KEY = 'synclaw_refresh_token'
const USER_KEY = 'synclaw_user'

export interface AuthState {
  isAuthenticated: boolean
  user: User | null
  token: string | null
  isLoading: boolean
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  name?: string
}

class AuthService {
  private token: string | null = null
  private refreshToken: string | null = null
  private user: User | null = null
  private listeners: Set<(state: AuthState) => void> = new Set()

  constructor() {
    this.loadFromStorage()
  }

  private loadFromStorage() {
    try {
      this.token = localStorage.getItem(AUTH_TOKEN_KEY)
      this.refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
      const userJson = localStorage.getItem(USER_KEY)
      if (userJson) {
        this.user = JSON.parse(userJson)
      }
      if (this.token) {
        api.setToken(this.token)
      }
    } catch {
      this.clearAuth()
    }
  }

  private saveToStorage() {
    if (this.token) {
      localStorage.setItem(AUTH_TOKEN_KEY, this.token)
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY)
    }
    if (this.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, this.refreshToken)
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY)
    }
    if (this.user) {
      localStorage.setItem(USER_KEY, JSON.stringify(this.user))
    } else {
      localStorage.removeItem(USER_KEY)
    }
  }

  private clearAuth() {
    this.token = null
    this.refreshToken = null
    this.user = null
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    api.clearToken()
  }

  private notify() {
    const state = this.getState()
    this.listeners.forEach(listener => listener(state))
  }

  getState(): AuthState {
    return {
      isAuthenticated: !!this.token,
      user: this.user,
      token: this.token,
      isLoading: false,
    }
  }

  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  async login(credentials: LoginCredentials): Promise<User> {
    const response = await api.auth.login(credentials.email, credentials.password)
    if (!response.success || !response.data) {
      throw new Error(response.error || '登录失败')
    }

    const { token, user } = response.data
    this.token = token
    api.setToken(token)
    
    if (user) {
      this.user = user
      localStorage.setItem(USER_KEY, JSON.stringify(user))
    }

    this.saveToStorage()
    this.notify()
    return user
  }

  async register(data: RegisterData): Promise<User> {
    const response = await api.auth.register(data.email, data.password, data.name)
    if (!response.success || !response.data) {
      throw new Error(response.error || '注册失败')
    }

    const { token, user } = response.data
    this.token = token
    api.setToken(token)
    
    if (user) {
      this.user = user
      localStorage.setItem(USER_KEY, JSON.stringify(user))
    }

    this.saveToStorage()
    this.notify()
    return user
  }

  async logout(): Promise<void> {
    try {
      await api.auth.logout()
    } catch {
      // ignore errors
    }
    this.clearAuth()
    this.notify()
  }

  async refreshAuth(): Promise<boolean> {
    if (!this.refreshToken) {
      return false
    }

    try {
      const response = await api.auth.refreshToken(this.refreshToken)
      if (response.success && response.data) {
        this.token = response.data.token
        api.setToken(this.token)
        this.saveToStorage()
        this.notify()
        return true
      }
    } catch {
      this.clearAuth()
      this.notify()
    }
    return false
  }

  async fetchCurrentUser(): Promise<User | null> {
    if (!this.token) {
      return null
    }

    try {
      const response = await api.auth.me()
      if (response.success && response.data) {
        this.user = response.data
        this.saveToStorage()
        this.notify()
        return this.user
      }
    } catch {
      // Token might be invalid
    }
    return null
  }

  getUser(): User | null {
    return this.user
  }

  isLoggedIn(): boolean {
    return !!this.token
  }

  getToken(): string | null {
    return this.token
  }
}

export const authService = new AuthService()

export default authService

/**
 * API Key 管理相关 API
 */

import { api, ApiKey } from './api'

export interface CreateApiKeyData {
  name: string
  permissions?: string[]
  expiresInDays?: number
}

export const DEFAULT_PERMISSIONS = [
  'chat:create',
  'chat:read',
  'chat:history',
  'files:read',
  'files:write',
]

export const AVAILABLE_PERMISSIONS = [
  { id: 'chat:create', label: '创建对话', description: '允许创建新的 AI 对话' },
  { id: 'chat:read', label: '读取对话', description: '允许读取对话内容' },
  { id: 'chat:history', label: '对话历史', description: '允许访问对话历史记录' },
  { id: 'files:read', label: '读取文件', description: '允许读取工作区文件' },
  { id: 'files:write', label: '写入文件', description: '允许创建和修改文件' },
  { id: 'agents:manage', label: '管理分身', description: '允许管理 AI 分身' },
  { id: 'skills:manage', label: '管理技能', description: '允许安装和配置技能' },
  { id: 'mcp:execute', label: '执行 MCP', description: '允许执行 MCP 工具' },
  { id: 'webhook:send', label: '发送 Webhook', description: '允许发送 webhook 通知' },
]

export function getPermissionLabel(permission: string): string {
  const found = AVAILABLE_PERMISSIONS.find(p => p.id === permission)
  return found?.label || permission
}

export function maskApiKey(key: string): string {
  if (key.length <= 12) return '****'
  const prefix = key.slice(0, 8)
  const suffix = key.slice(-4)
  return `${prefix}...${suffix}`
}

export function formatApiKeyCreatedAt(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export function formatLastUsed(dateStr?: string): string {
  if (!dateStr) return '从未使用'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '昨天'
  if (diffDays < 7) return `${diffDays} 天前`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} 周前`
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

export function getUsagePercentage(key: ApiKey): number {
  if (!key.usageLimit) return 0
  return Math.min(100, (key.usageCount / key.usageLimit) * 100)
}

export function getUsageColor(percentage: number): string {
  if (percentage >= 90) return 'var(--danger)'
  if (percentage >= 70) return '#f59e0b'
  return 'var(--success)'
}

export function isKeyExpiringSoon(key: ApiKey, daysThreshold = 7): boolean {
  if (!key.expiresAt) return false
  const expiryDate = new Date(key.expiresAt)
  const now = new Date()
  const diffMs = expiryDate.getTime() - now.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  return diffDays <= daysThreshold && diffDays >= 0
}

export function isKeyExpired(key: ApiKey): boolean {
  if (!key.expiresAt) return false
  return new Date(key.expiresAt) < new Date()
}

class ApiKeyService {
  async list(): Promise<ApiKey[]> {
    try {
      const response = await api.user.getApiKeys()
      if (response.success && response.data) {
        return response.data
      }
    } catch (error) {
      console.error('获取 API Keys 失败:', error)
    }
    return []
  }

  async create(data: CreateApiKeyData): Promise<{ key: string; apiKey: ApiKey } | null> {
    try {
      const response = await api.user.createApiKey(
        data.name,
        data.permissions || DEFAULT_PERMISSIONS
      )
      if (response.success && response.data) {
        return response.data
      }
      throw new Error(response.error || '创建 API Key 失败')
    } catch (error) {
      console.error('创建 API Key 失败:', error)
      throw error
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const response = await api.user.deleteApiKey(id)
      if (!response.success) {
        throw new Error(response.error || '删除 API Key 失败')
      }
    } catch (error) {
      console.error('删除 API Key 失败:', error)
      throw error
    }
  }

  async revoke(id: string): Promise<void> {
    try {
      const response = await api.user.revokeApiKey(id)
      if (!response.success) {
        throw new Error(response.error || '撤销 API Key 失败')
      }
    } catch (error) {
      console.error('撤销 API Key 失败:', error)
      throw error
    }
  }

  async rotate(id: string): Promise<{ key: string; apiKey: ApiKey } | null> {
    await this.delete(id)
    return null // In real impl, create new with same name
  }

  generateCurlExample(apiKey: string): string {
    const baseUrl = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api'
    return `curl -X POST "${baseUrl}/chat" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Hello!"}'`
  }

  generateFetchExample(apiKey: string): string {
    const baseUrl = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api'
    return `fetch('${baseUrl}/chat', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${apiKey}',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ message: 'Hello!' }),
})`
  }
}

export const apiKeyService = new ApiKeyService()

export default apiKeyService

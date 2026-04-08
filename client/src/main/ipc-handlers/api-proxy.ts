/**
 * api-proxy.ts — 通用 Web API 代理
 *
 * 解决 Electron 渲染进程跨域问题。
 * 渲染进程通过 IPC 调用本 handler，主进程持有 WEB_API_BASE 环境变量，
 * 通过主进程转发所有 Web API 请求，避免 CORS 问题。
 *
 * 使用方式：
 *   window.electronAPI?.apiProxy?.fetch({ path: '/api/subscription', method: 'GET' })
 *   window.electronAPI?.apiProxy?.fetch({ path: '/api/feedback', method: 'POST', body: { type: 'bug', description: '...' } })
 */

import { ipcMain } from 'electron'
import logger from '../logger.js'
import { getAppSettings } from '../index.js'

const log = logger.scope('api-proxy')

function getApiBase(): string | undefined {
  return process.env.WEB_API_BASE || getAppSettings().security.webApiBase || undefined
}

ipcMain.handle(
  'api:proxy',
  async (
    _event,
    { path, method = 'GET', body, token }: {
      path: string
      method?: string
      body?: unknown
      token?: string
    }
  ) => {
    const base = getApiBase()
    if (!base) {
      return { ok: false, status: 0, error: 'WEB_API_BASE is not configured', data: undefined }
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    try {
      const res = await fetch(`${base}${path}`, {
        method,
        headers,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      })

      const text = await res.text()
      let data: unknown = undefined
      try { data = JSON.parse(text) } catch { data = text }

      return { ok: res.ok, status: res.status, data, error: undefined }
    } catch (err) {
      log.error(`api:proxy ${method} ${path} failed:`, err)
      return { ok: false, status: 0, data: undefined, error: String(err) }
    }
  }
)

log.info('API proxy handler registered')

/**
 * web.ts — SynClaw 桌面客户端 ↔ web 平台 API 桥接。
 *
 * 职责：
 * 1. 将 SynClaw 设备注册到 web 平台（获取 device token）
 * 2. 将 AI 用量事件上报到 web 平台
 * 3. 管理 electron-store 中的 web token 持久化
 */

import { ipcMain } from 'electron'
import { getAppSettings, setAppSetting } from '../index.js'
import logger from '../logger.js'
import os from 'node:os'

const log = logger.scope('web')

const WEB_API_BASE = process.env.WEB_API_BASE ?? 'http://localhost:3000/api'

// ── Helpers ───────────────────────────────────────────────────────────────

async function apiRequest(
  path: string,
  opts: RequestInit & { token?: string } = {},
): Promise<{ ok: boolean; status: number; data?: unknown; error?: string }> {
  const { token, ...fetchOpts } = opts
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    const res = await fetch(`${WEB_API_BASE}${path}`, {
      ...fetchOpts,
      headers: { ...headers, ...fetchOpts.headers },
    })
    const data = await res.json().catch(() => ({}))
    return {
      ok: res.ok,
      status: res.status,
      data: data,
      error: data?.error as string | undefined,
    }
  } catch (err) {
    return { ok: false, status: 0, error: String(err) }
  }
}

function getDeviceName(): string {
  const hostname = os.hostname()
  const platform = os.platform() === 'darwin' ? 'Mac' : os.platform() === 'win32' ? 'Windows' : 'Linux'
  return hostname || `${platform} 设备`
}

// ── IPC Handlers ────────────────────────────────────────────────────────

/**
 * web:register — 注册或更新 SynClaw 设备，获取 device token
 * 调用时机：用户登录 web 账号后，或应用启动时
 */
ipcMain.handle('web:register', async (_event, { apiToken }: { apiToken: string }) => {
  try {
    const settings = getAppSettings()
    const existingId = settings.web.deviceId
    const existingToken = settings.web.deviceToken
    const deviceName = getDeviceName()
    const platform = os.platform()

    // 复用已有 ID / token 即可，无需重复注册
    if (existingId && existingToken) {
      log.info(`[web:register] 复用已有设备: id=${existingId}`)
      return { success: true, data: { id: existingId, token: existingToken } }
    }

    // 调用 POST /api/device-tokens 注册新设备
    const res = await apiRequest('/device-tokens', {
      method: 'POST',
      token: apiToken,
      body: JSON.stringify({ name: deviceName, platform }),
    })

    if (!res.ok) {
      log.error('[web:register] 注册失败:', res.error)
      return { success: false, error: res.error ?? '注册失败' }
    }

    const body = res.data as { id: string; token: string }
    // 持久化到 electron-store
    setAppSetting('web.deviceId', body.id)
    setAppSetting('web.deviceToken', body.token)
    setAppSetting('web.deviceName', deviceName)

    log.info(`[web:register] 设备注册成功: id=${body.id}`)
    return { success: true, data: { id: body.id, token: body.token } }
  } catch (err) {
    log.error('[web:register] 异常:', err)
    return { success: false, error: String(err) }
  }
})

/**
 * web:report-usage — 上报 AI 用量事件到 web 平台
 * events 格式与 /api/usage-events 一致
 */
ipcMain.handle(
  'web:report-usage',
  async (
    _event,
    { events }: { events: Array<{
      eventType: 'SESSION_START' | 'MESSAGE_SENT' | 'TOKENS_CONSUMED'
      model?: string
      inputTokens?: number
      outputTokens?: number
      sessionId?: string
      messageCount?: number
      metadata?: Record<string, unknown>
    }> },
  ) => {
    try {
      const settings = getAppSettings()
      const deviceToken = settings.web.deviceToken

      if (!deviceToken) {
        // 未注册设备，跳过上报（不影响核心功能）
        log.debug('[web:report-usage] 未注册设备，跳过')
        return { success: true, skipped: true }
      }

      const res = await apiRequest('/usage-events', {
        method: 'POST',
        body: JSON.stringify({ deviceToken, events }),
      })

      if (!res.ok) {
        log.warn('[web:report-usage] 上报失败（非致命）:', res.error)
        return { success: false, error: res.error }
      }

      setAppSetting('web.lastReportedAt', new Date().toISOString())
      log.debug(`[web:report-usage] 上报成功: ${events.length} events`)
      return { success: true, data: res.data }
    } catch (err) {
      log.warn('[web:report-usage] 异常（非致命）:', err)
      return { success: false, error: String(err) }
    }
  },
)

/**
 * web:revoke — 撤销设备 token（退出账号时调用）
 */
ipcMain.handle('web:revoke', async () => {
  try {
    const settings = getAppSettings()
    const deviceId = settings.web.deviceId
    const apiToken = '' // 需要从 renderer 传入

    if (deviceId) {
      // 调用 DELETE /api/device-tokens/[id]（可选，不影响本地）
      await apiRequest(`/device-tokens/${deviceId}`, { method: 'DELETE', token: apiToken })
    }

    setAppSetting('web.deviceToken', '')
    setAppSetting('web.deviceId', '')
    setAppSetting('web.deviceName', '')
    setAppSetting('web.lastReportedAt', '')

    log.info('[web:revoke] 设备已撤销')
    return { success: true }
  } catch (err) {
    log.error('[web:revoke] 异常:', err)
    return { success: false, error: String(err) }
  }
})

log.info('Web API handlers registered')

import { ipcMain, BrowserWindow, dialog, shell, app } from 'electron'
import * as os from 'os'
import * as path from 'node:path'
import { getGatewayBridge } from './gateway-bridge.js'
import { downloadUpdate, installUpdate } from './updater.js'
import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'

const log = {
  info: (...args: unknown[]) => console.log('[IPC]', new Date().toISOString(), ...args),
  error: (...args: unknown[]) => console.error('[IPC]', new Date().toISOString(), ...args),
}

// 获取 gateway bridge 单例
function gateway() {
  return getGatewayBridge()
}

export function registerIpcHandlers() {
  // ── Sessions ─────────────────────────────────────────────────────

  ipcMain.handle('openclaw:sessions:list', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('sessions.list', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:sessions:list failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:sessions:patch', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('sessions.patch', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:sessions:patch failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:sessions:reset', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('sessions.reset', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:sessions:reset failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:sessions:delete', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('sessions.delete', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:sessions:delete failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:sessions:compact', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('sessions.compact', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:sessions:compact failed:', err)
      return { success: false, error: String(err) }
    }
  })

  // ── Channels ─────────────────────────────────────────────────────

  ipcMain.handle('openclaw:channels:status', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('channels.status', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:channels:status failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:channels:configure', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('channels.configure', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:channels:configure failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:channels:disconnect', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('channels.disconnect', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:channels:disconnect failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:channels:send', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('channels.send', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:channels:send failed:', err)
      return { success: false, error: String(err) }
    }
  })

  // ── Gateway 状态 ───────────────────────────────────────────────────

  ipcMain.handle('openclaw:status', () => {
    return gateway().getStatus()
  })

  ipcMain.handle('openclaw:connect', async () => {
    try {
      await gateway().connect()
      return { success: true }
    } catch (err) {
      log.error('openclaw:connect failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:disconnect', async () => {
    try {
      await gateway().disconnect()
      return { success: true }
    } catch (err) {
      log.error('openclaw:disconnect failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:reconnect', async () => {
    try {
      await gateway().reconnect()
      return { success: true }
    } catch (err) {
      log.error('openclaw:reconnect failed:', err)
      return { success: false, error: String(err) }
    }
  })

  // ── Agent ────────────────────────────────────────────────────────

  ipcMain.handle('openclaw:agent', async (_event, params: Record<string, unknown> = {}) => {
    try {
      // agent 方法返回流式响应，通过 { expectFinal: true } 等待最终结果
      const result = await gateway().request('agent', params, { expectFinal: true })
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:agent failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:agent:wait', async (_event, params: { runId: string; timeoutMs?: number }) => {
    try {
      const result = await gateway().request('agent.wait', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:agent:wait failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:agent:identity', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('agent.identity.get', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:agent:identity failed:', err)
      return { success: false, error: String(err) }
    }
  })

  // ── Chat ─────────────────────────────────────────────────────────

  ipcMain.handle('openclaw:chat:send', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('chat.send', params, { expectFinal: true })
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:chat:send failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:chat:history', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('chat.history', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:chat:history failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:chat:abort', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('chat.abort', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:chat:abort failed:', err)
      return { success: false, error: String(err) }
    }
  })

  // ── Agents (多分身) ──────────────────────────────────────────────

  ipcMain.handle('openclaw:agents:list', async () => {
    try {
      const result = await gateway().request('agents.list')
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:agents:list failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:agents:create', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('agents.create', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:agents:create failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:agents:update', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('agents.update', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:agents:update failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:agents:delete', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('agents.delete', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:agents:delete failed:', err)
      return { success: false, error: String(err) }
    }
  })

  // ── Skills ───────────────────────────────────────────────────────

  ipcMain.handle('openclaw:skills:status', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('skills.status', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:skills:status failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:skills:install', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('skills.install', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:skills:install failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:skills:update', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('skills.update', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:skills:update failed:', err)
      return { success: false, error: String(err) }
    }
  })

  // ── Config ───────────────────────────────────────────────────────

  ipcMain.handle('openclaw:config:get', async () => {
    try {
      const result = await gateway().request('config.get')
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:config:get failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:config:patch', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('config.patch', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:config:patch failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:config:apply', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('config.apply', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:config:apply failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:config:schema', async () => {
    try {
      const result = await gateway().request('config.schema')
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:config:schema failed:', err)
      return { success: false, error: String(err) }
    }
  })

  // ── Cron ─────────────────────────────────────────────────────────

  ipcMain.handle('openclaw:cron:list', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('cron.list', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:cron:list failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:cron:status', async () => {
    try {
      const result = await gateway().request('cron.status')
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:cron:status failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:cron:add', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('cron.add', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:cron:add failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:cron:update', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('cron.update', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:cron:update failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:cron:remove', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('cron.remove', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:cron:remove failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:cron:run', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('cron.run', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:cron:run failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:cron:runs', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('cron.runs', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:cron:runs failed:', err)
      return { success: false, error: String(err) }
    }
  })

  // ── Tools ────────────────────────────────────────────────────────

  ipcMain.handle('openclaw:tools:catalog', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('tools.catalog', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:tools:catalog failed:', err)
      return { success: false, error: String(err) }
    }
  })

  // ── Models ───────────────────────────────────────────────────────

  ipcMain.handle('openclaw:models:list', async () => {
    try {
      const result = await gateway().request('models.list')
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:models:list failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:models:getCurrent', async () => {
    try {
      const result = await gateway().request('models.getCurrent')
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:models:getCurrent failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:models:setCurrent', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('models.setCurrent', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:models:setCurrent failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:models:configure', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('models.configure', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:models:configure failed:', err)
      return { success: false, error: String(err) }
    }
  })

  // ── Memory list / delete ───────────────────────────────────────────

  ipcMain.handle('openclaw:memory:search', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('memory.search', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:memory:search failed:', err)
      return { success: false, error: String(err) }
    }
  })

  // ── Health / Info ────────────────────────────────────────────────

  ipcMain.handle('openclaw:health', async () => {
    try {
      const result = await gateway().request('health')
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:health failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:usage:status', async () => {
    try {
      const result = await gateway().request('usage.status')
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:usage:status failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:usage:cost', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('usage.cost', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:usage:cost failed:', err)
      return { success: false, error: String(err) }
    }
  })

  // ── Gateway Identity ─────────────────────────────────────────────

  ipcMain.handle('openclaw:gateway:identity', async () => {
    try {
      const result = await gateway().request('gateway.identity.get')
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:gateway:identity failed:', err)
      return { success: false, error: String(err) }
    }
  })

  // ── User ────────────────────────────────────────────────────────

  ipcMain.handle('openclaw:user:getPoints', async () => {
    try {
      const result = await gateway().request('user.getPoints')
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:user:getPoints failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:user:getPointsHistory', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('user.getPointsHistory', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:user:getPointsHistory failed:', err)
      return { success: false, error: String(err) }
    }
  })

  // ── Hooks ──────────────────────────────────────────────────────────

  ipcMain.handle('openclaw:hooks:list', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('hooks.list', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:hooks:list failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:hooks:add', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('hooks.add', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:hooks:add failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:hooks:update', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('hooks.update', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:hooks:update failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:hooks:remove', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('hooks.remove', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:hooks:remove failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:hooks:runs', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('hooks.runs', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:hooks:runs failed:', err)
      return { success: false, error: String(err) }
    }
  })

  // ── Memory list / delete ───────────────────────────────────────────

  ipcMain.handle('openclaw:memory:list', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('memory.list', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:memory:list failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:memory:delete', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('memory.delete', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:memory:delete failed:', err)
      return { success: false, error: String(err) }
    }
  })

  // ── Memory store ─────────────────────────────────────────────────

  ipcMain.handle('openclaw:memory:store', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('memory.store', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:memory:store failed:', err)
      return { success: false, error: String(err) }
    }
  })

  // ── Sessions preview ───────────────────────────────────────────────

  ipcMain.handle('openclaw:sessions:preview', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('sessions.preview', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:sessions:preview failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:sessions:usage', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('sessions.usage', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:sessions:usage failed:', err)
      return { success: false, error: String(err) }
    }
  })

  // ── Agents files ──────────────────────────────────────────────────

  ipcMain.handle('openclaw:agents:files:list', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('agents.files.list', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:agents:files:list failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:agents:files:get', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('agents.files.get', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:agents:files:get failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:agents:files:set', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('agents.files.set', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:agents:files:set failed:', err)
      return { success: false, error: String(err) }
    }
  })

  // ── Chat inject ────────────────────────────────────────────────────

  ipcMain.handle('openclaw:chat:inject', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('chat.inject', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:chat:inject failed:', err)
      return { success: false, error: String(err) }
    }
  })

  // ── Send message ──────────────────────────────────────────────────

  ipcMain.handle('openclaw:send', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('send', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:send failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:poll', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('poll', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:poll failed:', err)
      return { success: false, error: String(err) }
    }
  })

  // ── Channels logout ────────────────────────────────────────────────

  ipcMain.handle('openclaw:channels:logout', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('channels.logout', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:channels:logout failed:', err)
      return { success: false, error: String(err) }
    }
  })

  // ── Web Login ─────────────────────────────────────────────────────

  ipcMain.handle('openclaw:web:login:start', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('web.login.start', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:web:login:start failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:web:login:wait', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('web.login.wait', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:web:login:wait failed:', err)
      return { success: false, error: String(err) }
    }
  })

  // ── Config set ────────────────────────────────────────────────────

  ipcMain.handle('openclaw:config:set', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('config.set', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:config:set failed:', err)
      return { success: false, error: String(err) }
    }
  })

  // ── TTS ───────────────────────────────────────────────────────────

  ipcMain.handle('openclaw:tts:status', async () => {
    try {
      const result = await gateway().request('tts.status')
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:tts:status failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:tts:providers', async () => {
    try {
      const result = await gateway().request('tts.providers')
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:tts:providers failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:tts:enable', async () => {
    try {
      const result = await gateway().request('tts.enable')
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:tts:enable failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:tts:disable', async () => {
    try {
      const result = await gateway().request('tts.disable')
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:tts:disable failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:tts:convert', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('tts.convert', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:tts:convert failed:', err)
      return { success: false, error: String(err) }
    }
  })

  // ── Update ────────────────────────────────────────────────────────

  ipcMain.handle('openclaw:update:run', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('update.run', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:update:run failed:', err)
      return { success: false, error: String(err) }
    }
  })

  // ── Logs ─────────────────────────────────────────────────────────

  ipcMain.handle('openclaw:logs:tail', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('logs.tail', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:logs:tail failed:', err)
      return { success: false, error: String(err) }
    }
  })

  // ── UI Actions ──────────────────────────────────────────────────────────

  ipcMain.handle('ui:openCredits', async () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) {
      win.webContents.send('navigate', { page: 'credits' })
    }
    return { success: true }
  })

  ipcMain.handle('ui:openSettings', async () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) {
      win.webContents.send('navigate', { page: 'settings' })
    }
    return { success: true }
  })

  ipcMain.handle('ui:openAvatarCreate', async () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) {
      win.webContents.send('navigate', { page: 'avatarCreate' })
    }
    return { success: true }
  })

  // ── Window handlers ─────────────────────────────────────────────────

  ipcMain.handle('window:minimize', () => {
    BrowserWindow.getFocusedWindow()?.minimize()
    return { success: true }
  })

  ipcMain.handle('window:maximize', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize()
      } else {
        win.maximize()
      }
    }
    return { success: true }
  })

  ipcMain.handle('window:close', () => {
    BrowserWindow.getFocusedWindow()?.close()
    return { success: true }
  })

  ipcMain.handle('window:isMaximized', () => {
    return { success: true, data: BrowserWindow.getFocusedWindow()?.isMaximized() ?? false }
  })

  ipcMain.handle('window:toggleFullScreen', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) {
      win.setFullScreen(!win.isFullScreen())
    }
    return { success: true }
  })

  // ── File handlers ───────────────────────────────────────────────────

  ipcMain.handle('file:read', async (_event, filePath: string) => {
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      return { success: true, data: content }
    } catch (err) {
      log.error('file:read failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('file:readBinary', async (_event, filePath: string) => {
    try {
      const buffer = await fs.readFile(filePath)
      return { success: true, data: buffer.toString('base64') }
    } catch (err) {
      log.error('file:readBinary failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('file:write', async (_event, filePath: string, content: string) => {
    try {
      await fs.writeFile(filePath, content, 'utf-8')
      return { success: true }
    } catch (err) {
      log.error('file:write failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('file:list', async (_event, dirPath: string) => {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })
      const files = entries.map(entry => ({
        name: entry.name,
        path: path.join(dirPath, entry.name),
        isDirectory: entry.isDirectory(),
      }))
      return { success: true, data: files }
    } catch (err) {
      log.error('file:list failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('file:delete', async (_event, filePath: string) => {
    try {
      const stat = await fs.stat(filePath)
      if (stat.isDirectory()) {
        await fs.rm(filePath, { recursive: true })
      } else {
        await fs.unlink(filePath)
      }
      return { success: true }
    } catch (err) {
      log.error('file:delete failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('file:stat', async (_event, filePath: string) => {
    try {
      const stat = await fs.stat(filePath)
      return {
        success: true,
        data: {
          size: stat.size,
          isDirectory: stat.isDirectory(),
          isFile: stat.isFile(),
          created: stat.birthtime.toISOString(),
          modified: stat.mtime.toISOString(),
        },
      }
    } catch (err) {
      log.error('file:stat failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('file:mkdir', async (_event, dirPath: string) => {
    try {
      await fs.mkdir(dirPath, { recursive: true })
      return { success: true }
    } catch (err) {
      log.error('file:mkdir failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('file:exists', async (_event, filePath: string) => {
    return { success: true, data: existsSync(filePath) }
  })

  ipcMain.handle('file:rename', async (_event, oldPath: string, newPath: string) => {
    try {
      await fs.rename(oldPath, newPath)
      return { success: true }
    } catch (err) {
      log.error('file:rename failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('file:copy', async (_event, srcPath: string, destPath: string) => {
    try {
      const srcStat = await fs.stat(srcPath)
      if (srcStat.isDirectory()) {
        await fs.cp(srcPath, destPath, { recursive: true })
      } else {
        await fs.copyFile(srcPath, destPath)
      }
      return { success: true }
    } catch (err) {
      log.error('file:copy failed:', err)
      return { success: false, error: String(err) }
    }
  })

  // ── Path utilities ─────────────────────────────────────────────────

  ipcMain.handle('path:expandTilde', (_event, inputPath: string) => {
    if (inputPath.startsWith('~/')) {
      return path.join(os.homedir(), inputPath.slice(2))
    }
    return inputPath
  })

  // File watching - tracked per window
  const fileWatchers = new Map<string, fs.StatWatcher>()

  ipcMain.handle('file:watch', async (event, dirPath: string) => {
    try {
      if (fileWatchers.has(dirPath)) {
        return { success: true, data: 'already watching' }
      }
      const watcher = fs.watch(dirPath, { recursive: true }, (eventType, filename) => {
        const win = BrowserWindow.fromWebContents(event.sender)
        if (win) {
          win.webContents.send('file:changed', { dirPath, event: eventType, filename })
        }
      })
      fileWatchers.set(dirPath, watcher)
      return { success: true }
    } catch (err) {
      log.error('file:watch failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('file:unwatch', async (_event, dirPath: string) => {
    try {
      const watcher = fileWatchers.get(dirPath)
      if (watcher) {
        watcher.close()
        fileWatchers.delete(dirPath)
      }
      return { success: true }
    } catch (err) {
      log.error('file:unwatch failed:', err)
      return { success: false, error: String(err) }
    }
  })

  // ── Dialog handlers ─────────────────────────────────────────────────

  ipcMain.handle('dialog:openFile', async (_event, options?: Electron.OpenDialogOptions) => {
    try {
      const result = await dialog.showOpenDialog(options)
      return result
    } catch (err) {
      log.error('dialog:openFile failed:', err)
      return { canceled: true, filePaths: [] }
    }
  })

  ipcMain.handle('dialog:saveFile', async (_event, options?: Electron.SaveDialogOptions) => {
    try {
      const result = await dialog.showSaveDialog(options)
      return result
    } catch (err) {
      log.error('dialog:saveFile failed:', err)
      return { canceled: true, filePath: undefined }
    }
  })

  ipcMain.handle('dialog:selectDirectory', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
      })
      return result
    } catch (err) {
      log.error('dialog:selectDirectory failed:', err)
      return { canceled: true, filePaths: [] }
    }
  })

  // ── Shell handlers ──────────────────────────────────────────────────

  ipcMain.handle('shell:openPath', async (_event, filePath: string) => {
    return shell.openPath(filePath)
  })

  ipcMain.handle('shell:openExternal', async (_event, url: string) => {
    try {
      await shell.openExternal(url)
      return { success: true }
    } catch (err) {
      log.error('shell:openExternal failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('shell:showItemInFolder', async (_event, filePath: string) => {
    shell.showItemInFolder(filePath)
    return { success: true }
  })

  // ── App handlers ────────────────────────────────────────────────────

  ipcMain.handle('app:getVersion', () => {
    return app.getVersion()
  })

  ipcMain.handle('app:getPath', (_event, name: 'home' | 'appData' | 'userData' | 'temp' | 'desktop' | 'documents') => {
    return app.getPath(name)
  })

  ipcMain.handle('app:setAutoLaunch', (_event, enabled: boolean) => {
    app.setLoginItemSettings({
      openAtLogin: enabled,
    })
    return { success: true }
  })

  ipcMain.handle('app:getAutoLaunch', () => {
    const settings = app.getLoginItemSettings()
    return settings.openAtLogin
  })

  // ── App Settings (electron-store) ──────────────────────────────────

  ipcMain.handle('settings:get', () => {
    const { getAppSettings } = require('./index.js')
    return { success: true, data: getAppSettings() }
  })

  ipcMain.handle('settings:set', (_event, key: string, value: unknown) => {
    const { setAppSetting } = require('./index.js')
    const validKeys = ['theme', 'fontSize', 'animationsEnabled', 'notificationsEnabled', 'compactMode', 'favorites', 'privacy.optimizationPlan']
    if (!validKeys.includes(key)) {
      return { success: false, error: `Invalid settings key: ${key}` }
    }
    try {
      setAppSetting(key as keyof import('./index.js').AppSettings, value as never)
      return { success: true }
    } catch (err) {
      log.error('settings:set failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('settings:reset', () => {
    const { resetAppSettings } = require('./index.js')
    return { success: true, data: resetAppSettings() }
  })

  // ── Auto Update ────────────────────────────────────────────────────────

  ipcMain.handle('app:downloadUpdate', async () => {
    try {
      await downloadUpdate()
      return { success: true }
    } catch (err) {
      log.error('app:downloadUpdate failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('app:installUpdate', () => {
    installUpdate()
    return { success: true }
  })

  // ── Device Pair ────────────────────────────────────────────────────

  ipcMain.handle('openclaw:device:pair:list', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('device.pair.list', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:device:pair:list failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:device:pair:approve', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('device.pair.approve', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:device:pair:approve failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:device:pair:reject', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('device.pair.reject', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:device:pair:reject failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:device:pair:remove', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('device.pair.remove', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:device:pair:remove failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:device:token:rotate', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('device.token.rotate', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:device:token:rotate failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:device:token:revoke', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('device.token.revoke', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:device:token:revoke failed:', err)
      return { success: false, error: String(err) }
    }
  })

  // ── Node Pair ──────────────────────────────────────────────────────

  ipcMain.handle('openclaw:node:pair:request', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('node.pair.request', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:node:pair:request failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:node:pair:list', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('node.pair.list', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:node:pair:list failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:node:pair:approve', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('node.pair.approve', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:node:pair:approve failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:node:pair:reject', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('node.pair.reject', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:node:pair:reject failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:node:pair:verify', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('node.pair.verify', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:node:pair:verify failed:', err)
      return { success: false, error: String(err) }
    }
  })

  // ── Node Management ────────────────────────────────────────────────

  ipcMain.handle('openclaw:node:rename', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('node.rename', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:node:rename failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:node:list', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('node.list', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:node:list failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:node:describe', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('node.describe', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:node:describe failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:node:pending:drain', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('node.pending.drain', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:node:pending:drain failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:node:pending:enqueue', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('node.pending.enqueue', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:node:pending:enqueue failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:node:pending:pull', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('node.pending.pull', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:node:pending:pull failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:node:pending:ack', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('node.pending.ack', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:node:pending:ack failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:node:invoke', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('node.invoke', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:node:invoke failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:node:invoke:result', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('node.invoke.result', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:node:invoke:result failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:node:event', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('node.event', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:node:event failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:node:canvas:capability:refresh', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('node.canvas.capability.refresh', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:node:canvas:capability:refresh failed:', err)
      return { success: false, error: String(err) }
    }
  })

  // ── Exec Approvals ─────────────────────────────────────────────────

  ipcMain.handle('openclaw:exec:approvals:get', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('exec.approvals.get', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:exec:approvals:get failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:exec:approvals:set', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('exec.approvals.set', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:exec:approvals:set failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:exec:approvals:node:get', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('exec.approvals.node.get', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:exec:approvals:node:get failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:exec:approvals:node:set', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('exec.approvals.node.set', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:exec:approvals:node:set failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:exec:approval:request', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('exec.approval.request', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:exec:approval:request failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:exec:approval:waitDecision', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('exec.approval.waitDecision', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:exec:approval:waitDecision failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:exec:approval:resolve', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('exec.approval.resolve', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:exec:approval:resolve failed:', err)
      return { success: false, error: String(err) }
    }
  })

  // ── Wizard ─────────────────────────────────────────────────────────

  ipcMain.handle('openclaw:wizard:start', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('wizard.start', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:wizard:start failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:wizard:next', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('wizard.next', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:wizard:next failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:wizard:cancel', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('wizard.cancel', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:wizard:cancel failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:wizard:status', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('wizard.status', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:wizard:status failed:', err)
      return { success: false, error: String(err) }
    }
  })

  // ── Push (APNs) ───────────────────────────────────────────────────

  ipcMain.handle('openclaw:push:test', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('push.test', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:push:test failed:', err)
      return { success: false, error: String(err) }
    }
  })

  // ── Voice Wake ────────────────────────────────────────────────────

  ipcMain.handle('openclaw:voicewake:get', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('voicewake.get', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:voicewake:get failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:voicewake:set', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('voicewake.set', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:voicewake:set failed:', err)
      return { success: false, error: String(err) }
    }
  })

  // ── Browser ──────────────────────────────────────────────────────

  ipcMain.handle('openclaw:browser:request', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('browser.request', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:browser:request failed:', err)
      return { success: false, error: String(err) }
    }
  })

  // ── System ───────────────────────────────────────────────────────

  ipcMain.handle('openclaw:system:presence', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('system-presence', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:system:presence failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:system:event', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('system-event', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:system:event failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:last-heartbeat', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('last-heartbeat', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:last-heartbeat failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:set-heartbeats', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('set-heartbeats', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:set-heartbeats failed:', err)
      return { success: false, error: String(err) }
    }
  })

  // ── Talk (Dialog Mode) ───────────────────────────────────────────

  ipcMain.handle('openclaw:talk:config', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('talk.config', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:talk:config failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('openclaw:talk:mode', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('talk.mode', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:talk:mode failed:', err)
      return { success: false, error: String(err) }
    }
  })

  // ── Doctor ───────────────────────────────────────────────────────

  ipcMain.handle('openclaw:doctor:memory:status', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('doctor.memory.status', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:doctor:memory:status failed:', err)
      return { success: false, error: String(err) }
    }
  })

  // ── Config schema.lookup ─────────────────────────────────────────

  ipcMain.handle('openclaw:config:schema:lookup', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('config.schema.lookup', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:config:schema:lookup failed:', err)
      return { success: false, error: String(err) }
    }
  })

  // ── TTS provider ────────────────────────────────────────────────

  ipcMain.handle('openclaw:tts:setProvider', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('tts.setProvider', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:tts:setProvider failed:', err)
      return { success: false, error: String(err) }
    }
  })

  // ── Sessions usage ────────────────────────────────────────────────

  ipcMain.handle('openclaw:status:get', async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await gateway().request('status', params)
      return { success: true, data: result }
    } catch (err) {
      log.error('openclaw:status:get failed:', err)
      return { success: false, error: String(err) }
    }
  })

  log.info('All IPC handlers registered successfully')
}

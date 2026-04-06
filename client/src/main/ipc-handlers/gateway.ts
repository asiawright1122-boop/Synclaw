/**
 * Gateway.ts — All OpenClaw Gateway API pass-through handlers.
 * Each handler calls gateway().request() and wraps the result.
 */

import { ipcMain } from 'electron'
import { getGatewayBridge } from '../gateway-bridge.js'
import logger from '../logger.js'

const log = logger.scope('gateway')
function g() { return getGatewayBridge() }

// ── Shared response type ───────────────────────────────────────────────────

type ApiResponse<T = unknown> = { success: boolean; data?: T; error?: string }

// ── Unified handler factory ───────────────────────────────────────────────

function gw<T = unknown>(
  channel: string,
  method: string,
  opts: { expectFinal?: boolean } = {},
): void {
  ipcMain.handle(channel, async (_event, params: Record<string, unknown> = {}) => {
    try {
      const result = await g().request<T>(method, params, opts)
      return { success: true, data: result }
    } catch (err) {
      log.error(`${channel} failed:`, err)
      return { success: false, error: String(err) }
    }
  })
}

// ── Lifecycle ──────────────────────────────────────────────────────────────

ipcMain.handle('openclaw:status', (): ReturnType<typeof g.getStatus> => g().getStatus())

ipcMain.handle('workspace:get', () => {
  return g().getWorkspacePath()
})

ipcMain.handle('openclaw:connect', async (): Promise<ApiResponse> => {
  try { await g().connect(); return { success: true } }
  catch (err) { log.error('connect failed:', err); return { success: false, error: String(err) } }
})

ipcMain.handle('openclaw:disconnect', async (): Promise<ApiResponse> => {
  try { await g().disconnect(); return { success: true } }
  catch (err) { log.error('disconnect failed:', err); return { success: false, error: String(err) } }
})

ipcMain.handle('openclaw:reconnect', async (): Promise<ApiResponse> => {
  try { await g().reconnect(); return { success: true } }
  catch (err) { log.error('reconnect failed:', err); return { success: false, error: String(err) } }
})

// ── Sessions ───────────────────────────────────────────────────────────────

gw('openclaw:sessions:list', 'sessions.list')
gw('openclaw:sessions:patch', 'sessions.patch')
gw('openclaw:sessions:reset', 'sessions.reset')
gw('openclaw:sessions:delete', 'sessions.delete')
gw('openclaw:sessions:compact', 'sessions.compact')
gw('openclaw:sessions:preview', 'sessions.preview')
gw('openclaw:sessions:usage', 'sessions.usage')

// ── Channels ───────────────────────────────────────────────────────────────

gw('openclaw:channels:status', 'channels.status')
gw('openclaw:channels:configure', 'channels.configure')
gw('openclaw:channels:disconnect', 'channels.disconnect')
gw('openclaw:channels:send', 'channels.send')
gw('openclaw:channels:logout', 'channels.logout')

// ── Agent ─────────────────────────────────────────────────────────────────

ipcMain.handle('openclaw:agent', async (_event, params: Record<string, unknown> = {}): Promise<ApiResponse> => {
  try {
    const result = await g().request('agent', params, { expectFinal: true })
    return { success: true, data: result }
  } catch (err) {
    log.error('openclaw:agent failed:', err)
    return { success: false, error: String(err) }
  }
})

ipcMain.handle('openclaw:agent:wait', async (_event, params: { runId: string; timeoutMs?: number }): Promise<ApiResponse> => {
  try {
    const result = await g().request('agent.wait', params)
    return { success: true, data: result }
  } catch (err) {
    log.error('openclaw:agent:wait failed:', err)
    return { success: false, error: String(err) }
  }
})

ipcMain.handle('openclaw:agent:identity', async (_event, params: Record<string, unknown> = {}): Promise<ApiResponse> => {
  try {
    const result = await g().request('agent.identity.get', params)
    return { success: true, data: result }
  } catch (err) {
    log.error('openclaw:agent:identity failed:', err)
    return { success: false, error: String(err) }
  }
})

// ── Chat ────────────────────────────────────────────────────────────────

ipcMain.handle('openclaw:chat:send', async (_event, params: Record<string, unknown> = {}): Promise<ApiResponse> => {
  try {
    const result = await g().request('chat.send', params, { expectFinal: true })
    return { success: true, data: result }
  } catch (err) {
    log.error('openclaw:chat:send failed:', err)
    return { success: false, error: String(err) }
  }
})

gw('openclaw:chat:history', 'chat.history')
gw('openclaw:chat:abort', 'chat.abort')
gw('openclaw:chat:inject', 'chat.inject')

// ── Send / Poll ──────────────────────────────────────────────────────────

gw('openclaw:send', 'send')
gw('openclaw:poll', 'poll')

// ── Avatars (agents) ────────────────────────────────────────────────────

gw('openclaw:agents:list', 'agents.list')
gw('openclaw:agents:create', 'agents.create')
gw('openclaw:agents:update', 'agents.update')
gw('openclaw:agents:delete', 'agents.delete')

// ── Agents Files ────────────────────────────────────────────────────────

gw('openclaw:agents:files:list', 'agents.files.list')
gw('openclaw:agents:files:get', 'agents.files.get')
gw('openclaw:agents:files:set', 'agents.files.set')

// ── Skills ──────────────────────────────────────────────────────────────

gw('openclaw:skills:status', 'skills.status')
gw('openclaw:skills:install', 'skills.install')
gw('openclaw:skills:update', 'skills.update')

// ── Config ─────────────────────────────────────────────────────────────

gw('openclaw:config:get', 'config.get')
gw('openclaw:config:patch', 'config.patch')
gw('openclaw:config:apply', 'config.apply')
gw('openclaw:config:schema', 'config.schema')
gw('openclaw:config:set', 'config.set')
gw('openclaw:config:schema:lookup', 'config.schema.lookup')

// ── Cron ────────────────────────────────────────────────────────────────

gw('openclaw:cron:list', 'cron.list')
gw('openclaw:cron:status', 'cron.status')
gw('openclaw:cron:add', 'cron.add')
gw('openclaw:cron:update', 'cron.update')
gw('openclaw:cron:remove', 'cron.remove')
gw('openclaw:cron:run', 'cron.run')
gw('openclaw:cron:runs', 'cron.runs')

// ── Models ──────────────────────────────────────────────────────────────

gw('openclaw:models:list', 'models.list')
gw('openclaw:models:getCurrent', 'models.getCurrent')
gw('openclaw:models:setCurrent', 'models.setCurrent')
gw('openclaw:models:configure', 'models.configure')

// ── Tools ──────────────────────────────────────────────────────────────

gw('openclaw:tools:catalog', 'tools.catalog')

// ── Memory ──────────────────────────────────────────────────────────────

gw('openclaw:memory:search', 'memory.search')
gw('openclaw:memory:list', 'memory.list')
gw('openclaw:memory:delete', 'memory.delete')
gw('openclaw:memory:store', 'memory.store')

// ── Web Login ──────────────────────────────────────────────────────────

gw('openclaw:web:login:start', 'web.login.start')
gw('openclaw:web:login:wait', 'web.login.wait')

// ── TTS ───────────────────────────────────────────────────────────────

gw('openclaw:tts:status', 'tts.status')
gw('openclaw:tts:providers', 'tts.providers')
gw('openclaw:tts:enable', 'tts.enable')
gw('openclaw:tts:disable', 'tts.disable')
gw('openclaw:tts:convert', 'tts.convert')
gw('openclaw:tts:setProvider', 'tts.setProvider')

// ── Update ─────────────────────────────────────────────────────────────

gw('openclaw:update:run', 'update.run')

// ── Logs ──────────────────────────────────────────────────────────────

gw('openclaw:logs:tail', 'logs.tail')

// ── Hooks ────────────────────────────────────────────────────────────

gw('openclaw:hooks:list', 'hooks.list')
gw('openclaw:hooks:add', 'hooks.add')
gw('openclaw:hooks:update', 'hooks.update')
gw('openclaw:hooks:remove', 'hooks.remove')
gw('openclaw:hooks:runs', 'hooks.runs')

// ── User ──────────────────────────────────────────────────────────────

gw('openclaw:user:getPoints', 'user.getPoints')
gw('openclaw:user:getPointsHistory', 'user.getPointsHistory')

// ── Usage ──────────────────────────────────────────────────────────────

gw('openclaw:usage:status', 'usage.status')
gw('openclaw:usage:cost', 'usage.cost')

// ── Device Pair ────────────────────────────────────────────────────────

gw('openclaw:device:pair:list', 'device.pair.list')
gw('openclaw:device:pair:approve', 'device.pair.approve')
gw('openclaw:device:pair:reject', 'device.pair.reject')
gw('openclaw:device:pair:remove', 'device.pair.remove')
gw('openclaw:device:token:rotate', 'device.token.rotate')
gw('openclaw:device:token:revoke', 'device.token.revoke')

// ── Node Pair ──────────────────────────────────────────────────────────

gw('openclaw:node:pair:request', 'node.pair.request')
gw('openclaw:node:pair:list', 'node.pair.list')
gw('openclaw:node:pair:approve', 'node.pair.approve')
gw('openclaw:node:pair:reject', 'node.pair.reject')
gw('openclaw:node:pair:verify', 'node.pair.verify')

// ── Node Management ──────────────────────────────────────────────────

gw('openclaw:node:rename', 'node.rename')
gw('openclaw:node:list', 'node.list')
gw('openclaw:node:describe', 'node.describe')
gw('openclaw:node:pending:drain', 'node.pending.drain')
gw('openclaw:node:pending:enqueue', 'node.pending.enqueue')
gw('openclaw:node:pending:pull', 'node.pending.pull')
gw('openclaw:node:pending:ack', 'node.pending.ack')
gw('openclaw:node:invoke', 'node.invoke')
gw('openclaw:node:invoke:result', 'node.invoke.result')
gw('openclaw:node:event', 'node.event')
gw('openclaw:node:canvas:capability:refresh', 'node.canvas.capability.refresh')

// ── Exec Approvals ────────────────────────────────────────────────────

gw('openclaw:exec:approvals:get', 'exec.approvals.get')
gw('openclaw:exec:approvals:set', 'exec.approvals.set')
gw('openclaw:exec:approvals:node:get', 'exec.approvals.node.get')
gw('openclaw:exec:approvals:node:set', 'exec.approvals.node.set')
gw('openclaw:exec:approval:request', 'exec.approval.request')
gw('openclaw:exec:approval:waitDecision', 'exec.approval.waitDecision')
gw('openclaw:exec:approval:resolve', 'exec.approval.resolve')

// ── Wizard ──────────────────────────────────────────────────────────

gw('openclaw:wizard:start', 'wizard.start')
gw('openclaw:wizard:next', 'wizard.next')
gw('openclaw:wizard:cancel', 'wizard.cancel')
gw('openclaw:wizard:status', 'wizard.status')

// ── Push ────────────────────────────────────────────────────────────

gw('openclaw:push:test', 'push.test')

// ── Voice Wake ──────────────────────────────────────────────────────

gw('openclaw:voicewake:get', 'voicewake.get')
gw('openclaw:voicewake:set', 'voicewake.set')

// ── Browser ────────────────────────────────────────────────────────

gw('openclaw:browser:request', 'browser.request')

// ── System ────────────────────────────────────────────────────────

gw('openclaw:system:presence', 'system-presence')
gw('openclaw:system:event', 'system-event')
gw('openclaw:last-heartbeat', 'last-heartbeat')
gw('openclaw:set-heartbeats', 'set-heartbeats')

// ── Talk ────────────────────────────────────────────────────────

gw('openclaw:talk:config', 'talk.config')
gw('openclaw:talk:mode', 'talk.mode')

// ── Doctor ────────────────────────────────────────────────────────

gw('openclaw:doctor:memory:status', 'doctor.memory.status')

// ── Status ──────────────────────────────────────────────────────

gw('openclaw:health', 'health')
gw('openclaw:status:get', 'status')
gw('openclaw:gateway:identity', 'gateway.identity.get')

// ── Gateway ────────────────────────────────────────────────────────

log.info('Gateway handlers registered')

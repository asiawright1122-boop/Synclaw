/**
 * ClawHub.ts — All clawhub CLI integration handlers.
 */

import { ipcMain } from 'electron'
import { spawn } from 'node:child_process'
import logger from '../logger.js'

const log = logger.scope('clawhub')

function sanitizeSkillName(name: string): string {
  if (!/^[a-zA-Z0-9_./@-]+$/.test(name) || name.length > 128) {
    throw new Error('Invalid skill name')
  }
  return name
}

function sanitizeQuery(query: string): string {
  if (query.length > 256) throw new Error('Query too long')
  return query.trim().slice(0, 256)
}

function runCliCommand(
  argv: string[],
  timeoutMs = 30_000,
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve) => {
    const proc = spawn(argv[0], argv.slice(1), {
      timeout: timeoutMs,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    proc.stdout?.on('data', (chunk: Buffer) => { stdout += chunk.toString() })
    proc.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString() })
    proc.on('close', (code) => resolve({ stdout, stderr, code }))
    proc.on('error', (err) => resolve({ stdout, stderr: String(err), code: null }))
  })
}

function stripAnsi(text: string): string {
  return text.replace(/\u001b\[[0-9;]*m/g, '').replace(/\n\nTip:[\s\S]*$/, '').trim()
}

// ── Status ────────────────────────────────────────────────────────────────

ipcMain.handle('clawhub:status', async () => {
  try {
    const result = await runCliCommand(['clawhub', '--version'], 10_000)
    if (result.code !== 0) {
      return { success: true, data: { installed: false, version: null, error: result.stderr.trim() || 'clawhub not found' } }
    }
    return { success: true, data: { installed: true, version: result.stdout.trim() } }
  } catch (err) {
    return { success: true, data: { installed: false, version: null, error: String(err) } }
  }
})

// ── List ─────────────────────────────────────────────────────────────────

ipcMain.handle('clawhub:list', async () => {
  try {
    const result = await runCliCommand(['clawhub', 'list', '--json'], 30_000)
    if (result.code !== 0) {
      return { success: false, error: result.stderr.trim() || `clawhub list failed (exit ${result.code})` }
    }
    const data = JSON.parse(stripAnsi(result.stdout))
    return { success: true, data }
  } catch (err) {
    log.error('clawhub:list failed:', err)
    return { success: false, error: `无法获取技能列表：${String(err)}` }
  }
})

// ── Search ────────────────────────────────────────────────────────────────

ipcMain.handle('clawhub:search', async (_event, query: string) => {
  try {
    const safeQuery = sanitizeQuery(query)
    const result = await runCliCommand(['clawhub', 'search', safeQuery, '--json'], 30_000)
    if (result.code !== 0) {
      return { success: false, error: result.stderr.trim() || `clawhub search failed (exit ${result.code})` }
    }
    const data = JSON.parse(stripAnsi(result.stdout))
    return { success: true, data }
  } catch (err) {
    log.error('clawhub:search failed:', err)
    return { success: false, error: `搜索失败：${String(err)}` }
  }
})

// ── Install ───────────────────────────────────────────────────────────────

ipcMain.handle('clawhub:install', async (_event, name: string, version?: string) => {
  try {
    const safeName = sanitizeSkillName(name)
    const safeVersion = version ? sanitizeSkillName(version) : undefined
    const argv = safeVersion
      ? ['clawhub', 'install', safeName, '--version', safeVersion]
      : ['clawhub', 'install', safeName]
    const result = await runCliCommand(argv, 120_000)
    if (result.code !== 0) {
      return { success: false, error: result.stderr.trim() || `安装失败 (exit ${result.code})` }
    }
    return {
      success: true,
      data: {
        ok: true,
        message: '安装成功',
        stdout: stripAnsi(result.stdout),
        stderr: stripAnsi(result.stderr),
      },
    }
  } catch (err) {
    log.error('clawhub:install failed:', err)
    return { success: false, error: `安装失败：${String(err)}` }
  }
})

// ── Update ────────────────────────────────────────────────────────────────

ipcMain.handle('clawhub:update', async (_event, name?: string, version?: string) => {
  try {
    const safeName = name ? sanitizeSkillName(name) : undefined
    const safeVersion = version ? sanitizeSkillName(version) : undefined
    const argv = safeName
      ? safeVersion
        ? ['clawhub', 'update', safeName, '--version', safeVersion]
        : ['clawhub', 'update', safeName]
      : ['clawhub', 'update', '--all']
    const result = await runCliCommand(argv, 120_000)
    if (result.code !== 0) {
      return { success: false, error: result.stderr.trim() || `更新失败 (exit ${result.code})` }
    }
    return {
      success: true,
      data: {
        ok: true,
        message: name ? `"${name}" 更新成功` : '全部技能已更新',
        stdout: stripAnsi(result.stdout),
      },
    }
  } catch (err) {
    log.error('clawhub:update failed:', err)
    return { success: false, error: `更新失败：${String(err)}` }
  }
})

// ── Check ────────────────────────────────────────────────────────────────

ipcMain.handle('clawhub:check', async () => {
  try {
    const result = await runCliCommand(['clawhub', 'check', '--json'], 30_000)
    if (result.code !== 0) {
      return { success: false, error: result.stderr.trim() || `clawhub check failed (exit ${result.code})` }
    }
    const data = JSON.parse(stripAnsi(result.stdout))
    return { success: true, data }
  } catch (err) {
    log.error('clawhub:check failed:', err)
    return { success: false, error: `检查失败：${String(err)}` }
  }
})

// ── Uninstall ─────────────────────────────────────────────────────────

ipcMain.handle('clawhub:uninstall', async (_event, name: string) => {
  try {
    const safeName = sanitizeSkillName(name)
    const result = await runCliCommand(['clawhub', 'uninstall', safeName], 60_000)
    if (result.code !== 0) {
      return { success: false, error: result.stderr.trim() || `卸载失败 (exit ${result.code})` }
    }
    return {
      success: true,
      data: {
        ok: true,
        message: `"${name}" 已卸载`,
        stdout: stripAnsi(result.stdout),
      },
    }
  } catch (err) {
    log.error('clawhub:uninstall failed:', err)
    return { success: false, error: `卸载失败：${String(err)}` }
  }
})

// ── Install ClawHub CLI ────────────────────────────────────────────────

ipcMain.handle('clawhub:installCli', async () => {
  try {
    const result = await runCliCommand(['npm', 'i', '-g', 'clawhub'], 120_000)
    if (result.code !== 0) {
      return { success: false, error: result.stderr.trim() || `安装失败 (exit ${result.code})` }
    }
    return {
      success: true,
      data: {
        ok: true,
        message: 'ClawHub CLI 安装成功',
        version: result.stdout.match(/clawhub@([\d.]+)/)?.[1] ?? null,
      },
    }
  } catch (err) {
    log.error('clawhub:installCli failed:', err)
    return { success: false, error: `安装失败：${String(err)}` }
  }
})

log.info('ClawHub handlers registered')

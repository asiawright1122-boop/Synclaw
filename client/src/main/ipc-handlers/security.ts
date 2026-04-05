/**
 * security.ts — Security & encryption IPC handlers.
 *
 * Handles:
 * - security:status     — returns encryption + WEB_API_BASE + sandbox status
 * - security:generateKey — generates STORE_ENCRYPTION_KEY, returns with instructions
 * - security:setWebApiBase — persists WEB_API_BASE to electron-store
 * - security:runAudit   — runs openclaw security audit CLI, returns CVE findings
 */

import { ipcMain, app } from 'electron'
import { getAppSettings, setAppSetting } from '../index.js'
import logger from '../logger.js'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import * as path from 'node:path'
import * as fs from 'node:fs'

const log = logger.scope('security')

/** Generate a random 32-char hex key (256-bit AES) */
function generateEncryptionKey(): string {
  return crypto.randomBytes(16).toString('hex')
}

/** Resolve the openclaw binary path (mirrors openclaw.ts logic) */
function getOpenClawPath(): string {
  const openclawHome =
    (process.env.OPENCLAW_HOME && process.env.OPENCLAW_HOME.trim()) ||
    path.join(app.getPath('userData'), 'openclaw')
  const candidates = [
    path.join(process.resourcesPath ?? '', 'openclaw-source'),
    path.join(app.getAppPath(), 'resources', 'openclaw-source'),
    path.join(openclawHome, 'node_modules', 'openclaw-source'),
  ]
  for (const dir of candidates) {
    const cli = path.join(dir, 'openclaw.mjs')
    if (fs.existsSync(cli)) return cli
  }
  // Fallback: openclaw in PATH
  return 'openclaw'
}

/** Returns the current encryption and web API configuration status */
ipcMain.handle('security:status', async () => {
  try {
    const settings = getAppSettings()
    const limitAccess = settings.workspace?.limitAccess ?? false
    return {
      success: true,
      data: {
        encryptionEnabled: !!process.env.STORE_ENCRYPTION_KEY,
        encryptionKeySetAt: settings.security?.encryptionKeySetAt ?? null,
        webApiBaseConfigured: !!(process.env.WEB_API_BASE || settings.security?.webApiBase),
        webApiBase: settings.security?.webApiBase ?? '',
        webApiBaseFromEnv: !!process.env.WEB_API_BASE,
        sandboxEnabled: limitAccess, // SBX-04: sandbox status reflected via limitAccess toggle
      },
    }
  } catch (err) {
    log.error('[security:status] failed:', err)
    return { success: false, error: String(err) }
  }
})

/**
 * Generate a new encryption key and return it to the caller.
 * The caller is responsible for instructing the user to add it to their .env
 * and restart the application (electron-store is initialized at module load).
 */
ipcMain.handle('security:generateKey', async () => {
  try {
    const key = generateEncryptionKey()
    const timestamp = new Date().toISOString()
    // Persist the fact that encryption was enabled (key set timestamp)
    setAppSetting('security.encryptionKeySetAt', timestamp)
    setAppSetting('security.encryptionEnabled', true)
    log.info('[security:generateKey] encryption key generated, setAt:', timestamp)
    return {
      success: true,
      data: {
        key,
        setAt: timestamp,
        instructions:
          '请将以下内容添加到您的 .env 文件，然后重启应用：\n\n' +
          `STORE_ENCRYPTION_KEY=${key}\n\n` +
          '重启后，electron-store 将自动加密所有敏感数据。' +
          '现有数据将在首次写入时自动迁移。',
      },
    }
  } catch (err) {
    log.error('[security:generateKey] failed:', err)
    return { success: false, error: String(err) }
  }
})

/** Persist WEB_API_BASE to electron-store (user-configured, not from env) */
ipcMain.handle(
  'security:setWebApiBase',
  async (_event, { url }: { url: string }) => {
    try {
      if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
        return { success: false, error: 'WEB_API_BASE 必须是以 http:// 或 https:// 开头的有效 URL' }
      }
      setAppSetting('security.webApiBase', url.trim())
      log.info('[security:setWebApiBase] saved:', url.trim())
      return { success: true }
    } catch (err) {
      log.error('[security:setWebApiBase] failed:', err)
      return { success: false, error: String(err) }
    }
  },
)

/**
 * Run openclaw security audit CLI and return parsed CVE findings.
 * Falls back to a plain-text audit if --json is not supported.
 */
ipcMain.handle('security:runAudit', async () => {
  const timeoutMs = 30_000
  return new Promise((resolve) => {
    const openclawBin = getOpenClawPath()
    log.info('[security:runAudit] running:', openclawBin, 'security audit --json')

    const child = spawn('node', [openclawBin, 'security', 'audit', '--json'], {
      timeout: timeoutMs,
      shell: true,
    })

    let stdout = ''
    let stderr = ''

    child.stdout?.on('data', (d) => { stdout += d.toString() })
    child.stderr?.on('data', (d) => { stderr += d.toString() })

    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      resolve({ success: false, error: '审计超时（30s），请稍后重试' })
    }, timeoutMs)

    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0 && stdout.trim()) {
        try {
          const parsed = JSON.parse(stdout.trim())
          log.info('[security:runAudit] succeeded, items:', Array.isArray(parsed) ? parsed.length : 'N/A')
          resolve({ success: true, data: parsed })
        } catch {
          // JSON parse failed — treat as plain text output
          resolve({ success: true, data: { raw: stdout.trim(), stderr: stderr.trim() } })
        }
      } else {
        log.warn('[security:runAudit] non-zero exit or empty output:', code, stderr.trim())
        resolve({
          success: false,
          error: stderr.trim() || `exit code ${code}`,
        })
      }
    })

    child.on('error', (err) => {
      clearTimeout(timer)
      log.error('[security:runAudit] spawn error:', err)
      resolve({ success: false, error: `无法运行审计命令: ${err.message}` })
    })
  })
})

log.info('Security handlers registered')

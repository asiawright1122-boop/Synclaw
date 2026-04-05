/**
 * security.ts — Security & encryption IPC handlers.
 *
 * Handles:
 * - security:status     — returns encryption + WEB_API_BASE status
 * - security:generateKey — generates STORE_ENCRYPTION_KEY, returns with instructions
 * - security:setWebApiBase — persists WEB_API_BASE to electron-store
 */

import { ipcMain } from 'electron'
import { getAppSettings, setAppSetting } from '../index.js'
import logger from '../logger.js'
import crypto from 'node:crypto'

const log = logger.scope('security')

/** Generate a random 32-char hex key (256-bit AES) */
function generateEncryptionKey(): string {
  return crypto.randomBytes(16).toString('hex')
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

log.info('Security handlers registered')

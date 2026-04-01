/**
 * Shell.ts — Shell/Dialog/App utility handlers.
 * Path-sensitive operations (openPath, showItemInFolder) are sandboxed
 * through path-validation.ts to prevent bypass of the workspace sandbox.
 */

import { ipcMain, BrowserWindow, dialog, shell, app } from 'electron'
import { downloadUpdate, installUpdate } from '../updater.js'
import logger from '../logger.js'
import { validatePath } from './path-validation.js'
import { getAppSettings } from '../index.js'

const log = logger.scope('shell')

// ── UI Actions ──────────────────────────────────────────────────────────────

ipcMain.handle('ui:openCredits', async () => {
  BrowserWindow.getFocusedWindow()?.webContents.send('navigate', { page: 'credits' })
  return { success: true }
})

ipcMain.handle('ui:openSettings', async () => {
  BrowserWindow.getFocusedWindow()?.webContents.send('navigate', { page: 'settings' })
  return { success: true }
})

ipcMain.handle('ui:openAvatarCreate', async () => {
  BrowserWindow.getFocusedWindow()?.webContents.send('navigate', { page: 'avatarCreate' })
  return { success: true }
})

// ── Window ────────────────────────────────────────────────────────────────

ipcMain.handle('window:minimize', () => {
  BrowserWindow.getFocusedWindow()?.minimize()
  return { success: true }
})

ipcMain.handle('window:maximize', () => {
  const win = BrowserWindow.getFocusedWindow()
  if (win) {
    if (win.isMaximized()) { win.unmaximize() }
    else { win.maximize() }
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
  if (win) { win.setFullScreen(!win.isFullScreen()) }
  return { success: true }
})

// ── Dialogs ────────────────────────────────────────────────────────────────

const DIALOG_ALLOWED_PROPERTIES: Record<string, string[]> = {
  open: ['title', 'defaultPath', 'filters', 'properties', 'buttonLabel', 'message', 'label'],
  save: ['title', 'defaultPath', 'filters', 'buttonLabel', 'message', 'showsTagField', 'tagField'],
}

function sanitizeOpenDialogOptions(opts?: Electron.OpenDialogOptions): Electron.OpenDialogOptions | undefined {
  if (!opts) return undefined
  const allowed = DIALOG_ALLOWED_PROPERTIES.open
  const sanitized: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in opts) sanitized[key] = (opts as Record<string, unknown>)[key]
  }
  // Enforce safe property values
  const props = sanitized.properties as string[] | undefined
  if (props) {
    const allowedProps = new Set(['openFile', 'openDirectory', 'multiSelections', 'showHiddenFiles', 'treatPackageAsDirectory'])
    sanitized.properties = props.filter(p => allowedProps.has(p))
  }
  return sanitized as Electron.OpenDialogOptions
}

function sanitizeSaveDialogOptions(opts?: Electron.SaveDialogOptions): Electron.SaveDialogOptions | undefined {
  if (!opts) return undefined
  const allowed = DIALOG_ALLOWED_PROPERTIES.save
  const sanitized: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in opts) sanitized[key] = (opts as Record<string, unknown>)[key]
  }
  return sanitized as Electron.SaveDialogOptions
}

ipcMain.handle('dialog:openFile', async (_event, options?: Electron.OpenDialogOptions) => {
  try { return await dialog.showOpenDialog(sanitizeOpenDialogOptions(options) ?? {}) }
  catch (err) { log.error('dialog:openFile failed:', err); return { canceled: true, filePaths: [] } }
})

ipcMain.handle('dialog:saveFile', async (_event, options?: Electron.SaveDialogOptions) => {
  try { return await dialog.showSaveDialog(sanitizeSaveDialogOptions(options) ?? {}) }
  catch (err) { log.error('dialog:saveFile failed:', err); return { canceled: true, filePath: undefined } }
})

ipcMain.handle('dialog:selectDirectory', async () => {
  try {
    return await dialog.showOpenDialog({ properties: ['openDirectory'] })
  } catch (err) {
    log.error('dialog:selectDirectory failed:', err)
    return { canceled: true, filePaths: [] }
  }
})

// ── Shell ────────────────────────────────────────────────────────────────

function getAuthSettings() {
  const settings = getAppSettings()
  return { authorizedDirs: settings.workspace.authorizedDirs ?? [], limitAccess: settings.workspace.limitAccess ?? true }
}

ipcMain.handle('shell:openPath', async (_event, filePath: string) => {
  try {
    const { authorizedDirs, limitAccess } = getAuthSettings()
    const validation = await validatePath(filePath, authorizedDirs, limitAccess)
    if (!validation.valid) return { success: false, error: validation.error }
    const result = await shell.openPath(filePath)
    if (result) return { success: false, error: result }
    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
})

ipcMain.handle('shell:openExternal', async (_event, url: string) => {
  try {
    let parsedUrl: URL
    try { parsedUrl = new URL(url) }
    catch { return { success: false, error: 'Invalid URL format' } }
    if (!['https:', 'http:', 'mailto:'].includes(parsedUrl.protocol)) {
      return { success: false, error: `Disallowed URL protocol: ${parsedUrl.protocol}` }
    }
    await shell.openExternal(url)
    return { success: true }
  } catch (err) {
    log.error('shell:openExternal failed:', err)
    return { success: false, error: String(err) }
  }
})

ipcMain.handle('shell:showItemInFolder', async (_event, filePath: string) => {
  const { authorizedDirs, limitAccess } = getAuthSettings()
  const validation = validatePath(filePath, authorizedDirs, limitAccess)
  if (!validation.valid) return { success: false, error: validation.error }
  shell.showItemInFolder(filePath)
  return { success: true }
})

// ── App ─────────────────────────────────────────────────────────────────

ipcMain.handle('app:getVersion', () => {
  return { success: true, data: app.getVersion() }
})

ipcMain.handle('app:getPath', (_event, name: 'home' | 'temp' | 'desktop' | 'documents') => {
  return { success: true, data: app.getPath(name) }
})

ipcMain.handle('app:setAutoLaunch', (_event, enabled: boolean) => {
  app.setLoginItemSettings({ openAtLogin: enabled })
  return { success: true }
})

ipcMain.handle('app:getAutoLaunch', () => {
  return { success: true, data: app.getLoginItemSettings().openAtLogin }
})

// ── Auto Update ─────────────────────────────────────────────────────────

ipcMain.handle('app:downloadUpdate', async () => {
  try { await downloadUpdate(); return { success: true } }
  catch (err) { log.error('app:downloadUpdate failed:', err); return { success: false, error: String(err) } }
})

ipcMain.handle('app:installUpdate', () => {
  installUpdate()
  return { success: true }
})

// ── Signing Status ────────────────────────────────────────────────────

type SigningStatus = 'signed' | 'unsigned' | 'not_macos' | 'unknown'

ipcMain.handle('app:getSigningStatus', async (): Promise<{ success: boolean; data?: { status: SigningStatus; teamId?: string } }> => {
  if (process.platform !== 'darwin') {
    return { success: true, data: { status: 'not_macos' } }
  }
  try {
    const { execSync } = await import('node:child_process')
    // Check the running app's own signature
    const execPath = app.isPackaged ? process.execPath : ''
    if (!execPath) {
      return { success: true, data: { status: 'unknown' } }
    }
    try {
      const out = execSync(`codesign -d "${execPath}" 2>&1 || true`, { timeout: 5000, encoding: 'utf-8' })
      const isSigned = !out.includes('no such') && !out.includes('invalid')
      if (isSigned) {
        // Try to extract team ID from output
        const teamMatch = out.match(/Team=(\S+)/)
        return { success: true, data: { status: 'signed', teamId: teamMatch?.[1] } }
      }
      return { success: true, data: { status: 'unsigned' } }
    } catch {
      return { success: true, data: { status: 'unsigned' } }
    }
  } catch (err) {
    log.warn('[app:getSigningStatus] failed:', err)
    return { success: true, data: { status: 'unknown' } }
  }
})

log.info('Shell/App handlers registered')

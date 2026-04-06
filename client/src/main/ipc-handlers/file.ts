/**
 * File.ts — All file system operation handlers.
 * All file operations go through path validation from path-validation.ts.
 */

import { ipcMain, BrowserWindow } from 'electron'
import * as path from 'node:path'
import * as os from 'node:os'
import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import type { FSWatcher } from 'node:fs'
import { validatePath } from './path-validation.js'
import { getAppSettings } from '../index.js'
import logger from '../logger.js'

const log = logger.scope('file')

// ── File watching (stateful, shared across handlers) ──────────────────────

const fileWatchers = new Map<string, FSWatcher>()
const pendingWatchEvents = new Map<string, NodeJS.Timeout>()
const WATCH_DEBOUNCE_MS = 100

function getAuth() {
  const { authorizedDirs, workspace: { limitAccess } } = getAppSettings()
  return { authorizedDirs, limitAccess }
}

// ── Read / Write ───────────────────────────────────────────────────────────

ipcMain.handle('file:read', async (_event, filePath: string) => {
  const { authorizedDirs, limitAccess } = getAuth()
  const validation = await validatePath(filePath, authorizedDirs, limitAccess)
  if (!validation.valid) return { success: false, error: validation.error }
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    return { success: true, data: content }
  } catch (err) {
    log.error('file:read failed:', err)
    return { success: false, error: String(err) }
  }
})

ipcMain.handle('file:readBinary', async (_event, filePath: string) => {
  const { authorizedDirs, limitAccess } = getAuth()
  const validation = await validatePath(filePath, authorizedDirs, limitAccess)
  if (!validation.valid) return { success: false, error: validation.error }
  try {
    const buffer = await fs.readFile(filePath)
    return { success: true, data: buffer.toString('base64') }
  } catch (err) {
    log.error('file:readBinary failed:', err)
    return { success: false, error: String(err) }
  }
})

ipcMain.handle('file:write', async (_event, filePath: string, content: string) => {
  const { authorizedDirs, limitAccess } = getAuth()
  const validation = await validatePath(filePath, authorizedDirs, limitAccess)
  if (!validation.valid) return { success: false, error: validation.error }
  try {
    await fs.writeFile(filePath, content, 'utf-8')
    return { success: true }
  } catch (err) {
    log.error('file:write failed:', err)
    return { success: false, error: String(err) }
  }
})

// ── Directory listing ──────────────────────────────────────────────────────

ipcMain.handle('file:list', async (_event, dirPath: string) => {
  const { authorizedDirs, limitAccess } = getAuth()
  const validation = await validatePath(dirPath, authorizedDirs, limitAccess)
  if (!validation.valid) return { success: false, error: validation.error }
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

// ── Delete ────────────────────────────────────────────────────────────────

ipcMain.handle('file:delete', async (_event, filePath: string) => {
  const { authorizedDirs, limitAccess } = getAuth()
  const validation = await validatePath(filePath, authorizedDirs, limitAccess)
  if (!validation.valid) return { success: false, error: validation.error }
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

// ── Stat ─────────────────────────────────────────────────────────────────

ipcMain.handle('file:stat', async (_event, filePath: string) => {
  const { authorizedDirs, limitAccess } = getAuth()
  const validation = await validatePath(filePath, authorizedDirs, limitAccess)
  if (!validation.valid) return { success: false, error: validation.error }
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

// ── Mkdir ────────────────────────────────────────────────────────────────

ipcMain.handle('file:mkdir', async (_event, dirPath: string) => {
  const { authorizedDirs, limitAccess } = getAuth()
  const validation = await validatePath(dirPath, authorizedDirs, limitAccess)
  if (!validation.valid) return { success: false, error: validation.error }
  try {
    await fs.mkdir(dirPath, { recursive: true })
    return { success: true }
  } catch (err) {
    log.error('file:mkdir failed:', err)
    return { success: false, error: String(err) }
  }
})

// ── Exists ───────────────────────────────────────────────────────────────

ipcMain.handle('file:exists', async (_event, filePath: string) => {
  const { authorizedDirs, limitAccess } = getAuth()
  const validation = await validatePath(filePath, authorizedDirs, limitAccess)
  if (!validation.valid) return { success: false, error: validation.error }
  return { success: true, data: existsSync(filePath) }
})

// ── Rename ───────────────────────────────────────────────────────────────

ipcMain.handle('file:rename', async (_event, oldPath: string, newPath: string) => {
  const { authorizedDirs, limitAccess } = getAuth()
  const v1 = await validatePath(oldPath, authorizedDirs, limitAccess)
  if (!v1.valid) return { success: false, error: v1.error }
  const v2 = await validatePath(newPath, authorizedDirs, limitAccess)
  if (!v2.valid) return { success: false, error: v2.error }
  try {
    await fs.rename(oldPath, newPath)
    return { success: true }
  } catch (err) {
    log.error('file:rename failed:', err)
    return { success: false, error: String(err) }
  }
})

// ── Copy ────────────────────────────────────────────────────────────────

ipcMain.handle('file:copy', async (_event, srcPath: string, destPath: string) => {
  const { authorizedDirs, limitAccess } = getAuth()
  const v1 = await validatePath(srcPath, authorizedDirs, limitAccess)
  if (!v1.valid) return { success: false, error: v1.error }
  const v2 = await validatePath(destPath, authorizedDirs, limitAccess)
  if (!v2.valid) return { success: false, error: v2.error }
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

// ── Validate (no-op, for frontend preview) ────────────────────────────────

ipcMain.handle('file:validate', async (_event, filePath: string) => {
  const { authorizedDirs, limitAccess } = getAuth()
  const validation = await validatePath(filePath, authorizedDirs, limitAccess)
  return { success: true, authorized: validation.valid, reason: validation.error }
})

// ── Path utilities ────────────────────────────────────────────────────────

ipcMain.handle('path:expandTilde', async (_event, inputPath: string) => {
  const expanded = inputPath.startsWith('~/')
    ? path.join(os.homedir(), inputPath.slice(2))
    : inputPath
  // Validate the resolved path against sandbox
  const { authorizedDirs, limitAccess } = getAuth()
  const validation = await validatePath(expanded, authorizedDirs, limitAccess)
  if (!validation.valid) return { success: false, error: validation.error }
  return { success: true, data: expanded }
})

// ── Watch / Unwatch ──────────────────────────────────────────────────────

ipcMain.handle('file:watch', async (event, dirPath: string) => {
  const { authorizedDirs, limitAccess } = getAuth()
  const validation = await validatePath(dirPath, authorizedDirs, limitAccess)
  if (!validation.valid) return { success: false, error: validation.error }
  try {
    if (fileWatchers.has(dirPath)) {
      return { success: true, data: 'already watching' }
    }
    type FsWatchCallback = (eventType: string, filename: string | null) => void
    const onChange: FsWatchCallback = (eventType, filename) => {
      const existing = pendingWatchEvents.get(dirPath)
      if (existing) clearTimeout(existing)
      const timer = setTimeout(() => {
        pendingWatchEvents.delete(dirPath)
        const win = BrowserWindow.fromWebContents(event.sender)
        if (win) {
          win.webContents.send('file:changed', { dirPath, event: eventType, filename })
        }
      }, WATCH_DEBOUNCE_MS)
      pendingWatchEvents.set(dirPath, timer)
    }
    const watcher = fs.watch(dirPath, { recursive: true }, onChange)
    fileWatchers.set(dirPath, watcher)
    return { success: true }
  } catch (err) {
    log.error('file:watch failed:', err)
    return { success: false, error: String(err) }
  }
})

ipcMain.handle('file:unwatch', async (_event, dirPath: string) => {
  const { authorizedDirs, limitAccess } = getAuth()
  const validation = await validatePath(dirPath, authorizedDirs, limitAccess)
  if (!validation.valid) return { success: false, error: validation.error }
  try {
    const pending = pendingWatchEvents.get(dirPath)
    if (pending) { clearTimeout(pending); pendingWatchEvents.delete(dirPath) }
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

log.info('File handlers registered')

/**
 * App.ts — App settings handlers backed by electron-store (main process only).
 * These are the only handlers that touch electron-store directly.
 */

import { ipcMain, BrowserWindow } from 'electron'
import { getAppSettings, setAppSetting, resetAppSettings } from '../index.js'
import { showLandingPage, hideLandingPage, getLandingPageAvailable } from '../index.js'
import logger from '../logger.js'

const log = logger.scope('app')

const VALID_SETTINGS_KEYS = [
  'theme',
  'fontSize',
  'animationsEnabled',
  'notificationsEnabled',
  'compactMode',
  'favorites',
  'authorizedDirs',
  'hasCompletedOnboarding',
  'workspace.limitAccess',
  'workspace.autoSave',
  'workspace.watch',
  'workspace.heartbeat',
  'privacy.optimizationPlan',
  // Note: web.deviceToken and web.deviceId are NOT in this list.
  // They are written exclusively by the main-process web:register handler (web.ts),
  // which calls setAppSetting directly (not through IPC). Keeping them out of this
  // list prevents the renderer from writing arbitrary values via settings:set.
  // These fields are intentionally omitted from the read-write whitelist.
]

type SettingsValue = string | number | boolean | string[] | object | null

const VALUE_VALIDATORS: Record<string, (v: unknown) => v is SettingsValue> = {
  theme: (v): v is string => ['light', 'dark', 'system'].includes(v as string),
  fontSize: (v): v is number => typeof v === 'number' && v >= 10 && v <= 32,
  animationsEnabled: (v): v is boolean => typeof v === 'boolean',
  notificationsEnabled: (v): v is boolean => typeof v === 'boolean',
  compactMode: (v): v is boolean => typeof v === 'boolean',
  favorites: (v): v is string[] => Array.isArray(v) && v.every(x => typeof x === 'string'),
  hasCompletedOnboarding: (v): v is boolean => typeof v === 'boolean',
  'workspace.limitAccess': (v): v is boolean => typeof v === 'boolean',
  'workspace.autoSave': (v): v is boolean => typeof v === 'boolean',
  'workspace.watch': (v): v is boolean => typeof v === 'boolean',
  'workspace.heartbeat': (v): v is string => ['30m', '1h', '2h', '4h'].includes(v as string),
  'workspace': (v): v is object => typeof v === 'object' && v !== null,
  'privacy.optimizationPlan': (v): v is boolean => typeof v === 'boolean',
  // web.* keys are main-process only — renderer cannot write via settings:set
  // so no validators needed for renderer-facing IPC
}

// ── Settings ────────────────────────────────────────────────────────────

/**
 * 安全组合验证：防止通过 settings:set 绕过沙箱。
 * 攻击场景：将 authorizedDirs 设为 ['/'] 同时关闭 limitAccess → 完全绕过沙箱。
 */
function validateSecurityCombination(key: string, value: unknown): string | null {
  // 扩展 authorizedDirs 时检查 limitAccess 是否启用
  if (key === 'authorizedDirs' && Array.isArray(value)) {
    const dirs = value as string[]
    // 检测"授权所有路径"：包含根目录或所有常见顶级路径
    const allPaths = ['/', '/home', '/Users', '/var', '/tmp']
    const includesAll = allPaths.some(p => dirs.includes(p))
    if (includesAll) {
      const current = getAppSettings()
      if (!current.workspace.limitAccess) {
        return '安全策略冲突：关闭沙箱时不允许授权全部路径。请先开启「限制访问」或移除全部路径授权。'
      }
    }
  }
  return null
}

ipcMain.handle('settings:get', () => {
  return { success: true, data: getAppSettings() }
})

ipcMain.handle('settings:set', (_event, key: string, value: unknown) => {
  if (!VALID_SETTINGS_KEYS.includes(key)) {
    return { success: false, error: `Invalid settings key: ${key}` }
  }
  const validator = VALUE_VALIDATORS[key]
  if (validator && !validator(value)) {
    return { success: false, error: `Invalid value type for key: ${key}` }
  }
  const comboError = validateSecurityCombination(key, value)
  if (comboError) {
    return { success: false, error: comboError }
  }
  try {
    setAppSetting(key as keyof ReturnType<typeof getAppSettings>, value as never)
    const updated = getAppSettings()
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('settings:changed', { key, value, settings: updated })
    }
    return { success: true }
  } catch (err) {
    log.error('settings:set failed:', err)
    return { success: false, error: String(err) }
  }
})

ipcMain.handle('settings:reset', () => {
  const settings = resetAppSettings()
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('settings:changed', { key: '__reset__', value: null, settings })
  }
  return { success: true, data: settings }
})

// ── Landing Page ─────────────────────────────────────────────────────────

ipcMain.handle('landing:isAvailable', () => {
  return { success: true, data: getLandingPageAvailable() }
})

ipcMain.handle('landing:show', () => {
  try {
    showLandingPage()
    return { success: true }
  } catch (err) {
    log.error('landing:show failed:', err)
    return { success: false, error: String(err) }
  }
})

ipcMain.handle('landing:hide', () => {
  try {
    hideLandingPage()
    return { success: true }
  } catch (err) {
    log.error('landing:hide failed:', err)
    return { success: false, error: String(err) }
  }
})

log.info('App settings handlers registered')

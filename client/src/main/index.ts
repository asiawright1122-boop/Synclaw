import { app, BrowserWindow, Tray, Menu, nativeImage, dialog, shell, globalShortcut } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import { fileURLToPath } from 'url'
import { openclawProcess } from './openclaw.js'
import { registerIpcHandlers } from './ipc-handlers.js'
import { getGatewayBridge } from './gateway-bridge.js'
import { setupAutoUpdater } from './updater.js'
import { createTray, destroyTray, registerTrayStatusListener } from './tray.js'
import { NotificationManager, setNotificationManagerInstance } from './notifications.js'

// electron-store must be added to package.json dependencies
// We use dynamic import to avoid bundling issues; it's always available when installed
let Store: typeof import('electron-store').default | null = null
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Store = require('electron-store').default
} catch {
  Store = null
}

// ── Settings store (electron-store) ──────────────────────────────────
// Persists UI preferences at app level (survives renderer restarts)
export interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  fontSize: number
  animationsEnabled: boolean
  notificationsEnabled: boolean
  compactMode: boolean
  favorites: string[]
  hasCompletedOnboarding: boolean
  authorizedDirs: string[]
  privacy: {
    optimizationPlan: boolean
  }
}

const defaultSettings: AppSettings = {
  theme: 'system',
  fontSize: 14,
  animationsEnabled: true,
  notificationsEnabled: true,
  compactMode: false,
  favorites: [],
  hasCompletedOnboarding: false,
  authorizedDirs: [],
  privacy: {
    optimizationPlan: false,
  },
}

let settingsStore: import('electron-store').default<AppSettings> | null = null
try {
  if (Store) {
    settingsStore = new Store<AppSettings>({
      name: 'settings',
      defaults: defaultSettings,
    })
  }
} catch {
  // electron-store unavailable — settings will fall back to renderer defaults
}

export function getAppSettings(): AppSettings {
  if (settingsStore) {
    return settingsStore.store as AppSettings
  }
  return defaultSettings
}

export function setAppSetting(key: string, value: unknown): void {
  if (!settingsStore) return
  if (key.includes('.')) {
    const [parent, child] = key.split('.')
    const current = settingsStore.get(parent as keyof AppSettings) as Record<string, unknown>
    settingsStore.set(parent as keyof AppSettings, { ...current, [child]: value } as never)
  } else {
    settingsStore.set(key as keyof AppSettings, value as never)
  }
}

export function resetAppSettings(): AppSettings {
  if (settingsStore) {
    settingsStore.clear()
    for (const [k, v] of Object.entries(defaultSettings)) {
      settingsStore.set(k as keyof AppSettings, v)
    }
    return settingsStore.store as AppSettings
  }
  return defaultSettings
}

const currentDirPath = path.dirname(fileURLToPath(import.meta.url))

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let notificationManager: NotificationManager | null = null
let windowStateStore: InstanceType<NonNullable<typeof Store>> | null = null

const log = (level: string, message: string, ...args: unknown[]) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] [${level}] ${message}`, ...args)
}

function getAssetPath(...paths: string[]): string {
  const resourcesPath = isDev
    ? path.join(currentDirPath, '../../')
    : process.resourcesPath
  return path.join(resourcesPath, ...paths)
}

// ── Window state store ──────────────────────────────────────────────────

function initWindowStateStore() {
  if (!Store) {
    log('WARN', 'electron-store not installed, window state will not be persisted')
    return
  }
  try {
    windowStateStore = new Store({ name: 'window-state' })
  } catch (err) {
    log('WARN', 'Failed to initialize window state store:', err)
  }
}

function getStoredWindowBounds(): Electron.Rectangle {
  const defaults: Electron.Rectangle = { width: 1200, height: 800, x: undefined, y: undefined }
  if (!windowStateStore) return defaults
  try {
    const stored = windowStateStore.get('windowBounds', defaults)
    return stored as Electron.Rectangle
  } catch {
    return defaults
  }
}

function saveWindowBounds() {
  if (!windowStateStore || !mainWindow || mainWindow.isMinimized() || mainWindow.isDestroyed()) return
  try {
    windowStateStore.set('windowBounds', mainWindow.getBounds())
  } catch (err) {
    log('WARN', 'Failed to save window bounds:', err)
  }
}

// ── Global shortcuts ────────────────────────────────────────────────────

function registerGlobalShortcuts(mainWindow: BrowserWindow) {
  // CmdOrCtrl+Shift+C — toggle window visibility
  const toggleOk = globalShortcut.register('CommandOrControl+Shift+C', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })
  if (!toggleOk) {
    log('WARN', 'Failed to register CommandOrControl+Shift+C shortcut')
  }

  // CmdOrCtrl+Shift+K — focus chat input
  const focusOk = globalShortcut.register('CommandOrControl+Shift+K', () => {
    mainWindow.show()
    mainWindow.focus()
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('focus-chat-input')
    }
  })
  if (!focusOk) {
    log('WARN', 'Failed to register CommandOrControl+Shift+K shortcut')
  }

  log('INFO', 'Global shortcuts registered')
}

// ── Window creation ─────────────────────────────────────────────────────

function createWindow() {
  log('INFO', 'Creating main window')

  // Restore window bounds from store
  const storedBounds = getStoredWindowBounds()

  mainWindow = new BrowserWindow({
    ...storedBounds,
    minWidth: 800,
    minHeight: 600,
    frame: true,
    backgroundColor: '#0f0f1a',
    show: false,
    ...(process.platform === 'darwin' ? { titleBarStyle: 'hiddenInset' } : {}),
    webPreferences: {
      preload: path.join(currentDirPath, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    if (isDev) {
      mainWindow?.webContents.openDevTools()
    }
  })

  // Forward maximize state changes to renderer
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window:maximizeChange', true)
  })
  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window:maximizeChange', false)
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(currentDirPath, '../renderer/index.html'))
  }

  // Hide instead of close when tray is active
  mainWindow.on('close', (event) => {
    if (tray) {
      event.preventDefault()
      mainWindow?.hide()
    }
    // Save bounds before hiding
    saveWindowBounds()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  log('INFO', 'Main window created')

  // Setup auto updater (only in production)
  if (process.env.NODE_ENV !== 'development') {
    setupAutoUpdater(mainWindow)
  }
}

// ── IPC setup ───────────────────────────────────────────────────────────

function setupIPC() {
  log('INFO', 'IPC handlers registered')
}

// ── App lifecycle ───────────────────────────────────────────────────────

app.whenReady().then(async () => {
  log('INFO', 'App ready')

  // Initialize window state store first (needed for createWindow)
  initWindowStateStore()

  createWindow()
  setupIPC()

  // Register global shortcuts (A-3)
  registerGlobalShortcuts(mainWindow!)

  // Create system tray with dynamic menu (A-1)
  tray = createTray(mainWindow!)

  // Register tray status listener — rebuilds menu on Gateway status change (A-1)
  registerTrayStatusListener()

  // Initialize notification manager (A-2)
  notificationManager = new NotificationManager(mainWindow!)
  setNotificationManagerInstance(notificationManager)

  // Register OpenClaw IPC handlers (gateway-bridge mode)
  registerIpcHandlers()

  // Start OpenClaw Gateway (both dev and prod)
  try {
    log('INFO', '正在连接 OpenClaw Gateway...')
    const bridge = getGatewayBridge()
    bridge.registerWindow(mainWindow!)
    await bridge.connect()
    log('INFO', 'OpenClaw Gateway 连接成功')
  } catch (error) {
    log('ERROR', 'OpenClaw Gateway 连接失败:', error)
  }
})

app.on('window-all-closed', () => {
  const bridge = getGatewayBridge()
  bridge.disconnect().catch(err => {
    log('ERROR', '断开 OpenClaw Gateway 时出错:', err)
  })

  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// Unregister all global shortcuts on quit (A-3)
app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  log('INFO', 'Global shortcuts unregistered')
})

process.on('uncaughtException', (error) => {
  log('ERROR', 'Uncaught exception:', error)
  dialog.showErrorBox('Error', `An unexpected error occurred: ${error.message}`)
})

process.on('unhandledRejection', (reason) => {
  log('ERROR', 'Unhandled rejection:', reason)
})

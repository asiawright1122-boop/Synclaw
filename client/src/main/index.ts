import { app, BrowserWindow, Tray, Menu, nativeImage, dialog, shell, globalShortcut } from 'electron'
import * as os from 'node:os'
import * as path from 'node:path'
import * as fs from 'node:fs'
import { spawn, ChildProcess } from 'child_process'
import { fileURLToPath } from 'url'
import { openclawProcess } from './openclaw.js'
import { registerIpcHandlers } from './ipc-handlers.js'
import { getGatewayBridge } from './gateway-bridge.js'
import logger from './logger.js'
import { setupAutoUpdater } from './updater.js'
import { createTray, destroyTray, registerTrayStatusListener } from './tray.js'
import { NotificationManager, setNotificationManagerInstance } from './notifications.js'
import { AppSettings, DEFAULT_SETTINGS } from './app-settings.js'

// electron-store must be added to package.json dependencies
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Store: any = null
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Store = require('electron-store')
} catch {
  Store = null
}

// Re-export AppSettings so existing callers (e.g. ipc-handlers) keep working
export type { AppSettings } from './app-settings.js'

// Re-export landing page functions for IPC handlers
export { showLandingPage, hideLandingPage, getLandingPageAvailable }

// ── Settings store (electron-store) ──────────────────────────────────
// Persists UI preferences at app level (survives renderer restarts)
const defaultSettings: AppSettings = DEFAULT_SETTINGS

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let settingsStore: any = null
try {
  if (Store) {
    const hasEncryption = !!process.env.STORE_ENCRYPTION_KEY
    if (process.env.NODE_ENV !== 'development' && !hasEncryption) {
      console.warn(
        '[Store] WARNING: STORE_ENCRYPTION_KEY is not set. ' +
        'Sensitive settings (authorized dirs, API keys) will be stored in plaintext. ' +
        'Set STORE_ENCRYPTION_KEY in your environment to enable encryption.'
      )
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // @ts-expect-error — Store is dynamically loaded CJS default export; type-safe call not expressible
    settingsStore = (Store as any).default ? (Store as any).default<AppSettings>({
      name: 'settings',
      defaults: defaultSettings,
      encryptionKey: process.env.STORE_ENCRYPTION_KEY ?? undefined,
    }) : (Store as any)({
      name: 'settings',
      defaults: defaultSettings,
      encryptionKey: process.env.STORE_ENCRYPTION_KEY ?? undefined,
    })
  }
} catch {
  // electron-store unavailable — settings will fall back to renderer defaults
}

// ── Settings change → Gateway security config bridge ──────────────────────
// 当 workspace.limitAccess 变更时，若 Gateway 已连接则实时推送配置更新。
function setupSettingsBridge(): void {
  if (!settingsStore) return

  try {
    // electron-store 的 onDidChange 在值变化时触发回调，传入 (newValue, oldValue)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(settingsStore as any).onDidChange?.('workspace.limitAccess', async (newVal: unknown) => {
      if (newVal === undefined || newVal === null) return
      try {
        const bridge = getGatewayBridge()
        if (bridge.status === 'connected' || bridge.status === 'ready') {
          logger('INFO', `[settings-bridge] limitAccess changed → 刷新 Gateway 安全配置`)
          await bridge.refreshSecurityConfig()
        }
      } catch (err) {
        logger('WARN', '[settings-bridge] 刷新安全配置失败:', err)
      }
    })
    logger('INFO', '[settings-bridge] electron-store → Gateway 订阅已注册')
  } catch (err) {
    logger('WARN', '[settings-bridge] 订阅失败（不影响运行）:', err)
  }
}

export function getAppSettings(): AppSettings {
  if (settingsStore) {
    const stored = settingsStore.store as AppSettings
    return {
      ...defaultSettings,
      ...stored,
      workspace: { ...defaultSettings.workspace, ...(stored.workspace ?? {}) },
    }
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deepSet(store: any, obj: unknown, prefix = ''): void {
  if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      deepSet(store, v, prefix ? `${prefix}.${k}` : k)
    }
  } else {
    store.set(prefix as keyof AppSettings, obj as never)
  }
}

export function resetAppSettings(): AppSettings {
  if (settingsStore) {
    settingsStore.clear()
    deepSet(settingsStore, defaultSettings)
    return settingsStore.store as AppSettings
  }
  return defaultSettings
}

const currentDirPath = path.dirname(fileURLToPath(import.meta.url))

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let notificationManager: NotificationManager | null = null
// ── Logging (electron-log backed) ────────────────────────────────────────
const log = logger.scope('main')
// Legacy compat: logCompat('LEVEL', msg) → electron-log
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function logCompat(level: string, message: string, ...args: any[]): void {
  const fn = (log as Record<string, (...a: unknown[]) => void>)[level.toLowerCase()] ?? log.info
  fn(message, ...args)
}

function getAssetPath(...paths: string[]): string {
  const resourcesPath = isDev
    ? path.join(currentDirPath, '../../')
    : process.resourcesPath
  return path.join(resourcesPath, ...paths)
}

// ── Window state store ──────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let windowStateStore: any = null

function initWindowStateStore() {
  if (!Store) {
    log.warn('electron-store not installed, window state will not be persisted')
    return
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    windowStateStore = new Store({ name: 'window-state' }) as any
  } catch (err) {
    log.warn('Failed to initialize window state store:', err)
  }
}

function getStoredWindowBounds(): Electron.Rectangle {
  const defaults: Electron.Rectangle = { width: 1200, height: 800, x: 0, y: 0 }
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
    log.warn('Failed to save window bounds:', err)
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
    log.warn('Failed to register CommandOrControl+Shift+C shortcut')
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
    log.warn('Failed to register CommandOrControl+Shift+K shortcut')
  }

  log.info('Global shortcuts registered')
}

// ── Landing Page (Next.js standalone) ────────────────────────────────
// Manages the Next.js standalone server process and BrowserView

let landingPageView: BrowserView | null = null
let landingPageAvailable = false
let landingProcess: ReturnType<typeof spawn> | null = null
let landingProcessUrl: string | null = null

const LANDING_PORT = 3847
const LANDING_HOST = '127.0.0.1'

function checkLandingPageExists(): boolean {
  if (app.isPackaged) {
    const landingPath = path.join(process.resourcesPath, 'web', 'standalone', 'server.js')
    return fs.existsSync(landingPath)
  }
  const devPath = path.join(currentDirPath, '../../../web/.next/standalone/server.js')
  return fs.existsSync(devPath)
}

function getLandingPageRoot(): string | null {
  if (!landingPageAvailable) return null
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'web', 'standalone')
  }
  const devPath = path.join(currentDirPath, '../../../web/.next/standalone')
  return fs.existsSync(devPath) ? devPath : null
}

function getLandingPagePort(): number {
  const envPort = parseInt(process.env.LANDING_PORT ?? '', 10)
  return isNaN(envPort) ? LANDING_PORT : envPort
}

async function startLandingProcess(): Promise<void> {
  const root = getLandingPageRoot()
  if (!root) return
  const port = getLandingPagePort()

  return new Promise((resolve) => {
    if (landingProcess) {
      landingProcess.kill('SIGTERM')
      landingProcess = null
    }

    landingProcess = spawn(process.execPath, [path.join(root, 'server.js')], {
      cwd: root,
      env: {
        ...process.env,
        PORT: String(port),
        HOSTNAME: LANDING_HOST,
        NODE_ENV: app.isPackaged ? 'production' : 'development',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdoutBuffer = ''

    landingProcess.stdout?.on('data', (data: Buffer) => {
      stdoutBuffer += data.toString()
      const trimmed = stdoutBuffer.trimEnd()
      log.info('[landing] stdout:', trimmed)
      if (/Ready/i.test(trimmed)) {
        const urlMatch = stdoutBuffer.match(/started server on (.+)/i)
        landingProcessUrl = urlMatch
          ? urlMatch[1].trim()
          : `http://${LANDING_HOST}:${port}`
        log.info(`[landing] Server ready at ${landingProcessUrl}`)
        resolve()
      }
    })

    landingProcess.stderr?.on('data', (data: Buffer) => {
      log.warn('[landing] stderr:', data.toString().trim())
    })

    landingProcess.on('error', (err) => {
      log.error('[landing] Process error:', err)
      landingProcess = null
    })

    landingProcess.on('exit', (code, signal) => {
      log.info(`[landing] Process exited: code=${code}, signal=${signal}`)
      landingProcess = null
      landingProcessUrl = null
    })

    // Fallback: if no "Ready" line within 15s, resolve with default URL
    const fallback = setTimeout(() => {
      if (!landingProcessUrl) {
        landingProcessUrl = `http://${LANDING_HOST}:${port}`
        log.warn('[landing] Timeout — using fallback URL:', landingProcessUrl)
        resolve()
      }
    }, 15000)
    fallback.unref()
  })
}

function createLandingPageView(): void {
  if (!landingPageAvailable || !mainWindow) return
  const root = getLandingPageRoot()
  if (!root) {
    log.warn('[landing] Standalone build not found')
    landingPageAvailable = false
    return
  }

  const { width, height } = mainWindow.getBounds()
  landingPageView = new BrowserView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })
  landingPageView.setBounds({
    x: 260,
    y: 0,
    width: Math.max(width - 260, 800),
    height: Math.max(height, 600),
  })
  landingPageView.setAutoResize({ width: true, height: true })
  log.info('[landing] BrowserView created')
}

function showLandingPage(): void {
  if (!landingPageAvailable || !landingPageView || !mainWindow) {
    log.warn('[landing] Cannot show: view not available')
    return
  }
  if (!landingProcessUrl) {
    log.warn('[landing] Server not started yet')
    return
  }

  const { width, height } = mainWindow.getBounds()
  landingPageView.setBounds({
    x: 260,
    y: 0,
    width: Math.max(width - 260, 800),
    height: Math.max(height, 600),
  })
  landingPageView.setAutoResize({ width: true, height: true })

  landingPageView.webContents.loadURL(landingProcessUrl).catch((err) => {
    log.error('[landing] Failed to load URL:', err)
  })
  mainWindow.addBrowserView(landingPageView)
  log.info(`[landing] Shown at ${landingProcessUrl}`)
}

function hideLandingPage(): void {
  if (!landingPageView || !mainWindow) return
  mainWindow.removeBrowserView(landingPageView)
  log.info('[landing] Hidden')
}

function destroyLandingPageView(): void {
  if (landingPageView) {
    hideLandingPage()
    landingPageView.webContents.destroy()
    landingPageView = null
  }
  if (landingProcess) {
    landingProcess.kill('SIGTERM')
    landingProcess = null
    landingProcessUrl = null
  }
}

function getLandingPageAvailable(): boolean {
  return landingPageAvailable
}

// ── Window creation ─────────────────────────────────────────────────────

function createWindow() {
  log.info('Creating main window')

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

  log.info('Main window created')

  // Setup auto updater (only in production)
  if (process.env.NODE_ENV !== 'development') {
    setupAutoUpdater(mainWindow)
  }
}

// ── Workspace directory initialization ───────────────────────────────────

function getDefaultWorkspacePath(): string {
  return path.join(os.homedir(), '.openclaw-synclaw', 'workspace')
}

async function initWorkspace() {
  const workspacePath = getDefaultWorkspacePath()
  try {
    await fs.promises.access(workspacePath)
  } catch {
    // Directory doesn't exist — create it
    try {
      await fs.promises.mkdir(workspacePath, { recursive: true })
      log.info(`Created default workspace directory: ${workspacePath}`)
    } catch (err) {
      log.warn(`Failed to create workspace directory: ${err}`)
    }
  }

  // Auto-authorize workspace directory if not already in authorizedDirs
  const settings = getAppSettings()
  if (!settings.authorizedDirs.includes(workspacePath)) {
    const current = settingsStore?.get('authorizedDirs') as string[] | undefined
    const next = [...(current ?? []), workspacePath]
    settingsStore?.set('authorizedDirs', next)
    log.info(`Auto-authorized workspace directory: ${workspacePath}`)
  }
}

// ── IPC setup ───────────────────────────────────────────────────────────

function setupIPC() {
  log.info('IPC handlers registered')
}

// ── App lifecycle ───────────────────────────────────────────────────────

app.whenReady().then(async () => {
  log.info('App ready')

  // Check if landing page is available and start its server
  landingPageAvailable = checkLandingPageExists()
  log.info(`[landing] Landing page available: ${landingPageAvailable}`)

  if (landingPageAvailable) {
    startLandingProcess()
      .then(() => {
        if (landingPageAvailable) {
          createLandingPageView()
        }
      })
      .catch((err) => {
        log.warn('[landing] Failed to start Next.js server:', String(err))
        landingPageAvailable = false
      })
  }

  // Initialize window state store first (needed for createWindow)
  initWindowStateStore()

  createWindow()
  setupIPC()
  setupSettingsBridge()

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

  // Initialize workspace directory (auto-create + auto-authorize)
  await initWorkspace()

  // Start OpenClaw Gateway (both dev and prod)
  try {
    log.info('正在连接 OpenClaw Gateway...')
    const bridge = getGatewayBridge()
    bridge.registerWindow(mainWindow!)
    await bridge.connect()
    log.info('OpenClaw Gateway 连接成功')
  } catch (error) {
    log.error('OpenClaw Gateway 连接失败:', error)
  }
})

app.on('window-all-closed', () => {
  const bridge = getGatewayBridge()
  bridge.disconnect().catch(err => {
    log.error('断开 OpenClaw Gateway 时出错:', err)
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
  destroyLandingPageView()
  globalShortcut.unregisterAll()
  log.info('Global shortcuts unregistered')
})

process.on('uncaughtException', (error) => {
  log.error('Uncaught exception:', error)
  dialog.showErrorBox('Error', `An unexpected error occurred: ${error.message}`)
})

process.on('unhandledRejection', (reason) => {
  log.error('Unhandled rejection:', reason)
})

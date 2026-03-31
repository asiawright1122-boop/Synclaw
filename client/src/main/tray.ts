/**
 * tray.ts
 *
 * SynClaw 系统托盘模块。
 * 菜单根据 Gateway 连接状态动态变化，支持 macOS dock badge。
 */

import { Tray, Menu, nativeImage, app, dialog, BrowserWindow } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import { fileURLToPath } from 'url'
import { getGatewayBridge, type GatewayStatus } from './gateway-bridge.js'
import logger from './logger.js'

const currentDirPath = path.dirname(fileURLToPath(import.meta.url))
const log = logger.scope('tray')

let tray: Tray | null = null
let mainWindowRef: BrowserWindow | null = null

// ── Helpers ──────────────────────────────────────────────────────────────

function statusLabel(status: GatewayStatus): string {
  switch (status) {
    case 'connected': return '已连接'
    case 'starting':  return '正在连接...'
    case 'idle':      return '未连接'
    case 'disconnected': return '未连接'
    case 'error':     return '连接错误'
    case 'ready':     return '就绪'
    default:          return '未知'
  }
}

function getIconPath(): string {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
  if (isDev) {
    return path.join(currentDirPath, '../../public/icon.png')
  }
  return path.join(process.resourcesPath, 'icon.png')
}

function loadIcon(): Electron.NativeImage {
  const iconPath = getIconPath()
  if (fs.existsSync(iconPath)) {
    return nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
  }
  log.warn(`Tray icon not found at ${iconPath}, using empty icon`)
  return nativeImage.createEmpty()
}

// ── Menu building ───────────────────────────────────────────────────────

function buildTrayMenu(status: GatewayStatus): Electron.Menu {
  const bridge = getGatewayBridge()

  const template: Electron.MenuItemConstructorOptions[] = [
    // 状态行（不可点击）
    {
      label: `状态: ${statusLabel(status)}`,
      enabled: false,
    },
    { type: 'separator' },

    // 连接 / 断开（根据状态）
    ...(status === 'connected' || status === 'ready'
      ? [
          {
            label: '断开连接',
            click: () => {
              bridge.disconnect().catch(err => log.warn('断开失败:', err))
            },
          },
        ]
      : status === 'starting'
      ? [
          {
            label: '正在连接...',
            enabled: false,
          },
        ]
      : [
          {
            label: '连接 OpenClaw',
            click: () => {
              bridge.connect().catch(err => log.warn('连接失败:', err))
            },
          },
        ]),

    { type: 'separator' },

    // 窗口操作
    {
      label: '显示 SynClaw',
      click: () => {
        mainWindowRef?.show()
        mainWindowRef?.focus()
      },
    },

    // 关于
    {
      label: '关于 SynClaw',
      click: () => {
        dialog.showMessageBox({
          type: 'info',
          title: '关于 SynClaw',
          message: 'SynClaw',
          detail: `版本: ${app.getVersion()}\nAI Agent Desktop Client`,
        })
      },
    },

    { type: 'separator' },

    // 退出（只清除 tray 引用，让主进程正常退出）
    {
      label: '退出',
      click: () => {
        tray = null
        app.quit()
      },
    },
  ]

  return Menu.buildFromTemplate(template)
}

// ── Dock badge (macOS only) ─────────────────────────────────────────────

function updateDockBadge(status: GatewayStatus) {
  if (process.platform !== 'darwin') return
  switch (status) {
    case 'connected':
    case 'ready':
      app.dock?.setBadge('●')  // green dot
      break
    default:
      app.dock?.setBadge('○')   // gray dot
      break
  }
}

// ── Tray creation / refresh ─────────────────────────────────────────────

function createTrayIcon(): Tray {
  const icon = loadIcon()
  const t = new Tray(icon)
  t.setToolTip('SynClaw - AI Agent')
  return t
}

export function createTray(mainWindow: BrowserWindow): Tray {
  mainWindowRef = mainWindow

  tray = createTrayIcon()

  // 初始菜单（idle 状态）
  tray.setContextMenu(buildTrayMenu('idle'))
  updateDockBadge('idle')

  // 点击托盘图标：显示/隐藏窗口
  tray.on('click', () => {
    if (mainWindowRef?.isVisible()) {
      mainWindowRef.hide()
    } else {
      mainWindowRef?.show()
      mainWindowRef?.focus()
    }
  })

  log.info('Tray created')
  return tray
}

export function destroyTray() {
  if (tray) {
    tray.destroy()
    tray = null
  }
}

/**
 * 监听 Gateway 状态变化，重新构建托盘菜单并更新 dock badge。
 * 在 main/index.ts 中调用。
 */
export function registerTrayStatusListener() {
  const bridge = getGatewayBridge()
  bridge.onStatusChange((status: GatewayStatus) => {
    if (!tray) return
    tray.setContextMenu(buildTrayMenu(status))
    updateDockBadge(status)
    log.info(`Tray updated: status=${status}`)
  })
}

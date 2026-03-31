import { autoUpdater } from 'electron-updater'
import type { BrowserWindow } from 'electron'
import logger from './logger.js'

const log = logger.scope('updater')

export function setupAutoUpdater(mainWindow: BrowserWindow) {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  const feedUrl = process.env.UPDATER_FEED_URL
  if (feedUrl) {
    autoUpdater.setFeedURL({ provider: 'generic', url: feedUrl })
  } else if (process.env.NODE_ENV !== 'development') {
    log.warn('UPDATER_FEED_URL not set, update checks will fail in production')
  }

  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info.version)
    mainWindow.webContents.send('openclaw:update-available', {
      version: info.version,
      releaseDate: info.releaseDate,
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    mainWindow.webContents.send('openclaw:update-downloaded', {
      version: info.version,
    })
  })

  autoUpdater.on('error', (err) => {
    log.error('Error:', err.message)
  })

  if (process.env.NODE_ENV !== 'development') {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((err) => {
        log.error('Check failed:', err.message)
      })
    }, 3000)
  }
}

export async function downloadUpdate() {
  return autoUpdater.downloadUpdate()
}

export function installUpdate() {
  autoUpdater.quitAndInstall()
}

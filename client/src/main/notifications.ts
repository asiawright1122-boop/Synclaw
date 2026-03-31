/**
 * notifications.ts
 *
 * SynClaw 通知管理模块。
 * 监听 Gateway 事件，通过 Electron Notification API 推送系统通知。
 */

import { Notification, BrowserWindow } from 'electron'
import { getGatewayBridge } from './gateway-bridge.js'
import logger from './logger.js'

const log = logger.scope('notifications')

export class NotificationManager {
  private enabled: boolean = true

  constructor(private mainWindow: BrowserWindow) {
    this.listen()
    log.info('NotificationManager initialized')
  }

  private listen() {
    const bridge = getGatewayBridge()
    bridge.onEvent((event, payload) => {
      if (!this.enabled) return

      try {
        switch (event) {
          case 'task:completed': {
            const data = payload as { title?: string; taskId?: string }
            this.notify('任务完成', data.title ?? '任务执行成功', 'info')
            break
          }
          case 'task:error': {
            const data = payload as { title?: string; error?: string; taskId?: string }
            this.notify(
              '任务失败',
              `${data.title ?? '任务'}: ${data.error ?? '未知错误'}`,
              'error'
            )
            break
          }
          case 'cron:triggered': {
            const data = payload as { name?: string; cronId?: string }
            this.notify('定时任务', data.name ?? '定时任务已触发', 'info')
            break
          }
          case 'cron:completed': {
            const data = payload as { name?: string; cronId?: string }
            this.notify('定时任务完成', data.name ?? '定时任务执行完成', 'info')
            break
          }
          case 'avatar:status-changed': {
            const data = payload as { name?: string; status?: string }
            this.notify(
              '分身状态变更',
              `${data.name ?? '分身'}: ${data.status ?? '状态变化'}`,
              'info'
            )
            break
          }
          case 'exec.approval.requested': {
            const data = payload as { id?: string; command?: string; nodeId?: string }
            // If a new exec approval arrives and window is not focused, notify the user
            if (!this.mainWindow.isFocused()) {
              const cmdPreview = (data.command ?? 'Shell command').slice(0, 60)
              this.notify(
                '命令执行审批',
                `待执行: ${cmdPreview}${cmdPreview.length >= 60 ? '…' : ''}`,
                'info'
              )
            }
            break
          }
          case 'exec.approval.resolved': {
            const data = payload as { id?: string; approved?: boolean }
            this.notify(
              '命令审批已处理',
              data.approved ? '已批准执行' : '已拒绝',
              'info'
            )
            break
          }
          default:
            // 不处理其他事件
            break
        }
      } catch (err) {
        log.error(`Failed to handle event ${event}:`, err)
      }
    })
  }

  /**
   * 显示系统通知。
   * 点击通知时聚焦主窗口。
   */
  notify(title: string, body: string, type: 'info' | 'error' = 'info') {
    if (!Notification.isSupported()) {
      log.warn('Notifications not supported on this system')
      return
    }

    const notification = new Notification({
      title,
      body,
      silent: type === 'error',
    })

    notification.on('click', () => {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.show()
        this.mainWindow.focus()
      }
    })

    notification.on('close', () => {
      log.info(`Notification closed: ${title}`)
    })

    notification.on('failed', (event, err) => {
      log.error(`Notification failed: ${err}`)
    })

    notification.show()
    log.info(`Notification shown: [${type}] ${title} — ${body}`)
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
    log.info(`Notifications ${enabled ? 'enabled' : 'disabled'}`)
  }
}

// Singleton instance for IPC access
let notificationManagerInstance: NotificationManager | null = null

export function setNotificationManagerInstance(instance: NotificationManager) {
  notificationManagerInstance = instance
}

export function getNotificationManagerInstance(): NotificationManager | null {
  return notificationManagerInstance
}

/**
 * GeneralPanel.tsx — 通用设置面板
 */
import { useState, useEffect } from 'react'
import { Card, Row, ToggleDot } from '../ui'
import { useSettingsStore } from '../../stores/settingsStore'

export function GeneralPanel() {
  const settings = useSettingsStore()
  const [phone, setPhone] = useState<string>('加载中…')

  useEffect(() => {
    if (!window.openclaw) return
    window.openclaw.config.get().then(res => {
      if (res.success && res.data) {
        const data = res.data as Record<string, unknown>
        const user = data.user as Record<string, unknown> | undefined
        if (user?.phone) setPhone(String(user.phone))
      }
    }).catch(() => {
      setPhone('获取失败')
    })
  }, [])

  return (
    <div className="pb-10">
      <h1 className="text-xl font-bold mb-6" style={{ color: 'var(--text)' }}>
        通用
      </h1>

      <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
        账号与安全
      </p>
      <Card className="mb-6">
        <Row label="手机号" border>
          <span className="text-sm tabular-nums" style={{ color: 'var(--text-sec)' }}>
            {phone}
          </span>
        </Row>
        <div className="px-5 py-3.5 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              注销账号
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-sec)' }}>
              注销账号将删除您的账户和所有数据
            </p>
          </div>
          <button
            type="button"
            className="px-3 py-1 rounded-lg text-sm font-medium shrink-0 border"
            style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
          >
            注销
          </button>
        </div>
      </Card>

      <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
        外观与行为
      </p>
      <Card>
        <Row
          label="主题模式"
          desc="选择橙白浅色或 Neon Noir 深色模式。"
          border
        >
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => settings.setTheme('light')}
              className="w-9 h-9 rounded-full p-0.5"
              style={{
                boxShadow: settings.theme === 'light' ? '0 0 0 2px var(--accent1)' : '0 0 0 1px #ddd',
              }}
              title="浅色"
            >
              <span
                className="block w-full h-full rounded-full overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, #fc5d1e 50%, #fff 50%)',
                }}
              />
            </button>
            <button
              type="button"
              onClick={() => settings.setTheme('dark')}
              className="w-9 h-9 rounded-full p-0.5"
              style={{
                boxShadow: settings.theme === 'dark' ? '0 0 0 2px var(--accent1)' : '0 0 0 1px #ddd',
              }}
              title="Neon Noir"
            >
              <span
                className="block w-full h-full rounded-full"
                style={{
                  background: 'linear-gradient(160deg, #6366f1 0%, #1e1b4b 45%, #0a0a0a 100%)',
                }}
              />
            </button>
            <button
              type="button"
              onClick={() => settings.setTheme('system')}
              className="w-9 h-9 rounded-full p-0.5 flex items-center justify-center text-xs font-medium border"
              style={{
                boxShadow: settings.theme === 'system' ? '0 0 0 2px var(--accent1)' : '0 0 0 1px #ddd',
                borderColor: settings.theme === 'system' ? 'var(--accent1)' : '#ddd',
                color: 'var(--text-sec)',
              }}
              title="跟随系统"
            >
              Aa
            </button>
          </div>
        </Row>
        <Row label="动画" desc="界面动画和过渡效果。" border>
          <ToggleDot
            on={settings.animationsEnabled}
            onChange={settings.setAnimationsEnabled}
          />
        </Row>
        <Row label="通知" desc="接收系统通知。" border>
          <ToggleDot
            on={settings.notificationsEnabled}
            onChange={settings.setNotificationsEnabled}
          />
        </Row>
        <Row label="紧凑模式" desc="减少界面元素间距，节省屏幕空间。" border={false}>
          <ToggleDot
            on={settings.compactMode}
            onChange={settings.setCompactMode}
          />
        </Row>
      </Card>

      <div className="flex justify-center mt-10">
        <button
          type="button"
          className="text-sm"
          style={{ color: 'var(--text-ter)' }}
        >
          退出登录
        </button>
      </div>
    </div>
  )
}

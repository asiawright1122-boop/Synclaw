/**
 * WorkspacePanel.tsx — 工作区设置面板
 */
import { useState, useCallback } from 'react'
import { Card, Row, ToggleStrip } from '../ui'
import { pillBtn } from './shared/pillBtn'
import { useSettingsStore } from '../../stores/settingsStore'
import { useToastStore } from '../../stores/toastStore'

function WorkspacePanel() {
  const limitAccess = useSettingsStore(s => s.workspace.limitAccess)
  const autoSave = useSettingsStore(s => s.workspace.autoSave)
  const watch = useSettingsStore(s => s.workspace.watch)
  const heartbeat = useSettingsStore(s => s.workspace.heartbeat)
  const setLimitAccess = useSettingsStore(s => s.setWorkspaceLimitAccess)
  const setAutoSave = useSettingsStore(s => s.setWorkspaceAutoSave)
  const setWatch = useSettingsStore(s => s.setWorkspaceWatch)
  const setHeartbeat = useSettingsStore(s => s.setWorkspaceHeartbeat)
  const [saving, setSaving] = useState(false)
  const addToast = useToastStore(s => s.addToast)

  const handleLimitAccess = useCallback((val: boolean) => {
    setSaving(true)
    try {
      setLimitAccess(val)
    } finally {
      setSaving(false)
    }
  }, [setLimitAccess])

  const handleAutoSave = useCallback((val: boolean) => {
    setSaving(true)
    try {
      setAutoSave(val)
    } finally {
      setSaving(false)
    }
  }, [setAutoSave])

  const handleWatch = useCallback((val: boolean) => {
    setSaving(true)
    try {
      setWatch(val)
    } finally {
      setSaving(false)
    }
  }, [setWatch])

  const handleHeartbeat = useCallback((val: '30m' | '1h' | '2h' | '4h') => {
    setSaving(true)
    try {
      setHeartbeat(val)
    } finally {
      setSaving(false)
    }
  }, [setHeartbeat])

  return (
    <div className="pb-10">
      <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
        工作区
        {saving && <span className="text-xs" style={{ color: 'var(--accent1)' }}>保存中...</span>}
      </h1>
      <p className="text-sm mt-1 mb-6" style={{ color: 'var(--text-sec)' }}>
        配置本地项目目录与上下文持久化行为。
      </p>

      <Card className="mb-4">
        <div className="px-5 py-4">
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            默认项目目录
          </p>
          <p className="text-xs mt-1 mb-3" style={{ color: 'var(--text-sec)' }}>
            SynClaw 项目和上下文文件的保存位置。
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              className="flex-1 min-w-0 px-3 py-2 rounded-lg text-sm border"
              style={{ borderColor: 'var(--border)', background: 'var(--input-bg)' }}
              value="~/.openclaw-synclaw/workspace"
            />
            <button
              type="button"
              className={pillBtn(false)}
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              onClick={() => {
                addToast({ type: 'info', message: '正在打开工作区目录...', duration: 2000 })
                window.electronAPI?.shell?.expandTilde?.('~/.openclaw-synclaw/workspace').then((expanded) => {
                  const resolvedPath = expanded ?? '~/.openclaw-synclaw/workspace'
                  window.electronAPI?.shell?.openPath?.(resolvedPath).catch(() => {
                    addToast({ type: 'warning', message: '无法打开目录，请确认路径是否存在', duration: 3000 })
                  })
                })
              }}
            >
              浏览
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <Row
          label="限制文件访问范围"
          desc="将 Agent 可访问目录限制在工作区内，降低误操作工作区外文件的风险。"
          border
        >
          <ToggleStrip on={limitAccess} onChange={handleLimitAccess} />
        </Row>
        <Row label="自动保存上下文" desc="自动将会话与产物保存到本地工作区。" border>
          <ToggleStrip on={autoSave} onChange={handleAutoSave} />
        </Row>
        <Row label="文件监听" desc="监听本地文件变更，实时刷新 Agent 上下文。" border>
          <ToggleStrip on={watch} onChange={handleWatch} />
        </Row>
        <div
          className="px-5 py-3.5"
          style={{ borderBottom: '1px solid var(--border-secondary)' }}
        >
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            Agent 心跳频率
          </p>
          <p className="text-xs mt-1 mb-3" style={{ color: 'var(--text-sec)' }}>
            周期性心跳会消耗积分，降低频率可节省积分；修改后需重启生效。
          </p>
          <div className="flex flex-wrap gap-2">
            {(['30m', '1h', '2h', '4h'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => handleHeartbeat(k)}
                className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
                style={
                  heartbeat === k
                    ? {
                        background: 'var(--accent1)',
                        color: '#fff',
                        borderColor: 'var(--accent1)',
                      }
                    : { borderColor: 'var(--border)', color: 'var(--text-sec)', background: 'transparent' }
                }
              >
                {k}
              </button>
            ))}
          </div>
        </div>
        <div className="px-5 py-3.5 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              从 OpenClaw 迁移
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-sec)' }}>
              迁移配置、聊天记录与技能到 SynClaw。
            </p>
          </div>
          <button
            type="button"
            className={pillBtn(false)}
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            onClick={() => addToast({ type: 'info', message: '迁移功能即将推出，请稍候', duration: 3000 })}
          >
            开始迁移
          </button>
        </div>
      </Card>
    </div>
  )
}

export { WorkspacePanel }

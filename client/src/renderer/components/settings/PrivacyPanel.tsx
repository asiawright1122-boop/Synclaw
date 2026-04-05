/**
 * PrivacyPanel.tsx — 数据与隐私面板
 */
import { useState, useEffect } from 'react'
import { Card, ToggleStrip } from '../ui'
import { ExternalLinkMini } from './shared/ExternalLinkMini'
import { useSettingsStore } from '../../stores/settingsStore'

function PrivacyPanel() {
  const [plan, setPlanState] = useState(false)
  const [wsPath, setWsPath] = useState('')

  useEffect(() => {
    window.electronAPI?.settings.get().then((res) => {
      if (res?.success && res.data) {
        const privacy = (res.data as { privacy?: { optimizationPlan?: boolean } }).privacy
        if (privacy && typeof privacy.optimizationPlan === 'boolean') {
          setPlanState(privacy.optimizationPlan)
        }
      }
    }).catch(() => {})
    window.electronAPI?.app.getDefaultWorkspacePath().then(res => {
      if (res?.success && res.data) setWsPath(res.data as string)
    }).catch(() => {})
  }, [])

  const handlePlanChange = (next: boolean) => {
    setPlanState(next)
    window.electronAPI?.settings.set('privacy.optimizationPlan', next).catch(() => {})
  }

  return (
    <div className="pb-10">
      <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
        数据与隐私
      </h1>
      <p className="text-sm mt-1 mb-6" style={{ color: 'var(--text-sec)' }}>
        查看数据存储位置与 SynClaw 的网络出站范围。
      </p>

      <Card className="mb-4">
        <div className="px-5 py-4">
          <p className="text-sm mb-2" style={{ color: 'var(--text-sec)' }}>
            本地数据路径
          </p>
          <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--text-sec)' }}>
            所有工作区文件、对话记录和 Agent 输出均存储在此本地目录。
          </p>
          <div
            className="px-3 py-2 rounded-lg text-sm font-mono border"
            style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-secondary)' }}
          >
            {wsPath || '加载中...'}
          </div>
        </div>
      </Card>

      <Card className="mb-4">
        <div className="px-5 py-4 flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>
              优化计划
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-sec)' }}>
              开启后，经过去标识化处理的用户输入与部分使用数据可能用于模型与产品体验优化。你可随时关闭，不影响正常使用。
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <ToggleStrip on={plan} onChange={handlePlanChange} />
            <span className="text-[10px]" style={{ color: 'var(--text-ter)' }}>
              {plan ? '开' : '关'}
            </span>
          </div>
        </div>
      </Card>

      <Card>
        <div className="px-5 py-4">
          <p className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>
            备案信息
          </p>
          <div className="grid gap-3 text-xs" style={{ color: 'var(--text-sec)' }}>
            <div>
              <span className="font-medium" style={{ color: 'var(--text)' }}>
                ICP 备案/许可证号：
              </span>
              京 ICP 备 20011824 号 -21（示例）
            </div>
            <div>
              <span className="font-medium block mb-1" style={{ color: 'var(--text)' }}>
                算法备案
              </span>
              智谱 ChatGLM 生成算法（示例备案号） · 智谱 ChatGLM 搜索算法（示例备案号）
            </div>
            <div>
              <span className="font-medium" style={{ color: 'var(--text)' }}>
                大模型备案登记：
              </span>
              Beijing-AutoGLM-20250606S0053（示例）
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mt-6 text-sm">
            <a href="#" className="inline-flex items-center gap-1 font-medium" style={{ color: 'var(--accent1)' }}>
              隐私政策 <ExternalLinkMini />
            </a>
            <a href="#" className="inline-flex items-center gap-1 font-medium" style={{ color: 'var(--accent1)' }}>
              用户协议 <ExternalLinkMini />
            </a>
          </div>
        </div>
      </Card>

      <Card>
        <div className="px-5 py-4">
          <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>
            重新引导
          </p>
          <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--text-sec)' }}>
            重新播放首次启动引导流程，可重新配置 API Key 和授权目录。
          </p>
          <button
            type="button"
            onClick={() => {
              const store = useSettingsStore.getState()
              store.setHasCompletedOnboarding(false)
              window.location.reload()
            }}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-sec)' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            重置引导
          </button>
        </div>
      </Card>
    </div>
  )
}

export { PrivacyPanel }

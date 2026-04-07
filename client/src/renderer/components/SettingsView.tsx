/**
 * AutoClaw 风格设置 — 左侧导航 + 右侧详情（完整复刻参考 UI）
 */
import { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '../stores/appStore'
import { ImPanel } from './IMPanel'
import { SkillsMarketPanel } from './SkillsMarketPanel'
import {
  ArrowLeft,
  Pencil,
  BarChart3,
  Coins,
  Cpu,
  Plug,
  BookOpen,
  MessageCircle,
  FolderOpen,
  Shield,
  MessageSquarePlus,
  Info,
  Server,
  Brain,
  Zap,
  Sparkles,
  Volume2,
  Bot,
} from 'lucide-react'
import { GeneralPanel } from './settings/GeneralPanel'
import { UsagePanel } from './settings/UsagePanel'
import { PointsPanel } from './settings/PointsPanel'
import { ModelsPanel } from './settings/ModelsPanel'
import { MemoryPanel } from './settings/MemoryPanel'
import { HooksPanel } from './settings/HooksPanel'
import { McpPanel } from './settings/McpPanel'
import { SkillsPanel } from './settings/SkillsPanel'
import { WorkspacePanel } from './settings/WorkspacePanel'
import { GatewayPanel } from './settings/GatewayPanel'
import { PrivacyPanel } from './settings/PrivacyPanel'
import { FeedbackPanelWrapper } from './settings/FeedbackPanelWrapper'
import { AboutPanel } from './settings/AboutPanel'
import { TtsPanel } from './settings/TtsPanel'
import { ExecApprovalsPanel } from './settings/ExecApprovalsPanel'
import { AvatarSettingsPanel } from './settings/AvatarSettingsPanel'
import { SecurityPanel } from './settings/SecurityPanel'

type SettingsSection =
  | 'general'
  | 'usage'
  | 'points'
  | 'models'
  | 'memory'
  | 'hooks'
  | 'mcp'
  | 'skills'
  | 'skillsMarket'
  | 'im'
  | 'security'
  | 'workspace'
  | 'privacy'
  | 'feedback'
  | 'about'
  | 'gateway'
  | 'tts'
  | 'execApprovals'
  | 'avatar'

const NAV: { id: SettingsSection; label: string; icon: typeof Pencil }[] = [
  { id: 'general', label: '通用', icon: Pencil },
  { id: 'usage', label: '用量统计', icon: BarChart3 },
  { id: 'points', label: '积分详情', icon: Coins },
  { id: 'models', label: '模型与 API', icon: Cpu },
  { id: 'memory', label: '记忆管理', icon: Brain },
  { id: 'hooks', label: '自动化', icon: Zap },
  { id: 'mcp', label: 'MCP 服务', icon: Plug },
  { id: 'skills', label: '技能', icon: BookOpen },
  { id: 'skillsMarket', label: '技能市场', icon: Sparkles },
  { id: 'im', label: 'IM 频道', icon: MessageCircle },
  { id: 'security', label: '安全性', icon: Shield },
  { id: 'execApprovals', label: '执行审批', icon: Shield },
  { id: 'avatar', label: '分身', icon: Bot },
  { id: 'workspace', label: '工作区', icon: FolderOpen },
  { id: 'gateway', label: 'Gateway', icon: Server },
  { id: 'tts', label: '语音', icon: Volume2 },
  { id: 'privacy', label: '数据与隐私', icon: Shield },
  { id: 'feedback', label: '提交反馈', icon: MessageSquarePlus },
  { id: 'about', label: '关于', icon: Info },
]

/* ─── 各面板已迁移至 settings/*.tsx ─── */

export function SettingsView() {
  const currentModel = useAppStore(s => s.currentModel)
  const setSettingsModalOpen = useAppStore(s => s.setSettingsModalOpen)
  const settingsSection = useAppStore(s => s.settingsSection)
  const [section, setSection] = useState<SettingsSection>('general')

  // 同步来自 command palette 的 section 切换
  useEffect(() => {
    if (settingsSection) {
      setSection(settingsSection as SettingsSection)
    }
  }, [settingsSection])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSettingsModalOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setSettingsModalOpen])

  const content = useMemo(() => {
    switch (section) {
      case 'general':
        return <GeneralPanel />
      case 'usage':
        return <UsagePanel />
      case 'points':
        return <PointsPanel />
      case 'models':
        return <ModelsPanel currentModel={currentModel} />
      case 'memory':
        return <MemoryPanel />
      case 'hooks':
        return <HooksPanel />
      case 'mcp':
        return <McpPanel />
      case 'skills':
        return <SkillsPanel />
      case 'skillsMarket':
        return <SkillsMarketPanel />
      case 'im':
        return <ImPanel />
      case 'security':
        return <SecurityPanel />
      case 'execApprovals':
        return <ExecApprovalsPanel />
      case 'workspace':
        return <WorkspacePanel />
      case 'gateway':
        return <GatewayPanel />
      case 'tts':
        return <TtsPanel />
      case 'avatar':
        return <AvatarSettingsPanel />
      case 'privacy':
        return <PrivacyPanel />
      case 'feedback':
        return <FeedbackPanelWrapper />
      case 'about':
        return <AboutPanel />
      default:
        return <GeneralPanel />
    }
  }, [section, currentModel])

  return (
    <div className="h-full flex overflow-hidden" style={{ background: '#f0f0f0' }}>
      {/* 左侧设置导航 */}
      <aside
        className="w-[220px] shrink-0 flex flex-col py-3 pl-2 pr-1 overflow-y-auto border-r"
        style={{
          background: '#f5f5f5',
          borderColor: 'var(--border-secondary)',
        }}
      >
        <button
          type="button"
          onClick={() => setSettingsModalOpen(false)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-2 text-left w-full transition-colors hover:bg-black/5"
          style={{ color: 'var(--text-sec)' }}
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          返回应用
        </button>
        <nav className="flex flex-col gap-0.5">
          {NAV.map((item) => {
            const Icon = item.icon
            const active = section === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left w-full transition-colors"
                style={{
                  background: active ? 'rgba(0,0,0,0.06)' : 'transparent',
                  color: active ? 'var(--text)' : 'var(--text-sec)',
                  fontWeight: active ? 500 : 400,
                }}
              >
                <Icon className="w-4 h-4 shrink-0 opacity-80" />
                {item.label}
              </button>
            )
          })}
        </nav>
      </aside>

      {/* 右侧内容 */}
      <main
        className="flex-1 overflow-y-auto min-w-0"
        style={{ background: '#fafafa' }}
      >
        <div className="max-w-3xl mx-auto px-10 py-8">{content}</div>
      </main>
    </div>
  )
}

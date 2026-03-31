import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Search, Loader2, Package, Globe, Code2, Image, FolderOpen,
  X, Download, RefreshCw, CheckCircle, AlertTriangle,
  Zap, ExternalLink, ArrowLeft, Trash2,
} from 'lucide-react'
import { useToast } from './Toast'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MarketSkill {
  name: string
  description: string
  emoji?: string
  source?: string
  homepage?: string
  installed?: boolean
  enabled?: boolean
  eligible?: boolean
  disabled?: boolean
  missingBins?: string[]
  missingEnv?: string[]
  installSpecs?: Array<{ kind: string; label: string; [key: string]: unknown }>
}

interface ClawHubStatus {
  installed: boolean
  version: string | null
  error?: string
}

interface SearchResult {
  name: string
  description: string
  version?: string
  author?: string
  downloads?: number
  [key: string]: unknown
}

type ViewMode = 'browse' | 'search' | 'detail'

const CATEGORY_ICONS: Record<string, typeof FolderOpen> = {
  文件: FolderOpen,
  文件管理: FolderOpen,
  开发: Code2,
  代码: Code2,
  搜索: Globe,
  搜索工具: Globe,
  创意: Image,
  图像: Image,
  其他: Package,
}

const INSTALLED_FALLBACK: MarketSkill[] = [
  { name: '1password', description: '配置 1Password CLI (op) 并与桌面应用集成，供 Agent 安全读取密钥片段。', emoji: '🔐', installed: true, enabled: true, eligible: true },
  { name: 'session-logs', description: '使用 jq 等工具检索、分析会话日志，便于排查问题。', emoji: '📋', installed: true, enabled: true, eligible: false, missingBins: ['rg'] },
  { name: 'skill-creator', description: '指导为 Claude 编写高质量 Skill 的说明与模板。', emoji: '📦', installed: true, enabled: true, eligible: true },
  { name: 'github', description: '与 GitHub 交互：创建 Issue、PR 评论、代码搜索。', emoji: '🐙', installed: false },
  { name: 'notion', description: '读写 Notion 数据库和页面，管理笔记与任务。', emoji: '📝', installed: false },
  { name: 'weather', description: '获取全球城市天气数据和预报。', emoji: '🌤️', installed: false },
  { name: 'discord', description: '发送 Discord 消息到频道，支持富文本和附件。', emoji: '🎮', installed: false },
  { name: 'slack', description: '向 Slack 频道发送通知和消息。', emoji: '💬', installed: false },
  { name: 'tmux', description: '远程控制 tmux 会话并抓取 pane 输出。', emoji: '🖥️', installed: true, enabled: false, eligible: false },
  { name: 'obsidian', description: '读取和写入 Obsidian 笔记库。', emoji: '📓', installed: false },
]

function inferCategory(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('file') || n.includes('folder') || n.includes('explorer') || n.includes('fs')) return '文件'
  if (n.includes('code') || n.includes('git') || n.includes('dev') || n.includes('lint') || n.includes('build')) return '开发'
  if (n.includes('search') || n.includes('grep') || n.includes('find')) return '搜索'
  if (n.includes('image') || n.includes('photo') || n.includes('canvas') || n.includes('draw')) return '创意'
  return '其他'
}

function categoryIcon(cat: string) {
  return CATEGORY_ICONS[cat] ?? Package
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ClawHubBadge({ status, onInstallCli, cliInstalling }: {
  status: ClawHubStatus
  onInstallCli?: () => void
  cliInstalling?: boolean
}) {
  if (!status.installed) {
    return (
      <div
        className="flex items-start gap-2 px-4 py-3 rounded-xl border mb-4"
        style={{ background: 'rgba(252,93,30,0.06)', borderColor: 'rgba(252,93,30,0.25)' }}
      >
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--accent1)' }} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium" style={{ color: 'var(--accent1)' }}>ClawHub CLI 未安装</p>
          <p className="text-xs mt-0.5 mb-2" style={{ color: 'var(--text-sec)' }}>
            技能市场需要 ClawHub CLI 才能浏览和安装技能
          </p>
          <button
            type="button"
            onClick={onInstallCli}
            disabled={cliInstalling}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-60"
            style={{ background: 'var(--accent1)', color: '#fff' }}
          >
            {cliInstalling
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 安装中…</>
              : <><Download className="w-3.5 h-3.5" /> 安装 ClawHub CLI</>
            }
          </button>
        </div>
      </div>
    )
  }
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs mb-4"
      style={{ background: 'rgba(34,197,94,0.08)', color: 'var(--success)', width: 'fit-content' }}
    >
      <CheckCircle className="w-3 h-3" />
      ClawHub {status.version} · https://clawhub.com
    </div>
  )
}

function SkillCard({
  skill,
  onInstall,
  onUninstall,
  onDetail,
  isInstalling,
  isUninstalling,
}: {
  skill: MarketSkill
  onInstall: (s: MarketSkill) => void
  onUninstall?: (s: MarketSkill) => void
  onDetail: (s: MarketSkill) => void
  isInstalling: boolean
  isUninstalling?: boolean | null
}) {
  const cat = inferCategory(skill.name)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative"
    >
      <button
        type="button"
        onClick={() => onDetail(skill)}
        className="w-full text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer"
        style={{
          background: 'var(--bg-container)',
          borderColor: 'var(--border)',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent1)'
          ;(e.currentTarget as HTMLElement).style.background = 'rgba(252,93,30,0.04)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
          ;(e.currentTarget as HTMLElement).style.background = 'var(--bg-container)'
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-lg leading-none shrink-0">{skill.emoji ?? '📦'}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{skill.name}</span>
                {skill.installed && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
                    style={{ background: 'rgba(34,197,94,0.12)', color: 'var(--success)' }}
                  >
                    已安装
                  </span>
                )}
                {!skill.installed && !skill.eligible && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
                    style={{ background: 'rgba(252,93,30,0.12)', color: 'var(--accent1)' }}
                  >
                    需配置
                  </span>
                )}
              </div>
              <span className="text-[10px]" style={{ color: 'var(--text-ter)' }}>
                {cat}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {skill.homepage && (
              <a
                href={skill.homepage}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: 'var(--text-ter)' }}
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            {!skill.installed ? (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onInstall(skill) }}
                disabled={isInstalling}
                className="p-1 rounded transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                style={{ background: 'var(--accent1)', color: '#fff' }}
                title="安装"
              >
                {isInstalling
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Download className="w-3.5 h-3.5" />
                }
              </button>
            ) : (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onUninstall?.(skill) }}
                disabled={!!isUninstalling}
                className="p-1 rounded transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                style={{ color: 'var(--accent1)', background: 'rgba(252,93,30,0.1)' }}
                title="卸载"
              >
                {isUninstalling
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Trash2 className="w-3.5 h-3.5" />
                }
              </button>
            )}
          </div>
        </div>
        <p
          className="text-xs mt-2 line-clamp-2 leading-relaxed"
          style={{ color: 'var(--text-sec)' }}
        >
          {skill.description}
        </p>
        {skill.missingBins && skill.missingBins.length > 0 && (
          <p className="text-[10px] mt-1.5" style={{ color: 'var(--accent1)' }}>
            缺少依赖: {skill.missingBins.join(', ')}
          </p>
        )}
      </button>
    </motion.div>
  )
}

function InstallConfirmModal({
  skill,
  onConfirm,
  onCancel,
  isInstalling,
}: {
  skill: MarketSkill
  onConfirm: () => void
  onCancel: () => void
  isInstalling: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-[420px] mx-4 rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-container)', boxShadow: '0 24px 64px rgba(0,0,0,0.4)', border: '1px solid var(--border)' }}
      >
        <div className="px-6 pt-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: 'var(--bg-elevated)' }}>
              {skill.emoji ?? '📦'}
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>安装技能</h3>
              <p className="text-xs" style={{ color: 'var(--text-sec)' }}>{skill.name}</p>
            </div>
          </div>
        </div>
        <div className="px-6 py-4">
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-sec)' }}>
            从 ClawHub 安装 <strong style={{ color: 'var(--text)' }}>{skill.name}</strong>。技能将被保存到本地目录。
          </p>
          {skill.missingBins && skill.missingBins.length > 0 && (
            <div
              className="mt-3 px-3 py-2 rounded-lg text-xs flex items-start gap-2"
              style={{ background: 'rgba(252,93,30,0.08)', border: '1px solid rgba(252,93,30,0.2)' }}
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'var(--accent1)' }} />
              <span style={{ color: 'var(--text-sec)' }}>
                此技能需要系统依赖：<strong style={{ color: 'var(--accent1)' }}>{skill.missingBins.join(', ')}</strong>
              </span>
            </div>
          )}
        </div>
        <div className="px-6 pb-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm transition-colors"
            style={{ color: 'var(--text-sec)', background: 'var(--bg-elevated)' }}
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isInstalling}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ background: 'var(--accent-gradient)', color: '#fff' }}
          >
            {isInstalling && <Loader2 className="w-4 h-4 animate-spin" />}
            {isInstalling ? '安装中…' : '确认安装'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function SkillDetailPanel({
  skill,
  onInstall,
  onUninstall,
  onBack,
  isInstalling,
  isUninstalling,
}: {
  skill: MarketSkill
  onInstall: (s: MarketSkill) => void
  onUninstall?: (s: MarketSkill) => void
  onBack: () => void
  isInstalling: boolean
  isUninstalling?: boolean | null
}) {
  const cat = inferCategory(skill.name)

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          type="button"
          onClick={onBack}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--text-sec)', background: 'var(--bg-elevated)' }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-2xl leading-none">{skill.emoji ?? '📦'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold truncate" style={{ color: 'var(--text)' }}>{skill.name}</h2>
            {skill.installed && (
              <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{ background: 'rgba(34,197,94,0.12)', color: 'var(--success)' }}>已安装</span>
            )}
          </div>
          <span className="text-xs" style={{ color: 'var(--text-ter)' }}>{cat}</span>
        </div>
      </div>

      {/* Description */}
      <div className="mb-5">
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-sec)' }}>{skill.description}</p>
      </div>

      {/* Info rows */}
      <div className="space-y-2 mb-5">
        {skill.source && (
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-sec)' }}>
            <Package className="w-3.5 h-3.5 shrink-0" />
            来源：<span style={{ color: 'var(--text-ter)' }}>{skill.source}</span>
          </div>
        )}
        {skill.homepage && (
          <a
            href={skill.homepage}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs transition-colors"
            style={{ color: 'var(--accent1)' }}
          >
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            在 clawhub.com 打开
          </a>
        )}
        {skill.missingBins && skill.missingBins.length > 0 && (
          <div
            className="flex items-start gap-2 px-3 py-2 rounded-lg text-xs"
            style={{ background: 'rgba(252,93,30,0.06)', border: '1px solid rgba(252,93,30,0.2)' }}
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'var(--accent1)' }} />
            <span style={{ color: 'var(--text-sec)' }}>
              需要系统依赖：<strong style={{ color: 'var(--accent1)' }}>{skill.missingBins.join(', ')}</strong>
            </span>
          </div>
        )}
        {skill.missingEnv && skill.missingEnv.length > 0 && (
          <div
            className="flex items-start gap-2 px-3 py-2 rounded-lg text-xs"
            style={{ background: 'rgba(252,93,30,0.06)', border: '1px solid rgba(252,93,30,0.2)' }}
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'var(--accent1)' }} />
            <span style={{ color: 'var(--text-sec)' }}>
              需要环境变量：<strong style={{ color: 'var(--accent1)' }}>{skill.missingEnv.join(', ')}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Install specs */}
      {skill.installSpecs && skill.installSpecs.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-sec)' }}>安装方式</p>
          <div className="space-y-1.5">
            {skill.installSpecs.map((spec, i) => (
              <div key={i} className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
                <Zap className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent1)' }} />
                <span style={{ color: 'var(--text)' }}>{String(spec.label)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action button */}
      {!skill.installed && (
        <div className="mt-auto pt-4" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            type="button"
            onClick={() => onInstall(skill)}
            disabled={isInstalling}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
            style={{
              background: isInstalling ? 'var(--bg-elevated)' : 'var(--accent-gradient)',
              color: isInstalling ? 'var(--text-ter)' : '#fff',
            }}
          >
            {isInstalling ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                安装中…
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                从 ClawHub 安装
              </>
            )}
          </button>
        </div>
      )}
      {skill.installed && (
        <div className="mt-auto pt-4 flex flex-col gap-2" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(34,197,94,0.08)', color: 'var(--success)' }}>
            <CheckCircle className="w-4 h-4" />
            已安装此技能
          </div>
          <button
            type="button"
            onClick={() => onUninstall?.(skill)}
            disabled={!!isUninstalling}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
            style={{
              background: isUninstalling ? 'var(--bg-elevated)' : 'rgba(252,93,30,0.08)',
              color: isUninstalling ? 'var(--text-ter)' : 'var(--accent1)',
              border: '1px solid rgba(252,93,30,0.2)',
            }}
          >
            {isUninstalling ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> 卸载中…</>
            ) : (
              <><Trash2 className="w-4 h-4" /> 卸载技能</>
            )}
          </button>
          <p className="text-xs text-center" style={{ color: 'var(--text-ter)' }}>在「技能」标签管理已安装技能的启用状态</p>
        </div>
      )}
    </motion.div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function SkillsMarketPanel() {
  const toast = useToast()
  const [clawhubStatus, setClawhubStatus] = useState<ClawHubStatus>({ installed: false, version: null })
  const [installedSkills, setInstalledSkills] = useState<MarketSkill[]>([])
  const [browseSkills, setBrowseSkills] = useState<MarketSkill[]>([])
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('browse')
  const [selectedSkill, setSelectedSkill] = useState<MarketSkill | null>(null)
  const [installTarget, setInstallTarget] = useState<MarketSkill | null>(null)
  const [isInstalling, setIsInstalling] = useState(false)
  const [isUninstalling, setIsUninstalling] = useState<string | null>(null)
  const [clawhubCliInstalling, setClawhubCliInstalling] = useState(false)
  const [loadingBrowse, setLoadingBrowse] = useState(false)
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  // ── Load ClawHub status + installed skills + browse ──────────────────────────
  const loadAll = useCallback(async () => {
    // Check clawhub status
    try {
      const statusRes = await window.electronAPI?.clawhub?.status()
      if (statusRes?.success && statusRes.data) {
        setClawhubStatus(statusRes.data)
      }
    } catch {}

    // Load installed skills (from openclaw.skills.status)
    try {
      const res = await window.openclaw?.skills.status()
      if (res?.success && Array.isArray(res.data)) {
        const installed = (res.data as Array<{
          name?: string; skillKey?: string; description?: string;
          enabled?: boolean; eligible?: boolean; disabled?: boolean;
          source?: string; homepage?: string;
          missing?: { bins?: string[]; env?: string[]; [key: string]: unknown };
          install?: Array<{ kind?: string; label?: string; [key: string]: unknown }>;
        }>).map(s => ({
          name: s.skillKey || s.name || '未知',
          description: s.description || '',
          enabled: s.enabled ?? false,
          eligible: s.eligible ?? false,
          disabled: s.disabled ?? false,
          installed: true,
          source: s.source,
          homepage: s.homepage,
          missingBins: s.missing?.bins as string[] | undefined,
          missingEnv: s.missing?.env as string[] | undefined,
          installSpecs: s.install?.map(i => ({ kind: String(i?.kind ?? ''), label: String(i?.label ?? '') })),
        }))
        setInstalledSkills(installed)
      }
    } catch {}

    // Load browse list
    if (window.electronAPI?.clawhub) {
      setLoadingBrowse(true)
      try {
        const listRes = await window.electronAPI.clawhub.list()
        if (listRes?.success && listRes.data) {
          const installedNames = new Set(installedSkills.map(s => s.name))
          const browsed = (listRes.data.skills as Array<{
            name?: string; description?: string; emoji?: string;
            eligible?: boolean; disabled?: boolean;
            source?: string; homepage?: string;
            missing?: { bins?: string[]; env?: string[]; [key: string]: unknown };
            install?: Array<{ kind?: string; label?: string; [key: string]: unknown }>;
          }>).map(s => ({
            name: s.name || '未知',
            description: s.description || '',
            emoji: s.emoji,
            eligible: s.eligible ?? false,
            disabled: s.disabled ?? false,
            installed: installedNames.has(s.name || ''),
            source: s.source,
            homepage: s.homepage,
            missingBins: s.missing?.bins as string[] | undefined,
            missingEnv: s.missing?.env as string[] | undefined,
            installSpecs: s.install?.map(i => ({ kind: String(i?.kind ?? ''), label: String(i?.label ?? '') })),
          }))
          setBrowseSkills(browsed)
        }
      } catch {}
      setLoadingBrowse(false)
    } else {
      // Fallback to static list when clawhub not available
      setBrowseSkills(INSTALLED_FALLBACK)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadAll() }, [loadAll])

  // ── Search ──────────────────────────────────────────────────────────────────
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      setViewMode('browse')
      return
    }
    if (!window.electronAPI?.clawhub) {
      // Fallback: filter local skills
      const results = INSTALLED_FALLBACK
        .filter(s => s.name.includes(query.toLowerCase()) || s.description.toLowerCase().includes(query.toLowerCase()))
        .map(s => ({ name: s.name, description: s.description }))
      setSearchResults(results)
      setViewMode('search')
      return
    }
    setLoadingSearch(true)
    try {
      const res = await window.electronAPI.clawhub.search(query)
      if (res?.success && Array.isArray(res.data?.results)) {
        setSearchResults(res.data.results)
      }
    } catch {}
    setLoadingSearch(false)
    setViewMode('search')
  }, [])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSearch(searchInput)
  }

  // ── Install ─────────────────────────────────────────────────────────────────
  const doInstall = useCallback(async (skill: MarketSkill) => {
    if (isInstalling) return
    if (!clawhubStatus.installed) {
      toast.error('ClawHub CLI 未安装，请先点击「安装 ClawHub」按钮')
      return
    }
    setIsInstalling(true)
    setInstallTarget(null)
    try {
      const res = await window.electronAPI?.clawhub?.install(skill.name)
      if (res?.success && res.data?.ok) {
        toast.success(`"${skill.name}" 安装成功`)
        await loadAll()
      } else {
        const msg = res?.error ?? '安装失败'
        toast.error(msg)
      }
    } catch (err) {
      toast.error(`安装失败：${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsInstalling(false)
    }
  }, [isInstalling, toast, loadAll, clawhubStatus])

  // ── Uninstall ────────────────────────────────────────────────────────────────
  const doUninstall = useCallback(async (skill: MarketSkill) => {
    if (isUninstalling) return
    setIsUninstalling(skill.name)
    try {
      const res = await window.electronAPI?.clawhub?.uninstall(skill.name)
      if (res?.success) {
        toast.success(`"${skill.name}" 已卸载`)
        await loadAll()
      } else {
        toast.error(res?.error ?? '卸载失败')
      }
    } catch (err) {
      toast.error(`卸载失败：${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsUninstalling(null)
    }
  }, [isUninstalling, toast, loadAll])

  // ── Install ClawHub CLI ───────────────────────────────────────────────────
  const handleInstallCli = useCallback(async () => {
    if (clawhubCliInstalling) return
    setClawhubCliInstalling(true)
    try {
      const res = await window.electronAPI?.clawhub?.installCli()
      if (res?.success && res.data?.ok) {
        toast.success('ClawHub CLI 安装成功，技能市场已就绪')
        await loadAll()
      } else {
        toast.error(res?.error ?? 'ClawHub CLI 安装失败')
      }
    } catch (err) {
      toast.error(`安装失败：${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setClawhubCliInstalling(false)
    }
  }, [clawhubCliInstalling, toast, loadAll])

  // ── Browse → merge installed status ─────────────────────────────────────────
  const installedNames = new Set(installedSkills.map(s => s.name))
  const mergedBrowse = browseSkills.map(s => ({
    ...s,
    installed: s.installed || installedNames.has(s.name),
    enabled: installedSkills.find(i => i.name === s.name)?.enabled ?? s.enabled,
    eligible: installedSkills.find(i => i.name === s.name)?.eligible ?? s.eligible,
    missingBins: installedSkills.find(i => i.name === s.name)?.missingBins ?? s.missingBins,
    missingEnv: installedSkills.find(i => i.name === s.name)?.missingEnv ?? s.missingEnv,
    installSpecs: installedSkills.find(i => i.name === s.name)?.installSpecs ?? s.installSpecs,
  }))

  const searchAsMarket = searchResults.map(r => ({
    name: r.name,
    description: r.description,
    emoji: (r as { emoji?: string }).emoji,
    source: (r as { source?: string }).source,
    homepage: (r as { homepage?: string }).homepage,
    installed: installedNames.has(r.name),
    enabled: installedSkills.find(i => i.name === r.name)?.enabled,
    eligible: installedSkills.find(i => i.name === r.name)?.eligible ?? false,
    missingBins: installedSkills.find(i => i.name === r.name)?.missingBins,
    missingEnv: installedSkills.find(i => i.name === r.name)?.missingEnv,
    installSpecs: installedSkills.find(i => i.name === r.name)?.installSpecs,
  }))

  // ── Category tabs ───────────────────────────────────────────────────────────
  const categories = useMemo(() => {
    const cats = new Set<string>()
    mergedBrowse.forEach(s => cats.add(inferCategory(s.name)))
    return ['全部', ...[...cats].sort()]
  }, [mergedBrowse])

  const [activeCategory, setActiveCategory] = useState('全部')
  const filteredBrowse = activeCategory === '全部'
    ? mergedBrowse
    : mergedBrowse.filter(s => inferCategory(s.name) === activeCategory)

  // ── Layout ──────────────────────────────────────────────────────────────────
  const showDetail = viewMode === 'detail' && selectedSkill

  return (
    <div className="pb-10">
      <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
        <Sparkles className="w-5 h-5" style={{ color: 'var(--accent1)' }} />
        技能市场
      </h1>
      <p className="text-sm mt-1 mb-5" style={{ color: 'var(--text-sec)' }}>
        从 ClawHub 发现、安装和同步 AI 技能
      </p>

      <ClawHubBadge
        status={clawhubStatus}
        onInstallCli={handleInstallCli}
        cliInstalling={clawhubCliInstalling}
      />

      {/* Search bar */}
      <form onSubmit={handleSearchSubmit} className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-ter)' }} />
        <input
          ref={searchInputRef}
          type="text"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder="搜索技能名称或功能…"
          className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm border transition-colors"
          style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text)' }}
        />
        {loadingSearch && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" style={{ color: 'var(--text-ter)' }} />
        )}
        {searchInput && !loadingSearch && (
          <button
            type="button"
            onClick={() => { setSearchInput(''); setSearchResults([]); setViewMode('browse') }}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-ter)' }}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </form>

      {/* Content */}
      {showDetail ? (
        <SkillDetailPanel
          skill={selectedSkill}
          onInstall={s => { setInstallTarget(s) }}
          onUninstall={s => doUninstall(s)}
          onBack={() => { setViewMode('browse'); setSelectedSkill(null) }}
          isInstalling={isInstalling}
          isUninstalling={!!isUninstalling}
        />
      ) : (
        <>
          {/* Category tabs (browse mode only) */}
          {viewMode === 'browse' && (
            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
              {categories.map(cat => {
                const Icon = categoryIcon(cat)
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0"
                    style={
                      activeCategory === cat
                        ? { background: 'var(--accent1)', color: '#fff' }
                        : { background: 'var(--bg-elevated)', color: 'var(--text-sec)', border: '1px solid var(--border)' }
                    }
                  >
                    {cat !== '全部' && <Icon className="w-3 h-3" />}
                    {cat}
                  </button>
                )
              })}
              <div className="ml-auto shrink-0">
                <button
                  type="button"
                  onClick={loadAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors"
                  style={{ color: 'var(--text-ter)', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                  title="刷新列表"
                >
                  <RefreshCw className="w-3 h-3" />
                  刷新
                </button>
              </div>
            </div>
          )}

          {/* Installed section */}
          {viewMode === 'browse' && installedSkills.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4" style={{ color: 'var(--success)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>已安装</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'var(--bg-elevated)', color: 'var(--text-ter)' }}>
                  {installedSkills.length}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {installedSkills.map(skill => (
                  <SkillCard
                    key={skill.name}
                    skill={skill}
                    onInstall={s => setInstallTarget(s)}
                    onUninstall={s => doUninstall(s)}
                    onDetail={s => { setSelectedSkill(s); setViewMode('detail') }}
                    isInstalling={isInstalling && installTarget?.name === skill.name}
                    isUninstalling={isUninstalling === skill.name}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Browse / Search grid */}
          {viewMode === 'browse' && (
            <>
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-4 h-4" style={{ color: 'var(--text-sec)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>市场</span>
              </div>
              {loadingBrowse ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-ter)' }} />
                </div>
              ) : filteredBrowse.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filteredBrowse.map(skill => (
                    <SkillCard
                      key={skill.name}
                      skill={skill}
                      onInstall={s => setInstallTarget(s)}
                      onUninstall={s => doUninstall(s)}
                      onDetail={s => { setSelectedSkill(s); setViewMode('detail') }}
                      isInstalling={isInstalling && installTarget?.name === skill.name}
                      isUninstalling={isUninstalling === skill.name}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Package className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-ter)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-ter)' }}>暂无技能</p>
                </div>
              )}
            </>
          )}

          {viewMode === 'search' && (
            <>
              <div className="flex items-center gap-2 mb-3">
                <Search className="w-4 h-4" style={{ color: 'var(--text-sec)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                  搜索 "{searchInput}"
                </span>
                {searchResults.length > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'var(--bg-elevated)', color: 'var(--text-ter)' }}>
                    {searchResults.length}
                  </span>
                )}
              </div>
              {searchResults.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {searchAsMarket.map(skill => (
                    <SkillCard
                      key={skill.name}
                      skill={skill}
                      onInstall={s => setInstallTarget(s)}
                      onUninstall={s => doUninstall(s)}
                      onDetail={s => { setSelectedSkill(s); setViewMode('detail') }}
                      isInstalling={isInstalling && installTarget?.name === skill.name}
                      isUninstalling={isUninstalling === skill.name}
                    />
                  ))}
                </div>
              ) : !loadingSearch ? (
                <div className="py-12 text-center">
                  <Search className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-ter)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-ter)' }}>未找到匹配的技能</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-quaternary)' }}>尝试其他关键词</p>
                </div>
              ) : (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-ter)' }} />
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Install confirmation modal */}
      <AnimatePresence>
        {installTarget && (
          <InstallConfirmModal
            skill={installTarget}
            onConfirm={() => doInstall(installTarget)}
            onCancel={() => setInstallTarget(null)}
            isInstalling={isInstalling}
          />
        )}
      </AnimatePresence>
    </div>
  )
}


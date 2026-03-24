import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Search, Power, Loader2, Package, Globe, Code2, Image, FolderOpen, X, Key, Download, AlertTriangle, RefreshCw } from 'lucide-react'

export interface Skill {
  name: string
  description: string
  enabled: boolean
  category?: string
  apiKey?: string
  version?: string
  /** Warning message, e.g. missing dependencies */
  warn?: string | null
}

interface SkillsPanelProps {
  onSkillSelect?: (skill: Skill) => void
}

const categoryIcons: Record<string, typeof FolderOpen> = {
  '文件': FolderOpen,
  '文件管理': FolderOpen,
  '开发': Code2,
  '代码': Code2,
  '搜索': Globe,
  '搜索工具': Globe,
  '创意': Image,
  '图像': Image,
  '其他': Package,
}

/**
 * Absolute fallback — only shown when OpenClaw is completely unavailable
 * (offline mode, Gateway disconnected, or development mode without backend).
 */
const FALLBACK_SKILLS: Skill[] = [
  {
    name: '1password',
    description: '配置 1Password CLI (op) 并与桌面应用集成，供 Agent 安全读取密钥片段。',
    enabled: true,
    category: '其他',
    version: '1.0.0',
  },
  {
    name: 'session-logs',
    description: '使用 jq 等工具检索、分析会话日志，便于排查问题。',
    enabled: true,
    category: '开发',
    version: '1.0.0',
    warn: '缺少可执行文件: rg',
  },
  {
    name: 'skill-creator',
    description: '指导为 Claude 编写高质量 Skill 的说明与模板。',
    enabled: true,
    category: '其他',
    version: '1.0.0',
  },
  {
    name: 'tmux',
    description: '远程控制 tmux 会话并抓取 pane 输出。',
    enabled: false,
    category: '开发',
    version: '1.0.0',
  },
]

export function SkillsPanel({ onSkillSelect }: SkillsPanelProps) {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)
  const [openclawStatus, setOpenclawStatus] = useState<'connected' | 'disconnected' | 'starting'>('disconnected')
  const [showInstallModal, setShowInstallModal] = useState(false)
  const [installInput, setInstallInput] = useState('')
  const [installApiKey, setInstallApiKey] = useState('')
  const [installError, setInstallError] = useState<string | null>(null)
  const [installing, setInstalling] = useState(false)
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [toggling, setToggling] = useState<string | null>(null)

  // Load OpenClaw connection status
  const loadOpenClawStatus = useCallback(async () => {
    try {
      setOpenclawStatus('starting')
      const status = await window.openclaw?.getStatus()
      setOpenclawStatus(status === 'connected' ? 'connected' : 'disconnected')
    } catch {
      setOpenclawStatus('disconnected')
    }
  }, [])

  // Load skills from OpenClaw API
  const loadSkills = useCallback(async () => {
    if (!window.openclaw) {
      // No OpenClaw available — use absolute fallback
      setSkills(FALLBACK_SKILLS)
      setLoading(false)
      return
    }

    setLoading(true)
    setFetchError(null)

    try {
      const result = await window.openclaw.skills.status()

      if (result?.success && result?.data) {
        const skillsData = result.data as Skill[]
        // Normalize each skill with a category (infer if missing)
        setSkills(skillsData.map(skill => ({
          ...skill,
          category: skill.category || inferCategory(skill.name),
        })))
      } else {
        // API returned but data was unexpected — fall back to static list
        setSkills(FALLBACK_SKILLS)
      }
    } catch (error) {
      console.error('[SkillsPanel] Failed to load skills:', error)
      setFetchError('加载技能列表失败，请检查 Gateway 连接后重试。')
      // Keep fallback visible so UI is not empty
      setSkills(FALLBACK_SKILLS)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOpenClawStatus()
    loadSkills()

    const unsub = window.openclaw?.on((e) => {
      const { event } = e

      switch (event) {
        case 'skill:installed':
        case 'skill:status-changed':
          loadSkills()
          break
        case 'openclaw:statusChange':
          loadOpenClawStatus()
          break
      }
    })

    return () => { unsub?.() }
  }, [loadSkills, loadOpenClawStatus])

  function inferCategory(name: string): string {
    const lower = name.toLowerCase()
    if (lower.includes('file') || lower.includes('文件') || lower.includes('folder')) return '文件'
    if (lower.includes('code') || lower.includes('代码') || lower.includes('dev')) return '开发'
    if (lower.includes('search') || lower.includes('搜索') || lower.includes('web')) return '搜索'
    if (lower.includes('image') || lower.includes('图像') || lower.includes('art')) return '创意'
    return '其他'
  }

  async function toggleSkill(skill: Skill) {
    if (toggling) return
    setToggling(skill.name)
    try {
      await window.openclaw?.skills.update({ skillKey: skill.name, enabled: !skill.enabled })
      await loadSkills()
    } catch (error) {
      console.error('[SkillsPanel] Failed to toggle skill:', error)
    } finally {
      setToggling(null)
    }
  }

  async function handleInstallSkill() {
    const trimmed = installInput.trim()
    if (!trimmed) {
      setInstallError('请输入技能名称或安装 ID')
      return
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      setInstallError('技能名称只能包含字母、数字、下划线和连字符')
      return
    }

    setInstalling(true)
    setInstallError(null)

    try {
      await window.openclaw?.skills.install({
        installId: trimmed,
        ...(installApiKey.trim() ? { apiKey: installApiKey.trim() } : {}),
      })
      setShowInstallModal(false)
      setInstallInput('')
      setInstallApiKey('')
      await loadSkills()
    } catch (error) {
      console.error('[SkillsPanel] Failed to install skill:', error)
      setInstallError('安装失败，请检查技能名称或网络连接后重试')
    } finally {
      setInstalling(false)
    }
  }

  function openInstallModal() {
    setInstallInput('')
    setInstallApiKey('')
    setInstallError(null)
    setShowInstallModal(true)
  }

  function handleOpenApiKeyModal(skill: Skill) {
    setSelectedSkill(skill)
    setApiKeyInput(skill.apiKey || '')
    setShowApiKeyModal(true)
  }

  async function handleSaveApiKey() {
    if (!selectedSkill) return
    
    try {
      await window.openclaw?.skills.update({
        skillKey: selectedSkill.name,
        apiKey: apiKeyInput.trim() || undefined
      })
      setShowApiKeyModal(false)
      await loadSkills()
    } catch (error) {
      console.error('保存 API Key 失败:', error)
    }
  }

  const filteredSkills = skills.filter(skill =>
    skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    skill.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const groupedSkills = filteredSkills.reduce((acc, skill) => {
    const category = skill.category || '其他'
    if (!acc[category]) acc[category] = []
    acc[category].push(skill)
    return acc
  }, {} as Record<string, Skill[]>)

  return (
    <div className="w-72 glass-light flex flex-col h-full border-r border-aurora-border">
      {/* Header */}
      <div className="p-4 border-b border-aurora-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-cyan/20 to-accent-violet/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-accent-cyan" />
            </div>
            <span className="font-display font-semibold text-white">技能</span>
          </div>
          
          {/* OpenClaw Status Indicator */}
          <div className="flex items-center gap-1.5">
            {openclawStatus === 'connected' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-emerald-400">已连接</span>
              </motion.div>
            )}
            {openclawStatus === 'starting' && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
                <span className="text-[10px] text-amber-400">启动中</span>
              </div>
            )}
            {openclawStatus === 'disconnected' && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-700/30 border border-slate-600/20">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                <span className="text-[10px] text-slate-500">离线</span>
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="搜索技能..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-aurora-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent-cyan/30 transition-colors"
          />
        </div>
      </div>

      {/* Skills List */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-8 h-8 border-2 border-accent-cyan/30 border-t-accent-cyan rounded-full"
            />
            <span className="text-slate-500 text-sm">加载技能中...</span>
          </div>
        ) : fetchError ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4 text-center px-4">
            <AlertTriangle className="w-10 h-10 text-amber-500" />
            <p className="text-slate-400 text-sm">{fetchError}</p>
            <button
              onClick={loadSkills}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-700/50 text-slate-300 text-sm hover:bg-slate-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              重试
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {Object.entries(groupedSkills).map(([category, categorySkills]) => {
              const Icon = categoryIcons[category] || Package

              return (
                <div key={category}>
                  <div className="flex items-center gap-2 text-xs text-slate-500 px-1 mb-3 uppercase tracking-wider">
                    <Icon className="w-3.5 h-3.5" />
                    {category}
                    <span className="ml-auto text-slate-600 normal-case tracking-normal">
                      {categorySkills.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {categorySkills.map((skill, index) => {
                      const isToggling = toggling === skill.name

                      return (
                        <motion.button
                          key={skill.name}
                          onClick={() => {
                            setSelectedSkill(skill)
                            onSkillSelect?.(skill)
                          }}
                          whileHover={{ scale: 1.01, x: 2 }}
                          whileTap={{ scale: 0.99 }}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={`w-full text-left p-3 rounded-xl transition-all relative overflow-hidden ${
                            selectedSkill?.name === skill.name
                              ? 'bg-gradient-to-r from-accent-cyan/10 to-accent-violet/5 border border-accent-cyan/20'
                              : 'bg-white/5 border border-transparent hover:bg-white/10 hover:border-aurora-borderLight'
                          }`}
                        >
                          <div className="flex items-center justify-between relative z-10">
                            <div className="min-w-0 flex-1 mr-2">
                              <div className="font-medium text-white text-sm truncate">{skill.name}</div>
                              {skill.version && (
                                <div className="text-slate-600 text-[10px] mt-0.5">v{skill.version}</div>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {/* API Key config button */}
                              <motion.button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleOpenApiKeyModal(skill)
                                }}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-500/10 transition-colors"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                title="配置 API Key"
                              >
                                <Key className="w-4 h-4" />
                              </motion.button>
                              {/* Enable/Disable toggle */}
                              <motion.button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleSkill(skill)
                                }}
                                disabled={isToggling}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  skill.enabled
                                    ? 'text-emerald-400 hover:bg-emerald-400/10'
                                    : 'text-slate-500 hover:bg-slate-500/10'
                                } ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                title={skill.enabled ? '点击禁用' : '点击启用'}
                              >
                                {isToggling ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Power className={`w-4 h-4 ${skill.enabled ? 'fill-current' : ''}`} />
                                )}
                              </motion.button>
                            </div>
                          </div>
                          <div className="text-slate-400 text-xs mt-1.5 line-clamp-2 relative z-10">
                            {skill.description}
                          </div>
                          {/* Warning badge */}
                          {skill.warn && (
                            <div className="flex items-center gap-1 mt-2 relative z-10">
                              <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                              <span className="text-amber-500 text-[10px]">{skill.warn}</span>
                            </div>
                          )}
                          {/* Status badge */}
                          <div className="flex items-center gap-1.5 mt-2 relative z-10">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                                skill.enabled
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : 'bg-slate-700/50 text-slate-500'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  skill.enabled ? 'bg-emerald-400' : 'bg-slate-500'
                                }`}
                              />
                              {skill.enabled ? '已启用' : '已禁用'}
                            </span>
                          </div>
                        </motion.button>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {filteredSkills.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-800/50 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-slate-600" />
                </div>
                <p className="text-slate-500 text-sm">没有找到匹配的技能</p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-2 text-accent-cyan text-xs hover:underline"
                  >
                    清除搜索
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Action */}
      <div className="p-3 border-t border-aurora-border">
        <motion.button
          onClick={openInstallModal}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-accent-cyan/20 to-accent-violet/20 text-accent-cyan hover:from-accent-cyan/30 hover:to-accent-violet/30 border border-accent-cyan/20 transition-all text-sm font-medium"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Download className="w-4 h-4" />
          <span>安装新技能</span>
        </motion.button>
      </div>

      {/* Install Modal */}
      <AnimatePresence>
        {showInstallModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowInstallModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-aurora-surface border border-aurora-border rounded-2xl p-6 w-80"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">安装技能</h3>
                <button
                  onClick={() => setShowInstallModal(false)}
                  className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <p className="text-sm text-slate-400 mb-4">
                输入技能名称或安装 ID 来安装新技能
              </p>

              <div className="mb-3">
                <input
                  type="text"
                  value={installInput}
                  onChange={(e) => {
                    setInstallInput(e.target.value)
                    setInstallError(null)
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleInstallSkill()}
                  placeholder="例如: claude-api, openai-search"
                  className="w-full px-3 py-2.5 rounded-xl bg-aurora-bg border border-aurora-border text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-cyan/40 text-sm"
                  autoFocus
                />
              </div>

              {/* Optional API Key */}
              <div className="mb-4">
                <label className="text-xs text-slate-500 mb-1.5 block">
                  API Key <span className="text-slate-600">(可选)</span>
                </label>
                <input
                  type="password"
                  value={installApiKey}
                  onChange={(e) => setInstallApiKey(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInstallSkill()}
                  placeholder="如有需要，输入 API Key"
                  className="w-full px-3 py-2.5 rounded-xl bg-aurora-bg border border-aurora-border text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-cyan/40 text-sm"
                />
              </div>

              {/* Validation error */}
              {installError && (
                <div className="flex items-center gap-1.5 mb-3 text-amber-400 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {installError}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setShowInstallModal(false)}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-white/10 text-slate-300 text-sm hover:bg-white/15 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleInstallSkill}
                  disabled={!installInput.trim() || installing}
                  className="flex-1 flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-accent-cyan to-accent-violet text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {installing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>安装中...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>安装</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* API Key Modal */}
      {showApiKeyModal && selectedSkill && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowApiKeyModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-aurora-surface border border-aurora-border rounded-2xl p-6 w-80"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">配置 API Key</h3>
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <p className="text-sm text-slate-400 mb-2">
              为「{selectedSkill.name}」配置 API Key
            </p>
            <p className="text-xs text-slate-500 mb-4">
              API Key 将加密存储，仅用于调用对应的第三方服务
            </p>
            
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveApiKey()}
              placeholder="输入 API Key"
              className="w-full px-3 py-2.5 rounded-xl bg-aurora-bg border border-aurora-border text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-cyan/40 text-sm mb-4"
              autoFocus
            />
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="flex-1 px-3.5 py-2 rounded-xl bg-white/10 text-slate-300 text-sm hover:bg-white/15 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveApiKey}
                className="flex-1 px-3.5 py-2 rounded-xl bg-gradient-to-r from-accent-cyan to-accent-violet text-white text-sm font-medium"
              >
                保存
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}

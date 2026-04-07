/**
 * CommandPalette — 快捷命令面板
 * 触发: Cmd/Ctrl + K
 * 功能: 快速执行命令（新建会话、切换模型、运行技能等）
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { useAppStore } from '../stores/appStore'

interface Command {
  id: string
  label: string
  description: string
  category: '会话' | '模型' | '技能' | '记忆' | '设置' | '工具' | '导航'
  icon: string
  action: () => void
  shortcut?: string
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  onOpenSettings?: (section: string) => void
}

export function CommandPalette({ isOpen, onClose, onOpenSettings }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [availableModels, setAvailableModels] = useState<{ id: string; name: string }[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const setActiveView = useAppStore(s => s.setActiveView)
  const setActiveTab = useAppStore(s => s.setActiveTab)
  const toggleRightPanel = useAppStore(s => s.toggleRightPanel)

  const handleSettings = useCallback((section: string) => {
    if (onOpenSettings) {
      onOpenSettings(section)
    }
  }, [onOpenSettings])

  const baseCommands: Command[] = [
    // 会话
    {
      id: 'new-chat',
      label: '新建会话',
      description: '开启新的对话会话',
      category: '会话',
      icon: '💬',
      action: () => {
        setActiveView('chat')
        setActiveTab('chat')
        onClose()
      },
      shortcut: '⌘N',
    },
    {
      id: 'reset-session',
      label: '重置当前会话',
      description: '清除上下文，重新开始对话',
      category: '会话',
      icon: '🔄',
      action: async () => {
        try {
          await window.openclaw?.sessions.reset({})
          window.location.reload()
        } catch { /* ignore */ }
        onClose()
      },
    },
    {
      id: 'compact-session',
      label: '压缩会话',
      description: '压缩历史消息，节省上下文空间',
      category: '会话',
      icon: '📦',
      action: async () => {
        await window.openclaw?.sessions.compact()
        onClose()
      },
    },
    {
      id: 'clear-history',
      label: '清空会话历史',
      description: '删除所有会话记录',
      category: '会话',
      icon: '🗑',
      action: async () => {
        const res = await window.openclaw?.sessions.list()
        if (res?.success && Array.isArray(res.data)) {
          const sessions = res.data as Array<{ id?: string }>
          for (const s of sessions) {
            if (s.id) {
              await window.openclaw?.sessions.delete({ id: s.id })
            }
          }
        }
        onClose()
      },
    },
    // 导航
    {
      id: 'nav-chat',
      label: '切换到对话',
      description: '打开对话视图',
      category: '导航',
      icon: '💬',
      action: () => {
        setActiveView('chat')
        setActiveTab('chat')
        onClose()
      },
    },
    {
      id: 'nav-avatars',
      label: '切换到分身',
      description: '打开分身管理',
      category: '导航',
      icon: '🤖',
      action: () => {
        setActiveTab('avatar')
        onClose()
      },
    },
    {
      id: 'nav-tasks',
      label: '切换到任务',
      description: '打开定时任务管理',
      category: '导航',
      icon: '⏰',
      action: () => {
        setActiveTab('task')
        onClose()
      },
    },
    {
      id: 'nav-right-panel',
      label: '切换上下文面板',
      description: '打开/关闭右侧上下文面板',
      category: '导航',
      icon: '📋',
      action: () => {
        toggleRightPanel()
        onClose()
      },
    },
    // 技能
    {
      id: 'skills-panel',
      label: '技能管理',
      description: '查看、安装、配置技能',
      category: '技能',
      icon: '🛠',
      action: () => handleSettings('skills'),
    },
    {
      id: 'skills-market-panel',
      label: '技能市场',
      description: '浏览、安装 ClawHub 技能',
      category: '技能',
      icon: '🛒',
      action: () => handleSettings('skillsMarket'),
    },
    // 记忆
    {
      id: 'memory-panel',
      label: '记忆管理',
      description: '浏览、搜索、删除 AI 记忆',
      category: '记忆',
      icon: '🧠',
      action: () => handleSettings('memory'),
    },
    {
      id: 'memory-save',
      label: '保存当前对话到记忆',
      description: '将重要信息存入长期记忆',
      category: '记忆',
      icon: '💾',
      action: async () => {
        await window.openclaw?.memory.store({
          type: 'summary',
          content: '用户通过快捷命令保存了对话摘要',
        })
        onClose()
      },
    },
    // 设置
    {
      id: 'settings-general',
      label: '通用设置',
      description: '主题、动画、通知等',
      category: '设置',
      icon: '⚙️',
      action: () => handleSettings('general'),
    },
    {
      id: 'settings-models',
      label: '模型与 API 设置',
      description: '切换模型、配置 API 参数',
      category: '设置',
      icon: '🤖',
      action: () => handleSettings('models'),
    },
    {
      id: 'settings-gateway',
      label: 'Gateway 设置',
      description: 'Gateway 连接状态与配置',
      category: '设置',
      icon: '🔗',
      action: () => handleSettings('gateway'),
    },
    {
      id: 'settings-privacy',
      label: '数据与隐私',
      description: '管理本地数据与隐私选项',
      category: '设置',
      icon: '🔒',
      action: () => handleSettings('privacy'),
    },
    {
      id: 'settings-usage',
      label: '用量统计',
      description: '查看 Token 用量与积分消耗',
      category: '设置',
      icon: '📊',
      action: () => handleSettings('usage'),
    },
    {
      id: 'settings-points',
      label: '积分充值',
      description: '查看积分余额和充值入口',
      category: '设置',
      icon: '🪙',
      action: () => handleSettings('points'),
    },
    {
      id: 'settings-feedback',
      label: '提交反馈',
      description: '报告问题或建议新功能',
      category: '设置',
      icon: '💬',
      action: () => handleSettings('feedback'),
    },
    // 工具
    {
      id: 'mcp-services',
      label: 'MCP 服务',
      description: '管理 MCP 工具服务',
      category: '工具',
      icon: '🔌',
      action: () => handleSettings('mcp'),
    },
    {
      id: 'hooks-automation',
      label: '自动化钩子',
      description: '配置事件触发钩子',
      category: '工具',
      icon: '⚡',
      action: () => handleSettings('hooks'),
    },
  ]

  // Build dynamic model switch commands
  const modelCommands: Command[] = availableModels.map(m => ({
    id: `model-${m.id}`,
    label: `切换模型: ${m.name}`,
    description: `切换到 ${m.name} 模型`,
    category: '模型' as const,
    icon: '🤖',
    action: async () => {
      await window.openclaw?.models.setCurrent({ modelId: m.id })
      onClose()
    },
  }))

  const commands = [...baseCommands, ...modelCommands]

  const filteredCommands = query.trim()
    ? commands.filter(cmd =>
        cmd.label.toLowerCase().includes(query.toLowerCase()) ||
        cmd.description.toLowerCase().includes(query.toLowerCase()) ||
        cmd.category.toLowerCase().includes(query.toLowerCase())
      )
    : commands

  // Load available models for dynamic commands
  useEffect(() => {
    if (!isOpen) return
    const load = async () => {
      if (window.openclaw) {
        try {
          const modelsRes = await window.openclaw.models.list()
          if (modelsRes.success && Array.isArray(modelsRes.data)) {
            setAvailableModels(modelsRes.data as { id: string; name: string }[])
          }
        } catch { /* ignore */ }
      }
    }
    load()
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const executeCommand = useCallback((cmd: Command) => {
    cmd.action()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredCommands[selectedIndex]) {
        executeCommand(filteredCommands[selectedIndex])
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const item = list.children[selectedIndex] as HTMLElement
    if (item) {
      item.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  if (!isOpen) return null

  const categoryOrder = ['导航', '会话', '模型', '技能', '记忆', '设置', '工具']
  const grouped = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = []
    acc[cmd.category].push(cmd)
    return acc
  }, {} as Record<string, Command[]>)

  const sortedCategories = [
    ...categoryOrder.filter(c => grouped[c]),
    ...Object.keys(grouped).filter(c => !categoryOrder.includes(c)),
  ]

  const flatList = sortedCategories.flatMap(cat => grouped[cat])

  return (
    <div
      className="fixed inset-0 z-[300] flex items-start justify-center pt-[15vh]"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-xl rounded-[14px] overflow-hidden shadow-2xl border"
        style={{
          background: 'var(--bg-container)',
          borderColor: 'var(--border)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
        }}
        onMouseDown={e => e.stopPropagation()}
      >
        <div
          className="flex items-center gap-3 px-4 py-3.5 border-b"
          style={{ borderColor: 'var(--border-secondary)' }}
        >
          <span style={{ color: 'var(--text-ter)' }}>🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入命令或搜索… (↑↓ 导航，↵ 执行)"
            className="flex-1 text-sm outline-none bg-transparent"
            style={{ color: 'var(--text)' }}
          />
          <kbd
            className="text-xs px-1.5 py-0.5 rounded border"
            style={{ borderColor: 'var(--border)', color: 'var(--text-ter)' }}
          >
            Esc
          </kbd>
        </div>

        <div
          ref={listRef}
          className="max-h-80 overflow-y-auto py-2"
        >
          {flatList.length === 0 && (
            <div className="text-center py-8 text-sm" style={{ color: 'var(--text-ter)' }}>
              未找到匹配的命令
            </div>
          )}

          {sortedCategories.map(cat => {
            const catCommands = grouped[cat]
            if (!catCommands?.length) return null

            return (
              <div key={cat}>
                <div
                  className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-ter)' }}
                >
                  {cat}
                  <span className="ml-1 font-normal normal-case tracking-normal opacity-60">{catCommands.length}</span>
                </div>
                {catCommands.map((cmd) => {
                  const globalIndex = flatList.indexOf(cmd)
                  const isSelected = globalIndex === selectedIndex

                  return (
                    <button
                      key={cmd.id}
                      type="button"
                      onClick={() => executeCommand(cmd)}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                      style={{
                        background: isSelected ? 'rgba(0,0,0,0.05)' : 'transparent',
                        color: 'var(--text)',
                      }}
                    >
                      <span className="text-base w-7 text-center shrink-0">{cmd.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{cmd.label}</span>
                          {cmd.shortcut && (
                            <kbd
                              className="text-[10px] px-1.5 py-0.5 rounded border shrink-0"
                              style={{ borderColor: 'var(--border)', color: 'var(--text-ter)' }}
                            >
                              {cmd.shortcut}
                            </kbd>
                          )}
                        </div>
                        <p className="text-xs truncate" style={{ color: 'var(--text-sec)' }}>
                          {cmd.description}
                        </p>
                      </div>
                      {isSelected && (
                        <span className="text-xs shrink-0" style={{ color: 'var(--text-ter)' }}>
                          ↵
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>

        <div
          className="flex items-center gap-4 px-4 py-2 border-t text-[10px]"
          style={{
            borderColor: 'var(--border-secondary)',
            color: 'var(--text-ter)',
          }}
        >
          <span>↑↓ 导航</span>
          <span>↵ 执行</span>
          <span>Esc 关闭</span>
          {flatList.length > 0 && (
            <span className="ml-auto">{flatList.length} 个命令</span>
          )}
        </div>
      </div>
    </div>
  )
}

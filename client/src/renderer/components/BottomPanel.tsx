/**
 * 底部面板：Terminal / Output / Details 三个 tab
 * Terminal tab 监听 task:log-line 事件，追加日志行到终端
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '../stores/appStore'
import { useTaskStore } from '../stores/taskStore'
import { ChevronUp, ChevronDown, Copy, Trash2, Search, X } from 'lucide-react'

type TabId = 'terminal' | 'output' | 'details'

interface TerminalLine {
  id: string
  timestamp: Date
  content: string
  type?: 'info' | 'warn' | 'error' | 'success'
}

const tabs: { id: TabId; label: string }[] = [
  { id: 'terminal', label: '终端' },
  { id: 'output', label: '输出' },
  { id: 'details', label: '详情' }
]

const MAX_TERMINAL_LINES = 500

/** Highlight matching text with background color */
function HighlightedText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim()) return <>{text}</>
  const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} style={{ background: 'rgba(252,93,30,0.3)', borderRadius: 2, padding: '0 1px' }}>{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

export function BottomPanel() {
  const { bottomPanelOpen, setBottomPanelOpen, bottomPanelHeight, setBottomPanelHeight } = useAppStore()
  const { selectedTaskId } = useTaskStore()
  const tasks = useTaskStore(s => s.tasks)
  const selectedTask = tasks.find(t => t.id === selectedTaskId) || null
  const [activeTab, setActiveTab] = useState<TabId>('terminal')
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([
    { id: '1', timestamp: new Date(), content: '> SynClaw 已就绪', type: 'info' },
    { id: '2', timestamp: new Date(), content: '> 等待任务执行...', type: 'info' }
  ])
  const [outputFiles, setOutputFiles] = useState<{ created: string[]; modified: string[] }>({ created: [], modified: [] })
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchMatchCount, setSearchMatchCount] = useState(0)
  const terminalRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const isDragging = useRef(false)
  const startY = useRef(0)
  const startHeight = useRef(0)

  // Subscribe to terminal output events
  useEffect(() => {
    if (!window.openclaw) return
    const unsubTaskLog = window.openclaw!.on((event) => {
      // Handle task:log-line event
      if (event.event === 'task:log-line') {
        const payload = event.payload as { line?: string; content?: string; level?: string }
        const lineContent = payload.line || payload.content || ''
        if (lineContent) {
          const lineType = getLineType(payload.level)
          setTerminalLines((prev) => {
            const newLine: TerminalLine = {
              id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              timestamp: new Date(),
              content: lineContent,
              type: lineType,
            }
            const newLines = [...prev, newLine]
            // Trim to max lines
            if (newLines.length > MAX_TERMINAL_LINES) {
              return newLines.slice(-MAX_TERMINAL_LINES)
            }
            return newLines
          })
        }
      }

      // Also handle terminal:output event
      if (event.event === 'terminal:output') {
        const payload = event.payload as { output?: string; content?: string }
        const output = payload.output || payload.content || ''
        if (output) {
          const newLine: TerminalLine = {
            id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            timestamp: new Date(),
            content: output,
            type: 'info',
          }
          setTerminalLines((prev) => {
            const newLines = [...prev, newLine]
            if (newLines.length > MAX_TERMINAL_LINES) {
              return newLines.slice(-MAX_TERMINAL_LINES)
            }
            return newLines
          })
        }
      }

      // Handle task:log for bulk logs
      if (event.event === 'task:log') {
        const payload = event.payload as { logs?: string[]; content?: string[] }
        const logs = payload.logs || payload.content || []
        if (logs.length > 0) {
          const newLines = logs.map((log, index) => ({
            id: `line-${Date.now()}-${index}`,
            timestamp: new Date(),
            content: typeof log === 'string' ? log : JSON.stringify(log),
            type: 'info' as const,
          }))
          setTerminalLines((prev) => {
            const combined = [...prev, ...newLines]
            if (combined.length > MAX_TERMINAL_LINES) {
              return combined.slice(-MAX_TERMINAL_LINES)
            }
            return combined
          })
        }
      }

      // Handle task:completed to populate Output tab with real file data
      if (event.event === 'task:completed') {
        const payload = event.payload as { created?: string[]; modified?: string[]; files?: { created?: string[]; modified?: string[] } }
        let created: string[] = []
        let modified: string[] = []
        if (payload.files) {
          created = payload.files.created || []
          modified = payload.files.modified || []
        } else {
          created = payload.created || []
          modified = payload.modified || []
        }
        if (created.length > 0 || modified.length > 0) {
          setOutputFiles({ created, modified })
        }
      }
    })

    return () => {
      unsubTaskLog()
    }
  }, [])

  // Filtered terminal lines based on search query
  const filteredLines = searchQuery.trim()
    ? terminalLines.filter(line => line.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : terminalLines

  // Update match count when search changes
  useEffect(() => {
    if (searchQuery.trim()) {
      const count = terminalLines.filter(l => l.content.toLowerCase().includes(searchQuery.toLowerCase())).length
      setSearchMatchCount(count)
    } else {
      setSearchMatchCount(0)
    }
  }, [searchQuery, terminalLines])

  // Auto-scroll to bottom when new lines are added (only if not searching)
  useEffect(() => {
    if (terminalRef.current && !searchQuery.trim()) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [terminalLines, searchQuery])

  // Drag to resize — use refs to track active listeners so we never double-register
  const moveListenerRef = useRef<((ev: Event) => void) | null>(null)
  const upListenerRef = useRef<(() => void) | null>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Remove any existing listeners before adding new ones
    if (moveListenerRef.current) document.removeEventListener('mousemove', moveListenerRef.current)
    if (upListenerRef.current) document.removeEventListener('mouseup', upListenerRef.current)

    isDragging.current = true
    startY.current = e.clientY
    startHeight.current = bottomPanelHeight

    const onMove = (ev: Event) => {
      if (!isDragging.current) return
      const mouseEv = ev as unknown as MouseEvent
      const delta = startY.current - mouseEv.clientY
      const newHeight = Math.min(Math.max(startHeight.current + delta, 100), 500)
      setBottomPanelHeight(newHeight)
    }

    const onUp = () => {
      isDragging.current = false
      document.removeEventListener('mousemove', onMove as EventListener)
      document.removeEventListener('mouseup', onUp as EventListener)
      moveListenerRef.current = null
      upListenerRef.current = null
    }

    moveListenerRef.current = onMove
    upListenerRef.current = onUp
    document.addEventListener('mousemove', onMove as EventListener)
    document.addEventListener('mouseup', onUp as EventListener)
  }, [bottomPanelHeight])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (moveListenerRef.current) document.removeEventListener('mousemove', moveListenerRef.current as EventListener)
      if (upListenerRef.current) document.removeEventListener('mouseup', upListenerRef.current as EventListener)
    }
  }, [])

  // Copy terminal output
  const handleCopy = useCallback(() => {
    const text = terminalLines.map((line) => line.content).join('\n')
    navigator.clipboard.writeText(text)
  }, [terminalLines])

  // Clear terminal
  const handleClear = useCallback(() => {
    setTerminalLines([{ id: '1', timestamp: new Date(), content: '> SynClaw 已就绪', type: 'info' }])
  }, [])

  // Get line type based on level
  function getLineType(level?: string): 'info' | 'warn' | 'error' | 'success' {
    if (!level) return 'info'
    const lower = level.toLowerCase()
    if (lower.includes('warn') || lower.includes('warning')) return 'warn'
    if (lower.includes('err')) return 'error'
    if (lower.includes('success') || lower.includes('done') || lower.includes('complete')) return 'success'
    return 'info'
  }

  // Format timestamp
  function formatTime(date: Date): string {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  // Scroll to top when searching
  useEffect(() => {
    if (searchQuery && terminalRef.current) {
      terminalRef.current.scrollTop = 0
    }
  }, [searchQuery])

  if (!bottomPanelOpen) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="border-t border-aurora-border bg-aurora-surface/50"
      >
        <button
          type="button"
          onClick={() => setBottomPanelOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-3 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/50 min-h-[44px]"
        >
          <ChevronUp className="w-4 h-4" />
          <span className="text-xs">展开面板</span>
        </button>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="border-t border-aurora-border flex flex-col bg-aurora-surface"
      style={{ height: bottomPanelHeight }}
    >
      <div
        className="h-1.5 cursor-ns-resize hover:bg-accent-cyan/30 transition-colors flex-shrink-0"
        onMouseDown={handleMouseDown}
        aria-label="拖拽调整高度"
      />
      <div className="flex items-center justify-between px-4 py-2 border-b border-aurora-border flex-shrink-0">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/50 min-h-[40px] ${
                activeTab === tab.id
                  ? 'bg-white/10 text-white'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSearchFocused(v => !v)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/50 min-w-[44px] min-h-[44px] flex items-center justify-center"
            title={searchFocused ? '关闭搜索' : '搜索日志'}
            aria-label="搜索日志"
            style={{ color: searchFocused ? 'var(--accent-cyan)' : undefined }}
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/50 min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="清空"
            aria-label="清空终端"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="复制"
            aria-label="复制"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setBottomPanelOpen(false)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="收起面板"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'terminal' && (
          <>
            {/* Search bar */}
            {searchFocused && (
              <div className="px-4 py-2 border-b border-aurora-border flex items-center gap-2 flex-shrink-0">
                <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  placeholder="搜索日志内容..."
                  className="flex-1 bg-transparent text-xs outline-none text-slate-300 placeholder-slate-600"
                  autoFocus
                />
                {searchQuery && (
                  <span className="text-[10px] text-slate-500 shrink-0">
                    {searchMatchCount} 个匹配
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setSearchFocused(false) }}
                  className="p-1 rounded hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <div
              ref={terminalRef}
              className="flex-1 p-4 font-mono text-sm overflow-y-auto bg-aurora-bg"
            >
              {filteredLines.length === 0 && searchQuery && (
                <div className="text-center text-slate-600 py-8">
                  未找到匹配的日志
                </div>
              )}
              {filteredLines.map((line) => (
                <div
                  key={line.id}
                  className="py-0.5 flex gap-2"
                >
                  <span className="text-slate-600 flex-shrink-0">
                    [{formatTime(line.timestamp)}]
                  </span>
                  <span
                    className={
                      line.type === 'error' ? 'text-red-400' :
                      line.type === 'warn' ? 'text-yellow-400' :
                      line.type === 'success' ? 'text-green-400' :
                      'text-slate-400'
                    }
                  >
                    {searchQuery && line.content.toLowerCase().includes(searchQuery.toLowerCase()) ? (
                      <HighlightedText text={line.content} highlight={searchQuery} />
                    ) : (
                      line.content
                    )}
                  </span>
                </div>
              ))}
              {!searchQuery && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-accent-cyan">$</span>
                  <span className="animate-pulse">▋</span>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'output' && (
          <div className="h-full p-4 overflow-y-auto">
            {selectedTask ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">生成的文件</h4>
                  <div className="space-y-1">
                    {outputFiles.created.length > 0 ? (
                      outputFiles.created.map((file, i) => (
                        <div key={`c-${i}`} className="text-sm text-slate-300 py-1 px-2 rounded bg-white/5 truncate">
                          {file}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-600">暂无生成文件</p>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">修改的文件</h4>
                  <div className="space-y-1">
                    {outputFiles.modified.length > 0 ? (
                      outputFiles.modified.map((file, i) => (
                        <div key={`m-${i}`} className="text-sm text-slate-300 py-1 px-2 rounded bg-white/5 truncate">
                          {file}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-600">暂无修改文件</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500">
                <p>选择任务查看输出</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'details' && (
          <div className="h-full p-4 overflow-y-auto">
            {selectedTask ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">创建时间</h4>
                  <p className="text-sm text-slate-300">
                    {new Date(selectedTask.createdAt).toLocaleString('zh-CN')}
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">更新时间</h4>
                  <p className="text-sm text-slate-300">
                    {new Date(selectedTask.updatedAt).toLocaleString('zh-CN')}
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">任务 ID</h4>
                  <p className="text-sm text-slate-500 font-mono">{selectedTask.id}</p>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500">
                <p>选择任务查看详情</p>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

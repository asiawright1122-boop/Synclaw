/**
 * SynClaw — AutoClaw 主布局 + 设置弹窗
 */

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from './stores/appStore'
import { useSettingsStore } from './stores/settingsStore'
import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'
import { ChatView } from './components/ChatView'
import { SettingsView } from './components/SettingsView'
import { CommandPalette } from './components/CommandPalette'
import { GlobalSearch } from './components/GlobalSearch'
import { ContextMenu, useContextMenu } from './components/ContextMenu'
import { ToastContainer } from './components/Toast'
import { OnboardingView } from './components/OnboardingView'
import { ExecApprovalModal } from './components/ExecApprovalModal'
import { X, Keyboard } from 'lucide-react'

function ShortcutsModal({ onClose }: { onClose: () => void }) {
  const shortcuts = [
    { keys: '⌘ + ,', description: '打开设置' },
    { keys: '⌘ + K', description: '命令面板' },
    { keys: '⌘ + ⇧ + F', description: '全局搜索' },
    { keys: '⌘ + ⇧ + S', description: '收起 / 展开侧栏' },
    { keys: '⌘ + /', description: '快捷键参考' },
    { keys: 'Esc', description: '关闭弹窗（从外向内）' },
    { keys: 'Enter', description: '发送消息' },
    { keys: '⇧ + Enter', description: '输入框内换行' },
  ]

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-6"
      style={{ background: 'rgba(0, 0, 0, 0.48)' }}
      role="dialog"
      aria-modal="true"
      aria-label="快捷键参考"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden border shadow-2xl"
        style={{
          background: 'var(--bg-container)',
          borderColor: 'var(--border)',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4" style={{ color: 'var(--accent1)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>快捷键</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-black/5"
            style={{ color: 'var(--text-sec)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Shortcuts list */}
        <div className="px-5 py-4 space-y-1">
          {shortcuts.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <span className="text-sm" style={{ color: 'var(--text-sec)' }}>{s.description}</span>
              <kbd
                className="px-2 py-0.5 rounded text-xs font-mono font-medium"
                style={{
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
              >
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function App() {
  const { settingsModalOpen, setSettingsModalOpen, setSettingsSection, toggleSidebarCollapsed } = useAppStore()
  const { theme, hasCompletedOnboarding, setHasCompletedOnboarding, loadSettings, loadError, setLoadError } = useSettingsStore()
  const { menu, showMenuAt, closeMenu } = useContextMenu()
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [gatewayDisconnectedDismissed, setGatewayDisconnectedDismissed] = useState(false)
  const [gatewayStatus, setGatewayStatus] = useState<'connected' | 'disconnected'>('connected')
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false)

  // Modal LIFO stack: tracks which modals are open (top = most recent)
  const [, setModalStack] = useState<string[]>([])

  const registerModal = useCallback((id: string) => {
    setModalStack(prev => {
      if (prev.includes(id)) return prev
      return [...prev, id]
    })
  }, [])

  const closeTopModal = useCallback(() => {
    setModalStack(prev => {
      if (prev.length === 0) return prev
      const top = prev[prev.length - 1]
      // Close the topmost modal
      if (top === 'commandPalette') setCommandPaletteOpen(false)
      else if (top === 'globalSearch') setGlobalSearchOpen(false)
      else if (top === 'settings') setSettingsModalOpen(false)
      else if (top === 'shortcuts') setShortcutsModalOpen(false)
      return prev.slice(0, -1)
    })
  }, [])

  // Load persisted settings from electron-store on mount; subscribe to cross-window changes
  useEffect(() => {
    let cleanup: (() => void) | undefined
    loadSettings().then(fn => {
      cleanup = fn
      setSettingsLoaded(true)
    })
    return () => { cleanup?.() }
  }, [loadSettings])

  // Listen for navigation events from main process
  useEffect(() => {
    const unsubscribe = window.electronAPI?.onNavigate?.((data) => {
      if (data.page === 'settings') {
        setSettingsModalOpen(true)
        registerModal('settings')
      } else if (data.page === 'credits') {
        setSettingsSection('credits')
        setSettingsModalOpen(true)
        registerModal('settings')
      } else if (data.page === 'avatarCreate') {
        setSettingsModalOpen(true)
        registerModal('settings')
      }
    })
    return () => { unsubscribe?.() }
  }, [setSettingsModalOpen, setSettingsSection, registerModal])

  // Register modals when they open/close
  useEffect(() => {
    if (commandPaletteOpen) registerModal('commandPalette')
  }, [commandPaletteOpen, registerModal])
  useEffect(() => {
    if (globalSearchOpen) registerModal('globalSearch')
  }, [globalSearchOpen, registerModal])
  useEffect(() => {
    if (settingsModalOpen) registerModal('settings')
  }, [settingsModalOpen, registerModal])
  useEffect(() => {
    if (shortcutsModalOpen) registerModal('shortcuts')
  }, [shortcutsModalOpen, registerModal])

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const mod = isMac ? e.metaKey : e.ctrlKey

      // Cmd+, → 打开设置
      if (mod && e.key === ',') {
        e.preventDefault()
        setSettingsModalOpen(true)
        registerModal('settings')
        return
      }

      // Cmd+K → 命令面板
      if (mod && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(v => !v)
        return
      }

      // Cmd+Shift+F → 全局搜索
      if (mod && e.shiftKey && e.key === 'F') {
        e.preventDefault()
        setGlobalSearchOpen(v => !v)
        return
      }

      // Cmd+Shift+S → 侧栏收起/展开
      if (mod && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
        toggleSidebarCollapsed()
        return
      }

      // Cmd+/ → 快捷键参考
      if (mod && e.key === '/') {
        e.preventDefault()
        setShortcutsModalOpen(v => !v)
        return
      }

      // Escape → 关闭最上层弹窗（LIFO）
      if (e.key === 'Escape') {
        e.preventDefault()
        closeTopModal()
        return
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [toggleSidebarCollapsed, registerModal, closeTopModal])

  // Command palette 中打开 settings 时自动打开 modal
  const handleCommandOpenSettings = useCallback((section: string) => {
    setSettingsSection(section)
    setSettingsModalOpen(true)
    registerModal('settings')
    setCommandPaletteOpen(false)
  }, [setSettingsSection, setSettingsModalOpen, registerModal])

  // 引导完成后设置标记，主界面已预先渲染（隐藏在 overlay 下）
  const handleOnboardingComplete = useCallback(() => {
    setHasCompletedOnboarding(true)
  }, [setHasCompletedOnboarding])

  // Gateway connection status listener — shows disconnect banner in main UI
  useEffect(() => {
    const unsub = window.openclaw?.onStatusChange?.((s: string) => {
      setGatewayStatus(
        s === 'connected' || s === 'ready' || s === 'ready_for_inference'
          ? 'connected'
          : 'disconnected'
      )
      setGatewayDisconnectedDismissed(false)
    })
    return () => { unsub?.() }
  }, [])

  // Apply theme on mount and when theme changes
  useEffect(() => {
    const applyTheme = () => {
      if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        document.documentElement.dataset.theme = prefersDark ? 'dark' : 'light'
      } else {
        document.documentElement.dataset.theme = theme
      }
    }

    applyTheme()

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme()
      }
    }
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  // Global context menu handler for text selection and general context
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-context-menu]')) {
        return
      }
    }
    document.addEventListener('contextmenu', handleContextMenu)
    return () => document.removeEventListener('contextmenu', handleContextMenu)
  }, [])

  const handleContextMenuSelect = (item: { onClick: () => void }) => {
    item.onClick()
    closeMenu()
  }

  // Wait for settings to load before rendering — prevents flicker
  if (!settingsLoaded) {
    return (
      <div
        className="h-screen w-screen flex items-center justify-center"
        style={{ background: 'var(--bg-layout)' }}
      >
        <div className="w-8 h-8 rounded-full animate-spin" style={{ border: '2px solid var(--border)', borderTopColor: 'var(--accent1)' }} />
      </div>
    )
  }

  return (
    <>
      {/* 首次启动引导 */}
      {!hasCompletedOnboarding && (
        <OnboardingView onComplete={handleOnboardingComplete} />
      )}

      <div
        className="h-screen w-screen flex flex-col overflow-hidden"
        style={{ background: 'var(--bg-layout)', color: 'var(--text)' }}
      >
        <Header />
        {loadError && (
          <div
            role="alert"
            className="flex items-center gap-3 px-4 py-2 text-sm"
            style={{ background: 'var(--accent1)', color: '#fff' }}
          >
            <span>⚠️ {loadError}</span>
            <button
              onClick={() => setLoadError(null)}
              className="ml-auto underline hover:no-underline"
            >
              知道了
            </button>
          </div>
        )}
        {gatewayStatus === 'disconnected' && !gatewayDisconnectedDismissed && hasCompletedOnboarding && (
          <div
            role="alert"
            className="flex items-center gap-3 px-4 py-2 text-sm"
            style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}
          >
            <span>⚠️ Gateway 连接已断开，AI 对话暂时不可用。</span>
            <button
              onClick={() => setGatewayDisconnectedDismissed(true)}
              className="ml-auto text-xs px-2 py-0.5 rounded transition-colors"
              style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}
            >
              关闭
            </button>
          </div>
        )}
        <div className="flex-1 flex min-h-0">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            <ChatView onShowContextMenu={showMenuAt} />
          </div>
        </div>

        {/* 设置弹窗 */}
        {settingsModalOpen ? (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-6"
            style={{ background: 'rgba(0, 0, 0, 0.38)' }}
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setSettingsModalOpen(false)
            }}
          >
            <div
              className="relative w-full max-w-[960px] h-[min(88vh,820px)] rounded-[14px] overflow-hidden flex flex-col shadow-2xl border"
              style={{
                borderColor: 'var(--border)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setSettingsModalOpen(false)}
                className="absolute top-3 right-3 z-10 w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-black/5"
                style={{ color: 'var(--text-sec)' }}
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex-1 min-h-0 flex flex-col pt-2">
                <SettingsView />
              </div>
            </div>
          </div>
        ) : null}

        {/* Global Context Menu */}
        <ContextMenu menu={menu} onSelect={handleContextMenuSelect} />

        {/* Command Palette */}
        <CommandPalette
          isOpen={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
          onOpenSettings={handleCommandOpenSettings}
        />

        {/* Global Search */}
        <GlobalSearch
          isOpen={globalSearchOpen}
          onClose={() => setGlobalSearchOpen(false)}
        />

        {/* Shortcuts Modal */}
        {shortcutsModalOpen && (
          <ShortcutsModal onClose={() => setShortcutsModalOpen(false)} />
        )}

        {/* Toast Notifications */}
        <ToastContainer />

        {/* Exec Approval Modal */}
        <ExecApprovalModal />
      </div>
    </>
  )
}

export default App

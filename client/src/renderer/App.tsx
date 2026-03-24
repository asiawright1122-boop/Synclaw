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
import { X } from 'lucide-react'

function App() {
  const { settingsModalOpen, setSettingsModalOpen, setSettingsSection } = useAppStore()
  const { theme, loadSettings } = useSettingsStore()
  const { menu, showMenuAt, closeMenu } = useContextMenu()
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false)

  // Load persisted settings from electron-store on mount
  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // Listen for navigation events from main process
  useEffect(() => {
    const unsubscribe = window.electronAPI?.onNavigate?.((data) => {
      if (data.page === 'settings') {
        setSettingsModalOpen(true)
      } else if (data.page === 'credits') {
        setSettingsSection('credits')
        setSettingsModalOpen(true)
      } else if (data.page === 'avatarCreate') {
        setSettingsModalOpen(true)
      }
    })
    return () => {
      unsubscribe?.()
    }
  }, [setSettingsModalOpen, setSettingsSection])

  // Cmd/Ctrl + K → 打开命令面板
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault()
        setGlobalSearchOpen(v => !v)
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(v => !v)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Command palette 中打开 settings 时自动打开 modal
  const handleCommandOpenSettings = useCallback((section: string) => {
    setSettingsSection(section)
    setSettingsModalOpen(true)
    setCommandPaletteOpen(false)
  }, [setSettingsSection, setSettingsModalOpen])

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

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme()
      }
    }
    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme])

  // Global context menu handler for text selection and general context
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      // Only show menu if not on a specific element that handles its own context menu
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

  return (
    <div
      className="h-screen w-screen flex flex-col overflow-hidden"
      style={{ background: 'var(--bg-layout)', color: 'var(--text)' }}
    >
      <Header />
      <div className="flex-1 flex min-h-0">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <ChatView onShowContextMenu={showMenuAt} />
        </div>
      </div>

      {/* 设置：弹窗 */}
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
              aria-label="关闭设置"
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

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  )
}

export default App

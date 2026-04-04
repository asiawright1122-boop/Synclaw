import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { FolderOpen, File, ChevronRight, Home, RefreshCw, ChevronLeft, LayoutGrid, List, Star, Clock, Trash2, Edit2, Copy, FolderInput, FolderPlus, FilePlus, ShieldAlert } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { useSettingsStore } from '../stores/settingsStore'
// 原始 store 引用（用于在 useCallback 内实时读取 limitAccess / authorizedDirs）
import { useSettingsStore as rawSettingsStore } from '../stores/settingsStore'
import { useToast } from './Toast'
import { t } from '../i18n'

interface FileItem {
  name: string
  path: string
  isDirectory: boolean
}

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  target: FileItem | null
}

export function FileExplorer() {
  const { currentPath, setCurrentPath, files, setFiles } = useAppStore()
  const { favorites, addFavorite, removeFavorite } = useSettingsStore()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [pathHistory, setPathHistory] = useState<string[]>([])
  const [previewContent, setPreviewContent] = useState<string | null>(null)
  const [previewFile, setPreviewFile] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    target: null,
  })
  const [renameTarget, setRenameTarget] = useState<FileItem | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [watchedPath, setWatchedPath] = useState('')
  const [newItemType, setNewItemType] = useState<'file' | 'folder' | null>(null)
  const [newItemName, setNewItemName] = useState('')
  const [creating, setCreating] = useState(false)
  // 标记是否已成功导航到某目录（区分「未导航」与「目录为空」）
  const [hasNavigated, setHasNavigated] = useState(false)
  const newItemInputRef = useRef<HTMLInputElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  // ── Authorization check ────────────────────────────────────────────────
  const validatePath = useCallback((targetPath: string): boolean => {
    const { workspace, authorizedDirs } = rawSettingsStore.getState()
    if (!workspace.limitAccess) return true
    if (!authorizedDirs.length) return false
    return authorizedDirs.some(dir => targetPath.startsWith(dir + '/') || targetPath === dir)
  }, [])

  // ── Load directory ───────────────────────────────────────────────────────
  const loadDirectory = useCallback(async (dirPath: string) => {
    const { workspace, authorizedDirs } = rawSettingsStore.getState()
    if (workspace.limitAccess && !authorizedDirs.length) {
      toast.warning('请先在设置中添加授权目录，AI 才能操作文件', 5000)
      setLoading(false)
      return
    }
    if (!validatePath(dirPath)) {
      toast.error(`权限不足：${dirPath} 不在授权目录范围内`, 5000)
      setLoading(false)
      return
    }
    setLoading(true)
    setPreviewContent(null)
    setPreviewFile(null)
    try {
      if (window.electronAPI?.file) {
        const result = await window.electronAPI.file.list(dirPath)
        if (result?.success && result.data) {
          const sorted = [...result.data].sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1
            if (!a.isDirectory && b.isDirectory) return 1
            return a.name.localeCompare(b.name)
          })
          setFiles(sorted)
          setCurrentPath(dirPath)
          setHasNavigated(true)
          setPathHistory(prev => [...prev, dirPath])
        } else if (result?.success && !result.data) {
          setFiles([])
          setCurrentPath(dirPath)
        } else if (result?.error) {
          toast.error(result.error, 4000)
          setLoading(false)
          return
        }
      } else {
        setLoading(false)
      }
    } catch {
      setLoading(false)
    }
  }, [setFiles, setCurrentPath, validatePath, toast])

  // ── Preview file ─────────────────────────────────────────────────────────
  const previewFileContent = useCallback(async (item: FileItem) => {
    if (item.isDirectory) return
    try {
      const result = await window.electronAPI?.file.read(item.path)
      if (result?.success && result.data !== undefined) {
        setPreviewContent(result.data)
        setPreviewFile(item.name)
      }
    } catch {
      setPreviewContent(t('fileexplorer.preview.error'))
      setPreviewFile(item.name)
    }
  }, [])

  // ── Navigate ─────────────────────────────────────────────────────────────
  const handleItemClick = (item: FileItem) => {
    if (item.isDirectory) {
      loadDirectory(item.path)
    } else {
      previewFileContent(item)
    }
  }

  const handleItemDoubleClick = (item: FileItem) => {
    if (item.isDirectory) {
      loadDirectory(item.path)
    }
  }

  const goBack = () => {
    if (pathHistory.length > 1) {
      const newHistory = [...pathHistory]
      newHistory.pop()
      const prevPath = newHistory[newHistory.length - 1]
      setPathHistory(newHistory)
      loadDirectory(prevPath)
    }
  }

  const goHome = async () => {
    setPathHistory([])
    if (window.electronAPI?.app) {
      const home = await window.electronAPI.app.getPath('home')
      loadDirectory(home)
    }
    // Electron 环境必须通过 API 获取主目录，不存在 fallback
  }

  const handleRefresh = () => {
    if (currentPath) {
      loadDirectory(currentPath)
    }
  }

  // ── Context menu ─────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(prev => ({ ...prev, visible: false }))
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleContextMenu = (e: React.MouseEvent, item: FileItem) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      target: item,
    })
  }

  const closeContextMenu = () => {
    setContextMenu(prev => ({ ...prev, visible: false }))
  }

  const handleCopyPath = async (item: FileItem) => {
    await navigator.clipboard.writeText(item.path)
    closeContextMenu()
  }

  const handleOpenInFolder = async (item: FileItem) => {
    await window.electronAPI?.shell.showItemInFolder(item.path)
    closeContextMenu()
  }

  const handleRename = (item: FileItem) => {
    setRenameTarget(item)
    setRenameValue(item.name)
    closeContextMenu()
    setTimeout(() => renameInputRef.current?.focus(), 50)
  }

  const handleRenameSubmit = async () => {
    if (!renameTarget || !renameValue.trim() || renameValue === renameTarget.name) {
      setRenameTarget(null)
      return
    }
    const dir = renameTarget.path.substring(0, renameTarget.path.lastIndexOf('/'))
    const newPath = `${dir}/${renameValue.trim()}`
    try {
      const result = await window.electronAPI?.file.rename(renameTarget.path, newPath)
      if (result?.success) {
        await loadDirectory(currentPath)
      }
    } catch {
      // ignore rename errors
    }
    setRenameTarget(null)
  }

  const handleDelete = async (item: FileItem) => {
    closeContextMenu()
    try {
      const result = await window.electronAPI?.file.delete(item.path)
      if (result?.success) {
        await loadDirectory(currentPath)
      }
    } catch {
      // ignore delete errors
    }
  }

  const handleMoveFile = async (item: FileItem) => {
    closeContextMenu()
    const result = await window.electronAPI?.dialog.selectDirectory()
    if (result?.canceled || !result?.filePaths?.length) return
    const destDir = result.filePaths[0]
    const newPath = `${destDir}/${item.name}`
    try {
      const renameResult = await window.electronAPI?.file.rename(item.path, newPath)
      if (renameResult?.success) {
        await loadDirectory(currentPath)
      }
    } catch {
      // ignore move errors
    }
  }

  // ── New file / folder ──────────────────────────────────────────────────────
  const startNewFile = () => {
    setNewItemType('file')
    setNewItemName('untitled.txt')
    setCreating(true)
    setTimeout(() => newItemInputRef.current?.focus(), 50)
  }

  const startNewFolder = () => {
    setNewItemType('folder')
    setNewItemName('New Folder')
    setCreating(true)
    setTimeout(() => newItemInputRef.current?.select(), 50)
  }

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemName.trim() || !newItemType || !currentPath) return

    const name = newItemName.trim()
    const newPath = `${currentPath}/${name}`

    try {
      if (newItemType === 'folder') {
        await window.electronAPI?.file.mkdir(newPath)
      } else {
        await window.electronAPI?.file.write(newPath, '')
      }
      setCreating(false)
      setNewItemType(null)
      setNewItemName('')
      await loadDirectory(currentPath)
    } catch {
      setCreating(false)
    }
  }

  const cancelNewItem = () => {
    setCreating(false)
    setNewItemType(null)
    setNewItemName('')
  }

  // ── File watcher ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentPath || !window.electronAPI) return

    const setupWatcher = async () => {
      // Unwatch the previously watched directory before watching a new one
      if (watchedPath && watchedPath !== currentPath) {
        try {
          await window.electronAPI.file.unwatch(watchedPath)
        } catch {
          // ignore unwatch errors
        }
      }

      // Skip if already watching this path
      if (watchedPath === currentPath) return

      try {
        const result = await window.electronAPI.file.watch(currentPath)
        if (result?.success) {
          setWatchedPath(currentPath)
        }
      } catch {
        // fs.watch not available
      }
    }

    setupWatcher()

    return () => {
      if (watchedPath) {
        window.electronAPI?.file.unwatch?.(watchedPath)
        setWatchedPath('')
      }
    }
  }, [currentPath, watchedPath])

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewContent(null)
        setPreviewFile(null)
        setRenameTarget(null)
        closeContextMenu()
        if (creating) cancelNewItem()
      }
      if (e.key === 'Backspace' && currentPath && !previewContent && !creating) {
        if (pathHistory.length > 1) {
          goBack()
        }
      }
      // Ctrl/Cmd + N: new file
      if ((e.ctrlKey || e.metaKey) && e.key === 'n' && currentPath && !creating) {
        e.preventDefault()
        startNewFile()
      }
      // Ctrl/Cmd + Shift + N: new folder
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N' && currentPath && !creating) {
        e.preventDefault()
        startNewFolder()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPath, previewContent, pathHistory, creating])

  // ── Render helpers ──────────────────────────────────────────────────────
  const renderItem = (item: FileItem, index: number) => {
    const isRenaming = renameTarget?.path === item.path

    if (viewMode === 'list') {
      return (
        <motion.div
          key={item.path}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.02 }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 cursor-pointer transition-all group"
          onClick={() => handleItemClick(item)}
          onDoubleClick={() => handleItemDoubleClick(item)}
          onContextMenu={(e) => handleContextMenu(e, item)}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            item.isDirectory
              ? 'bg-accent-cyan/10 text-accent-cyan'
              : 'bg-slate-700/50 text-slate-400'
          }`}>
            {item.isDirectory ? (
              <FolderOpen className="w-5 h-5" />
            ) : (
              <File className="w-5 h-5" />
            )}
          </div>
          {isRenaming ? (
            <input
              ref={renameInputRef}
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={e => {
                if (e.key === 'Enter') handleRenameSubmit()
                if (e.key === 'Escape') setRenameTarget(null)
              }}
              className="flex-1 px-2 py-1 rounded text-sm bg-white/10 border border-accent-cyan text-white outline-none"
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span className="text-slate-200 text-sm font-medium group-hover:text-white flex-1 truncate">{item.name}</span>
          )}
          {item.isDirectory && <ChevronRight className="w-4 h-4 text-slate-600 ml-auto group-hover:text-slate-400" />}
        </motion.div>
      )
    } else {
      return (
        <motion.button
          key={item.path}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.02 }}
          onClick={() => handleItemClick(item)}
          onDoubleClick={() => handleItemDoubleClick(item)}
          onContextMenu={(e) => handleContextMenu(e, item)}
          className="flex flex-col items-center gap-2 p-4 rounded-2xl hover:bg-white/5 transition-all group"
        >
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
            item.isDirectory
              ? 'bg-accent-cyan/10 text-accent-cyan'
              : 'bg-slate-700/50 text-slate-400'
          }`}>
            {item.isDirectory ? (
              <FolderOpen className="w-8 h-8" />
            ) : (
              <File className="w-8 h-8" />
            )}
          </div>
          {isRenaming ? (
            <input
              ref={renameInputRef}
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={e => {
                if (e.key === 'Enter') handleRenameSubmit()
                if (e.key === 'Escape') setRenameTarget(null)
              }}
              className="w-full px-1 py-0.5 rounded text-xs text-center bg-white/10 border border-accent-cyan text-white outline-none"
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span className="text-slate-300 text-xs text-center group-hover:text-white truncate w-full">{item.name}</span>
          )}
        </motion.button>
      )
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full relative">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-accent-violet/5 via-transparent to-transparent pointer-events-none" />

      {/* Toolbar */}
      <div className="h-14 px-4 border-b border-aurora-border flex items-center gap-2 relative z-10">
        <div className="flex items-center gap-1">
          <motion.button
            onClick={goBack}
            disabled={pathHistory.length <= 1}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ChevronLeft className="w-5 h-5" />
          </motion.button>
          <motion.button
            onClick={goHome}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Home className="w-5 h-5" />
          </motion.button>
          <motion.button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </motion.button>

          {/* Divider */}
          <div className="w-px h-5 bg-white/10 mx-0.5" />

          {/* New file */}
          <motion.button
            onClick={startNewFile}
            disabled={!currentPath || creating}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title={`${t('fileexplorer.newFile')} (⌘N)`}
          >
            <FilePlus className="w-5 h-5" />
          </motion.button>

          {/* New folder */}
          <motion.button
            onClick={startNewFolder}
            disabled={!currentPath || creating}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title={`${t('fileexplorer.newFolder')} (⌘⇧N)`}
          >
            <FolderPlus className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Path bar */}
        <div
          className="flex-1 mx-2 px-4 py-2 bg-white/5 rounded-xl border border-aurora-border text-sm text-slate-300 truncate flex items-center gap-2 cursor-pointer hover:bg-white/10 transition-colors"
          onClick={goHome}
          title={currentPath || '选择文件夹开始'}
        >
          <FolderOpen className="w-4 h-4 text-accent-cyan flex-shrink-0" />
          {currentPath || '选择文件夹开始'}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg border border-aurora-border">
          <motion.button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-accent-cyan/20 text-accent-cyan' : 'text-slate-400 hover:text-white'}`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <List className="w-4 h-4" />
          </motion.button>
          <motion.button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-accent-cyan/20 text-accent-cyan' : 'text-slate-400 hover:text-white'}`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <LayoutGrid className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Quick access sidebar */}
        <div className="w-48 border-r border-aurora-border p-3 space-y-1 hidden md:block">
          <div className="text-xs text-slate-500 uppercase tracking-wider px-2 mb-2">快速访问</div>
          {/* User favorites */}
          {favorites.map(path => (
            <motion.button
              key={path}
              onClick={() => loadDirectory(path)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-sm"
              whileHover={{ x: 2 }}
              title={path}
            >
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 shrink-0" />
              <span className="truncate">{path.split('/').pop()}</span>
            </motion.button>
          ))}
          {/* Fixed shortcuts — 由 Electron API 动态获取，不硬编码 */}
          <motion.button
            onClick={async () => {
              const home = await window.electronAPI?.app?.getPath('home')
              if (home) loadDirectory(home)
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-sm"
            whileHover={{ x: 2 }}
          >
            <Clock className="w-4 h-4 shrink-0" />
            <span className="truncate">主目录</span>
          </motion.button>
          <motion.button
            onClick={async () => {
              const trash = await window.electronAPI?.app?.getPath('trash')
              if (trash) loadDirectory(trash)
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-sm"
            whileHover={{ x: 2 }}
          >
            <Trash2 className="w-4 h-4 shrink-0" />
            <span className="truncate">回收站</span>
          </motion.button>
          {favorites.length === 0 && (
            <p className="text-[10px] text-slate-600 px-3 mt-1">右键文件即可收藏</p>
          )}
        </div>

        {/* File list */}
        <div className="flex-1 overflow-y-auto p-4 relative z-10">
          {!currentPath ? (
            <div className="h-full flex items-center justify-center">
              <motion.button
                onClick={goHome}
                className="flex flex-col items-center gap-4 text-slate-500 hover:text-accent-cyan transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="w-20 h-20 rounded-2xl bg-white/5 border border-aurora-border flex items-center justify-center">
                  <FolderOpen className="w-10 h-10" />
                </div>
                <span className="text-sm">点击打开文件夹</span>
              </motion.button>
            </div>
          ) : viewMode === 'list' ? (
            <div className="space-y-1">
              {/* New item inline form */}
              {creating && newItemType && (
                <form onSubmit={handleCreateItem} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-cyan/10 border border-accent-cyan/30">
                  <span className="text-accent-cyan">
                    {newItemType === 'folder' ? <FolderPlus className="w-4 h-4" /> : <FilePlus className="w-4 h-4" />}
                  </span>
                  <input
                    ref={newItemInputRef}
                    type="text"
                    value={newItemName}
                    onChange={e => setNewItemName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Escape') cancelNewItem()
                      e.stopPropagation()
                    }}
                    className="flex-1 bg-transparent text-sm text-white outline-none placeholder-slate-500"
                    placeholder={newItemType === 'folder' ? '文件夹名称' : '文件名'}
                    autoFocus
                  />
                  <span className="text-xs text-slate-500">↵ 确认 · Esc 取消</span>
                </form>
              )}
              {files.map((item, index) => renderItem(item, index))}
              {/* 无授权目录警告横幅（区分「目录为空」与「未配置授权目录」） */}
              {hasNavigated && files.length === 0 && (
                <div
                  className="mt-4 mx-2 px-4 py-3 rounded-xl border flex items-start gap-3"
                  style={{ background: 'rgba(252,93,30,0.08)', borderColor: 'rgba(252,93,30,0.25)' }}
                >
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--accent1)' }} />
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'var(--accent1)' }}>
                      当前目录为空或未配置授权目录
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-sec)' }}>
                      如需 AI 操作文件，请在「设置 → 文件安全」中添加授权目录
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-4 xl:grid-cols-6 gap-4">
              {/* New item inline form */}
              {creating && newItemType && (
                <form onSubmit={handleCreateItem} className="flex flex-col items-center gap-1 p-3 rounded-xl bg-accent-cyan/10 border border-accent-cyan/30">
                  <span className="text-accent-cyan">
                    {newItemType === 'folder' ? <FolderPlus className="w-8 h-8" /> : <FilePlus className="w-8 h-8" />}
                  </span>
                  <input
                    ref={newItemInputRef}
                    type="text"
                    value={newItemName}
                    onChange={e => setNewItemName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Escape') cancelNewItem()
                      e.stopPropagation()
                    }}
                    className="w-full bg-transparent text-xs text-white text-center outline-none placeholder-slate-500"
                    placeholder={newItemType === 'folder' ? '文件夹名' : '文件名'}
                    autoFocus
                  />
                </form>
              )}
              {files.map((item, index) => renderItem(item, index))}
              {/* 无授权目录警告横幅 */}
              {hasNavigated && files.length === 0 && (
                <div
                  className="col-span-full mt-4 mx-2 px-4 py-3 rounded-xl border flex items-start gap-3"
                  style={{ background: 'rgba(252,93,30,0.08)', borderColor: 'rgba(252,93,30,0.25)' }}
                >
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--accent1)' }} />
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'var(--accent1)' }}>
                      当前目录为空或未配置授权目录
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-sec)' }}>
                      如需 AI 操作文件，请在「设置 → 文件安全」中添加授权目录
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Preview panel */}
        {previewContent !== null && (
          <div className="w-80 border-l border-aurora-border flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-aurora-border flex items-center justify-between">
              <span className="text-sm font-medium text-slate-300 truncate">{previewFile}</span>
              <button
                onClick={() => { setPreviewContent(null); setPreviewFile(null) }}
                className="p-1 rounded hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
              >
                ×
              </button>
            </div>
            <pre className="flex-1 overflow-auto p-4 text-xs text-slate-400 whitespace-pre-wrap font-mono">
              {previewContent}
            </pre>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu.visible && contextMenu.target && (
        <div
          ref={contextMenuRef}
          className="fixed z-[9999] min-w-[160px] rounded-xl border border-aurora-border bg-[#1a1d23] shadow-2xl py-1 overflow-hidden"
          style={{
            left: Math.min(contextMenu.x, window.innerWidth - 180),
            top: Math.min(contextMenu.y, window.innerHeight - 200),
          }}
        >
          <ContextMenuItem
            icon={<FilePlus className="w-4 h-4" />}
            label="新建文件"
            onClick={() => { closeContextMenu(); startNewFile() }}
          />
          <ContextMenuItem
            icon={<FolderPlus className="w-4 h-4" />}
            label="新建文件夹"
            onClick={() => { closeContextMenu(); startNewFolder() }}
          />
          <div className="my-1 border-t border-aurora-border" />
          <ContextMenuItem
            icon={<Star className={`w-4 h-4 ${contextMenu.target && favorites.includes(contextMenu.target.path) ? 'text-yellow-400 fill-yellow-400' : ''}`} />}
            label={contextMenu.target && favorites.includes(contextMenu.target.path) ? '取消收藏' : '收藏'}
            onClick={() => {
              if (!contextMenu.target) return
              if (favorites.includes(contextMenu.target.path)) {
                removeFavorite(contextMenu.target.path)
              } else {
                addFavorite(contextMenu.target.path)
              }
              closeContextMenu()
            }}
          />
          <div className="my-1 border-t border-aurora-border" />
          {!contextMenu.target.isDirectory && (
            <ContextMenuItem
              icon={<File className="w-4 h-4" />}
              label="预览"
              onClick={() => { previewFileContent(contextMenu.target!); closeContextMenu() }}
            />
          )}
          <ContextMenuItem
            icon={<Edit2 className="w-4 h-4" />}
            label="重命名"
            onClick={() => handleRename(contextMenu.target!)}
          />
          <ContextMenuItem
            icon={<FolderInput className="w-4 h-4" />}
            label="移动到..."
            onClick={() => handleMoveFile(contextMenu.target!)}
          />
          <ContextMenuItem
            icon={<Copy className="w-4 h-4" />}
            label="复制路径"
            onClick={() => handleCopyPath(contextMenu.target!)}
          />
          <ContextMenuItem
            icon={<FolderOpen className="w-4 h-4" />}
            label="在文件夹中显示"
            onClick={() => handleOpenInFolder(contextMenu.target!)}
          />
          <div className="my-1 border-t border-aurora-border" />
          <ContextMenuItem
            icon={<Trash2 className="w-4 h-4" />}
            label="删除"
            onClick={() => handleDelete(contextMenu.target!)}
            danger
          />
        </div>
      )}
    </div>
  )
}

function ContextMenuItem({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-left hover:bg-white/10 transition-colors"
      style={{ color: danger ? '#ef4444' : undefined }}
    >
      <span className="w-4 h-4 flex-shrink-0 opacity-70">{icon}</span>
      {label}
    </button>
  )
}

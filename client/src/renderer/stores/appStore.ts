import { create } from 'zustand'

export interface FileItem {
  name: string
  path: string
  isDirectory: boolean
}

export interface AvatarItem {
  id: string
  name: string
  description?: string
  status?: 'online' | 'offline' | 'busy'
  color?: string
  icon?: 'claw' | 'bot' | 'globe' | 'eye'
  pinned?: boolean
  model?: string
}

interface AppState {
  // Sidebar collapse
  sidebarCollapsed: boolean
  toggleSidebarCollapsed: () => void

  // Sidebar mode tabs: 分身(IM) / 对话(chat) / 定时任务(scheduled)
  activeTab: 'avatar' | 'chat' | 'task'
  setActiveTab: (tab: 'avatar' | 'chat' | 'task') => void

  // Selected avatar — stores the full avatar object; use .id for agent calls
  selectedAvatar: AvatarItem | null
  setSelectedAvatar: (avatar: AvatarItem | null) => void

  // Selected IM session
  selectedSession: string | null
  setSelectedSession: (id: string | null) => void

  // Main content (reserved for future tabs)
  activeView: 'chat' | 'settings'
  setActiveView: (view: 'chat' | 'settings') => void

  /** 设置以弹窗展示 */
  settingsModalOpen: boolean
  setSettingsModalOpen: (open: boolean) => void

  /** 设置弹窗中的当前 section */
  settingsSection: string
  setSettingsSection: (section: string) => void

  // Model selector
  currentModel: string
  setCurrentModel: (model: string) => void

  // Files
  currentPath: string
  setCurrentPath: (path: string) => void
  files: FileItem[]
  setFiles: (files: FileItem[]) => void

  // Tasks
  selectedTask: {
    id: string
    title: string
    description: string
    status: 'pending' | 'planning' | 'in_progress' | 'ai_review' | 'human_review' | 'completed'
    progress: number
    subtasks: { id: string; title: string; completed: boolean }[]
    logs: string[]
    createdAt: number
    updatedAt: number
  } | null
  setSelectedTask: (task: AppState['selectedTask']) => void

  // Loading states
  isLoading: boolean
  setLoading: (loading: boolean) => void

  // Bottom panel
  bottomPanelOpen: boolean
  setBottomPanelOpen: (open: boolean) => void
  bottomPanelHeight: number
  setBottomPanelHeight: (height: number) => void

  // Right panel
  rightPanelOpen: boolean
  toggleRightPanel: () => void
}

export const useAppStore = create<AppState>((set) => ({
  // Sidebar
  sidebarCollapsed: false,
  toggleSidebarCollapsed: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  // Sidebar mode tabs
  activeTab: 'avatar',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Selected avatar
  selectedAvatar: null,
  setSelectedAvatar: (avatar) => set({ selectedAvatar: avatar }),

  // Selected IM session
  selectedSession: null,
  setSelectedSession: (id) => set({ selectedSession: id }),

  // Active view
  activeView: 'chat',
  setActiveView: (view) => set({ activeView: view }),

  settingsModalOpen: false,
  setSettingsModalOpen: (open) => set({ settingsModalOpen: open }),

  settingsSection: 'general',
  setSettingsSection: (section) => set({ settingsSection: section }),

  // Model
  currentModel: 'GLM-4-Turbo',
  setCurrentModel: (model) => set({ currentModel: model }),

  // Files
  currentPath: '',
  setCurrentPath: (path) => set({ currentPath: path }),
  files: [],
  setFiles: (files) => set({ files }),

  // Selected task
  selectedTask: null,
  setSelectedTask: (task) => set({ selectedTask: task }),

  // Loading
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),

  // Bottom panel
  bottomPanelOpen: false,
  setBottomPanelOpen: (open) => set({ bottomPanelOpen: open }),
  bottomPanelHeight: 200,
  setBottomPanelHeight: (height) => set({ bottomPanelHeight: height }),

  // Right panel
  rightPanelOpen: false,
  toggleRightPanel: () => set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),
}))

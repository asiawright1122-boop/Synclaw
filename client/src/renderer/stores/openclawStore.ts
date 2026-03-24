import { create } from 'zustand'

interface SkillInfo {
  id: string
  name: string
  description?: string
  enabled: boolean
  version?: string
  category?: string
}

interface OpenClawState {
  // 连接状态
  connected: boolean
  running: boolean
  connecting: boolean

  // 技能
  skills: SkillInfo[] | null
  skillsLoading: boolean

  // Actions
  setConnected: (connected: boolean) => void
  setRunning: (running: boolean) => void
  setConnecting: (connecting: boolean) => void

  setSkills: (skills: SkillInfo[] | null) => void
  setSkillsLoading: (loading: boolean) => void

  // 异步 Actions
  checkStatus: () => Promise<void>
  startOpenClaw: () => Promise<void>
  stopOpenClaw: () => Promise<void>
  loadSkills: () => Promise<void>
}

export const useOpenClawStore = create<OpenClawState>((set) => ({
  // 初始状态
  connected: false,
  running: false,
  connecting: false,
  skills: null,
  skillsLoading: false,

  // 同步 Actions
  setConnected: (connected) => set({ connected }),
  setRunning: (running) => set({ running }),
  setConnecting: (connecting) => set({ connecting }),

  setSkills: (skills) => set({ skills }),
  setSkillsLoading: (skillsLoading) => set({ skillsLoading }),

  // 异步 Actions
  checkStatus: async () => {
    try {
      const status = await window.openclaw?.getStatus()
      set({
        connected: status === 'connected',
        running: status === 'connected',
      })
    } catch (error) {
      console.error('检查状态失败:', error)
      set({ running: false, connected: false })
    }
  },

  startOpenClaw: async () => {
    set({ connecting: true })
    try {
      const result = await window.openclaw?.connect()
      if (result?.success) {
        set({ running: true, connected: true })
      } else {
        console.error('启动失败:', result?.error)
      }
    } catch (error) {
      console.error('启动失败:', error)
    } finally {
      set({ connecting: false })
    }
  },

  stopOpenClaw: async () => {
    try {
      await window.openclaw?.disconnect()
      set({ running: false, connected: false })
    } catch (error) {
      console.error('停止失败:', error)
    }
  },

  loadSkills: async () => {
    set({ skillsLoading: true })
    try {
      const result = await window.openclaw?.skills.status()
      if (result?.success && Array.isArray(result.data)) {
        const skills = (result.data as Array<{
          skillKey?: string
          name?: string
          description?: string
          enabled?: boolean
          version?: string
          category?: string
        }>).map((s) => ({
          id: s.skillKey || s.name || '',
          name: s.skillKey || s.name || '',
          description: s.description,
          enabled: s.enabled ?? false,
          version: s.version,
          category: s.category,
        }))
        set({ skills })
      } else {
        console.error('加载技能失败:', result?.error)
        set({ skills: null })
      }
    } catch (error) {
      console.error('加载技能失败:', error)
      set({ skills: null })
    } finally {
      set({ skillsLoading: false })
    }
  }
}))

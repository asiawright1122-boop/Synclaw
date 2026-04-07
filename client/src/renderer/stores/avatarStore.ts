/**
 * Avatar Store - Zustand state management for avatar CRUD
 */
import { create } from 'zustand'
import { getTemplateById, applyTemplate } from '../lib/avatar-templates'

export interface Avatar {
  id: string
  name: string
  description?: string
  personality?: string
  model?: string
  emoji?: string
  color?: string
  status?: 'online' | 'offline' | 'busy'
  pinned?: boolean
  createdAt?: number
}

export interface CreateAvatarParams {
  name?: string
  description?: string
  personality?: string
  model?: string
  emoji?: string
  color?: string
}

export interface UpdateAvatarParams extends CreateAvatarParams {
  id: string
}

export interface AvatarState {
  avatars: Avatar[]
  activeAvatarId: string | null
  loading: boolean
  error: string | null
  demoMode: boolean

  setAvatars: (avatars: Avatar[]) => void
  setActiveAvatar: (id: string | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setDemoMode: (demo: boolean) => void

  loadAvatars: () => Promise<void>
  createAvatar: (params: CreateAvatarParams) => Promise<Avatar | null>
  createFromTemplate: (templateId: string) => Promise<Avatar | null>
  updateAvatar: (params: UpdateAvatarParams) => Promise<void>
  deleteAvatar: (id: string) => Promise<void>
  activateAvatar: (id: string) => Promise<void>
}

// Demo avatars for when OpenClaw API is unavailable
const DEMO_AVATARS: Avatar[] = [
  {
    id: 'demo-programmer',
    name: '程序员',
    emoji: '💻',
    description: '全栈开发专家',
    color: '#3b82f6',
    status: 'online',
  },
  {
    id: 'demo-writer',
    name: '写作助手',
    emoji: '✍️',
    description: '专业文案写手',
    color: '#8b5cf6',
    status: 'online',
  },
]

// Helper to check if openclaw API is available
function hasOpenClaw(): boolean {
  return typeof window !== 'undefined' && !!window.openclaw
}

export const useAvatarStore = create<AvatarState>((set, get) => ({
  avatars: [],
  activeAvatarId: null,
  loading: false,
  error: null,
  demoMode: false,

  setAvatars: (avatars) => set({ avatars }),
  setActiveAvatar: (id) => set({ activeAvatarId: id }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setDemoMode: (demo) => set({ demoMode: demo }),

  loadAvatars: async () => {
    set({ loading: true, error: null })
    try {
      if (!hasOpenClaw()) {
        // Demo mode - use local demo avatars
        set({ avatars: DEMO_AVATARS, demoMode: true, loading: false })
        return
      }

      const result = await window.openclaw!.avatars.list()
      if (result.success && result.data) {
        const data = result.data as Array<{
          id: string
          name: string
          description?: string
          personality?: string
          model?: string
          status?: string
        }>
        const avatars: Avatar[] = data.map((a, index) => ({
          id: a.id || `avatar-${index}`,
          name: a.name || '未命名分身',
          description: a.description || a.personality?.slice(0, 60) || '',
          personality: a.personality,
          model: a.model,
          status: (a.status as Avatar['status']) || 'online',
          color: ['#fc5d1e', '#6b7280', '#4e7db7', '#2f9e5b', '#a78bfa'][index % 5],
        }))
        set({ avatars, demoMode: false })
      } else {
        // API returned but no data - use demo mode
        set({ avatars: DEMO_AVATARS, demoMode: true })
      }
    } catch (error) {
      console.error('[AvatarStore] Failed to load avatars:', error)
      // Fallback to demo mode
      set({ avatars: DEMO_AVATARS, demoMode: true, error: null })
    } finally {
      set({ loading: false })
    }
  },

  createAvatar: async (params) => {
    set({ loading: true, error: null })
    try {
      if (!hasOpenClaw()) {
        // Demo mode - create locally
        const newAvatar: Avatar = {
          id: `demo-${Date.now()}`,
          name: params.name || '新分身',
          description: params.description || '',
          personality: params.personality,
          model: params.model,
          emoji: params.emoji || '🤖',
          color: params.color || '#fc5d1e',
          status: 'online',
          createdAt: Date.now(),
        }
        set(state => ({ avatars: [...state.avatars, newAvatar] }))
        return newAvatar
      }

      const result = await window.openclaw!.avatars.create({
        name: params.name,
        model: params.model,
        personality: params.personality,
      })

      if (result.success && result.data) {
        // Gateway returns avatar without emoji/color/description — merge from params
        const createdAvatar: Avatar = {
          ...(result.data as Avatar),
          emoji: params.emoji || '🤖',
          color: params.color || '#fc5d1e',
          description: params.description || '',
        }
        set((state) => ({ avatars: [...state.avatars, createdAvatar] }))
        return createdAvatar
      } else {
        set({ error: result.error || '创建失败' })
        return null
      }
    } catch (error) {
      console.error('[AvatarStore] Failed to create avatar:', error)
      set({ error: '创建分身失败' })
      return null
    } finally {
      set({ loading: false })
    }
  },

  createFromTemplate: async (templateId) => {
    const template = getTemplateById(templateId)
    if (!template) {
      set({ error: '未找到模板' })
      return null
    }
    const params = applyTemplate(template)
    return get().createAvatar(params)
  },

  updateAvatar: async (params) => {
    set({ loading: true, error: null })
    try {
      if (!hasOpenClaw()) {
        // Demo mode - update locally
        set(state => ({
          avatars: state.avatars.map(av =>
            av.id === params.id
              ? { ...av, ...params, id: undefined } // Remove id from spread
              : av
          ).map(av => av) as Avatar[]
        }))
        return
      }

      const result = await window.openclaw!.avatars.update({
        id: params.id,
        name: params.name,
        model: params.model,
        personality: params.personality,
      })

      if (result.success) {
        // Reload avatars to get updated data
        await get().loadAvatars()
      } else {
        set({ error: result.error || '更新失败' })
      }
    } catch (error) {
      console.error('[AvatarStore] Failed to update avatar:', error)
      set({ error: '更新分身失败' })
    } finally {
      set({ loading: false })
    }
  },

  deleteAvatar: async (id) => {
    set({ loading: true, error: null })
    try {
      if (!hasOpenClaw()) {
        // Demo mode - delete locally
        // Also reset appStore.selectedAvatar if deleting the active avatar
        const { activeAvatarId } = get()
        if (activeAvatarId === id) {
          const { setSelectedAvatar } = await import('./appStore').then(m => m.useAppStore.getState())
          setSelectedAvatar(null)
        }
        set(state => ({
          avatars: state.avatars.filter(av => av.id !== id),
          activeAvatarId: activeAvatarId === id ? null : state.activeAvatarId,
        }))
        return
      }

      const result = await window.openclaw!.avatars.delete({ id })
      if (result.success) {
        // Reset appStore.selectedAvatar if deleting the active avatar
        const { activeAvatarId } = get()
        if (activeAvatarId === id) {
          const { setSelectedAvatar } = await import('./appStore').then(m => m.useAppStore.getState())
          setSelectedAvatar(null)
        }
        set(state => ({
          avatars: state.avatars.filter(av => av.id !== id),
          activeAvatarId: state.activeAvatarId === id ? null : state.activeAvatarId,
        }))
      } else {
        set({ error: result.error || '删除失败' })
      }
    } catch (error) {
      console.error('[AvatarStore] Failed to delete avatar:', error)
      set({ error: '删除分身失败' })
    } finally {
      set({ loading: false })
    }
  },

  activateAvatar: async (id) => {
    const avatar = get().avatars.find(av => av.id === id)
    if (!avatar) return

    set({ activeAvatarId: id })

    // Update in appStore as well for UI consistency
    const { setSelectedAvatar } = await import('./appStore').then(m => m.useAppStore.getState())
    setSelectedAvatar(avatar)

    // If not in demo mode, sync with OpenClaw
    if (hasOpenClaw() && !get().demoMode) {
      try {
        await window.openclaw!.avatars.update({
          id,
          personality: avatar.personality,
        })
      } catch (error) {
        console.error('[AvatarStore] Failed to activate avatar in Gateway:', error)
      }
    }
  },
}))

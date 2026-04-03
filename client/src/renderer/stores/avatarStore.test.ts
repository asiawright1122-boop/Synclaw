import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock appStore before importing avatarStore
// We need useAppStore to have a getState method for the dynamic import in activateAvatar
const mockSetSelectedAvatar = vi.fn()
const mockAppStoreState = {
  selectedAvatar: null,
  setSelectedAvatar: mockSetSelectedAvatar,
}

vi.mock('./appStore', () => ({
  useAppStore: Object.assign(
    vi.fn(() => mockAppStoreState),
    { getState: () => mockAppStoreState }
  ),
}))

vi.mock('../lib/avatar-templates', () => ({
  getTemplateById: vi.fn(),
  applyTemplate: vi.fn(),
}))

const mockOpenClaw = {
  avatars: {
    list: vi.fn().mockResolvedValue({ success: true, data: [{ id: 'av-1', name: 'Avatar 1' }] }),
    create: vi.fn().mockResolvedValue({ success: true, data: { id: 'av-new', name: 'New Avatar' } }),
    update: vi.fn().mockResolvedValue({ success: true }),
    delete: vi.fn().mockResolvedValue({ success: true }),
  },
}

vi.stubGlobal('window', { openclaw: mockOpenClaw })

const { useAvatarStore } = await import('./avatarStore')

describe('avatarStore', () => {
  beforeEach(async () => {
    useAvatarStore.setState({ avatars: [], activeAvatarId: null, loading: false, error: null, demoMode: false })
    mockSetSelectedAvatar.mockClear()
    mockOpenClaw.avatars.list.mockResolvedValue({ success: true, data: [{ id: 'av-1', name: 'Avatar 1' }] })
    mockOpenClaw.avatars.create.mockResolvedValue({ success: true, data: { id: 'av-new', name: 'New Avatar' } })
    mockOpenClaw.avatars.update.mockResolvedValue({ success: true })
    mockOpenClaw.avatars.delete.mockResolvedValue({ success: true })
  })

  describe('loadAvatars', () => {
    it('loads avatars from API when openclaw is available', async () => {
      await useAvatarStore.getState().loadAvatars()
      expect(useAvatarStore.getState().avatars.length).toBeGreaterThan(0)
      expect(useAvatarStore.getState().demoMode).toBe(false)
      expect(mockOpenClaw.avatars.list).toHaveBeenCalled()
    })

    it('falls back to DEMO_AVATARS when openclaw is undefined', async () => {
      // Simulate openclaw being undefined
      const original = (window as unknown as { openclaw?: unknown }).openclaw
      ;(window as unknown as { openclaw?: unknown }).openclaw = undefined
      await useAvatarStore.getState().loadAvatars()
      expect(useAvatarStore.getState().demoMode).toBe(true)
      expect(useAvatarStore.getState().avatars.length).toBeGreaterThanOrEqual(2)
      ;(window as unknown as { openclaw?: unknown }).openclaw = original
    })
  })

  describe('activateAvatar', () => {
    it('sets activeAvatarId and syncs to appStore', async () => {
      await useAvatarStore.getState().loadAvatars()
      await useAvatarStore.getState().activateAvatar('av-1')
      expect(useAvatarStore.getState().activeAvatarId).toBe('av-1')
      expect(mockSetSelectedAvatar).toHaveBeenCalled()
    })

    it('does nothing for invalid avatar id', async () => {
      await useAvatarStore.getState().loadAvatars()
      await useAvatarStore.getState().activateAvatar('non-existent-id')
      expect(useAvatarStore.getState().activeAvatarId).toBeNull()
    })
  })

  describe('createAvatar', () => {
    it('creates a new avatar and adds it to the list', async () => {
      await useAvatarStore.getState().loadAvatars()
      const initialCount = useAvatarStore.getState().avatars.length
      await useAvatarStore.getState().createAvatar({ name: 'Test', personality: 'helpful' })
      expect(useAvatarStore.getState().avatars.length).toBe(initialCount + 1)
    })
  })

  describe('deleteAvatar', () => {
    it('removes avatar and clears activeAvatarId if deleted', async () => {
      await useAvatarStore.getState().loadAvatars()
      await useAvatarStore.getState().activateAvatar('av-1')
      await useAvatarStore.getState().deleteAvatar('av-1')
      expect(useAvatarStore.getState().avatars.find((a) => a.id === 'av-1')).toBeUndefined()
      expect(useAvatarStore.getState().activeAvatarId).toBeNull()
    })
  })

  describe('setDemoMode', () => {
    it('toggles demoMode', () => {
      useAvatarStore.getState().setDemoMode(true)
      expect(useAvatarStore.getState().demoMode).toBe(true)
      useAvatarStore.getState().setDemoMode(false)
      expect(useAvatarStore.getState().demoMode).toBe(false)
    })
  })
})

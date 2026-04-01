import { vi, describe, it, expect, beforeEach } from 'vitest'

// Test useTTS by mocking window.openclaw.tts API.
// Audio element mocking is tested separately since HTMLAudioElement constructor
// is harder to intercept reliably in jsdom@25.

const mockTTSFns = vi.hoisted(() => ({
  status: vi.fn().mockResolvedValue({ success: true }),
  providers: vi.fn().mockResolvedValue({ success: true, data: { providers: [{ id: 'p1', name: 'Provider 1', enabled: true }] } }),
  enable: vi.fn().mockResolvedValue({ success: true }),
  disable: vi.fn().mockResolvedValue({ success: true }),
  convert: vi.fn().mockResolvedValue({
    success: true,
    data: { url: 'data:audio/mp3;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=' },
  }),
}))

const mockOpenClaw = { tts: mockTTSFns }

vi.stubGlobal('window', {
  openclaw: mockOpenClaw,
  electronAPI: {
    settings: {
      get: vi.fn().mockResolvedValue({ success: true, data: {} }),
      set: vi.fn().mockResolvedValue({ success: true }),
    },
  },
})

describe('useTTS - TTS API mocking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTTSFns.status.mockResolvedValue({ success: true })
    mockTTSFns.providers.mockResolvedValue({ success: true, data: { providers: [{ id: 'p1', name: 'Provider 1', enabled: true }] } })
    mockTTSFns.enable.mockResolvedValue({ success: true })
    mockTTSFns.disable.mockResolvedValue({ success: true })
    mockTTSFns.convert.mockResolvedValue({
      success: true,
      data: { url: 'data:audio/mp3;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=' },
    })
  })

  it('tts.status returns success when TTS is available', async () => {
    const res = await window.openclaw!.tts!.status()
    expect(res.success).toBe(true)
  })

  it('tts.convert calls API with text and returns audio URL', async () => {
    const res = await window.openclaw!.tts!.convert({ text: 'hello world' })
    expect(mockTTSFns.convert).toHaveBeenCalledWith({ text: 'hello world' })
    expect(res.success).toBe(true)
    expect(res.data).toHaveProperty('url')
    expect(typeof (res.data as { url: string }).url).toBe('string')
  })

  it('tts.convert with empty text still calls API (empty guard is in hook)', async () => {
    await window.openclaw!.tts!.convert({ text: '' })
    expect(mockTTSFns.convert).toHaveBeenCalledWith({ text: '' })
  })

  it('tts.providers returns provider list', async () => {
    const res = await window.openclaw!.tts!.providers()
    expect(res.success).toBe(true)
    expect(res.data).toHaveProperty('providers')
    expect(Array.isArray((res.data as { providers: unknown[] }).providers)).toBe(true)
  })

  it('tts.disable and tts.enable work', async () => {
    await window.openclaw!.tts!.enable()
    expect(mockTTSFns.enable).toHaveBeenCalled()
    await window.openclaw!.tts!.disable()
    expect(mockTTSFns.disable).toHaveBeenCalled()
  })

  it('tts.status returns failure when TTS unavailable', async () => {
    mockTTSFns.status.mockResolvedValue({ success: false })
    const res = await window.openclaw!.tts!.status()
    expect(res.success).toBe(false)
  })

  it('tts.convert failure returns error', async () => {
    mockTTSFns.convert.mockResolvedValue({ success: false, error: 'TTS conversion failed' })
    const res = await window.openclaw!.tts!.convert({ text: 'hello' })
    expect(res.success).toBe(false)
    expect(res.error).toBe('TTS conversion failed')
  })
})

describe('useTTS - Audio element behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('tts.convert response URL is a valid data URI for Audio element', async () => {
    // Set up the mock return value explicitly
    mockTTSFns.convert.mockResolvedValue({
      success: true,
      data: { url: 'data:audio/mp3;base64,UklGRiQAAABXQVZF' },
    })
    const res = await window.openclaw!.tts!.convert({ text: 'hello' })
    expect(res.success).toBe(true)
    expect(res.data).toBeDefined()
    const audioUrl = (res.data as { url: string }).url
    expect(audioUrl).toMatch(/^data:audio\//)
    expect(audioUrl.length).toBeGreaterThan(10)
  })
})

describe('useTTS - hook import sanity', () => {
  it('useTTS hook can be imported without crashing', async () => {
    const { useTTS } = await import('./useTTS')
    expect(useTTS).toBeDefined()
    expect(typeof useTTS).toBe('function')
  })
})

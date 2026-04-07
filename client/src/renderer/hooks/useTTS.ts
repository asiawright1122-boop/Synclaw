/**
 * useTTS.ts — Hook for Text-to-Speech via OpenClaw Gateway
 *
 * Wraps window.openclaw.tts.* API and provides audio playback via HTMLAudioElement.
 * Gracefully degrades if TTS is unavailable.
 *
 * NOTE: window.openclaw.tts.convert() is a request-response API — it returns a
 * complete audio URL, NOT a stream. It does NOT provide word-level timing data.
 * Word synchronization for TTS playback is simulated using estimated per-word
 * duration: estimatedWordDuration = audio.duration / wordCount, updated via
 * HTMLAudioElement's ontimeupdate event.
 */
import { useState, useCallback, useEffect, useRef } from 'react'

export interface TTSProvider {
  id: string
  name: string
  enabled?: boolean
}

export interface TTSState {
  isAvailable: boolean
  isPlaying: boolean
  isPaused: boolean
  currentText: string
  providers: TTSProvider[]
  currentProvider: string | null
  speed: number
  volume: number
  isLoading: boolean
  error: string | null
  /** 0-based index of the word currently being spoken (estimated via timeUpdate) */
  currentWordIndex: number
}

export interface TTSControls {
  speak: (text: string) => Promise<void>
  stop: () => void
  pause: () => void
  resume: () => void
  setSpeed: (speed: number) => void
  setVolume: (volume: number) => void
  enableProvider: (providerId: string) => Promise<void>
  disableProvider: () => Promise<void>
  /** Start word highlight tracking for the current speech */
  startHighlightTracking: () => void
  /** Stop word highlight tracking */
  stopHighlightTracking: () => void
}

const DEFAULT_SPEED = 1.0
const DEFAULT_VOLUME = 1.0
const MIN_SPEED = 0.5
const MAX_SPEED = 2.0

export function useTTS(): TTSState & TTSControls {
  const [isAvailable, setIsAvailable] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentText, setCurrentText] = useState('')
  const [providers, setProviders] = useState<TTSProvider[]>([])
  const [currentProvider, setCurrentProvider] = useState<string | null>(null)
  const [speed, setSpeedState] = useState(DEFAULT_SPEED)
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** 0-based index of the word being spoken (-1 when idle) */
  const [currentWordIndex, setCurrentWordIndex] = useState(-1)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const currentAudioUrl = useRef<string | null>(null)
  /** Words split from currentText for word-sync highlight */
  const wordsRef = useRef<string[]>([])
  /** Estimated duration per word in seconds */
  const estimatedWordDurationRef = useRef(0)

  // Initialize: check TTS availability and load providers
  const initialize = useCallback(async () => {
    if (!window.openclaw?.tts) {
      setIsAvailable(false)
      return
    }

    try {
      const statusRes = await window.openclaw.tts.status()
      setIsAvailable(statusRes.success)

      if (statusRes.success) {
        const providersRes = await window.openclaw.tts.providers()
        if (providersRes.success && providersRes.data) {
          const data = providersRes.data as Record<string, unknown>
          const list = data.providers as TTSProvider[] | undefined
          if (Array.isArray(list)) {
            setProviders(list)
            const enabled = list.find(p => p.enabled)
            if (enabled) setCurrentProvider(enabled.id)
          }
        }
      }
    } catch (err) {
      console.error('[useTTS] Failed to initialize TTS:', err)
      setIsAvailable(false)
    }
  }, [])

  // Word-sync highlight tracking callbacks
  const startHighlightTracking = useCallback(() => {
    setCurrentWordIndex(-1)
    wordsRef.current = []
    estimatedWordDurationRef.current = 0
  }, [])

  const stopHighlightTracking = useCallback(() => {
    setCurrentWordIndex(-1)
    wordsRef.current = []
    estimatedWordDurationRef.current = 0
  }, [])

  useEffect(() => {
    initialize()
  }, [initialize])

  // Cleanup audio URL on unmount
  useEffect(() => {
    return () => {
      if (currentAudioUrl.current) {
        URL.revokeObjectURL(currentAudioUrl.current)
        currentAudioUrl.current = null
      }
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  // Apply speed/volume to current audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed
      audioRef.current.volume = volume
    }
  }, [speed, volume])

  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return
    if (!window.openclaw?.tts) {
      setError('TTS not available')
      return
    }

    // Stop any current playback
    stop()

    setIsLoading(true)
    setError(null)
    setCurrentText(text)
    // Split text into words for sync highlight tracking
    wordsRef.current = text.trim().split(/\s+/)
    estimatedWordDurationRef.current = 0
    setCurrentWordIndex(-1)

    try {
      const res = await window.openclaw.tts.convert({ text })

      if (!res.success) {
        throw new Error(res.error || 'TTS conversion failed')
      }

      const data = res.data as Record<string, unknown>
      const audioUrl = data.url as string | undefined

      if (!audioUrl) {
        throw new Error('No audio URL in TTS response')
      }

      // Clean up previous URL
      if (currentAudioUrl.current) {
        URL.revokeObjectURL(currentAudioUrl.current)
      }

      // Create new audio element
      const audio = new Audio(audioUrl)
      audio.playbackRate = speed
      audio.volume = volume

      // Capture duration once metadata is loaded (before play starts)
      audio.onloadedmetadata = () => {
        if (wordsRef.current.length > 0 && !isNaN(audio.duration) && audio.duration > 0) {
          estimatedWordDurationRef.current = audio.duration / wordsRef.current.length
        }
      }

      audio.onplay = () => {
        setIsPlaying(true)
        setIsPaused(false)
      }

      audio.onpause = () => {
        setIsPlaying(false)
        setIsPaused(true)
      }

      audio.onended = () => {
        setIsPlaying(false)
        setIsPaused(false)
        setCurrentWordIndex(-1)
        setCurrentText('')
        if (currentAudioUrl.current) {
          URL.revokeObjectURL(currentAudioUrl.current)
          currentAudioUrl.current = null
        }
      }

      audio.onerror = (e) => {
        console.error('[useTTS] Audio playback error:', e)
        setError('Audio playback failed')
        setIsPlaying(false)
        setIsPaused(false)
      }

      // Track playback progress for word-sync highlight
      audio.ontimeupdate = () => {
        const words = wordsRef.current
        const perWord = estimatedWordDurationRef.current
        if (words.length === 0 || perWord <= 0) return
        const idx = Math.min(
          Math.floor(audio.currentTime / perWord),
          words.length - 1
        )
        setCurrentWordIndex(idx)
      }

      audioRef.current = audio
      currentAudioUrl.current = audioUrl

      await audio.play()
    } catch (err) {
      console.error('[useTTS] speak error:', err)
      setError(err instanceof Error ? err.message : 'TTS failed')
      setIsPlaying(false)
    } finally {
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speed, volume])

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
    if (currentAudioUrl.current) {
      URL.revokeObjectURL(currentAudioUrl.current)
      currentAudioUrl.current = null
    }
    setIsPlaying(false)
    setIsPaused(false)
    setCurrentWordIndex(-1)
    wordsRef.current = []
    estimatedWordDurationRef.current = 0
    setCurrentText('')
  }, [])

  const pause = useCallback(() => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause()
    }
  }, [isPlaying])

  const resume = useCallback(() => {
    if (audioRef.current && isPaused) {
      audioRef.current.play().catch(err => {
        console.error('[useTTS] Resume failed:', err)
        setError('Resume failed')
      })
    }
  }, [isPaused])

  const setSpeed = useCallback((newSpeed: number) => {
    const clamped = Math.min(MAX_SPEED, Math.max(MIN_SPEED, newSpeed))
    setSpeedState(clamped)
    // Persist to settings
    window.electronAPI?.settings.set('tts.speed', clamped)
  }, [])

  const setVolume = useCallback((newVolume: number) => {
    const clamped = Math.min(1, Math.max(0, newVolume))
    setVolumeState(clamped)
    // Persist to settings
    window.electronAPI?.settings.set('tts.volume', clamped)
  }, [])

  const enableProvider = useCallback(async (providerId: string) => {
    if (!window.openclaw?.tts || !window.openclaw.ttsSetProvider) return

    try {
      setIsLoading(true)
      // Enable the TTS system, then switch to the requested provider
      await window.openclaw.tts.enable()
      await window.openclaw.ttsSetProvider({ providerId })
      setCurrentProvider(providerId)
    } catch (err) {
      console.error('[useTTS] enableProvider error:', err)
      setError('Failed to enable provider')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const disableProvider = useCallback(async () => {
    if (!window.openclaw?.tts) return

    try {
      setIsLoading(true)
      await window.openclaw.tts.disable()
      setCurrentProvider(null)
    } catch (err) {
      console.error('[useTTS] disableProvider error:', err)
      setError('Failed to disable provider')
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    isAvailable,
    isPlaying,
    isPaused,
    currentText,
    providers,
    currentProvider,
    speed,
    volume,
    isLoading,
    error,
    speak,
    stop,
    pause,
    resume,
    setSpeed,
    setVolume,
    enableProvider,
    disableProvider,
    currentWordIndex,
    startHighlightTracking,
    stopHighlightTracking,
  }
}

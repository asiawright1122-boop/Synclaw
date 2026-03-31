/**
 * VoiceModePanel.tsx — Voice mode panel for ChatView
 *
 * Provides:
 * - Mic button for voice input (hold to speak)
 * - Waveform visualization
 * - Speed/volume sliders
 * - TTS playback controls
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Square, Pause, Play, Volume2, Gauge } from 'lucide-react'
import { useTTS } from '../hooks/useTTS'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { t } from '../i18n'

interface VoiceModePanelProps {
  onTranscript?: (text: string) => void
}

const MIN_SPEED = 0.5
const MAX_SPEED = 2.0
const SPEED_STEP = 0.1

export function VoiceModePanel({ onTranscript }: VoiceModePanelProps) {
  const {
    isAvailable: ttsAvailable,
    isPlaying,
    isPaused,
    currentText,
    speed,
    volume,
    isLoading: ttsLoading,
    stop,
    pause,
    resume,
    setSpeed,
    setVolume,
  } = useTTS()

  const {
    isSupported: sttSupported,
    isListening,
    transcript,
    interimTranscript,
    error: sttError,
    startListening,
    stopListening,
    clearTranscript,
  } = useSpeechRecognition()

  const [showControls, setShowControls] = useState(false)
  const [waveformBars, setWaveformBars] = useState<number[]>(Array(12).fill(0.1))
  const animationRef = useRef<number | null>(null)

  // Animate waveform when listening
  useEffect(() => {
    if (isListening) {
      const animate = () => {
        setWaveformBars(prev =>
          prev.map(() => 0.2 + Math.random() * 0.8)
        )
        animationRef.current = requestAnimationFrame(animate)
      }
      animationRef.current = requestAnimationFrame(animate)
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      setWaveformBars(Array(12).fill(0.1))
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isListening])

  // Notify parent of transcript changes
  useEffect(() => {
    if (transcript && onTranscript) {
      onTranscript(transcript)
      clearTranscript()
    }
  }, [transcript, onTranscript, clearTranscript])

  // Handle mic button - hold to speak
  const handleMicMouseDown = useCallback(() => {
    if (!sttSupported) return
    startListening()
  }, [sttSupported, startListening])

  const handleMicMouseUp = useCallback(() => {
    if (isListening) {
      stopListening()
    }
  }, [isListening, stopListening])

  // Handle mic button - toggle on mobile (tap to toggle)
  const handleMicClick = useCallback(() => {
    if (!sttSupported) return
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [sttSupported, isListening, startListening, stopListening])

  // Handle keyboard shortcut (Space to toggle listening)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body && !e.repeat) {
        e.preventDefault()
        if (!sttSupported) return
        if (isListening) {
          stopListening()
        } else {
          startListening()
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault()
        if (isListening) {
          stopListening()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [sttSupported, isListening, startListening, stopListening])

  // If neither TTS nor STT is available, don't render
  if (!ttsAvailable && !sttSupported) {
    return null
  }

  const displayTranscript = interimTranscript || transcript

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="w-full px-4 py-3 rounded-t-2xl border-t"
      style={{
        background: 'var(--bg-subtle)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Transcript display */}
      <AnimatePresence>
        {displayTranscript && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 px-3 py-2 rounded-lg text-sm"
            style={{
              background: 'var(--bg-elevated)',
              color: 'var(--text)',
              fontStyle: 'italic',
            }}
          >
            {displayTranscript}
            {interimTranscript && (
              <span className="animate-pulse opacity-50">|</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error display */}
      <AnimatePresence>
        {sttError && sttError !== 'no-speech' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mb-2 px-3 py-1.5 rounded-lg text-xs"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
            }}
          >
            {t(`stt.error.${sttError}`) || sttError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Waveform visualization */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-center gap-0.5 h-8 mb-2"
          >
            {waveformBars.map((height, i) => (
              <motion.div
                key={i}
                className="w-1 rounded-full"
                style={{
                  background: 'var(--accent1)',
                  height: `${Math.max(4, height * 24)}px`,
                }}
                animate={{
                  height: `${Math.max(4, height * 24)}px`,
                }}
                transition={{
                  duration: 0.1,
                  ease: 'easeOut',
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls row */}
      <div className="flex items-center gap-3">
        {/* Mic button */}
        {sttSupported && (
          <div className="relative group">
            <button
              type="button"
              onMouseDown={handleMicMouseDown}
              onMouseUp={handleMicMouseUp}
              onMouseLeave={handleMicMouseUp}
              onTouchStart={handleMicClick}
              onTouchEnd={handleMicMouseUp}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                isListening
                  ? 'bg-red-500 text-white shadow-lg scale-110'
                  : 'hover:bg-black/5'
              }`}
              style={{
                color: isListening ? '#fff' : 'var(--text-sec)',
              }}
              title={isListening ? t('voice.stopListening') : t('voice.startListening')}
            >
              {isListening ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>

            {/* Tooltip */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-sec)' }}
            >
              {isListening ? t('voice.releaseToStop') : t('voice.holdToSpeak')}
            </div>
          </div>
        )}

        {/* TTS playback controls */}
        {ttsAvailable && (isPlaying || isPaused || currentText) && (
          <>
            <button
              type="button"
              onClick={isPlaying ? pause : resume}
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors"
              style={{ color: 'var(--text-sec)' }}
              title={isPlaying ? t('voice.pause') : t('voice.resume')}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={stop}
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors"
              style={{ color: 'var(--text-sec)' }}
              title={t('voice.stop')}
            >
              <Square className="w-4 h-4" />
            </button>

            {/* Current playing text preview */}
            {currentText && (
              <div className="flex-1 text-xs truncate px-2" style={{ color: 'var(--text-sec)' }}>
                <span className="opacity-60">{t('voice.playing')}:</span>{' '}
                <span className="truncate">{currentText.slice(0, 50)}{currentText.length > 50 ? '...' : ''}</span>
              </div>
            )}
          </>
        )}

        {/* Loading indicator */}
        {ttsLoading && (
          <div className="w-8 h-8 rounded-full flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent1)', borderTopColor: 'transparent' }} />
          </div>
        )}

        <div className="flex-1" />

        {/* Settings toggle */}
        <button
          type="button"
          onClick={() => setShowControls(!showControls)}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors"
          style={{
            color: showControls ? 'var(--accent1)' : 'var(--text-ter)',
          }}
          title={t('voice.settings')}
        >
          <Gauge className="w-4 h-4" />
        </button>

        {/* Speed & Volume controls */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="flex items-center gap-3 overflow-hidden"
            >
              {/* Speed control */}
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--text-ter)' }}>
                  {t('voice.speed')}:
                </span>
                <input
                  type="range"
                  min={MIN_SPEED}
                  max={MAX_SPEED}
                  step={SPEED_STEP}
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="w-16 h-1 rounded-full appearance-none cursor-pointer"
                  style={{ background: 'var(--border)' }}
                />
                <span className="text-xs tabular-nums w-8" style={{ color: 'var(--text-sec)' }}>
                  {speed.toFixed(1)}x
                </span>
              </div>

              {/* Volume control */}
              <div className="flex items-center gap-2">
                <Volume2 className="w-3.5 h-3.5" style={{ color: 'var(--text-ter)' }} />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-16 h-1 rounded-full appearance-none cursor-pointer"
                  style={{ background: 'var(--border)' }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

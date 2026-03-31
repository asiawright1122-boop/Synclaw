/**
 * useSpeechRecognition.ts — Hook for Web Speech API (Speech-to-Text)
 *
 * Wraps the browser's SpeechRecognition API for voice input.
 * Gracefully degrades if the API is unavailable.
 */
import { useState, useCallback, useEffect, useRef } from 'react'

export interface TranscriptResult {
  transcript: string
  isFinal: boolean
  confidence: number
}

export interface SpeechRecognitionState {
  isSupported: boolean
  isListening: boolean
  transcript: string
  interimTranscript: string
  error: string | null
  finalResults: TranscriptResult[]
}

export interface SpeechRecognitionControls {
  startListening: (lang?: string) => void
  stopListening: () => void
  abortListening: () => void
  clearTranscript: () => void
}

// Type declarations for Web Speech API (prefixed to avoid clash with browser lib types)
interface W3SpeechErrorEvent extends Event {
  error: string
  message?: string
}

interface W3SpeechAlternative {
  transcript: string
  confidence: number
}

interface W3SpeechResult {
  readonly isFinal: boolean
  readonly length: number
  item(index: number): W3SpeechAlternative
  [index: number]: W3SpeechAlternative
}

interface W3SpeechResultList {
  readonly length: number
  item(index: number): W3SpeechResult
  [index: number]: W3SpeechResult
}

interface W3SpeechEvent extends Event {
  readonly resultIndex: number
  readonly results: W3SpeechResultList
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  onresult: ((event: W3SpeechEvent) => void) | null
  onerror: ((event: W3SpeechErrorEvent) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
  onspeechend: (() => void) | null
  onspeechstart: (() => void) | void | null
  start(): void
  stop(): void
  abort(): void
}

declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition
    webkitSpeechRecognition: new () => ISpeechRecognition
  }
}

export function useSpeechRecognition(): SpeechRecognitionState & SpeechRecognitionControls {
  const [isSupported, setIsSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [finalResults, setFinalResults] = useState<TranscriptResult[]>([])

  const recognitionRef = useRef<ISpeechRecognition | null>(null)
  const currentLang = useRef('zh-CN')
  // Avoids recreating the recognition instance on every interim update
  const interimRef = useRef('')

  // Check for Web Speech API support
  useEffect(() => {
    const supported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
    setIsSupported(supported)
  }, [])

  // Initialize SpeechRecognition instance
  const createRecognition = useCallback((): ISpeechRecognition | null => {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognitionClass) {
      return null
    }

    const recognition = new SpeechRecognitionClass()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    recognition.lang = currentLang.current

    recognition.onstart = () => {
      setIsListening(true)
      setError(null)
    }

    recognition.onresult = (event: W3SpeechEvent) => {
      let interim = ''
      let final = ''

      // Cast results to the proper indexed form
      type RecognizedResult = { isFinal: boolean; 0: { transcript: string } }
      const results = event.results as unknown as RecognizedResult[]
      for (let i = event.resultIndex; i < results.length; i++) {
        const result = results[i]
        if (result.isFinal) {
          final += result[0].transcript
        } else {
          interim += result[0].transcript
        }
      }

      if (interim) {
        interimRef.current = interim
        setInterimTranscript(interim)
      }

      if (final) {
        setTranscript(prev => prev + final)
        interimRef.current = ''
        setInterimTranscript('')
        setFinalResults(prev => [
          ...prev,
          {
            transcript: final,
            isFinal: true,
            confidence: event.results[event.resultIndex]?.[0]?.confidence ?? 1,
          } satisfies TranscriptResult,
        ])
      }
    }

    recognition.onerror = (event: W3SpeechErrorEvent) => {
      console.error('[useSpeechRecognition] Error:', event.error)

      let errorMessage: string
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'no-speech'
          break
        case 'audio-capture':
          errorMessage = 'audio-capture'
          break
        case 'not-allowed':
          errorMessage = 'not-allowed'
          break
        case 'network':
          errorMessage = 'network'
          break
        case 'aborted':
          errorMessage = 'aborted'
          break
        default:
          errorMessage = event.error
      }

      setError(errorMessage)
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
      // Use ref to avoid stale closure — interimTranscript is not a dep of createRecognition
      if (interimRef.current) {
        setTranscript(prev => prev + interimRef.current)
        setInterimTranscript('')
        interimRef.current = ''
      }
    }

    return recognition
  }, []) // createRecognition is stable — all mutable state accessed via refs

  const startListening = useCallback((lang?: string) => {
    if (!isSupported) {
      setError('Speech recognition not supported')
      return
    }

    if (isListening) {
      return
    }

    // Clean up previous instance
    if (recognitionRef.current) {
      recognitionRef.current.abort()
    }

    const langCode = lang || currentLang.current || 'zh-CN'
    currentLang.current = langCode

    const recognition = createRecognition()
    if (!recognition) {
      setError('Failed to create recognition instance')
      return
    }

    recognition.lang = langCode
    recognitionRef.current = recognition

    try {
      recognition.start()
    } catch (err) {
      console.error('[useSpeechRecognition] start error:', err)
      // If already started, stop and restart
      if (err instanceof Error && err.name === 'InvalidStateError') {
        recognition.abort()
        try {
          recognition.start()
        } catch (retryErr) {
          console.error('[useSpeechRecognition] retry error:', retryErr)
          setError('Failed to start recognition')
        }
      }
    }
  }, [isSupported, isListening, createRecognition])

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }, [isListening])

  const abortListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort()
      recognitionRef.current = null
      setIsListening(false)
      setInterimTranscript('')
    }
  }, [])

  const clearTranscript = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
    setFinalResults([])
    setError(null)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
        recognitionRef.current = null
      }
    }
  }, [])

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    finalResults,
    startListening,
    stopListening,
    abortListening,
    clearTranscript,
  }
}

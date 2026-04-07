/**
 * 主对话区：空态（横幅 + 蟹钳 Logo + 双卡片）+ 底部胶囊输入（附件 / 模型 / 发送）
 * 已接入 OpenClaw Gateway
 * 包含 Markdown 渲染、动画增强、右键菜单支持
 */
import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react'
import { useAppStore } from '../stores/appStore'
import { useChatStore } from '../stores/chatStore'
import { useGatewayStore } from '../stores/gatewayStore'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, User, ChevronDown, Paperclip, BadgeCheck, MessageCircle, X, Copy, Check, Volume2, Settings } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import type { ContextMenuItem } from '../hooks/useContextMenu'
import { t } from '../i18n'
import { AvatarSelector } from './AvatarSelector'
import { VoiceModePanel } from './VoiceModePanel'
import { useTTS } from '../hooks/useTTS'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { useGatewayStatusToast } from '../hooks/useGatewayStatusToast'
import { useToast } from './Toast'
import { DisconnectBanner } from './DisconnectBanner'
import 'highlight.js/styles/github-dark.css'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface ModelOption {
  id: string
  name: string
}

interface AttachmentFile {
  id: string
  name: string
  size: number
  mimeType: string
  content: string // base64 for small files, path reference for large
}

interface CodeBlockProps {
  children: React.ReactNode
  className?: string
}

function CodeBlock({ children, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const language = className?.replace('language-', '') || ''

  const handleCopy = async () => {
    const code = String(children).replace(/\n$/, '')
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="code-block-wrapper group relative">
      <div className="flex items-center justify-between px-3 py-1.5 border-b rounded-t-lg" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border)' }}>
        <span className="text-xs font-mono" style={{ color: 'var(--text-ter)' }}>
          {language || 'code'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className={`code-block-copy-btn ${copied ? 'copied' : ''}`}
          style={{ opacity: 1, position: 'static', transform: 'none' }}
        >
          {copied ? (
            <span className="flex items-center gap-1">
              <Check className="w-3 h-3" />
              {t('btn.copied')}
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Copy className="w-3 h-3" />
              {t('btn.copy')}
            </span>
          )}
        </button>
      </div>
      <pre style={{ margin: 0, borderRadius: '0 0 8px 8px' }}>
        <code className={className}>{children}</code>
      </pre>
    </div>
  )
}

function ClawLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 14c-2 0-3.5-1.5-4-3.5C2.5 8 4 6 6 6c1 0 2 .5 2.5 1.5" />
      <path d="M17 14c2 0 3.5-1.5 4-3.5C21.5 8 20 6 18 6c-1 0-2 .5-2.5 1.5" />
      <path d="M9 10c0-1.5 1-2.5 3-2.5s3 1 3 2.5v1c0 3-1.5 5-3 6.5-1.5-1.5-3-3.5-3-6.5v-1Z" />
      <path d="M12 8V6" />
    </svg>
  )
}

interface MessageBubbleProps {
  message: {
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    thinking?: boolean
    attachments?: Array<{
      id: string
      name: string
      size: number
      mimeType: string
    }>
  }
  onContextMenu: (e: React.MouseEvent) => void
}

const MessageBubble = memo(({ message, onContextMenu }: MessageBubbleProps) => {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'

  // Memoize markdown components to avoid recreating on each render
  const markdownComponents = useMemo(() => ({
    code: ({ className, children, ...props }: React.HTMLAttributes<HTMLElement> & { className?: string }) => {
      const isInline = !className
      if (isInline) {
        return (
          <code
            style={{
              background: 'var(--bg-subtle)',
              padding: '0.125rem 0.375rem',
              borderRadius: 4,
              fontSize: '0.875em',
              fontFamily: "'JetBrains Mono', monospace",
            }}
            {...props}
          >
            {children}
          </code>
        )
      }
      return (
        <CodeBlock className={className}>
          {children as React.ReactNode}
        </CodeBlock>
      )
    },
    pre: ({ children }: React.HTMLAttributes<HTMLElement>) => <>{children}</>,
  }), [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      exit={{ opacity: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
      onContextMenu={onContextMenu}
      data-context-menu
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
        style={
          isUser
            ? { background: 'var(--accent1)' }
            : { background: 'var(--accent-gradient)', color: '#fff' }
        }
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      <div
        className="max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed"
        style={
          isUser
            ? {
                background: 'var(--accent1)',
                color: '#fff',
                borderTopLeftRadius: 4,
                borderTopRightRadius: 16,
                borderBottomLeftRadius: 16,
                borderBottomRightRadius: 16,
              }
            : {
                background: 'var(--bg-elevated)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                borderTopLeftRadius: 16,
                borderTopRightRadius: 4,
                borderBottomLeftRadius: 16,
                borderBottomRightRadius: 16,
                boxShadow: 'var(--shadow-secondary)',
              }
        }
      >
        {message.thinking ? (
          <span style={{ color: 'var(--text-sec)', fontStyle: 'italic' }}>
            {message.content || t('chat.thinking')}
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              ▌
            </motion.span>
          </span>
        ) : isUser ? (
          <div className="flex flex-col gap-1.5">
            <span>{message.content}</span>
            {message.attachments && message.attachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {message.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                    style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)' }}
                  >
                    <Paperclip className="w-3 h-3 opacity-80" />
                    <span className="max-w-[100px] truncate">{att.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : isAssistant ? (
          <div className="prose prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={markdownComponents}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        ) : (
          <span>{message.content}</span>
        )}
      </div>
    </motion.div>
  )
}, (prev, next) => prev.message.id === next.message.id && prev.message.content === next.message.content && prev.message.thinking === next.message.thinking)

interface ChatViewProps {
  onShowContextMenu?: (items: ContextMenuItem[], x: number, y: number) => void
}

export function ChatView({ onShowContextMenu }: ChatViewProps) {
  const [input, setInput] = useState('')
  const [modelOpen, setModelOpen] = useState(false)
  const [models, setModels] = useState<ModelOption[]>([])
  const [attachments, setAttachments] = useState<AttachmentFile[]>([])
  const [voiceModeOpen, setVoiceModeOpen] = useState(false)
  const [autoPlayTTS, setAutoPlayTTS] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const modelMenuRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { currentModel, setCurrentModel, selectedAvatar, setActiveTab, setActiveView, setSettingsModalOpen, setSettingsSection } = useAppStore()
  const { messages, sending, sendMessage, abortRun, init } = useChatStore()

  // Gateway status from unified store
  const status = useGatewayStore((s) => s.status)
  const reconnect = useGatewayStore((s) => s.reconnect)
  const isConnected = status === 'connected' || status === 'ready'
  const isDisconnected = status === 'disconnected' || status === 'error'
  const initRef = useRef(init)
  initRef.current = init

  // TTS hook for auto-playing AI responses
  const { isAvailable: ttsAvailable, speak } = useTTS()

  // STT hook for voice input
  const { isSupported: sttSupported } = useSpeechRecognition()

  // Gateway status Toast notifications
  useGatewayStatusToast()

  // Toast for TTS errors
  const toast = useToast()

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Toggle voice mode via keyboard shortcut (Cmd+Shift+M)
  useEffect(() => {
    const handler = () => {
      setVoiceModeOpen(v => !v)
    }
    document.addEventListener('voice:toggle', handler)
    return () => document.removeEventListener('voice:toggle', handler)
  }, [])

  // Auto-play TTS when AI response completes
  const lastAssistantMessageRef = useRef<string | null>(null)
  useEffect(() => {
    if (!autoPlayTTS || !ttsAvailable) return

    const lastMessage = messages[messages.length - 1]
    if (!lastMessage || lastMessage.role !== 'assistant') return

    // Check if this is a new completed response (not still streaming)
    if (lastMessage.content !== lastAssistantMessageRef.current) {
      lastAssistantMessageRef.current = lastMessage.content

      // Only speak if message is complete (no thinking indicator)
      if (!lastMessage.thinking && lastMessage.content.trim()) {
        // Small delay to allow streaming to complete
        const timer = setTimeout(() => {
          speak(lastMessage.content).catch(() => {
            toast.error('语音播放失败', 3000)
          })
        }, 500)
        return () => clearTimeout(timer)
      }
    }
  }, [messages, autoPlayTTS, ttsAvailable, speak])

  // Load auto-play preference
  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const res = await window.electronAPI?.settings.get()
        if (res?.success && res.data) {
          const data = res.data as unknown as Record<string, unknown>
          setAutoPlayTTS((data.ttsAutoPlay as boolean) ?? false)
        }
      } catch {
        // Ignore
      }
    }
    loadPrefs()
  }, [])

  // Close model dropdown when clicking outside
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
        setModelOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  // Initialize chat store and OpenClaw connection
  useEffect(() => {
    if (!window.openclaw) return

    let cleanup: (() => void) | undefined

    const initChat = async () => {
      cleanup = await initRef.current()
    }

    initChat()

    // Load model list
    const loadModels = async () => {
      try {
        const result = await window.openclaw!.models.list()
        if (result.success && result.data) {
          const modelList = result.data as Array<{ id: string; name?: string }>
          setModels(modelList.map((m) => ({
            id: m.id,
            name: m.name || m.id,
          })))
        }
      } catch (error) {
        console.error('[ChatView] Failed to load models:', error)
      }
    }
    loadModels()

    return () => {
      cleanup?.()
    }
  }, [])

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`
    }
  }, [input])

  const handleSend = useCallback(async () => {
    if (!input.trim() || sending) return
    const userMessage = input.trim()
    const hasAttachments = attachments.length > 0

    // Build message with attachment references
    let fullMessage = userMessage
    if (hasAttachments) {
      const attList = attachments.map(a =>
        `📎 [附件] ${a.name} (${formatFileSize(a.size)})`
      ).join('\n')
      fullMessage = `${userMessage}\n\n${attList}`
    }

    setInput('')
    setAttachments([])
    try {
      await sendMessage(fullMessage, currentModel, selectedAvatar?.id, hasAttachments ? attachments : undefined)
    } catch (error) {
      console.error('[ChatView] Send error:', error)
    }
  }, [input, sending, sendMessage, currentModel, selectedAvatar, attachments])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const MAX_ATTACHMENTS = 5
    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

    const newFiles: AttachmentFile[] = []
    for (const file of files) {
      if (attachments.length + newFiles.length >= MAX_ATTACHMENTS) break
      if (file.size > MAX_FILE_SIZE) {
        console.warn(`[ChatView] File too large: ${file.name} (${file.size} bytes)`)
        continue
      }

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      newFiles.push({
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: file.name,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
        content: base64,
      })
    }

    setAttachments(prev => [...prev, ...newFiles])

    // Reset file input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id))
  }

  const handleModelChange = async (modelId: string) => {
    setCurrentModel(modelId)
    setModelOpen(false)
    if (!window.openclaw) return
    try {
      await window.openclaw.models.setCurrent({ modelId })
    } catch (error) {
      console.error('[ChatView] Failed to set model:', error)
    }
  }

  const handleStop = () => {
    abortRun()
  }

  const handleMessageContextMenu = (message: { id: string; content: string }, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onShowContextMenu?.([
      {
        label: '复制',
        icon: <Copy className="w-4 h-4" />,
        onClick: () => navigator.clipboard.writeText(message.content),
      },
      {
        label: '复制消息 ID',
        onClick: () => navigator.clipboard.writeText(message.id),
      },
      { label: '', onClick: () => {}, separator: true } as unknown as ContextMenuItem,
      {
        label: '朗读',
        icon: <Volume2 className="w-4 h-4" />,
        onClick: () => speak(message.content).catch(() => {
          toast.error('语音播放失败', 3000)
        }),
      },
      {
        label: '全选',
        onClick: () => document.execCommand('selectAll'),
      },
    ], e.clientX, e.clientY)
  }

  // Handle transcript from voice input
  const handleVoiceTranscript = useCallback((text: string) => {
    setInput(text)
    inputRef.current?.focus()
  }, [])

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: 'var(--bg-container)' }}>
      {/* Disconnect Banner */}
      <DisconnectBanner />

      {/* Connection status bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: isConnected ? '#22c55e' : '#ef4444' }}
            />
            <span className="text-xs" style={{ color: 'var(--text-sec)' }}>
              {isConnected ? t('status.connected') : t('status.disconnected')}
            </span>
          </div>

          {/* Avatar indicator */}
          {selectedAvatar && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('avatar')
                setActiveView('chat')
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors"
              style={{
                background: 'rgba(252,93,30,0.08)',
                color: 'var(--accent1)',
                border: '1px solid rgba(252,93,30,0.2)',
              }}
            >
              <Bot className="w-3 h-3" />
              <span className="font-medium max-w-[100px] truncate">{selectedAvatar.name}</span>
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            if (!window.openclaw) return
            if (isDisconnected) {
              reconnect()
            } else if (isConnected) {
              window.openclaw.disconnect()
            }
          }}
          className="text-xs px-3 py-1 rounded-full cursor-pointer transition-colors"
          style={{
            background: isConnected ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
            color: isConnected ? '#ef4444' : '#22c55e',
            border: `1px solid ${isConnected ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
          }}
        >
          {isConnected ? t('btn.disconnect') : t('btn.connect')}
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <AnimatePresence mode="wait">
          {messages.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-2xl mx-auto flex flex-col items-center"
            >
              {/* 积分促销条 */}
              <button
                type="button"
                className="mb-8 px-4 py-2 rounded-full text-xs font-medium transition-opacity hover:opacity-90"
                style={{
                  background: 'rgba(252, 93, 30, 0.12)',
                  color: 'var(--accent1)',
                  border: '1px solid rgba(252, 93, 30, 0.25)',
                }}
                onClick={() => {
                  window.openclaw?.ui?.openCredits?.()
                }}
              >
                {t('chat.banner.text')} <span className="mx-1 opacity-60">|</span> {t('chat.banner.link')}
              </button>

              <div className="mb-5" style={{ color: 'var(--accent1)' }}>
                <ClawLogo className="w-[72px] h-[72px] mx-auto" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight mb-2" style={{ color: 'var(--text)' }}>
                {t('chat.title')}
              </h2>
              <p className="text-sm text-center mb-10 max-w-md leading-relaxed" style={{ color: 'var(--text-sec)' }}>
                {t('chat.subtitle')}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl">
                <button
                  type="button"
                  onClick={() => {
                    setSettingsSection('models')
                    setSettingsModalOpen(true)
                  }}
                  className="text-left rounded-[14px] p-5 border transition-shadow hover:shadow-md cursor-pointer"
                  style={{
                    background: 'var(--bg-container)',
                    borderColor: 'var(--border)',
                    boxShadow: 'var(--shadow-secondary)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <BadgeCheck className="w-4 h-4" style={{ color: 'var(--accent1)' }} />
                    <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                      {t('chat.card.quick.title')}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-sec)' }}>
                    {t('chat.card.quick.desc')}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('chat')
                    setActiveView('chat')
                  }}
                  className="text-left rounded-[14px] p-5 border transition-shadow hover:shadow-md cursor-pointer"
                  style={{
                    background: 'var(--bg-container)',
                    borderColor: 'var(--border)',
                    boxShadow: 'var(--shadow-secondary)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <MessageCircle className="w-4 h-4" style={{ color: 'var(--accent1)' }} />
                    <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                      {t('chat.card.im.title')}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-sec)' }}>
                    {t('chat.card.im.desc')}
                  </p>
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="messages"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-3xl mx-auto space-y-4"
            >
              <AnimatePresence>
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3) }}
                  >
                    <MessageBubble
                      message={message}
                      onContextMenu={(e) => handleMessageContextMenu(message, e)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* AI 响应骨架屏 — sending 时显示 */}
              <AnimatePresence>
                {sending && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    {/* User thought skeleton (right-aligned) */}
                    <div className="flex gap-3 flex-row-reverse">
                      <div className="w-8 h-8 rounded-full" style={{ background: 'var(--accent1)' }} />
                      <div
                        className="max-w-[70%] px-4 py-3 rounded-2xl space-y-2"
                        style={{ background: 'var(--accent1)', borderTopLeftRadius: 4, borderTopRightRadius: 16, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}
                      >
                        <div className="h-3 rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.25)', width: '60%' }} />
                      </div>
                    </div>
                    {/* Assistant response skeletons (left-aligned) */}
                    {[1, 2].map((i) => (
                      <div key={i} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full" style={{ background: 'var(--accent-gradient)' }} />
                        <div
                          className="max-w-[70%] px-4 py-3 rounded-2xl space-y-2"
                          style={{
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border)',
                            borderTopLeftRadius: 16,
                            borderTopRightRadius: 4,
                            borderBottomLeftRadius: 16,
                            borderBottomRightRadius: 16,
                          }}
                        >
                          <div className="h-3 rounded-full animate-pulse" style={{ background: 'var(--border)', animationDelay: `${i * 150}ms` }} />
                          <div className="h-3 rounded-full animate-pulse" style={{ background: 'var(--border)', width: '80%', animationDelay: `${i * 150 + 100}ms` }} />
                          {i === 1 && <div className="h-3 rounded-full animate-pulse" style={{ background: 'var(--border)', width: '55%' }} />}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 底部胶囊输入 */}
      <div className="flex-shrink-0 px-6 pb-5 pt-2">
        {/* 附件标签区 */}
        <AnimatePresence>
          {attachments.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="max-w-3xl mx-auto mb-2 overflow-hidden"
            >
              <div className="flex flex-wrap gap-2 p-2 rounded-xl border"
                style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border)' }}
              >
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs border"
                    style={{
                      background: 'var(--bg-elevated)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-sec)',
                    }}
                  >
                    <Paperclip className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--accent1)' }} />
                    <span className="max-w-[120px] truncate">{att.name}</span>
                    <span className="opacity-60">{formatFileSize(att.size)}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(att.id)}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-black/[0.08] transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center text-xs px-1" style={{ color: 'var(--text-ter)' }}>
                  {attachments.length}/5
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div
          className="max-w-3xl mx-auto flex items-end gap-2 pl-2 pr-2 py-2 rounded-full border"
          style={{
            background: 'var(--bg-subtle)',
            borderColor: 'var(--border)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          {/* 隐藏的文件输入 */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="*/*"
            className="hidden"
            onChange={handleFileChange}
          />

          <button
            type="button"
            className="p-2 rounded-full flex-shrink-0 mb-0.5 hover:bg-black/[0.05] transition-colors relative"
            style={{ color: attachments.length > 0 ? 'var(--accent1)' : 'var(--text-ter)' }}
            title={t('chat.attached')}
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="w-[18px] h-[18px]" />
            {attachments.length > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                style={{ background: 'var(--accent1)' }}
              >
                {attachments.length}
              </span>
            )}
          </button>

          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('chat.placeholder')}
            className="flex-1 bg-transparent border-none outline-none text-sm resize-none min-h-[36px] max-h-[120px] py-2"
            style={{ color: 'var(--text)' }}
            rows={1}
            disabled={sending}
          />

          <div className="relative flex-shrink-0 mb-0.5" ref={modelMenuRef}>
            <button
              type="button"
              onClick={() => setModelOpen(!modelOpen)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium max-w-[140px]"
              style={{
                background: 'var(--bg-container)',
                border: '1px solid var(--border)',
                color: 'var(--text-sec)',
              }}
            >
              <span className="truncate">{currentModel}</span>
              <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
            </button>
            {modelOpen ? (
              <div
                className="absolute bottom-full right-0 mb-1 rounded-xl overflow-hidden z-50 min-w-[180px]"
                style={{ background: 'var(--bg-container)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
              >
                {models.length > 0 ? (
                  models.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleModelChange(m.id)}
                      className="block w-full text-left px-4 py-2.5 text-sm transition-colors"
                      style={{
                        color: m.id === currentModel ? 'var(--accent1)' : 'var(--text)',
                        background: m.id === currentModel ? 'var(--bg-subtle)' : 'transparent',
                      }}
                    >
                      {m.name}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-2.5 text-sm" style={{ color: 'var(--text-sec)' }}>
                    {t('generic.loading')}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Avatar selector */}
          <AvatarSelector />

          {/* Voice mode button */}
          {(ttsAvailable || sttSupported) && (
            <button
              type="button"
              onClick={() => setVoiceModeOpen(!voiceModeOpen)}
              className={`p-2 rounded-full flex-shrink-0 mb-0.5 transition-colors ${
                voiceModeOpen ? 'bg-opacity-20' : 'hover:bg-black/[0.05]'
              }`}
              style={{
                color: voiceModeOpen ? 'var(--accent1)' : 'var(--text-ter)',
                background: voiceModeOpen ? 'rgba(252, 93, 30, 0.1)' : undefined,
              }}
              title={voiceModeOpen ? t('voice.closePanel') : t('voice.openPanel')}
            >
              {voiceModeOpen ? <Settings className="w-[18px] h-[18px]" /> : <Volume2 className="w-[18px] h-[18px]" />}
            </button>
          )}

          {sending ? (
            <motion.button
              type="button"
              onClick={handleStop}
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5"
              style={{ background: '#ef4444', color: '#fff' }}
              title="停止"
              whileTap={{ scale: 0.95 }}
            >
              <X className="w-4 h-4" />
            </motion.button>
          ) : (
            <motion.button
              type="button"
              onClick={handleSend}
              disabled={!input.trim()}
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5 transition-all disabled:opacity-35"
              style={{
                background: input.trim() ? 'var(--accent1)' : '#c8c8c8',
                color: '#fff',
              }}
              title="发送"
              whileTap={{ scale: 0.95 }}
            >
              <Send className="w-4 h-4" />
            </motion.button>
          )}
        </div>

        {/* Voice Mode Panel */}
        <AnimatePresence>
          {voiceModeOpen && (
            <VoiceModePanel
              onTranscript={handleVoiceTranscript}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

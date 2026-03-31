/**
 * AvatarSelector - Dropdown selector for switching avatars in ChatView
 * Appears near the input field, shows current avatar and quick switch
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, ChevronDown, Check, Loader2, X } from 'lucide-react'
import { useAvatarStore, type Avatar } from '../stores/avatarStore'
import { AVATAR_TEMPLATES } from '../lib/avatar-templates'

interface AvatarSelectorProps {
  onAvatarChange?: (avatar: Avatar) => void
}

function ClawGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 14c-2 0-3.5-1.5-4-3.5C2.5 8 4 6 6 6c1 0 2 .5 2.5 1.5" />
      <path d="M17 14c2 0 3.5-1.5 4-3.5C21.5 8 20 6 18 6c-1 0-2 .5-2.5 1.5" />
      <path d="M9 10c0-1.5 1-2.5 3-2.5s3 1 3 2.5v1c0 3-1.5 5-3 6.5-1.5-1.5-3-3.5-3-6.5v-1Z" />
      <path d="M12 8V6" />
    </svg>
  )
}

export function AvatarSelector({ onAvatarChange }: AvatarSelectorProps) {
  const {
    avatars,
    activeAvatarId,
    loading,
    loadAvatars,
    activateAvatar,
    createFromTemplate,
  } = useAvatarStore()

  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Get current active avatar
  const activeAvatar = avatars.find(av => av.id === activeAvatarId) || avatars[0]

  // Load avatars on mount
  useEffect(() => {
    if (avatars.length === 0) {
      loadAvatars()
    }
  }, [loadAvatars, avatars.length])

  // Close on outside click
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', close)
      return () => document.removeEventListener('mousedown', close)
    }
  }, [open])

  // Filter avatars by search
  const filteredAvatars = search.trim()
    ? avatars.filter(av =>
        av.name.toLowerCase().includes(search.toLowerCase()) ||
        (av.description || '').toLowerCase().includes(search.toLowerCase())
      )
    : avatars

  // Handle avatar selection
  const handleSelect = useCallback(async (avatar: Avatar) => {
    await activateAvatar(avatar.id)
    onAvatarChange?.(avatar)
    setOpen(false)
    setSearch('')
  }, [activateAvatar, onAvatarChange])

  // Handle creating from template inline
  const handleCreateFromTemplate = useCallback(async (templateId: string) => {
    setCreating(templateId)
    const newAvatar = await createFromTemplate(templateId)
    if (newAvatar) {
      await activateAvatar(newAvatar.id)
      onAvatarChange?.(newAvatar)
    }
    setCreating(null)
    setOpen(false)
    setSearch('')
  }, [createFromTemplate, activateAvatar, onAvatarChange])

  return (
    <div className="relative flex-shrink-0 mb-0.5">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium max-w-[160px]"
        style={{
          background: activeAvatar?.color ? `${activeAvatar.color}15` : 'var(--bg-container)',
          border: `1px solid ${activeAvatar?.color || 'var(--border)'}40`,
          color: 'var(--text-sec)',
        }}
      >
        {loading && avatars.length === 0 ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
        ) : activeAvatar ? (
          <span className="text-sm flex-shrink-0">{activeAvatar.emoji || '🤖'}</span>
        ) : (
          <Bot className="w-3.5 h-3.5 flex-shrink-0" />
        )}
        <span className="truncate">{activeAvatar?.name || '选择分身'}</span>
        <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full right-0 mb-1 rounded-xl overflow-hidden z-50"
            style={{
              background: 'var(--bg-container)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow)',
              width: 240,
              maxHeight: 360,
            }}
          >
            {/* Search */}
            <div className="p-2 border-b" style={{ borderColor: 'var(--border)' }}>
              <div
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                style={{ background: 'var(--bg-subtle)' }}
              >
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索分身..."
                  className="flex-1 bg-transparent border-none outline-none text-xs"
                  style={{ color: 'var(--text)' }}
                  autoFocus
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="p-0.5 rounded hover:bg-white/5"
                    style={{ color: 'var(--text-ter)' }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Avatar list */}
            <div className="overflow-y-auto" style={{ maxHeight: 240 }}>
              {filteredAvatars.length > 0 ? (
                filteredAvatars.map((avatar) => (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => handleSelect(avatar)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors"
                    style={{
                      background: avatar.id === activeAvatarId ? 'var(--bg-subtle)' : 'transparent',
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                      style={{ background: avatar.color || 'var(--accent1)' }}
                    >
                      {avatar.emoji ? (
                        <span>{avatar.emoji}</span>
                      ) : avatar.id.startsWith('ac') || avatar.id === 'AutoClaw' ? (
                        <ClawGlyph className="w-4 h-4 text-white" />
                      ) : (
                        <Bot className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                        {avatar.name}
                      </p>
                    </div>
                    {avatar.id === activeAvatarId && (
                      <Check className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent1)' }} />
                    )}
                  </button>
                ))
              ) : !search && avatars.length === 0 ? (
                <div className="px-3 py-6 text-center">
                  <Bot className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-ter)' }} />
                  <p className="text-xs" style={{ color: 'var(--text-sec)' }}>还没有分身</p>
                </div>
              ) : (
                <div className="px-3 py-4 text-center">
                  <p className="text-xs" style={{ color: 'var(--text-sec)' }}>未找到匹配的分身</p>
                </div>
              )}
            </div>

            {/* Quick create from template */}
            {!search && (
              <div className="p-2 border-t" style={{ borderColor: 'var(--border)' }}>
                <p className="text-[10px] font-medium px-1 mb-1.5" style={{ color: 'var(--text-ter)' }}>
                  快速创建
                </p>
                <div className="flex flex-wrap gap-1">
                  {AVATAR_TEMPLATES.slice(0, 4).map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => handleCreateFromTemplate(template.id)}
                      disabled={creating !== null}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors"
                      style={{
                        background: 'var(--bg-subtle)',
                        color: 'var(--text-sec)',
                      }}
                    >
                      {creating === template.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <span>{template.emoji}</span>
                      )}
                      <span>{template.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

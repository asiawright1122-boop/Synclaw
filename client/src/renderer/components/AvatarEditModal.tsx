/**
 * AvatarEditModal - Slide-up modal for creating/editing avatars
 * Supports creation from scratch or from a template
 */
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, User, Palette, FileText, Sparkles, Check } from 'lucide-react'
import { useAvatarStore, type Avatar, type CreateAvatarParams } from '../stores/avatarStore'
import { AVATAR_TEMPLATES, type AvatarTemplate } from '../lib/avatar-templates'

interface AvatarEditModalProps {
  open: boolean
  onClose: () => void
  editAvatar?: Avatar | null
  initialTemplateId?: string
}

const EMOJI_OPTIONS = ['🤖', '💻', '✍️', '📋', '🔍', '📊', '🎨', '🚀', '💡', '🔧', '📚', '🎯']
const COLOR_OPTIONS = [
  '#fc5d1e', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b',
  '#ec4899', '#06b6d4', '#84cc16', '#f43f5e', '#6366f1',
]

export function AvatarEditModal({
  open,
  onClose,
  editAvatar,
  initialTemplateId,
}: AvatarEditModalProps) {
  const { createAvatar, updateAvatar, loading } = useAvatarStore()

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [personality, setPersonality] = useState('')
  const [emoji, setEmoji] = useState('🤖')
  const [color, setColor] = useState('#fc5d1e')
  const [showTemplates, setShowTemplates] = useState(!editAvatar && !initialTemplateId)

  // Load template or avatar data when modal opens
  useEffect(() => {
    if (open) {
      if (editAvatar) {
        // Edit mode
        setName(editAvatar.name)
        setDescription(editAvatar.description || '')
        setPersonality(editAvatar.personality || '')
        setEmoji(editAvatar.emoji || '🤖')
        setColor(editAvatar.color || '#fc5d1e')
        setShowTemplates(false)
      } else if (initialTemplateId) {
        // Create from template
        const template = AVATAR_TEMPLATES.find(t => t.id === initialTemplateId)
        if (template) {
          setName(template.name)
          setDescription(template.description)
          setPersonality(template.personality)
          setEmoji(template.emoji)
          setColor(template.color)
        }
        setShowTemplates(false)
      } else {
        // Fresh create
        setName('')
        setDescription('')
        setPersonality('')
        setEmoji('🤖')
        setColor('#fc5d1e')
        setShowTemplates(true)
      }
    }
  }, [open, editAvatar, initialTemplateId])

  const handleApplyTemplate = useCallback((template: AvatarTemplate) => {
    setName(template.name)
    setDescription(template.description)
    setPersonality(template.personality)
    setEmoji(template.emoji)
    setColor(template.color)
    setShowTemplates(false)
  }, [])

  const handleSave = useCallback(async () => {
    if (!name.trim()) return

    const params: CreateAvatarParams = {
      name: name.trim(),
      description: description.trim(),
      personality: personality.trim(),
      emoji,
      color,
    }

    if (editAvatar) {
      await updateAvatar({ id: editAvatar.id, ...params })
    } else {
      await createAvatar(params)
    }

    onClose()
  }, [name, description, personality, emoji, color, editAvatar, createAvatar, updateAvatar, onClose])

  const handleClose = useCallback(() => {
    if (!loading) {
      onClose()
    }
  }, [loading, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0, 0, 0, 0.5)' }}
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-0 right-0 bottom-0 z-50 rounded-t-2xl overflow-hidden"
            style={{
              background: 'var(--bg-container)',
              maxHeight: '85vh',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                  style={{ background: color }}
                >
                  {emoji}
                </div>
                <div>
                  <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>
                    {editAvatar ? '编辑分身' : '创建分身'}
                  </h2>
                  <p className="text-xs" style={{ color: 'var(--text-sec)' }}>
                    {editAvatar ? '修改分身信息' : '从模板快速创建或自定义'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ color: 'var(--text-sec)' }}
                disabled={loading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(85vh - 140px)' }}>
              {/* Template selection (only for new avatars) */}
              {showTemplates && !editAvatar && (
                <div className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4" style={{ color: 'var(--accent1)' }} />
                    <h3 className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                      选择模板快速开始
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {AVATAR_TEMPLATES.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => handleApplyTemplate(template)}
                        className="flex items-start gap-3 p-3 rounded-xl border text-left transition-all"
                        style={{
                          background: 'var(--bg-subtle)',
                          borderColor: 'var(--border)',
                        }}
                      >
                        <span className="text-xl">{template.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                            {template.name}
                          </p>
                          <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-sec)' }}>
                            {template.description}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowTemplates(false)}
                    className="w-full mt-3 py-2 text-sm"
                    style={{ color: 'var(--accent1)' }}
                  >
                    从空白开始
                  </button>
                </div>
              )}

              {/* Form fields */}
              <div className="px-5 py-4 space-y-4">
                {/* Name */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                    <User className="w-4 h-4" />
                    名称
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="给分身起个名字"
                    className="w-full px-4 py-2.5 rounded-xl border text-sm"
                    style={{
                      background: 'var(--bg-subtle)',
                      borderColor: 'var(--border)',
                      color: 'var(--text)',
                    }}
                    disabled={loading}
                  />
                </div>

                {/* Emoji & Color row */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Emoji picker */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                      <span className="text-base">😀</span>
                      图标
                    </label>
                    <div className="flex flex-wrap gap-1.5 p-2 rounded-xl border" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border)' }}>
                      {EMOJI_OPTIONS.map((e) => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => setEmoji(e)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-base transition-transform hover:scale-110"
                          style={{
                            background: emoji === e ? color : 'transparent',
                          }}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color picker */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                      <Palette className="w-4 h-4" />
                      颜色
                    </label>
                    <div className="flex flex-wrap gap-1.5 p-2 rounded-xl border" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border)' }}>
                      {COLOR_OPTIONS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setColor(c)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform hover:scale-110"
                          style={{ background: c }}
                        >
                          {color === c && <Check className="w-4 h-4 text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                    <FileText className="w-4 h-4" />
                    简介
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="简单描述这个分身的特点"
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-xl border text-sm resize-none"
                    style={{
                      background: 'var(--bg-subtle)',
                      borderColor: 'var(--border)',
                      color: 'var(--text)',
                    }}
                    disabled={loading}
                  />
                </div>

                {/* Personality (System Prompt) */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                    <Sparkles className="w-4 h-4" />
                    系统提示词
                  </label>
                  <textarea
                    value={personality}
                    onChange={(e) => setPersonality(e.target.value)}
                    placeholder="定义这个分身的性格、行为方式、专业领域..."
                    rows={6}
                    className="w-full px-4 py-2.5 rounded-xl border text-sm resize-none font-mono"
                    style={{
                      background: 'var(--bg-subtle)',
                      borderColor: 'var(--border)',
                      color: 'var(--text)',
                    }}
                    disabled={loading}
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--text-ter)' }}>
                    系统提示词定义了 AI 的角色定位和行为准则
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              className="flex items-center justify-end gap-3 px-5 py-4 border-t"
              style={{ borderColor: 'var(--border)' }}
            >
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-full text-sm font-medium"
                style={{
                  background: 'var(--bg-subtle)',
                  color: 'var(--text-sec)',
                }}
                disabled={loading}
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!name.trim() || loading}
                className="px-5 py-2 rounded-full text-sm font-medium transition-all disabled:opacity-50"
                style={{
                  background: name.trim() ? 'var(--accent1)' : undefined,
                  color: '#fff',
                }}
              >
                {loading ? '保存中...' : editAvatar ? '保存修改' : '创建分身'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

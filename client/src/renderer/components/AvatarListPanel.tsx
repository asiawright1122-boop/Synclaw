/**
 * AvatarListPanel - Avatar management panel for sidebar
 * Displays all avatars, allows CRUD operations, and template selection
 */
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Bot, Loader2, RefreshCw, Search, Trash2, Edit3, Star, X } from 'lucide-react'
import { useAvatarStore, type Avatar } from '../stores/avatarStore'
import { AvatarEditModal } from './AvatarEditModal'
import { t } from '../i18n'
import { AVATAR_TEMPLATES } from '../lib/avatar-templates'

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

interface AvatarCardProps {
  avatar: Avatar
  isActive: boolean
  onActivate: () => void
  onEdit: () => void
  onDelete: () => void
}

function AvatarCard({ avatar, isActive, onActivate, onEdit, onDelete }: AvatarCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      data-testid="avatar-card"
      className="group relative rounded-xl border p-3 cursor-pointer transition-all"
      style={{
        background: isActive ? 'rgba(252, 93, 30, 0.08)' : 'var(--bg-subtle)',
        borderColor: isActive ? 'var(--accent1)' : 'var(--border)',
        boxShadow: isActive ? '0 0 0 1px var(--accent1)' : 'none',
      }}
      onClick={onActivate}
    >
      {/* Active badge */}
      {isActive && (
        <div
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: 'var(--accent1)' }}
        >
          <Star className="w-3 h-3 text-white fill-white" />
        </div>
      )}

      {/* Avatar icon */}
      <div className="flex items-start gap-3">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: avatar.color || 'var(--accent1)' }}
        >
          {avatar.emoji ? (
            <span>{avatar.emoji}</span>
          ) : avatar.id.startsWith('ac') || avatar.id === 'AutoClaw' ? (
            <ClawGlyph className="w-6 h-6 text-white" />
          ) : (
            <Bot className="w-6 h-6 text-white" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
              {avatar.name}
            </p>
            {avatar.pinned && <span className="text-xs">📌</span>}
          </div>
          <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-sec)' }}>
            {avatar.description || avatar.personality?.slice(0, 40) || '在线'}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="w-2 h-2 rounded-full"
              style={{
                background: avatar.status === 'online' ? '#22c55e' : avatar.status === 'busy' ? '#eab308' : '#9ca3af',
              }}
            />
            <span className="text-[10px]" style={{ color: 'var(--text-ter)' }}>
              {avatar.status === 'online' ? '在线' : avatar.status === 'busy' ? '忙碌' : '离线'}
            </span>
          </div>
        </div>
      </div>

      {/* Hover actions */}
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onEdit()
          }}
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-sec)' }}
          title={t('avatar.list.edit')}
        >
          <Edit3 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--bg-elevated)', color: '#ef4444' }}
          title={t('avatar.list.delete')}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  )
}

interface DeleteConfirmModalProps {
  open: boolean
  avatar: Avatar | null
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}

function DeleteConfirmModal({ open, avatar, onConfirm, onCancel, loading }: DeleteConfirmModalProps) {
  return (
    <AnimatePresence>
      {open && avatar && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60]"
            style={{ background: 'rgba(0, 0, 0, 0.5)' }}
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] w-[320px] rounded-2xl p-5"
            style={{ background: 'var(--bg-container)', border: '1px solid var(--border)' }}
          >
            <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text)' }}>
              {t('avatar.list.delete')}
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-sec)' }}>
              {t('avatar.list.deleteConfirm')}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-2 rounded-full text-sm font-medium"
                style={{ background: 'var(--bg-subtle)', color: 'var(--text-sec)' }}
                disabled={loading}
              >
                {t('generic.cancel') ?? '取消'}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className="flex-1 py-2 rounded-full text-sm font-medium text-white"
                style={{ background: '#ef4444' }}
              >
                {loading ? t('generic.loading') : t('generic.confirm') ?? '确认删除'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export function AvatarListPanel() {
  const {
    avatars,
    activeAvatarId,
    loading,
    error,
    demoMode,
    loadAvatars,
    deleteAvatar,
    activateAvatar,
  } = useAvatarStore()

  const [search, setSearch] = useState('')
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingAvatar, setEditingAvatar] = useState<Avatar | null>(null)
  const [createTemplateId, setCreateTemplateId] = useState<string | undefined>()
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingAvatar, setDeletingAvatar] = useState<Avatar | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Load avatars on mount
  useEffect(() => {
    loadAvatars()
  }, [loadAvatars])

  // Filter avatars by search
  const filteredAvatars = search.trim()
    ? avatars.filter(av =>
        av.name.toLowerCase().includes(search.toLowerCase()) ||
        (av.description || '').toLowerCase().includes(search.toLowerCase())
      )
    : avatars

  const handleCreateFromTemplate = useCallback((templateId: string) => {
    setCreateTemplateId(templateId)
    setEditingAvatar(null)
    setEditModalOpen(true)
  }, [])

  // Handlers
  const handleCreate = useCallback(() => {
    setEditingAvatar(null)
    setCreateTemplateId(undefined)
    setEditModalOpen(true)
  }, [])

  const handleEdit = useCallback((avatar: Avatar) => {
    setEditingAvatar(avatar)
    setCreateTemplateId(undefined)
    setEditModalOpen(true)
  }, [])

  const handleDeleteRequest = useCallback((avatar: Avatar) => {
    setDeletingAvatar(avatar)
    setDeleteModalOpen(true)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingAvatar) return
    setDeleting(true)
    await deleteAvatar(deletingAvatar.id)
    setDeleting(false)
    setDeleteModalOpen(false)
    setDeletingAvatar(null)
  }, [deletingAvatar, deleteAvatar])

  const handleDeleteCancel = useCallback(() => {
    setDeleteModalOpen(false)
    setDeletingAvatar(null)
  }, [])

  const handleActivate = useCallback(async (avatar: Avatar) => {
    await activateAvatar(avatar.id)
  }, [activateAvatar])

  const handleModalClose = useCallback(() => {
    setEditModalOpen(false)
    setEditingAvatar(null)
    setCreateTemplateId(undefined)
  }, [])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            我的分身
          </h2>
          <button
            type="button"
            onClick={handleCreate}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium"
            style={{
              background: 'var(--accent1)',
              color: '#fff',
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            新建
          </button>
        </div>

        {/* Search */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
        >
          <Search className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-ter)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-xs min-w-0"
            style={{ color: 'var(--text)' }}
            placeholder={t('avatar.list.search')}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="p-0.5 rounded hover:bg-white/5 transition-colors"
              style={{ color: 'var(--text-ter)' }}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Demo mode indicator */}
      {demoMode && (
        <div
          className="flex-shrink-0 mx-4 mt-3 px-3 py-2 rounded-lg text-xs"
          style={{
            background: 'rgba(245, 158, 11, 0.1)',
            color: '#f59e0b',
            border: '1px solid rgba(245, 158, 11, 0.3)',
          }}
        >
          {t('avatar.list.demo')}
        </div>
      )}

      {/* Avatar list */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && avatars.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-sec)' }} />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <p className="text-sm" style={{ color: 'var(--text-sec)' }}>{error}</p>
            <button
              type="button"
              onClick={loadAvatars}
              className="flex items-center gap-1 text-sm"
              style={{ color: 'var(--accent1)' }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {t('generic.retry')}
            </button>
          </div>
        ) : filteredAvatars.length === 0 ? (
          !search ? (
            <div className="flex flex-col gap-4 py-6">
              <div className="text-center">
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
                  {t('avatar.list.empty')}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-sec)' }}>
                  选择一个模板快速创建分身
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {AVATAR_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleCreateFromTemplate(template.id)}
                    className="flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-md text-left cursor-pointer"
                    style={{
                      background: 'var(--bg-subtle)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                      style={{ background: template.color }}
                    >
                      {template.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                        {template.name}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-sec)' }}>
                        {template.description}
                      </p>
                    </div>
                    <span
                      className="text-xs px-2 py-1 rounded-lg font-medium flex-shrink-0"
                      style={{ background: `${template.color}20`, color: template.color }}
                    >
                      使用模板
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-12">
              <Bot className="w-10 h-10" style={{ color: 'var(--text-ter)' }} />
              <p className="text-sm" style={{ color: 'var(--text-sec)' }}>
                {t('avatar.list.noMatch')}
              </p>
            </div>
          )
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-2">
              {filteredAvatars.map((avatar) => (
                <AvatarCard
                  key={avatar.id}
                  avatar={avatar}
                  isActive={activeAvatarId === avatar.id}
                  onActivate={() => handleActivate(avatar)}
                  onEdit={() => handleEdit(avatar)}
                  onDelete={() => handleDeleteRequest(avatar)}
                />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>

      {/* Edit modal */}
      <AvatarEditModal
        open={editModalOpen}
        onClose={handleModalClose}
        editAvatar={editingAvatar}
        initialTemplateId={createTemplateId}
      />

      {/* Delete confirmation */}
      <DeleteConfirmModal
        open={deleteModalOpen}
        avatar={deletingAvatar}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        loading={deleting}
      />
    </div>
  )
}

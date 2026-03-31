/**
 * AvatarSettingsPanel.tsx — 分身设置面板（Settings 路由）
 *
 * 提供：
 * - 默认启动分身选择
 * - 快速跳转到分身管理（打开侧边栏 Avatar Tab）
 */
import { useState, useEffect, useCallback } from 'react'
import { Bot, Star, ExternalLink } from 'lucide-react'
import { Card, Row } from '../ui'
import { useAvatarStore } from '../../stores/avatarStore'
import { useAppStore } from '../../stores/appStore'

export function AvatarSettingsPanel() {
  const { avatars, loadAvatars, activateAvatar } = useAvatarStore()
  const { setSettingsModalOpen, setActiveTab } = useAppStore()
  const [defaultId, setDefaultId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Load saved default
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await window.electronAPI?.settings.get()
        if (res?.success && res.data) {
          const data = res.data as unknown as Record<string, unknown>
          const pref = data.avatar as Record<string, unknown> | undefined
          setDefaultId((pref?.defaultId as string | undefined) ?? null)
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    load()
    loadAvatars()
  }, [loadAvatars])

  const handleSetDefault = useCallback(async (avatarId: string) => {
    setDefaultId(avatarId)
    await window.electronAPI?.settings.set('avatar.defaultId', avatarId)
    // If not already active, activate
    activateAvatar(avatarId)
  }, [activateAvatar])

  const handleOpenAvatarManagement = useCallback(() => {
    setActiveTab('avatar')
    setSettingsModalOpen(false)
  }, [setActiveTab, setSettingsModalOpen])

  const activeDefault = avatars.find(a => a.id === defaultId)

  return (
    <div className="pb-10">
      <h1 className="text-xl font-bold mb-6" style={{ color: 'var(--text)' }}>
        分身设置
      </h1>

      {/* Quick access */}
      <Card className="mb-6">
        <div className="px-5 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              管理分身
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-sec)' }}>
              创建、编辑、删除分身，或查看模板
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenAvatarManagement}
            className="px-4 py-1.5 rounded-lg text-sm font-medium border shrink-0 flex items-center gap-1.5 transition-opacity hover:opacity-80"
            style={{ borderColor: 'var(--accent1)', color: 'var(--accent1)' }}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            打开
          </button>
        </div>
      </Card>

      {/* Default avatar on startup */}
      <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
        默认启动分身
      </p>
      <Card>
        {loading ? (
          <div className="px-5 py-4 text-sm" style={{ color: 'var(--text-sec)' }}>
            加载中…
          </div>
        ) : avatars.length === 0 ? (
          <div className="px-5 py-4">
            <p className="text-sm" style={{ color: 'var(--text-sec)' }}>
              暂无分身。请先在「管理分身」中创建。
            </p>
          </div>
        ) : (
          <>
            <Row label="当前默认" border>
              <div className="flex items-center gap-2 shrink-0">
                {activeDefault ? (
                  <>
                    {activeDefault.emoji ? (
                      <span className="text-base">{activeDefault.emoji}</span>
                    ) : (
                      <Bot className="w-4 h-4" style={{ color: 'var(--text-sec)' }} />
                    )}
                    <span className="text-sm" style={{ color: 'var(--text-sec)' }}>
                      {activeDefault.name}
                    </span>
                  </>
                ) : (
                  <span className="text-sm" style={{ color: 'var(--text-sec)' }}>
                    未设置
                  </span>
                )}
              </div>
            </Row>

            <div className="px-5 py-3">
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-sec)' }}>
                切换默认分身
              </p>
              <div className="flex flex-wrap gap-2">
                {avatars.map(avatar => {
                  const isDefault = avatar.id === defaultId
                  return (
                    <button
                      key={avatar.id}
                      type="button"
                      onClick={() => handleSetDefault(avatar.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all hover:scale-105"
                      style={{
                        borderColor: isDefault ? 'var(--accent1)' : 'var(--border)',
                        background: isDefault ? 'rgba(252, 93, 30, 0.08)' : 'transparent',
                        color: isDefault ? 'var(--accent1)' : 'var(--text)',
                      }}
                    >
                      {avatar.emoji ? (
                        <span>{avatar.emoji}</span>
                      ) : (
                        <Bot className="w-3.5 h-3.5" />
                      )}
                      {avatar.name}
                      {isDefault && <Star className="w-3 h-3 fill-current" />}
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Info */}
      <p className="text-xs mt-4" style={{ color: 'var(--text-sec)' }}>
        启动分身将在每次应用启动时自动激活。关闭默认设置后，启动时将使用上一个激活的分身。
      </p>
    </div>
  )
}

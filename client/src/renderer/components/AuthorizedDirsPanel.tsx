import { useCallback } from 'react'
import { useSettingsStore } from '../stores/settingsStore'
import { FolderPlus, Trash2, FolderOpen, ShieldAlert } from 'lucide-react'

export function AuthorizedDirsPanel() {
  const { authorizedDirs, addAuthorizedDir, removeAuthorizedDir } = useSettingsStore()

  const handleAddDir = useCallback(async () => {
    const result = await window.electronAPI?.dialog?.selectDirectory?.()
    if (result?.canceled || !result?.filePaths?.[0]) return
    const dir = result.filePaths[0]
    if (authorizedDirs.includes(dir)) return
    addAuthorizedDir(dir)
  }, [authorizedDirs, addAuthorizedDir])

  const handleRemoveDir = useCallback((dir: string) => {
    removeAuthorizedDir(dir)
  }, [removeAuthorizedDir])

  return (
    <div className="pb-10">
      <h1
        className="text-xl font-bold flex items-center gap-2"
        style={{ color: 'var(--text)' }}
      >
        文件安全
        {authorizedDirs.length === 0 && (
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(252,93,30,0.12)', color: 'var(--accent1)' }}
          >
            未配置
          </span>
        )}
      </h1>
      <p className="text-sm mt-1 mb-6" style={{ color: 'var(--text-sec)' }}>
        仅授权目录内的文件可被 AI 操作。系统敏感目录自动阻止访问。
      </p>

      {authorizedDirs.length === 0 ? (
        <div
          className="rounded-[10px] border border-dashed p-8 text-center"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-container)' }}
        >
          <ShieldAlert
            className="mx-auto mb-3 w-10 h-10"
            style={{ color: 'var(--text-ter)' }}
          />
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            未设置授权目录
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-sec)' }}>
            请添加至少一个目录，AI 才能操作文件
          </p>
          <button
            type="button"
            onClick={handleAddDir}
            className="mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-opacity"
            style={{ background: 'var(--accent1)', color: '#fff' }}
          >
            添加授权目录
          </button>
        </div>
      ) : (
        <>
          <div
            className="rounded-[10px] border overflow-hidden mb-4"
            style={{ background: 'var(--bg-container)', borderColor: 'var(--border)' }}
          >
            {authorizedDirs.map((dir, idx) => (
              <div
                key={dir}
                className="flex items-center justify-between gap-3 px-4 py-3"
                style={{
                  borderBottom:
                    idx < authorizedDirs.length - 1
                      ? '1px solid var(--border-secondary)'
                      : undefined,
                }}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <FolderOpen className="w-4 h-4 shrink-0" style={{ color: 'var(--accent1)' }} />
                  <span
                    className="text-sm truncate"
                    style={{ color: 'var(--text)' }}
                    title={dir}
                  >
                    {dir}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveDir(dir)}
                  className="p-1.5 rounded-md shrink-0 transition-colors hover:opacity-80"
                  style={{ color: 'var(--danger)' }}
                  title="移除授权"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddDir}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-opacity"
            style={{
              background: 'var(--bg-container)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
          >
            <FolderPlus className="w-4 h-4" />
            添加授权目录
          </button>
        </>
      )}

      <div
        className="mt-6 rounded-[10px] border p-4"
        style={{ background: 'rgba(252,93,30,0.06)', borderColor: 'rgba(252,93,30,0.2)' }}
      >
        <p className="text-xs font-medium" style={{ color: 'var(--accent1)' }}>
          安全说明
        </p>
        <ul className="mt-2 space-y-1">
          <li className="text-xs" style={{ color: 'var(--text-sec)' }}>
            · 路径穿越（如 <code className="px-1 rounded" style={{ background: 'var(--bg)', color: 'var(--text)' }}>../etc/passwd</code>）自动阻止
          </li>
          <li className="text-xs" style={{ color: 'var(--text-sec)' }}>
            · 系统敏感目录（/etc、/proc、C:\Windows 等）自动拒绝
          </li>
          <li className="text-xs" style={{ color: 'var(--text-sec)' }}>
            · 所有文件操作需在授权目录范围内执行
          </li>
        </ul>
      </div>
    </div>
  )
}

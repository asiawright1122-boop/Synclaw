/**
 * McpPanel.tsx — MCP 服务管理面板
 */
import { useState, useEffect } from 'react'
import { Card } from '../ui'
import { pillBtn } from './shared/pillBtn'
import { useToastStore } from '../../stores/toastStore'
import { Spinner } from '../ui'

interface McpServer {
  name: string
  type: string
  url?: string
  command?: string[]
  args?: string[]
  enabled?: boolean
}

interface McpTool {
  name: string
  description?: string
  enabled?: boolean
  source?: string
}

const QUICK_TEMPLATES = [
  {
    id: 'filesystem',
    name: 'File System',
    type: 'stdio' as const,
    command: 'npx',
    args: '-y @modelcontextprotocol/server-filesystem',
    desc: '访问本地文件系统',
  },
  {
    id: 'brave-search',
    name: 'Brave Search',
    type: 'http' as const,
    url: '',
    command: 'npx',
    args: '-y @modelcontextprotocol/server-brave-search',
    desc: '网页搜索',
  },
  {
    id: 'sqlite',
    name: 'SQLite',
    type: 'stdio' as const,
    command: 'npx',
    args: '-y @modelcontextprotocol/server-sqlite',
    desc: '本地 SQLite 数据库',
  },
  {
    id: 'fetch',
    name: 'Web Fetch',
    type: 'stdio' as const,
    command: 'npx',
    args: '-y @modelcontextprotocol/server-fetch',
    desc: '获取网页内容',
  },
]

function McpPanel() {
  const [loading, setLoading] = useState(false)
  const [tools, setTools] = useState<McpTool[]>([])
  const [servers, setServers] = useState<McpServer[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [addingType, setAddingType] = useState<'sse' | 'stdio'>('sse')
  const [formName, setFormName] = useState('')
  const [formUrl, setFormUrl] = useState('')
  const [formCommand, setFormCommand] = useState('')
  const [formArgs, setFormArgs] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingServer, setDeletingServer] = useState<string | null>(null)
  const [expandedServer, setExpandedServer] = useState<string | null>(null)
  const addToast = useToastStore(s => s.addToast)

  const loadTools = async () => {
    setLoading(true)
    try {
      const [toolRes, configRes] = await Promise.allSettled([
        window.openclaw?.tools.catalog({ includePlugins: true }),
        window.openclaw?.config.get(),
      ])

      if (toolRes?.status === 'fulfilled' && toolRes.value?.success && Array.isArray(toolRes.value.data)) {
        setTools(toolRes.value.data as McpTool[])
      }

      if (configRes?.status === 'fulfilled' && configRes.value?.success) {
        const cfg = configRes.value.data as Record<string, unknown>
        const mcpServers = (cfg.mcp as Record<string, unknown>) ?? {}
        const serverList = Object.entries(mcpServers).map(([name, val]) => {
          const v = val as Record<string, unknown>
          return {
            name,
            type: v.type as string ?? (v.command ? 'stdio' : 'sse'),
            url: v.url as string | undefined,
            command: v.command as string[] | undefined,
            args: v.args as string[] | undefined,
            enabled: v.enabled as boolean ?? true,
          }
        })
        setServers(serverList)
      }
    } catch {
      // keep empty
    } finally {
      setLoading(false)
    }
  }

  const handleAddServer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) return
    setSaving(true)
    try {
      const res = await window.openclaw?.config.get()
      if (res?.success && res.data) {
        const cfg = res.data as Record<string, unknown>
        const mcpServers = { ...((cfg.mcp as Record<string, unknown>) ?? {}) }

        if (addingType === 'sse') {
          mcpServers[formName.trim()] = {
            type: 'sse',
            url: formUrl.trim(),
            enabled: true,
          }
        } else {
          const argsArr = formArgs.trim()
            ? formArgs.trim().split(/\s+/)
            : []
          mcpServers[formName.trim()] = {
            type: 'stdio',
            command: formCommand.trim().split(/\s+/),
            args: argsArr,
            enabled: true,
          }
        }

        const patchRes = await window.openclaw?.config.patch({ raw: { mcp: mcpServers } })
        if (patchRes?.success) {
          await window.openclaw?.config.apply()
          setFormName('')
          setFormUrl('')
          setFormCommand('')
          setFormArgs('')
          setShowAddForm(false)
          addToast({ type: 'success', message: `MCP 服务 "${formName.trim()}" 添加成功`, duration: 2000 })
          loadTools()
        } else {
          addToast({ type: 'error', message: '保存配置失败', duration: 3000 })
        }
      }
    } catch {
      addToast({ type: 'error', message: '添加 MCP 服务失败', duration: 3000 })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteServer = async (name: string) => {
    setDeletingServer(name)
    try {
      const res = await window.openclaw?.config.get()
      if (res?.success && res.data) {
        const cfg = res.data as Record<string, unknown>
        const mcpServers = { ...((cfg.mcp as Record<string, unknown>) ?? {}) }
        delete mcpServers[name]
        const patchRes = await window.openclaw?.config.patch({ raw: { mcp: mcpServers } })
        if (patchRes?.success) {
          await window.openclaw?.config.apply()
          setServers(prev => prev.filter(s => s.name !== name))
          addToast({ type: 'success', message: `已删除 ${name}`, duration: 2000 })
        } else {
          addToast({ type: 'error', message: '删除失败', duration: 3000 })
        }
      }
    } catch {
      addToast({ type: 'error', message: '删除失败', duration: 3000 })
    } finally {
      setDeletingServer(null)
    }
  }

  const handleQuickAdd = async (tpl: typeof QUICK_TEMPLATES[0]) => {
    setSaving(true)
    try {
      const res = await window.openclaw?.config.get()
      if (res?.success && res.data) {
        const cfg = res.data as Record<string, unknown>
        const mcpServers = { ...((cfg.mcp as Record<string, unknown>) ?? {}) }
        const argsArr = tpl.args.split(/\s+/)

        if (tpl.type === 'http') {
          mcpServers[tpl.name] = { type: 'sse', url: tpl.url || 'http://localhost:8080/sse', enabled: true }
        } else {
          mcpServers[tpl.name] = {
            type: 'stdio',
            command: [tpl.command, ...argsArr.slice(1)],
            enabled: true,
          }
        }

        const patchRes = await window.openclaw?.config.patch({ raw: { mcp: mcpServers } })
        if (patchRes?.success) {
          await window.openclaw?.config.apply()
          addToast({ type: 'success', message: `${tpl.name} 添加成功，请配置 API Key`, duration: 3000 })
          loadTools()
        }
      }
    } catch {
      addToast({ type: 'error', message: '添加失败', duration: 3000 })
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    loadTools()
  }, [])

  return (
    <div className="pb-10">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
            MCP 服务
          </h1>
          <p className="text-sm mt-1 max-w-xl" style={{ color: 'var(--text-sec)' }}>
            MCP（模型上下文协议）服务为 Agent 扩展外部工具 — 文件系统、数据库、网页搜索等。
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={loadTools}
            className={pillBtn(false)}
            style={{ borderColor: 'var(--border)', color: 'var(--text-sec)' }}
            disabled={loading}
          >
            {loading ? <Spinner size={14} /> : '刷新'}
          </button>
          <button
            type="button"
            className={pillBtn(true)}
            style={{ background: 'var(--accent1)' }}
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? '取消' : '添加服务'}
          </button>
        </div>
      </div>

      {/* 添加服务表单 */}
      {showAddForm && (
        <Card className="mb-6 mt-4">
          <div className="px-5 py-4">
            <p className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>
              添加 MCP 服务
            </p>

            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setAddingType('sse')}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${addingType === 'sse' ? 'text-white border-transparent' : ''}`}
                style={addingType === 'sse' ? { background: 'var(--accent1)' } : { borderColor: 'var(--border)', color: 'var(--text-sec)' }}
              >
                HTTP/SSE（远程服务）
              </button>
              <button
                type="button"
                onClick={() => setAddingType('stdio')}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${addingType === 'stdio' ? 'text-white border-transparent' : ''}`}
                style={addingType === 'stdio' ? { background: 'var(--accent1)' } : { borderColor: 'var(--border)', color: 'var(--text-sec)' }}
              >
                Stdio（本地进程）
              </button>
            </div>

            <form onSubmit={handleAddServer} className="space-y-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-sec)' }}>服务名称</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="例如: my-filesystem"
                  required
                  className="w-full text-sm px-3 py-2 rounded-lg border"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)', background: 'var(--bg-container)' }}
                />
              </div>

              {addingType === 'sse' ? (
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-sec)' }}>服务 URL</label>
                  <input
                    type="url"
                    value={formUrl}
                    onChange={e => setFormUrl(e.target.value)}
                    placeholder="https://your-mcp-server.com/sse"
                    required
                    className="w-full text-sm px-3 py-2 rounded-lg border"
                    style={{ borderColor: 'var(--border)', color: 'var(--text)', background: 'var(--bg-container)' }}
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--text-ter)' }}>
                    MCP SSE 服务器的 URL，协议为 HTTP GET /sse 端点
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-sec)' }}>命令</label>
                    <input
                      type="text"
                      value={formCommand}
                      onChange={e => setFormCommand(e.target.value)}
                      placeholder="npx / uvx / python"
                      required
                      className="w-full text-sm px-3 py-2 rounded-lg border"
                      style={{ borderColor: 'var(--border)', color: 'var(--text)', background: 'var(--bg-container)' }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-sec)' }}>参数（空格分隔）</label>
                    <input
                      type="text"
                      value={formArgs}
                      onChange={e => setFormArgs(e.target.value)}
                      placeholder="-y @modelcontextprotocol/server-filesystem /home/user"
                      className="w-full text-sm px-3 py-2 rounded-lg border"
                      style={{ borderColor: 'var(--border)', color: 'var(--text)', background: 'var(--bg-container)' }}
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--text-ter)' }}>
                      例如: -y @modelcontextprotocol/server-filesystem /home/user
                    </p>
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving || !formName.trim()}
                  className={pillBtn(true)}
                  style={{ background: 'var(--accent1)', opacity: saving || !formName.trim() ? 0.5 : 1 }}
                >
                  {saving ? <Spinner size={14} /> : '添加服务'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className={pillBtn(false)}
                  style={{ borderColor: 'var(--border)', color: 'var(--text-sec)' }}
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </Card>
      )}

      {/* 已配置的服务列表 */}
      {servers.length > 0 && (
        <>
          <p className="text-sm font-semibold mb-3 mt-6" style={{ color: 'var(--text)' }}>
            已配置的服务 ({servers.length})
          </p>
          <div className="space-y-2">
            {servers.map(server => (
              <Card key={server.name}>
                <div className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                          {server.name}
                        </span>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                          style={{
                            background: server.type === 'sse' ? 'rgba(99,102,241,0.1)' : 'rgba(47,158,91,0.1)',
                            color: server.type === 'sse' ? '#6366f1' : 'var(--success)',
                          }}
                        >
                          {server.type === 'sse' ? 'HTTP/SSE' : 'Stdio'}
                        </span>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                          style={{
                            background: server.enabled ? 'rgba(47,158,91,0.15)' : 'rgba(0,0,0,0.06)',
                            color: server.enabled ? 'var(--success)' : 'var(--text-ter)',
                          }}
                        >
                          {server.enabled ? '运行中' : '已禁用'}
                        </span>
                      </div>
                      {server.type === 'sse' ? (
                        <p className="text-xs truncate" style={{ color: 'var(--text-ter)' }}>
                          {server.url || '—'}
                        </p>
                      ) : (
                        <p className="text-xs truncate font-mono" style={{ color: 'var(--text-ter)' }}>
                          {(server.command ?? []).join(' ')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setExpandedServer(expandedServer === server.name ? null : server.name)}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs transition-colors"
                        style={{ background: 'var(--bg-subtle)', color: 'var(--text-sec)' }}
                        title="详情"
                      >
                        {expandedServer === server.name ? '−' : '+'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteServer(server.name)}
                        disabled={deletingServer === server.name}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs transition-colors"
                        style={{ color: deletingServer === server.name ? 'var(--text-ter)' : 'var(--danger)' }}
                        title="删除"
                      >
                        {deletingServer === server.name ? <Spinner size={12} /> : '×'}
                      </button>
                    </div>
                  </div>

                  {expandedServer === server.name && (
                    <div
                      className="mt-3 pt-3 space-y-1"
                      style={{ borderTop: '1px solid var(--border-secondary)' }}
                    >
                      {server.type === 'sse' ? (
                        <p className="text-xs" style={{ color: 'var(--text-sec)' }}>
                          <span className="font-medium">URL:</span> {server.url}
                        </p>
                      ) : (
                        <>
                          <p className="text-xs" style={{ color: 'var(--text-sec)' }}>
                            <span className="font-medium">Command:</span> {server.command?.join(' ')}
                          </p>
                          {server.args && server.args.length > 0 && (
                            <p className="text-xs" style={{ color: 'var(--text-sec)' }}>
                              <span className="font-medium">Args:</span> {server.args.join(' ')}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* 工具列表 */}
      {tools.length > 0 && (
        <>
          <p className="text-sm font-semibold mb-3 mt-8" style={{ color: 'var(--text)' }}>
            可用工具 ({tools.length})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {tools.map(tool => (
              <Card key={tool.name}>
                <div className="px-3 py-2.5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                      {tool.name}
                    </span>
                    {tool.enabled !== undefined && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0"
                        style={{
                          background: tool.enabled ? 'rgba(47,158,91,0.15)' : 'rgba(0,0,0,0.06)',
                          color: tool.enabled ? 'var(--success)' : 'var(--text-ter)',
                        }}
                      >
                        {tool.enabled ? '已启用' : '已禁用'}
                      </span>
                    )}
                  </div>
                  {tool.description && (
                    <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--text-sec)' }}>
                      {tool.description}
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* 空状态 + 快速添加模板 */}
      {servers.length === 0 && tools.length === 0 && !loading && (
        <div className="mt-8">
          <div className="text-center mb-6">
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>
              配置你的第一个 MCP 服务
            </p>
            <p className="text-xs max-w-sm mx-auto" style={{ color: 'var(--text-sec)' }}>
              MCP 服务扩展 SynClaw 的能力，访问文件、搜索、数据库等
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {QUICK_TEMPLATES.map(tpl => (
              <Card key={tpl.id}>
                <div className="px-4 py-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                        {tpl.name}
                      </span>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                        style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}
                      >
                        {tpl.type === 'stdio' ? 'Stdio' : 'HTTP'}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-sec)' }}>
                      {tpl.desc}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleQuickAdd(tpl)}
                    disabled={saving || servers.some(s => s.name === tpl.name)}
                    className={`${pillBtn(true)} text-xs shrink-0`}
                    style={{
                      background: servers.some(s => s.name === tpl.name) ? 'var(--success)' : 'var(--accent1)',
                      opacity: saving ? 0.5 : 1,
                    }}
                  >
                    {servers.some(s => s.name === tpl.name) ? '已添加' : saving ? <Spinner size={12} /> : '+ 快速添加'}
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export { McpPanel }

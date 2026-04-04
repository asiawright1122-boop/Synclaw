/**
 * ModelsPanel.tsx — 模型与 API 设置面板
 */
import { useState, useEffect } from 'react'
import { Card, ToggleDot } from '../ui'
import { pillBtn } from './shared/pillBtn'
import { useToastStore } from '../../stores/toastStore'
import { Spinner } from '../ui'

interface ModelParamConfig {
  temperature: number
  topP: number
  topK: number
  maxTokens: number
  thinking: boolean
  thinkingBudget: number
}

function ModelsPanel({ currentModel }: { currentModel: string | null }) {
  const [loading, setLoading] = useState(false)
  const [models, setModels] = useState<Array<{ id: string; name: string; description?: string }>>([])
  const [current, setCurrent] = useState<string | null>(currentModel)
  const [switching, setSwitching] = useState<string | null>(null)

  // 模型参数配置状态
  const [showParams, setShowParams] = useState(false)
  const [params, setParams] = useState<ModelParamConfig>({
    temperature: 0.7,
    topP: 0.9,
    topK: 40,
    maxTokens: 4096,
    thinking: true,
    thinkingBudget: 16000,
  })
  const [savingParams, setSavingParams] = useState(false)
  const addToast = useToastStore(s => s.addToast)

  const loadModels = async () => {
    setLoading(true)
    try {
      const [listRes, currentRes] = await Promise.allSettled([
        window.openclaw?.models.list(),
        window.openclaw?.models.getCurrent(),
      ])

      if (listRes?.status === 'fulfilled' && listRes.value?.success && Array.isArray(listRes.value.data)) {
        setModels(listRes.value.data as typeof models)
      }

      if (currentRes?.status === 'fulfilled' && currentRes.value?.success) {
        const data = currentRes.value.data as Record<string, unknown>
        setCurrent((data?.id ?? data?.modelId ?? data?.model ?? null) as string | null)
      }
    } catch {
      // keep empty
    } finally {
      setLoading(false)
    }
  }

  // 加载当前模型参数
  const loadParams = async () => {
    if (!window.openclaw) return
    try {
      const res = await window.openclaw.config.get()
      if (res?.success && res.data) {
        const cfg = res.data as Record<string, unknown>
        const agentDefaults = cfg.agents as Record<string, unknown> | undefined
        const defaults = (agentDefaults?.defaults ?? agentDefaults) as Record<string, unknown> | undefined
        if (defaults) {
          setParams({
            temperature: typeof defaults.temperature === 'number' ? defaults.temperature : 0.7,
            topP: typeof defaults.topP === 'number' ? defaults.topP : 0.9,
            topK: typeof defaults.topK === 'number' ? defaults.topK : 40,
            maxTokens: typeof defaults.maxTokens === 'number' ? defaults.maxTokens : 4096,
            thinking: defaults.thinking !== false,
            thinkingBudget: typeof defaults.thinkingBudget === 'number' ? defaults.thinkingBudget : 16000,
          })
        }
      }
    } catch {
      // use defaults
    }
  }

  useEffect(() => {
    loadModels()
    loadParams()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSwitch = async (modelId: string) => {
    setSwitching(modelId)
    try {
      const res = await window.openclaw?.models.setCurrent({ modelId })
      if (res?.success) {
        setCurrent(modelId)
        addToast({ type: 'success', message: `已切换至 ${modelId}`, duration: 2000 })
      }
    } finally {
      setSwitching(null)
    }
  }

  const handleSaveParams = async () => {
    if (!window.openclaw) return
    setSavingParams(true)
    try {
      const res = await window.openclaw.config.patch({
        raw: {
          agents: {
            defaults: {
              model: { primary: current || undefined },
              temperature: params.temperature,
              topP: params.topP,
              topK: params.topK,
              maxTokens: params.maxTokens,
              thinking: params.thinking,
              thinkingBudget: params.thinkingBudget,
            },
          },
        },
      })
      if (res?.success) {
        await window.openclaw.config.apply()
        addToast({ type: 'success', message: '参数已保存', duration: 2000 })
      } else {
        addToast({ type: 'error', message: '保存失败', duration: 3000 })
      }
    } catch {
      addToast({ type: 'error', message: '保存失败', duration: 3000 })
    } finally {
      setSavingParams(false)
    }
  }

  const updateParam = (key: keyof ModelParamConfig, value: number | boolean) => {
    setParams(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="pb-10">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
          模型与 API
        </h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setShowParams(!showParams); if (!showParams) loadParams() }}
            className={`${pillBtn(!showParams)}`}
            style={{ borderColor: showParams ? 'var(--accent1)' : 'var(--border)', color: showParams ? 'var(--accent1)' : 'var(--text-sec)' }}
          >
            参数配置
          </button>
          <button
            type="button"
            onClick={loadModels}
            className={pillBtn(false)}
            style={{ borderColor: 'var(--border)', color: 'var(--text-sec)' }}
            disabled={loading}
          >
            {loading ? <Spinner size={14} /> : '刷新'}
          </button>
        </div>
      </div>

      {/* 参数配置面板 */}
      {showParams && (
        <Card className="mb-6">
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                模型参数配置
              </p>
              <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--bg-subtle)', color: 'var(--text-ter)' }}>
                当前: {current || '—'}
              </span>
            </div>
            <div className="space-y-5">

              {/* Temperature */}
              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>Temperature</label>
                  <span className="text-xs tabular-nums" style={{ color: 'var(--text-sec)' }}>{params.temperature}</span>
                </div>
                <input
                  type="range" min="0" max="2" step="0.05"
                  value={params.temperature}
                  onChange={e => updateParam('temperature', parseFloat(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: 'var(--accent1)' }}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--text-ter)' }}>
                  控制随机性。较低 = 更确定性，较高 = 更有创意
                </p>
              </div>

              {/* Top P */}
              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>Top P</label>
                  <span className="text-xs tabular-nums" style={{ color: 'var(--text-sec)' }}>{params.topP}</span>
                </div>
                <input
                  type="range" min="0" max="1" step="0.05"
                  value={params.topP}
                  onChange={e => updateParam('topP', parseFloat(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: 'var(--accent1)' }}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--text-ter)' }}>
                  核采样。限制令牌选择范围，通常与 Temperature 二选一
                </p>
              </div>

              {/* Top K */}
              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>Top K</label>
                  <span className="text-xs tabular-nums" style={{ color: 'var(--text-sec)' }}>{params.topK}</span>
                </div>
                <input
                  type="range" min="1" max="100" step="1"
                  value={params.topK}
                  onChange={e => updateParam('topK', parseInt(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: 'var(--accent1)' }}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--text-ter)' }}>
                  从概率最高的 K 个词中采样
                </p>
              </div>

              {/* Max Tokens */}
              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>Max Tokens</label>
                  <span className="text-xs tabular-nums" style={{ color: 'var(--text-sec)' }}>{params.maxTokens}</span>
                </div>
                <input
                  type="range" min="256" max="32768" step="256"
                  value={params.maxTokens}
                  onChange={e => updateParam('maxTokens', parseInt(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: 'var(--accent1)' }}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--text-ter)' }}>
                  单次响应最大 Token 数
                </p>
              </div>

              {/* Thinking */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>思维链 (Thinking)</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-ter)' }}>启用 AI 思考过程（Extended Thinking）</p>
                </div>
                <ToggleDot
                  on={params.thinking}
                  onChange={v => updateParam('thinking', v)}
                />
              </div>

              {/* Thinking Budget */}
              {params.thinking && (
                <div>
                  <div className="flex justify-between mb-1.5">
                    <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>思考预算 (Budget)</label>
                    <span className="text-xs tabular-nums" style={{ color: 'var(--text-sec)' }}>{params.thinkingBudget} tokens</span>
                  </div>
                  <input
                    type="range" min="1024" max="32000" step="512"
                    value={params.thinkingBudget}
                    onChange={e => updateParam('thinkingBudget', parseInt(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{ accentColor: 'var(--accent1)' }}
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--text-ter)' }}>
                    分配给 AI 思考过程的 Token 预算
                  </p>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSaveParams}
                  disabled={savingParams}
                  className={`${pillBtn(true)} w-full`}
                  style={{ background: 'var(--accent1)' }}
                >
                  {savingParams ? <Spinner size={14} /> : '保存参数'}
                </button>
              </div>
            </div>
          </div>
        </Card>
      )}

      <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>
        可用模型
      </p>
      {models.length === 0 && !loading && (
        <div
          className="rounded-[10px] border px-4 py-8 text-center text-sm mb-6"
          style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-secondary)', color: 'var(--text-ter)' }}
        >
          暂无可用模型
        </div>
      )}
      {models.map(m => (
        <div
          key={m.id}
          className="rounded-[10px] border px-4 py-3 flex justify-between items-center mb-2"
          style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-secondary)' }}
        >
          <div className="min-w-0">
            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              {m.name}
            </span>
            {m.description && (
              <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-ter)' }}>
                {m.description}
              </p>
            )}
          </div>
          {m.id === current ? (
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-md shrink-0"
              style={{ background: 'rgba(47,158,91,0.15)', color: 'var(--success)' }}
            >
              当前选择
            </span>
          ) : (
            <button
              type="button"
              onClick={() => handleSwitch(m.id)}
              disabled={switching !== null}
              className="text-xs px-3 py-1 rounded-md border shrink-0 transition-colors"
              style={{ borderColor: 'var(--accent1)', color: 'var(--accent1)' }}
            >
              {switching === m.id ? <Spinner size={12} /> : '切换'}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

export { ModelsPanel }

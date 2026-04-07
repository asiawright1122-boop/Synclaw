/**
 * OnboardingView — 三步骤首次启动引导
 * Step 1: API Key 配置
 * Step 2: 授权目录选择
 * Step 3: 完成
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Key,
  FolderPlus,
  CheckCircle,
  ChevronRight,
  X,
  Loader2,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react'
import { useSettingsStore } from '../stores/settingsStore'
import { useGatewayStatus } from '../hooks/useGatewayStatus'
import { useToast } from './Toast'

interface OnboardingViewProps {
  onComplete: () => void
}

type Step = 1 | 2 | 3

const STEPS: Step[] = [1, 2, 3]

function validateApiKey(key: string): boolean {
  // Accept any non-empty string of sufficient length; let the Gateway validate the actual key
  return key.trim().length >= 32
}

function maskKey(key: string): string {
  if (key.length <= 10) return '••••••••••'
  return `${key.slice(0, 6)}••••••••${key.slice(-4)}`
}

export function OnboardingView({ onComplete }: OnboardingViewProps) {
  const [step, setStep] = useState<Step>(1)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [dirError, setDirError] = useState('')
  const [gatewayStatus, setGatewayStatus] = useState<'checking' | 'ready' | 'error'>('checking')
  const [apiKeySaving, setApiKeySaving] = useState(false)
  const [apiKeyError, setApiKeyError] = useState('')
  const [apiKeySuccess, setApiKeySuccess] = useState(false)

  const {
    setHasCompletedOnboarding,
    addAuthorizedDir,
    removeAuthorizedDir,
    authorizedDirs: storedAuthorizedDirs,
  } = useSettingsStore()

  const [authorizedDirs, setAuthorizedDirs] = useState<string[]>(storedAuthorizedDirs)

  // Gateway ping status from useGatewayStatus hook
  const { ping, isPinging, pingResult } = useGatewayStatus()

  // Toast notifications
  const toast = useToast()

  // 同步外部变更（如从设置页面添加的目录）
  useEffect(() => {
    setAuthorizedDirs(storedAuthorizedDirs)
  }, [storedAuthorizedDirs])

  // Check gateway status on mount
  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        const status = await window.openclaw?.getStatus?.()
        if (!cancelled) {
          setGatewayStatus(
            status === 'ready' || status === 'connected' ? 'ready' : 'error'
          )
        }
      } catch {
        if (!cancelled) setGatewayStatus('error')
      }
    }
    const timer = setTimeout(check, 1500)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [])

  const handleStep1Next = async () => {
    if (!apiKeyInput.trim() || !validateApiKey(apiKeyInput)) return
    setApiKeyError('')
    setApiKeySuccess(false)
    setApiKeySaving(true)
    try {
      const res = await window.openclaw?.skills?.update?.({ apiKey: apiKeyInput.trim() })
      if (res?.success) {
        setApiKeySuccess(true)
        toast.success('API Key 已保存', 2000)
        // Per ONB-01: verify connection with gateway.ping()
        await ping()
        if (pingResult === true) {
          setGatewayStatus('ready')
          setStep(2)
        } else {
          setGatewayStatus('error')
          setApiKeyError('API Key 已保存，但 Gateway 连接验证失败。请确认 OpenClaw 已启动，或前往「设置 → Gateway」查看状态。')
        }
      } else {
        const errorMsg = res?.error ? `保存失败：${res.error}` : '保存 API Key 时出错，请重试'
        setApiKeyError(errorMsg)
        toast.error(errorMsg, 3000)
      }
    } catch (err) {
      const errorMsg = `保存失败：${err instanceof Error ? err.message : String(err)}`
      setApiKeyError(errorMsg)
      toast.error(errorMsg, 3000)
    } finally {
      setApiKeySaving(false)
    }
  }

  const handleStep1Skip = async () => {
    setApiKeyInput('')
    setApiKeySuccess(false)
    setStep(2)
  }

  const handleAddDir = async () => {
    setDirError('')
    try {
      const result = await window.electronAPI?.dialog?.selectDirectory?.()
      if (result?.canceled || !result?.filePaths?.[0]) return
      const dir = result.filePaths[0]
      if (authorizedDirs.includes(dir)) {
        setDirError('该目录已被添加')
        return
      }
      setAuthorizedDirs(prev => [...prev, dir])
      await addAuthorizedDir(dir)
    } catch {
      setDirError('选择目录失败')
    }
  }

  const handleRemoveDir = async (dir: string) => {
    setAuthorizedDirs(prev => prev.filter(d => d !== dir))
    await removeAuthorizedDir(dir)
  }

  const handleStep3Complete = async () => {
    await setHasCompletedOnboarding(true)
    onComplete()
  }

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
  }

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }}
    >
      {/* Decorative background orb */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="orb-glow"
          style={{
            position: 'absolute',
            top: '15%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 480,
            height: 480,
            borderRadius: '50%',
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[520px] mx-4 rounded-2xl overflow-hidden"
        style={{
          background: 'var(--bg-container)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px var(--border)',
        }}
      >
        {/* Header */}
        <div
          className="px-8 pt-8 pb-4"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              {/* SynClaw logo mark */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--accent-gradient)' }}
              >
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1
                  className="text-lg font-semibold leading-tight"
                  style={{ color: 'var(--text)' }}
                >
                  开始设置 SynClaw
                </h1>
                <p className="text-sm" style={{ color: 'var(--text-sec)' }}>
                  只需几步，完成配置
                </p>
              </div>
            </div>
            {/* Back button (steps 2 and 3) */}
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1 as Step)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
                style={{ color: 'var(--text-sec)', background: 'var(--bg-elevated)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-sec)')}
              >
                <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                上一步
              </button>
            )}
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-2">
            {STEPS.map((s, idx) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300"
                  style={
                    step === s
                      ? {
                          background: 'var(--accent-gradient)',
                          color: 'white',
                        }
                      : step > s
                        ? {
                            background: 'var(--success)',
                            color: 'white',
                          }
                        : {
                            background: 'var(--bg-elevated)',
                            color: 'var(--text-ter)',
                          }
                  }
                >
                  {step > s ? <CheckCircle className="w-3.5 h-3.5" /> : s}
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className="w-10 h-px transition-all duration-300"
                    style={{
                      background:
                        step > s ? 'var(--success)' : 'var(--border)',
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="px-8 py-6 min-h-[280px]">
          <AnimatePresence mode="wait" custom={1}>
            {step === 1 && (
              <motion.div
                key="step1"
                custom={1}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="flex items-start gap-3 mb-5">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--bg-elevated)' }}
                  >
                    <Key className="w-4.5 h-4.5" style={{ color: 'var(--accent1)' }} />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text)' }}>
                      连接你的 Claude API
                    </h2>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-sec)' }}>
                      SynClaw 使用你的 Anthropic API Key 来驱动 AI 对话。Key 仅存储在本地，不会上传任何服务器。
                    </p>
                  </div>
                </div>

                {/* Gateway status */}
                {gatewayStatus === 'checking' && (
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-lg mb-4 text-sm"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-sec)' }}
                  >
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    正在检查 Gateway 连接…
                  </div>
                )}
                {gatewayStatus === 'ready' && (
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-lg mb-4 text-sm"
                    style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--success)' }}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Gateway 已就绪
                  </div>
                )}
                {gatewayStatus === 'error' && (
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-lg mb-4 text-sm"
                    style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)' }}
                  >
                    Gateway 连接失败，可先跳过继续使用
                  </div>
                )}

                <div className="mb-1">
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: 'var(--text)' }}
                  >
                    API Key
                  </label>
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={e => setApiKeyInput(e.target.value)}
                    placeholder="sk-ant-..."
                    autoFocus
                    className="w-full px-4 py-3 rounded-xl text-sm transition-colors"
                    style={{
                      background: 'var(--input-bg)',
                      border: '1px solid var(--input-border)',
                      color: 'var(--text)',
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && validateApiKey(apiKeyInput)) {
                        handleStep1Next()
                      }
                    }}
                  />
                </div>

                {apiKeyInput && !validateApiKey(apiKeyInput) && (
                  <p className="text-xs mb-3" style={{ color: 'var(--danger)' }}>
                    API Key 必须以 sk-ant- 开头
                  </p>
                )}

                {apiKeyError && (
                  <p className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)' }}>
                    {apiKeyError}
                  </p>
                )}

                {apiKeySuccess && (
                  <p className="text-xs mb-3 px-3 py-2 rounded-lg flex items-center gap-1.5" style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--success)' }}>
                    <CheckCircle className="w-3.5 h-3.5" />
                    API Key 已保存
                  </p>
                )}

                {(apiKeySuccess || isPinging) && (
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-lg mb-3 text-sm"
                    style={{
                      background: isPinging
                        ? 'var(--bg-elevated)'
                        : pingResult === true
                          ? 'rgba(34,197,94,0.1)'
                          : 'rgba(239,68,68,0.1)',
                      color: isPinging
                        ? 'var(--text-sec)'
                        : pingResult === true
                          ? 'var(--success)'
                          : 'var(--danger)',
                    }}
                  >
                    {isPinging ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        正在验证 Gateway 连接…
                      </>
                    ) : pingResult === true ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" />
                        连接成功
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5" />
                        连接失败
                      </>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between mt-4">
                  <button
                    type="button"
                    onClick={handleStep1Skip}
                    className="text-sm transition-colors"
                    style={{ color: 'var(--text-ter)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-sec)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-ter)')}
                  >
                    跳过，使用默认配置
                  </button>
                  <button
                    type="button"
                    onClick={handleStep1Next}
                    disabled={!validateApiKey(apiKeyInput) || apiKeySaving}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                    style={{
                      background: validateApiKey(apiKeyInput) && !apiKeySaving
                        ? 'var(--accent-gradient)'
                        : 'var(--bg-elevated)',
                      color: validateApiKey(apiKeyInput) && !apiKeySaving ? 'white' : 'var(--text-ter)',
                      cursor: validateApiKey(apiKeyInput) && !apiKeySaving ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {apiKeySaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        保存中…
                      </>
                    ) : (
                      <>
                        继续
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                custom={1}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="flex items-start gap-3 mb-5">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--bg-elevated)' }}
                  >
                    <FolderPlus className="w-4.5 h-4.5" style={{ color: 'var(--accent1)' }} />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text)' }}>
                      设置授权目录
                    </h2>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-sec)' }}>
                      选择 SynClaw AI 可以访问的本地文件夹。所有文件操作都限制在这些目录中，保护你的隐私安全。
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddDir}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium mb-3 transition-all duration-200"
                  style={{
                    border: '1px dashed var(--input-border)',
                    color: 'var(--text-sec)',
                    background: 'transparent',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--accent1)'
                    e.currentTarget.style.color = 'var(--accent1)'
                    e.currentTarget.style.background = 'rgba(252,93,30,0.04)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--input-border)'
                    e.currentTarget.style.color = 'var(--text-sec)'
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <FolderPlus className="w-4 h-4" />
                  添加文件夹
                </button>

                {dirError && (
                  <p className="text-xs mb-2 px-1" style={{ color: 'var(--danger)' }}>
                    {dirError}
                  </p>
                )}

                {authorizedDirs.length === 0 && (
                  <p className="text-xs mb-2 px-1" style={{ color: 'var(--text-ter)' }}>
                    可跳过，稍后在「设置 → 文件安全」中配置
                  </p>
                )}

                {authorizedDirs.length > 0 ? (
                  <div
                    className="rounded-xl overflow-hidden"
                    style={{ border: '1px solid var(--border)' }}
                  >
                    {authorizedDirs.map((dir, idx) => (
                      <div
                        key={dir}
                        className="flex items-center gap-3 px-4 py-2.5"
                        style={
                          idx > 0
                            ? { borderTop: '1px solid var(--border)' }
                            : undefined
                        }
                      >
                        <FolderPlus className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent1)' }} />
                        <span
                          className="flex-1 text-sm truncate"
                          style={{ color: 'var(--text)' }}
                          title={dir}
                        >
                          {dir}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDir(dir)}
                          className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-colors"
                          style={{ color: 'var(--text-ter)' }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = 'var(--bg-elevated)'
                            e.currentTarget.style.color = 'var(--danger)'
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'transparent'
                            e.currentTarget.style.color = 'var(--text-ter)'
                          }}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    className="rounded-xl px-4 py-6 text-center"
                    style={{
                      background: 'var(--bg-elevated)',
                      color: 'var(--text-ter)',
                    }}
                  >
                    <p className="text-sm">暂未添加任何目录</p>
                    <p className="text-xs mt-1">添加目录后，AI 可访问对应文件夹中的文件</p>
                  </div>
                )}

                <div className="mt-5">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all duration-200"
                    style={{
                      background: 'var(--accent-gradient)',
                      color: 'white',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >
                    完成设置
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                custom={1}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center justify-center text-center py-4"
              >
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
                  style={{ background: 'rgba(34,197,94,0.12)' }}
                >
                  <CheckCircle
                    className="w-10 h-10"
                    style={{ color: 'var(--success)' }}
                  />
                </motion.div>

                <h2
                  className="text-xl font-semibold mb-2"
                  style={{ color: 'var(--text)' }}
                >
                  配置完成
                </h2>
                <p
                  className="text-sm leading-relaxed mb-1"
                  style={{ color: 'var(--text-sec)' }}
                >
                  SynClaw 已准备就绪。
                </p>
                {apiKeyInput && validateApiKey(apiKeyInput) && (
                  <p
                    className="text-xs mb-6 px-4 py-2 rounded-lg"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-ter)' }}
                  >
                    Key: {maskKey(apiKeyInput)}
                  </p>
                )}
                {authorizedDirs.length > 0 && (
                  <p
                    className="text-xs mb-6 px-4 py-2 rounded-lg"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-ter)' }}
                  >
                    {authorizedDirs.length} 个授权目录
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleStep3Complete}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
                  style={{
                    background: 'var(--accent-gradient)',
                    color: 'white',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  <Sparkles className="w-4 h-4" />
                  开始使用 SynClaw
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer hint */}
        <div
          className="px-8 pb-4 text-center"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <p className="text-xs" style={{ color: 'var(--text-quaternary)' }}>
            配置可随时在「设置」中修改
          </p>
        </div>
      </motion.div>
    </div>
  )
}

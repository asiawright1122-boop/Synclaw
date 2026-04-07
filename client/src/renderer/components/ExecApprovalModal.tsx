/**
 * ExecApprovalModal.tsx — Security approval modal for exec requests.
 * Displays pending shell commands from OpenClaw Gateway and lets the user
 * approve, deny, or allow-once before execution proceeds.
 */
import { useEffect, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, Check, CheckCircle, Ban, Clock, Terminal,
  ChevronDown, ChevronUp, AlertTriangle,
  X
} from 'lucide-react'
import { useExecApprovalStore, type ApprovalDecisionReason } from '../stores/execApprovalStore'
import { useToast } from './Toast'

// ── Risk helpers ─────────────────────────────────────────────────────────────

const RISKY_COMMANDS = /^\s*(rm\s+-rf|del\s+\/f|dd\s+|mkfs|chmod\s+000|sudo\s+rm|wget|curl\s+-[A-Za-z]*s[^a-z]|chattr\s+-i)/i
const DESTRUCTIVE_KEYWORDS = ['rm -rf', 'del /f', 'format', 'dd if=', 'mkfs', 'chmod 000', 'wget | sh', 'curl | sh']

function getRiskLevel(cmd: string): 'low' | 'medium' | 'high' {
  if (RISKY_COMMANDS.test(cmd)) return 'high'
  if (DESTRUCTIVE_KEYWORDS.some((kw) => cmd.includes(kw))) return 'high'
  if (/sudo|root|chmod|chown|kill|killall|pkill/.test(cmd)) return 'medium'
  return 'low'
}

function riskColor(level: 'low' | 'medium' | 'high'): string {
  if (level === 'high') return 'var(--accent1)'
  if (level === 'medium') return 'var(--accent-orange)'
  return 'var(--accent-cyan)'
}

// ── Countdown timer ──────────────────────────────────────────────────────────

function Countdown({ expiresAt, timeoutMs }: { expiresAt: number; timeoutMs: number }) {
  const [remaining, setRemaining] = useState(timeoutMs)

  useEffect(() => {
    const tick = setInterval(() => {
      setRemaining(Math.max(0, expiresAt + timeoutMs - Date.now()))
    }, 1000)
    return () => clearInterval(tick)
  }, [expiresAt, timeoutMs])

  const totalSecs = Math.floor(remaining / 1000)
  const mins = Math.floor(totalSecs / 60)
  const secs = totalSecs % 60

  const pct = remaining / timeoutMs
  const color = pct > 0.5 ? 'var(--accent-cyan)' : pct > 0.2 ? 'var(--accent-orange)' : 'var(--accent1)'

  return (
    <div className="flex items-center gap-2">
      <Clock className="w-3.5 h-3.5" style={{ color: 'var(--text-sec)' }} />
      <span className="text-xs tabular-nums" style={{ color }}>
        {mins > 0 ? `${mins}m ` : ''}{secs}s
      </span>
      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--border-secondary)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  )
}

// ── Main modal ────────────────────────────────────────────────────────────────

export function ExecApprovalModal() {
  const { current, isVisible, resolveCurrent } = useExecApprovalStore()
  const [envExpanded, setEnvExpanded] = useState(false)
  const [denialReason, setDenialReason] = useState('')
  const [showDenialInput, setShowDenialInput] = useState(false)

  // Toast notifications
  const toast = useToast()

  // Reset env expanded and denial state when current changes
  useEffect(() => {
    setEnvExpanded(false)
    setDenialReason('')
    setShowDenialInput(false)
  }, [current?.id])

  // Show toast when approval times out (modal becomes invisible with a current approval)
  const hasTimedOutRef = useRef(false)
  useEffect(() => {
    // Reset ref when a new approval comes in
    hasTimedOutRef.current = false
  }, [current?.id])

  useEffect(() => {
    if (!current) return
    if (!isVisible && !hasTimedOutRef.current) {
      hasTimedOutRef.current = true
      toast.warning('审批请求超时，请重新发起请求', 3000)
    }
  }, [isVisible, current, toast])

  const handleApprove = useCallback(() => {
    resolveCurrent('approved')
  }, [resolveCurrent])

  const handleApproveOnce = useCallback(() => {
    resolveCurrent('approved-once')
  }, [resolveCurrent])

  const handleDeny = useCallback(() => {
    if (!showDenialInput) {
      setShowDenialInput(true)
      return
    }
    const v: ApprovalDecisionReason = denialReason.trim()
      ? { decision: 'denied', reason: denialReason.trim() }
      : 'denied'
    resolveCurrent(v)
    setDenialReason('')
    setShowDenialInput(false)
  }, [resolveCurrent, denialReason, showDenialInput])

  const handleCancelDeny = useCallback(() => {
    setDenialReason('')
    setShowDenialInput(false)
  }, [])

  // Keyboard shortcuts: Enter=approve, Esc=deny (only when not typing in input)
  useEffect(() => {
    if (!isVisible || !current || showDenialInput) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') { e.preventDefault(); handleApprove() }
      if (e.key === 'Escape') { e.preventDefault(); handleDeny() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isVisible, current, showDenialInput, handleApprove, handleDeny])

  const content = (
    <AnimatePresence>
      {isVisible && current && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[300] flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.55)', backdropFilter: 'blur(4px)' }}
          role="dialog"
          aria-modal="true"
          aria-label="命令执行审批"
        >
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[560px] rounded-2xl overflow-hidden"
            style={{
              background: 'var(--bg-sidebar)',
              border: '1px solid var(--border)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-center gap-3 px-5 py-4"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(252, 93, 30, 0.12)' }}
              >
                <Shield className="w-5 h-5" style={{ color: 'var(--accent1)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                  命令执行审批
                </h2>
                <p className="text-xs truncate" style={{ color: 'var(--text-sec)' }}>
                  {current.nodeName ? `来自节点 ${current.nodeName}` : 'Shell 命令待执行'}
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-4">

              {/* Command block */}
              <div>
                <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-sec)' }}>
                  待执行命令
                </p>
                <div
                  className="rounded-xl px-4 py-3 font-mono text-sm leading-relaxed overflow-x-auto"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                  }}
                >
                  <div className="flex items-start gap-2">
                    <Terminal className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--text-ter)' }} />
                    <span className="break-all">{current.command || `${current.executable} ${(current.args ?? []).join(' ')}`}</span>
                  </div>
                </div>
              </div>

              {/* Reason / context */}
              {current.reason && (
                <div>
                  <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-sec)' }}>
                    执行意图
                  </p>
                  <p className="text-sm rounded-xl px-4 py-2.5" style={{ color: 'var(--text-sec)', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-secondary)' }}>
                    {current.reason}
                  </p>
                </div>
              )}

              {/* Risk badge */}
              {(() => {
                const riskLevel = getRiskLevel(current.command)
                const color = riskColor(riskLevel)
                return (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" style={{ color }} />
                    <span className="text-xs" style={{ color }}>
                      {riskLevel === 'high' && '警告：该命令可能具有破坏性，请仔细确认'}
                      {riskLevel === 'medium' && '注意：该命令需要系统级权限'}
                      {riskLevel === 'low' && '低风险命令'}
                    </span>
                    <span
                      className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: `${color}18`, color }}
                    >
                      {riskLevel === 'high' ? '高风险' : riskLevel === 'medium' ? '需注意' : '安全'}
                    </span>
                  </div>
                )
              })()}

              {/* Environment variables (collapsible) */}
              {current.env && Object.keys(current.env).length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setEnvExpanded((v) => !v)}
                    className="flex items-center gap-1.5 text-xs font-medium transition-colors"
                    style={{ color: 'var(--text-sec)' }}
                  >
                    <span>环境变量（{Object.keys(current.env).length} 项）</span>
                    {envExpanded
                      ? <ChevronUp className="w-3.5 h-3.5" />
                      : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  <AnimatePresence>
                    {envExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                      >
                        <div
                          className="mt-2 rounded-xl px-3 py-2 space-y-1"
                          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-secondary)' }}
                        >
                          {Object.entries(current.env).map(([key, val]) => (
                            <div key={key} className="flex gap-2 text-xs font-mono">
                              <span style={{ color: 'var(--accent-cyan)' }}>{key}=</span>
                              <span
                                className="truncate"
                                style={{ color: 'var(--text-sec)' }}
                                title={val}
                              >
                                {/* Mask sensitive values */}
                                {/password|secret|token|key|auth/i.test(key)
                                  ? '••••••••'
                                  : val}
                              </span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Timeout countdown */}
              <Countdown expiresAt={current.receivedAt} timeoutMs={current.timeoutMs} />
            </div>

            {/* Footer */}
            <div
              className="flex flex-col gap-3 px-5 py-4"
              style={{ borderTop: '1px solid var(--border)' }}
            >
              {/* Denial reason input (collapsible) */}
              <AnimatePresence>
                {showDenialInput && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <div
                      className="rounded-xl px-3 py-2.5 space-y-2"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}
                    >
                      <p className="text-xs font-medium" style={{ color: 'var(--text-sec)' }}>
                        拒绝理由（可选）
                      </p>
                      <input
                        type="text"
                        value={denialReason}
                        onChange={(e) => setDenialReason(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); handleDeny() }
                          if (e.key === 'Escape') { e.preventDefault(); handleCancelDeny() }
                        }}
                        placeholder="说明拒绝原因，帮助 AI 理解"
                        className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid var(--border-secondary)',
                          color: 'var(--text)',
                        }}
                        autoFocus
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={handleCancelDeny}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
                          style={{ background: 'transparent', color: 'var(--text-sec)' }}
                        >
                          <X className="w-3 h-3" />
                          取消
                        </button>
                        <button
                          type="button"
                          onClick={handleDeny}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                          style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-sec)', border: '1px solid var(--border)' }}
                        >
                          <Ban className="w-3 h-3" />
                          确认拒绝
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Primary action buttons */}
              <div className="flex items-center gap-3">
                {!showDenialInput && (
                  <button
                    type="button"
                    onClick={handleDeny}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-sec)',
                    }}
                  >
                    <Ban className="w-4 h-4" />
                    拒绝
                  </button>
                )}

                {!showDenialInput && (
                  <button
                    type="button"
                    onClick={handleApproveOnce}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{
                      background: 'rgba(0, 210, 170, 0.08)',
                      border: '1px solid rgba(0, 210, 170, 0.25)',
                      color: 'var(--accent-cyan)',
                    }}
                  >
                    <CheckCircle className="w-4 h-4" />
                    仅本次批准
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleApprove}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: 'var(--accent-gradient)',
                    color: 'var(--text-inverse)',
                    boxShadow: '0 4px 16px rgba(252, 93, 30, 0.3)',
                  }}
                >
                  <Check className="w-4 h-4" />
                  批准执行
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  // Portal into body so modal renders above everything
  return createPortal(content, document.body)
}

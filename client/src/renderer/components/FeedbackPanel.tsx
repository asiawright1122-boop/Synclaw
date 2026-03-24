/**
 * FeedbackPanel - User feedback form component
 * Provides a form for users to submit feedback, bug reports, feature requests, etc.
 */
import { useCallback, useEffect, useState } from 'react'
import { CheckCircle, AlertCircle, Send, Mail, MessageSquare, Loader2 } from 'lucide-react'
import { authService } from '../lib/auth'

export type FeedbackType = 'bug' | 'feature' | 'general' | 'account'

export interface FeedbackFormData {
  email: string
  type: FeedbackType
  description: string
}

interface FeedbackPanelProps {
  /** Called when feedback is submitted successfully */
  onSuccess?: () => void
}

const FEEDBACK_TYPES: { value: FeedbackType; label: string; placeholder: string }[] = [
  {
    value: 'bug',
    label: 'Bug Report',
    placeholder: '请详细描述你遇到的问题，包括复现步骤、期望结果和实际结果...',
  },
  {
    value: 'feature',
    label: 'Feature Request',
    placeholder: '请描述你希望添加的功能，以及它能解决什么问题...',
  },
  {
    value: 'general',
    label: 'General Feedback',
    placeholder: '请分享你的想法、建议或任何其他反馈...',
  },
  {
    value: 'account',
    label: 'Account Issue',
    placeholder: '请描述你的账户问题，包括相关账户信息和截图...',
  },
]

export function FeedbackPanel({ onSuccess }: FeedbackPanelProps) {
  const [email, setEmail] = useState('')
  const [type, setType] = useState<FeedbackType>('general')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  // Pre-fill email from auth service
  useEffect(() => {
    const user = authService.getUser()
    if (user?.email) {
      setEmail(user.email)
    }
  }, [])

  const currentType = FEEDBACK_TYPES.find(t => t.value === type) || FEEDBACK_TYPES[2]

  const canSubmit = description.trim().length >= 10

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || submitting) return

    setSubmitting(true)
    setSubmitStatus('idle')
    setErrorMessage('')

    try {
      const feedbackData: FeedbackFormData = {
        email: email.trim(),
        type,
        description: description.trim(),
      }

      // Try to submit to backend API first
      try {
        const response = await fetch('/api/feedback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(feedbackData),
        })

        if (response.ok) {
          setSubmitStatus('success')
          setDescription('')
          onSuccess?.()
          return
        }
      } catch {
        // Backend not available, fall back to mailto
      }

      // Fallback: Open mailto link with pre-filled subject and body
      const subjectMap: Record<FeedbackType, string> = {
        bug: 'Bug Report',
        feature: 'Feature Request',
        general: 'General Feedback',
        account: 'Account Issue',
      }

      const subject = encodeURIComponent(`[SynClaw] ${subjectMap[type]} - User Feedback`)
      const body = encodeURIComponent(
        `Type: ${subjectMap[type]}\n` +
        `Email: ${email || 'Not provided'}\n\n` +
        `Description:\n${description}\n\n` +
        `---\n` +
        `Sent from SynClaw Feedback Panel\n` +
        `App Version: ${window.electronAPI?.app?.getVersion?.() || 'Unknown'}`
      )

      // Open mailto in a new window/tab
      window.open(`mailto:feedback@synclaw.ai?subject=${subject}&body=${body}`, '_blank')

      // Still mark as success since mailto opened
      setSubmitStatus('success')
      setDescription('')
      onSuccess?.()
    } catch {
      setSubmitStatus('error')
      setErrorMessage('提交失败，请稍后重试或发送邮件至 feedback@synclaw.ai')
    } finally {
      setSubmitting(false)
    }
  }, [canSubmit, submitting, email, type, description, onSuccess])

  const handleReset = () => {
    setSubmitStatus('idle')
    setErrorMessage('')
  }

  return (
    <div className="pb-10 max-w-2xl">
      <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>
        提交反馈
      </h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-sec)' }}>
        请描述你遇到的问题或建议。我们会认真阅读每一条反馈，并尽快回复你。
      </p>

      {/* Success State */}
      {submitStatus === 'success' && (
        <div
          className="rounded-[10px] border p-6 mb-6 text-center"
          style={{ background: 'rgba(47, 158, 91, 0.08)', borderColor: 'var(--success)' }}
        >
          <CheckCircle className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--success)' }} />
          <p className="text-base font-medium mb-2" style={{ color: 'var(--success)' }}>
            反馈已提交
          </p>
          <p className="text-sm" style={{ color: 'var(--text-sec)' }}>
            感谢你的反馈，我们会尽快处理并回复。
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors border"
            style={{ borderColor: 'var(--success)', color: 'var(--success)' }}
          >
            提交新反馈
          </button>
        </div>
      )}

      {/* Error State */}
      {submitStatus === 'error' && (
        <div
          className="rounded-[10px] border p-4 mb-6"
          style={{ background: 'rgba(239, 68, 68, 0.08)', borderColor: 'var(--danger)' }}
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--danger)' }} />
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: 'var(--danger)' }}>
                提交失败
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-sec)' }}>
                {errorMessage}
              </p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs px-3 py-1 rounded-md border shrink-0"
              style={{ borderColor: 'var(--border)', color: 'var(--text-sec)' }}
            >
              重试
            </button>
          </div>
        </div>
      )}

      {/* Form */}
      {submitStatus !== 'success' && (
        <div className="space-y-5">
          {/* Email Field */}
          <div>
            <label
              htmlFor="feedback-email"
              className="flex items-center gap-1.5 text-sm font-medium mb-2"
              style={{ color: 'var(--text)' }}
            >
              <Mail className="w-4 h-4" style={{ color: 'var(--text-sec)' }} />
              邮箱
              <span className="text-xs font-normal" style={{ color: 'var(--text-ter)' }}>
                (可选，已登录自动填充)
              </span>
            </label>
            <input
              id="feedback-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full rounded-[10px] px-4 py-2.5 text-sm border transition-colors focus:outline-none"
              style={{
                background: 'var(--bg-subtle)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
              }}
            />
          </div>

          {/* Type Dropdown */}
          <div>
            <label
              htmlFor="feedback-type"
              className="flex items-center gap-1.5 text-sm font-medium mb-2"
              style={{ color: 'var(--text)' }}
            >
              <MessageSquare className="w-4 h-4" style={{ color: 'var(--text-sec)' }} />
              反馈类型
            </label>
            <select
              id="feedback-type"
              value={type}
              onChange={(e) => setType(e.target.value as FeedbackType)}
              className="w-full rounded-[10px] px-4 py-2.5 text-sm border transition-colors focus:outline-none appearance-none cursor-pointer"
              style={{
                background: 'var(--bg-subtle)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
              }}
            >
              {FEEDBACK_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Description Textarea */}
          <div>
            <label
              htmlFor="feedback-description"
              className="text-sm font-medium mb-2 block"
              style={{ color: 'var(--text)' }}
            >
              描述
              <span className="text-xs font-normal ml-2" style={{ color: 'var(--danger)' }}>
                (必填，至少 10 个字符)
              </span>
            </label>
            <textarea
              id="feedback-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={8}
              placeholder={currentType.placeholder}
              className="w-full rounded-[10px] px-4 py-3 text-sm border resize-none transition-colors focus:outline-none"
              style={{
                background: 'var(--bg-subtle)',
                borderColor: description.length > 0 && description.length < 10 ? 'var(--accent1)' : 'var(--border)',
                color: 'var(--text)',
              }}
            />
            <div className="flex justify-end mt-1.5">
              <span
                className="text-xs"
                style={{
                  color: description.length < 10 ? 'var(--text-ter)' : 'var(--success)',
                }}
              >
                {description.length} / 10 字符
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              disabled={!canSubmit || submitting}
              onClick={handleSubmit}
              className="flex items-center gap-2 px-6 py-2.5 rounded-[10px] text-sm font-medium transition-all"
              style={{
                background: canSubmit && !submitting ? 'var(--accent1)' : '#eee',
                color: canSubmit && !submitting ? '#fff' : 'var(--text-ter)',
                opacity: canSubmit ? 1 : 0.7,
              }}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  提交中...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  提交反馈
                </>
              )}
            </button>

            {!canSubmit && description.length > 0 && (
              <span className="text-xs" style={{ color: 'var(--text-ter)' }}>
                请至少输入 10 个字符
              </span>
            )}
          </div>

          {/* Hint */}
          <p className="text-xs mt-4" style={{ color: 'var(--text-ter)' }}>
            提交后将自动附带应用版本信息，便于我们快速定位问题。
            如需发送附件，请使用邮箱 feedback@synclaw.ai。
          </p>
        </div>
      )}
    </div>
  )
}

export default FeedbackPanel

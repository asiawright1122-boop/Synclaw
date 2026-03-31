/**
 * 共享 UI 组件
 * 从 SettingsView 提取，供全项目复用
 */
import { RefreshCw } from 'lucide-react'

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[10px] border overflow-hidden ${className}`}
      style={{ background: 'var(--bg-container)', borderColor: 'var(--border)' }}
    >
      {children}
    </div>
  )
}

export function Row({
  label,
  desc,
  children,
  border = true,
}: {
  label: string
  desc?: string
  children?: React.ReactNode
  border?: boolean
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 px-5 py-3.5"
      style={{ borderBottom: border ? '1px solid var(--border-secondary)' : undefined }}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
          {label}
        </p>
        {desc ? (
          <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-sec)' }}>
            {desc}
          </p>
        ) : null}
      </div>
      {children}
    </div>
  )
}

export function ToggleStrip({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="w-11 h-6 rounded-full relative shrink-0 transition-colors"
      style={{ background: on ? 'var(--accent1)' : '#e0e0e0' }}
    >
      <span
        className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200"
        style={{ left: on ? 22 : 2 }}
      />
    </button>
  )
}

export function ToggleDot({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border transition-colors"
      style={{
        borderColor: on ? 'var(--accent1)' : '#ddd',
        background: on ? 'rgba(252,93,30,0.12)' : '#f5f5f5',
      }}
    >
      <span
        className="w-4 h-4 rounded-full"
        style={{ background: on ? 'var(--accent1)' : '#ccc' }}
      />
    </button>
  )
}

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <RefreshCw
      className="animate-spin"
      style={{ width: size, height: size, color: 'var(--text-sec)' }}
    />
  )
}

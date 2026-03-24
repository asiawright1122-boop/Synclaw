/**
 * Toast notification system with auto-dismiss
 */
import { create } from 'zustand'
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react'
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastStore {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
  clearAll: () => void
}

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const newToast: Toast = { ...toast, id }

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }))

    // Auto-remove after duration (default 2s)
    const duration = toast.duration ?? 2000
    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id)
      }, duration)
    }

    return id
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }))
  },

  clearAll: () => {
    set({ toasts: [] })
  },
}))

const toastIcons: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const Icon = toastIcons[toast.type]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`toast toast-${toast.type}`}
      role="alert"
    >
      <Icon className="toast-icon" />
      <span className="toast-content">{toast.message}</span>
      <button
        type="button"
        className="toast-close"
        onClick={onRemove}
        aria-label="关闭"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  )
}

interface ToastContainerProps {
  maxToasts?: number
}

export function ToastContainer({ maxToasts = 5 }: ToastContainerProps) {
  const { toasts, removeToast } = useToastStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const visibleToasts = toasts.slice(-maxToasts)

  if (!mounted) return null

  return createPortal(
    <div className="toast-container" aria-live="polite" aria-label="通知">
      <AnimatePresence mode="popLayout">
        {visibleToasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onRemove={() => removeToast(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>,
    document.body
  )
}

// Convenience hooks for different toast types
export function useToast() {
  const { addToast, removeToast, clearAll } = useToastStore()

  return {
    success: (message: string, duration?: number) =>
      addToast({ type: 'success', message, duration }),

    error: (message: string, duration?: number) =>
      addToast({ type: 'error', message, duration: duration ?? 3000 }),

    info: (message: string, duration?: number) =>
      addToast({ type: 'info', message, duration }),

    warning: (message: string, duration?: number) =>
      addToast({ type: 'warning', message, duration }),

    custom: (toast: Omit<Toast, 'id'>) => addToast(toast),

    dismiss: removeToast,

    clearAll,
  }
}

// Context provider for app-wide toast access
interface ToastContextValue {
  toast: ReturnType<typeof useToast>
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const toast = useToast()

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

export function useToastContext() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToastContext must be used within a ToastProvider')
  }
  return context
}

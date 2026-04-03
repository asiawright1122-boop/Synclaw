/**
 * ErrorBoundary.tsx
 *
 * React 错误边界组件，捕获子组件的渲染错误，
 * 防止单个组件错误导致整个应用崩溃。
 */

import React, { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  /** 组件名称，用于日志标识 */
  name?: string
  /** 发生错误时执行的回调 */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.name ? `(${this.props.name})` : ''}] Caught:`, error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500" />
          <div>
            <h3 className="text-lg font-semibold text-[var(--text)]">
              {this.props.name ? `${this.props.name} 出现问题` : '组件渲染出错'}
            </h3>
            <p className="mt-1 text-sm text-[var(--text-sec)]">
              {this.state.error?.message || '未知错误'}
            </p>
          </div>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 rounded-lg bg-[var(--accent1)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <RefreshCw className="h-4 w-4" />
            重试
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

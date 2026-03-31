import { useToast } from './Toast'

/**
 * Hook to show a permission denied error toast.
 * Usage: call `showPermissionDenied()` when a file operation is rejected.
 */
export function usePermissionDeniedToast() {
  const toast = useToast()

  return {
    show: (filePath?: string) => {
      const msg = filePath
        ? `权限不足：路径 ${filePath} 未在授权目录范围内`
        : '权限不足：此操作需要授权目录权限'
      toast.error(msg, 5000)
    },
  }
}

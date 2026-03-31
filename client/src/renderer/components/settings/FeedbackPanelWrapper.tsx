/**
 * FeedbackPanelWrapper.tsx — 反馈提交包装器
 */
import { FeedbackPanel } from '../FeedbackPanel'
import { useToastStore } from '../../stores/toastStore'

function FeedbackPanelWrapper() {
  const addToast = useToastStore(s => s.addToast)
  return (
    <FeedbackPanel
      onSuccess={() => {
        addToast({ type: 'success', message: '反馈已提交，感谢你的建议！', duration: 3000 })
      }}
    />
  )
}

export { FeedbackPanelWrapper }

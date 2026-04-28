import { createPortal } from 'react-dom'
import { CheckCircle, AlertCircle } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Props {
  message: string
  type?: ToastType
}

const styles: Record<ToastType, { bg: string; color: string; border: string }> = {
  success: { bg: 'var(--bg3)', color: 'var(--text1)', border: 'var(--border)' },
  error: { bg: 'var(--danger-bg)', color: 'var(--danger-text)', border: 'var(--danger-border)' },
  info: { bg: 'var(--bg2)', color: 'var(--text1)', border: 'var(--border)' },
}

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={13} strokeWidth={1.5} />,
  error: <AlertCircle size={13} strokeWidth={1.5} />,
  info: null,
}

export default function Toast({ message, type = 'info' }: Props) {
  const s = styles[type]
  const icon = icons[type]

  return createPortal(
    <div
      className="fixed z-[200] px-4 py-2.5 rounded-full border pointer-events-none flex items-center gap-1.5"
      style={{
        left: '50%',
        bottom: 'calc(88px + env(safe-area-inset-bottom, 0px))',
        transform: 'translateX(-50%)',
        background: s.bg,
        borderColor: s.border,
        color: s.color,
        animation: 'toastIn 0.28s cubic-bezier(0.16,1,0.3,1) both',
        boxShadow: '0 10px 40px rgba(0,0,0,0.18)',
        whiteSpace: 'nowrap',
      }}
    >
      {icon}
      <span className="font-mono text-[11px]" style={{ letterSpacing: '0.04em' }}>
        {message}
      </span>
    </div>,
    document.body,
  )
}

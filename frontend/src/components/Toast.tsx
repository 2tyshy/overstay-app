import { createPortal } from 'react-dom'

interface Props {
  message: string
}

export default function Toast({ message }: Props) {
  return createPortal(
    <div
      className="fixed z-[200] px-4 py-2.5 rounded-full border pointer-events-none"
      style={{
        left: '50%',
        bottom: 'calc(88px + env(safe-area-inset-bottom, 0px))',
        transform: 'translateX(-50%)',
        background: 'var(--bg2)',
        borderColor: 'var(--border)',
        color: 'var(--text1)',
        animation: 'toastIn 0.28s cubic-bezier(0.16,1,0.3,1) both',
        boxShadow: '0 10px 40px rgba(0,0,0,0.18)',
      }}
    >
      <span className="font-mono text-[11px]" style={{ letterSpacing: '0.04em' }}>
        {message}
      </span>
    </div>,
    document.body,
  )
}

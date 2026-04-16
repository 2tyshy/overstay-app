import { useEffect, useRef, type ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  children: ReactNode
  height?: string
}

export default function BottomSheet({ open, onClose, children, height = '85vh' }: Props) {
  const bgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <div
      ref={bgRef}
      onClick={e => { if (e.target === bgRef.current) onClose() }}
      className="fixed inset-0 z-50 flex items-end transition-opacity duration-200"
      style={{
        background: 'rgba(0,0,0,0.7)',
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'all' : 'none',
      }}
    >
      <div
        className="w-full border-t overflow-y-auto transition-transform duration-[360ms]"
        style={{
          background: 'var(--bg2)',
          borderColor: 'var(--border)',
          maxHeight: height,
          borderRadius: '16px 16px 0 0',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        <div className="flex justify-center pt-3 pb-5">
          <div className="w-7 h-[3px] rounded-full" style={{ background: 'var(--border)' }} />
        </div>
        <div className="px-[22px] pb-10">
          {children}
        </div>
      </div>
    </div>
  )
}

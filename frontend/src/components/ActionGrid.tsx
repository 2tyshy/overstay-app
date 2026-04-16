import { List, Camera, FileText } from 'lucide-react'

interface Props {
  onSchemes: () => void
  onStamp: () => void
  onPdf: () => void
}

export default function ActionGrid({ onSchemes, onStamp, onPdf }: Props) {
  const actions = [
    { icon: List, label: 'Схемы', sub: 'визаранов', onClick: onSchemes, primary: true },
    { icon: Camera, label: 'Штамп', sub: 'фото → AI', onClick: onStamp, primary: false },
    { icon: FileText, label: 'PDF', sub: 'экспорт', onClick: onPdf, primary: false },
  ]

  return (
    <div className="grid grid-cols-3 gap-2 mb-3" style={{ animation: 'cardIn 0.5s cubic-bezier(0.16,1,0.3,1) 0.25s both' }}>
      {actions.map(a => {
        const Icon = a.icon
        return (
          <button
            key={a.label}
            onClick={a.onClick}
            className="border rounded-[10px] p-3 text-left transition-all duration-150 hover:-translate-y-px active:scale-[0.97]"
            style={{
              background: 'var(--bg2)',
              borderColor: 'var(--border)',
            }}
          >
            <Icon size={16} strokeWidth={1.5} className="mb-1.5" style={{ color: 'var(--text3)' }} />
            <span className="text-[10px] font-semibold block" style={{ color: 'var(--text1)' }}>{a.label}</span>
            <span className="font-mono text-[8px] block mt-px" style={{ color: 'var(--text3)' }}>{a.sub}</span>
          </button>
        )
      })}
    </div>
  )
}

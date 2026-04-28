import { Camera, ChevronRight } from 'lucide-react'

interface Props {
  onCamera: () => void
}

export default function ActionGrid({ onCamera }: Props) {
  return (
    <button
      onClick={onCamera}
      className="w-full flex items-center gap-4 border rounded-[14px] p-4 mb-3 active:scale-[0.98] transition-transform"
      style={{
        borderColor: 'var(--border)',
        background: 'var(--bg2)',
        animation: 'cardIn 0.5s cubic-bezier(0.16,1,0.3,1) 0.25s both',
      }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: 'var(--bg3)' }}
      >
        <Camera size={22} strokeWidth={1.5} style={{ color: 'var(--text1)' }} />
      </div>
      <div className="text-left">
        <div className="text-[14px] font-semibold" style={{ color: 'var(--text1)' }}>
          Сфотографируй штамп
        </div>
        <div className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--text3)' }}>
          AI заполнит визу автоматически
        </div>
      </div>
      <ChevronRight size={16} className="ml-auto shrink-0" style={{ color: 'var(--text4)' }} />
    </button>
  )
}

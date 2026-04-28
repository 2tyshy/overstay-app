import { Stamp } from 'lucide-react'

interface Props {
  onAdd: () => void
}

export default function EmptyState({ onAdd }: Props) {
  return (
    <div
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
      style={{ animation: 'cardIn 0.5s cubic-bezier(0.16,1,0.3,1) both' }}
    >
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: 'var(--bg2)' }}
      >
        <Stamp size={36} strokeWidth={1.5} style={{ color: 'var(--text3)' }} />
      </div>
      <div className="text-[18px] font-semibold mb-2" style={{ color: 'var(--text1)' }}>
        Куда летишь дальше?
      </div>
      <div className="font-mono text-[11px] mb-8" style={{ color: 'var(--text3)' }}>
        Сфотографируй штамп — AI заполнит визу сам
      </div>
      <button
        onClick={onAdd}
        className="px-6 py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98]"
        style={{ background: 'var(--text1)', color: 'var(--bg)' }}
      >
        Добавить первый въезд
      </button>
    </div>
  )
}

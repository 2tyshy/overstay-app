import { Plus, Stamp } from 'lucide-react'

interface Props {
  onAdd: () => void
}

export default function EmptyState({ onAdd }: Props) {
  return (
    <div
      className="my-4 border rounded-[14px] px-5 py-10 text-center"
      style={{
        background: 'var(--bg2)',
        borderColor: 'var(--border)',
        animation: 'cardIn 0.5s cubic-bezier(0.16,1,0.3,1) both',
      }}
    >
      <div
        className="mx-auto w-12 h-12 border rounded-full flex items-center justify-center mb-3"
        style={{ borderColor: 'var(--border)', color: 'var(--text3)' }}
      >
        <Stamp size={20} strokeWidth={1.5} />
      </div>
      <div className="text-[15px] font-semibold mb-1" style={{ color: 'var(--text1)' }}>
        Ещё нет ни одного въезда
      </div>
      <div className="font-mono text-[10px] mb-5 leading-[1.6] px-4" style={{ color: 'var(--text3)' }}>
        Добавь штамп, чтобы начать трекинг визовых дедлайнов
      </div>
      <button
        onClick={onAdd}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded border font-semibold text-[12px] transition-all duration-150 active:scale-[0.97]"
        style={{ background: 'var(--text1)', color: 'var(--bg)', borderColor: 'var(--text1)' }}
      >
        <Plus size={14} strokeWidth={2} />
        Добавить первый въезд
      </button>
    </div>
  )
}

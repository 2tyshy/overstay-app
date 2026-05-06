import { Plus, RefreshCw } from 'lucide-react'
import ThemeToggle from './ThemeToggle'

interface Props {
  title: string
  onRefresh: () => void
  onAddEntry?: () => void
}

export default function Header({ title, onRefresh, onAddEntry }: Props) {
  return (
    <div className="flex items-center justify-between px-[22px] pt-3.5 pb-0 shrink-0">
      <div className="flex flex-col">
        <span
          className="font-light text-[11px] uppercase"
          style={{ letterSpacing: '0.35em', color: 'var(--text3)' }}
        >
          {title}
        </span>
        <span
          className="font-mono text-[8px] mt-0.5 leading-none"
          style={{ color: 'var(--text3)', opacity: 0.5 }}
        >
          {__BUILD_TAG__}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onRefresh}
          aria-label="Обновить данные"
          className="w-11 h-11 rounded-lg transition-colors active:scale-90 flex items-center justify-center"
          style={{ color: 'var(--text3)' }}
          title="Обновить"
        >
          <RefreshCw size={16} strokeWidth={1.5} />
        </button>
        {onAddEntry && (
          <button
            onClick={onAddEntry}
            aria-label="Добавить новый въезд"
            className="h-11 px-2.5 rounded-lg border flex items-center gap-1.5 transition-colors active:scale-95"
            style={{ color: 'var(--text2)', borderColor: 'var(--border)' }}
            title="Добавить въезд"
          >
            <Plus size={14} strokeWidth={1.5} />
            <span className="font-mono text-[9px] uppercase" style={{ letterSpacing: '0.12em' }}>
              Въезд
            </span>
          </button>
        )}
        <ThemeToggle />
      </div>
    </div>
  )
}

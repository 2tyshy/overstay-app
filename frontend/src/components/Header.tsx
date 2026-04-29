import { RefreshCw } from 'lucide-react'
import ThemeToggle from './ThemeToggle'

interface Props {
  title: string
  onRefresh: () => void
}

export default function Header({ title, onRefresh }: Props) {
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
          className="p-1.5 rounded-lg transition-colors active:scale-90"
          style={{ color: 'var(--text3)' }}
          title="Обновить"
        >
          <RefreshCw size={16} strokeWidth={1.5} />
        </button>
        <ThemeToggle />
      </div>
    </div>
  )
}

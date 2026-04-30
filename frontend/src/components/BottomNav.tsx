import { LayoutGrid, CircleArrowRight, Sparkles } from 'lucide-react'
import type { Screen } from '@/types'

const tabs: Array<{ id: Screen; label: string; icon: typeof LayoutGrid }> = [
  { id: 'status', label: 'Статус', icon: LayoutGrid },
  { id: 'next', label: 'Куда', icon: CircleArrowRight },
  { id: 'chat', label: 'Помощник', icon: Sparkles },
]

interface Props {
  active: Screen
  onChange: (screen: Screen) => void
}

export default function BottomNav({ active, onChange }: Props) {
  return (
    <nav
      className="flex pt-2 px-1 border-t"
      style={{
        background: 'var(--bg)',
        borderColor: 'var(--border)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)',
      }}
    >
      {tabs.map(tab => {
        const isActive = active === tab.id
        const Icon = tab.icon
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className="flex-1 flex flex-col items-center gap-1 py-1.5 relative"
            style={{ color: isActive ? 'var(--text1)' : 'var(--text3)' }}
          >
            <Icon size={19} strokeWidth={1.5} />
            <span
              className="font-mono text-[9px] uppercase"
              style={{ letterSpacing: '0.12em' }}
            >
              {tab.label}
            </span>
            {isActive && (
              <span
                className="absolute bottom-0 h-0.5 rounded-full"
                style={{
                  width: 18,
                  background: 'var(--text1)',
                  animation: 'lineIn 0.3s ease both',
                }}
              />
            )}
          </button>
        )
      })}
    </nav>
  )
}

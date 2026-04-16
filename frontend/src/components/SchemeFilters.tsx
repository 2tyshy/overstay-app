import { useState } from 'react'

const FILTERS = ['Все', 'VN →', 'TH →', 'Граница', 'Самолёт']

interface Props {
  onFilter: (filter: string) => void
}

export default function SchemeFilters({ onFilter }: Props) {
  const [active, setActive] = useState('Все')

  return (
    <div className="flex gap-1.5 overflow-x-auto pt-3 -mx-[18px] px-[18px]" style={{ scrollbarWidth: 'none' }}>
      {FILTERS.map(f => (
        <button
          key={f}
          onClick={() => { setActive(f); onFilter(f) }}
          className="shrink-0 border rounded px-3 py-1 font-mono text-[10px] transition-all duration-150"
          style={{
            borderColor: active === f ? 'var(--text3)' : 'var(--border)',
            color: active === f ? 'var(--text2)' : 'var(--text3)',
            background: active === f ? 'var(--bg3)' : 'transparent',
          }}
        >
          {f}
        </button>
      ))}
    </div>
  )
}

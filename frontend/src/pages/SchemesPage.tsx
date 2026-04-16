import { useState } from 'react'
import { Plus } from 'lucide-react'
import SchemeFilters from '@/components/SchemeFilters'
import SchemeCard from '@/components/SchemeCard'
import type { Scheme } from '@/types'

const MOCK_SCHEMES: Scheme[] = [
  { id: '1', passport: 'RU', from_country: 'VN', to_country: 'LA', border_crossing: 'Nam Phao', cost_usd: 25, duration_hours: 10, description: 'Автобус из HCMC → Vinh → граница Nam Phao. Пешком через КПП, штамп Лаос, разворот. Новый VN штамп 90 дней.', tip: 'Бери $35 налик — $20 виза Лаос + буфер на транспорт', verified_at: '2026-03-15', works_count: 47, broken_count: 3, created_at: '' },
  { id: '2', passport: 'RU', from_country: 'VN', to_country: 'KH', border_crossing: 'Moc Bai', cost_usd: 40, duration_hours: 5, description: 'Из HCMC автобус до Moc Bai — 2 часа. Быстрый КПП в Камбоджу и назад. Самый короткий ран из Хошимина.', tip: 'Виза Камбоджа $30 на месте. Торгуйся за автобус', verified_at: '2026-02-20', works_count: 31, broken_count: 1, created_at: '' },
  { id: '3', passport: 'RU', from_country: 'VN', to_country: 'KR', cost_usd: 200, duration_hours: 168, description: 'Рейс в Сеул на неделю. В Thai консульстве e-Visa за 3 дня. Прилетаешь с готовой Thai визой.', tip: 'Корея 90 дней безвиз для RU. Совмести с путешествием', verified_at: '2026-01-10', works_count: 19, broken_count: 0, created_at: '' },
]

export default function SchemesPage() {
  const [_filter, setFilter] = useState('Все')
  const [votes, setVotes] = useState<Record<string, 'works' | 'broken'>>({})

  const handleVote = (schemeId: string, vote: 'works' | 'broken') => {
    setVotes(prev => {
      if (prev[schemeId] === vote) {
        const next = { ...prev }
        delete next[schemeId]
        return next
      }
      return { ...prev, [schemeId]: vote }
    })
  }

  return (
    <div className="h-full overflow-y-auto px-[18px] pb-4" style={{ scrollbarWidth: 'none' }}>
      <SchemeFilters onFilter={setFilter} />

      <div
        className="font-mono text-[9px] uppercase mt-4 mb-2 flex items-center gap-2.5"
        style={{ color: 'var(--text4)', letterSpacing: '0.24em' }}
      >
        {MOCK_SCHEMES.length} подтверждено · RU
        <span className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      </div>

      {MOCK_SCHEMES.map((scheme, i) => (
        <SchemeCard key={scheme.id} scheme={scheme} index={i} userVote={votes[scheme.id] ?? null} onVote={handleVote} />
      ))}

      <button
        className="w-full border border-dashed rounded flex items-center gap-3 p-3.5 mt-0.5 transition-all duration-150"
        style={{ borderColor: 'var(--border)', color: 'var(--text1)' }}
      >
        <div
          className="w-8 h-8 border rounded flex items-center justify-center shrink-0"
          style={{ borderColor: 'var(--border)', color: 'var(--text3)' }}
        >
          <Plus size={15} strokeWidth={1.5} />
        </div>
        <div>
          <span className="text-[13px] font-medium block">Добавить схему</span>
          <span className="font-mono text-[9px] mt-px block" style={{ color: 'var(--text3)' }}>Помоги другим · анонимно</span>
        </div>
      </button>
    </div>
  )
}

import { type VisaEntry } from '@/types'
import HeroCard from '@/components/HeroCard'
import AlertStrip from '@/components/AlertStrip'
import CountryCard from '@/components/CountryCard'
import ActionGrid from '@/components/ActionGrid'
import HistoryItem from '@/components/HistoryItem'
import EmptyState from '@/components/EmptyState'

interface Props {
  entries: VisaEntry[]
  onStamp: () => void
  onEntryClick: (entry: VisaEntry) => void
  totalDaysSpent: number
}

export default function StatusPage({ entries, onStamp, onEntryClick, totalDaysSpent }: Props) {
  const current = entries[0]
  const history = entries.slice(1)

  const stats = {
    countries: new Set(entries.map(e => e.country)).size,
    totalDays: totalDaysSpent,
    runs: history.length,
  }

  return (
    <div className="h-full overflow-y-auto px-[18px] pb-4" style={{ scrollbarWidth: 'none' }}>
      {current ? (
        <>
          <HeroCard entry={current} stats={stats} onClick={() => onEntryClick(current)} />

          {/* AlertStrip with inline edit CTA when warn/danger */}
          {current.days_left > 0 && current.days_left <= Math.ceil(current.max_days * 0.25) ? (
            <div className="flex items-center gap-2 mb-1">
              <div className="flex-1">
                <AlertStrip entry={current} />
              </div>
              <button
                onClick={() => onEntryClick(current)}
                className="font-mono text-[10px] shrink-0 underline"
                style={{ color: 'var(--alert-text)' }}
              >
                Изменить →
              </button>
            </div>
          ) : (
            <AlertStrip entry={current} />
          )}

          <CountryCard countryCode={current.country} />
        </>
      ) : (
        <EmptyState onAdd={onStamp} />
      )}

      <ActionGrid onCamera={onStamp} />

      {history.length > 0 && (
        <>
          <div
            className="font-mono text-[9px] uppercase mt-6 mb-3 flex items-center gap-2.5"
            style={{ color: 'var(--text4)', letterSpacing: '0.24em' }}
          >
            История въездов
            <span className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          </div>
          <div className="border-t" style={{ borderColor: 'var(--border)' }}>
            {history.map((entry, i) => (
              <HistoryItem key={entry.id} entry={entry} index={i} onClick={() => onEntryClick(entry)} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

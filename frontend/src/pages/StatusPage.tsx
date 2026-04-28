import { type VisaEntry } from '@/types'
import HeroCard from '@/components/HeroCard'
import AlertStrip from '@/components/AlertStrip'
import CountryCard from '@/components/CountryCard'
import ActionGrid from '@/components/ActionGrid'
import HistoryItem from '@/components/HistoryItem'
import EmptyState from '@/components/EmptyState'
import type { Screen } from '@/types'

interface Props {
  entries: VisaEntry[]
  onNavigate: (screen: Screen) => void
  onStamp: () => void
  onPdf: () => void
  onEntryClick: (entry: VisaEntry) => void
  totalDaysSpent: number
}

export default function StatusPage({
  entries, onNavigate, onStamp, onPdf, onEntryClick, totalDaysSpent,
}: Props) {
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
          <AlertStrip entry={current} />
          <CountryCard countryCode={current.country} />
        </>
      ) : (
        <EmptyState onAdd={onStamp} />
      )}

      <ActionGrid onFaq={() => onNavigate('chat')} onStamp={onStamp} onPdf={onPdf} />

      {history.length > 0 && (
        <>
          <div
            className="font-mono text-[9px] uppercase mt-4 mb-2 flex items-center gap-2.5"
            style={{ color: 'var(--text4)', letterSpacing: '0.24em' }}
          >
            История · {history.length}
            <span className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          </div>
          {history.map((entry, i) => (
            <HistoryItem key={entry.id} entry={entry} index={i} onClick={() => onEntryClick(entry)} />
          ))}
        </>
      )}
    </div>
  )
}

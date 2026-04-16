import { type VisaEntry } from '@/types'
import HeroCard from '@/components/HeroCard'
import AlertStrip from '@/components/AlertStrip'
import ActionGrid from '@/components/ActionGrid'
import HistoryItem from '@/components/HistoryItem'
import type { Screen } from '@/types'

interface Props {
  onNavigate: (screen: Screen) => void
  onStamp: () => void
}

const MOCK_ENTRY: VisaEntry = {
  id: '1', user_id: '1', country: 'VN', entry_date: '2026-03-15',
  visa_type: 'evisa_90', max_days: 90, created_at: '',
  deadline: '2026-06-13', days_left: 14,
}

const MOCK_HISTORY: VisaEntry[] = [
  { id: '2', user_id: '1', country: 'TH', entry_date: '2025-09-10', visa_type: 'dtv_180', max_days: 180, created_at: '', deadline: '2026-03-08', days_left: 0 },
  { id: '3', user_id: '1', country: 'KH', entry_date: '2025-09-08', visa_type: 'visa_on_arrival_30', max_days: 2, created_at: '', deadline: '2025-09-10', days_left: 0 },
]

export default function StatusPage({ onNavigate, onStamp }: Props) {
  return (
    <div className="h-full overflow-y-auto px-[18px] pb-4" style={{ scrollbarWidth: 'none' }}>
      <HeroCard
        entry={MOCK_ENTRY}
        stats={{ countries: 7, totalDays: 312, runs: 4 }}
      />

      <AlertStrip daysLeft={14} schemesCount={3} countries={['RU → LA', 'KH', 'TH']} />

      <ActionGrid
        onSchemes={() => onNavigate('schemes')}
        onStamp={onStamp}
        onPdf={() => {}}
      />

      <div
        className="font-mono text-[9px] uppercase mt-4 mb-2 flex items-center gap-2.5"
        style={{ color: 'var(--text4)', letterSpacing: '0.24em' }}
      >
        История
        <span className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      </div>

      {MOCK_HISTORY.map((entry, i) => (
        <HistoryItem key={entry.id} entry={entry} index={i} />
      ))}
    </div>
  )
}

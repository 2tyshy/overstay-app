import { ChevronRight } from 'lucide-react'
import { COUNTRY_FLAGS, COUNTRY_NAMES, type VisaEntry } from '@/types'
import { formatDateFull } from '@/lib/dates'

interface Props {
  entry: VisaEntry
  index: number
  onClick?: () => void
}

export default function HistoryItem({ entry, index, onClick }: Props) {
  const badge = entry.max_days <= 3 ? 'РАН' : `${entry.max_days} дн`
  const isExpired = entry.days_left === 0

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 py-3.5 border-b last:border-0 active:opacity-70 transition-opacity text-left"
      style={{
        borderColor: 'var(--border)',
        opacity: isExpired ? 0.55 : 1,
        animation: `cardIn 0.4s cubic-bezier(0.16,1,0.3,1) ${index * 0.05}s both`,
      }}
    >
      <span className="text-2xl shrink-0" aria-hidden="true">{COUNTRY_FLAGS[entry.country] ?? '🏳️'}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium truncate" style={{ color: 'var(--text1)' }}>
          {COUNTRY_NAMES[entry.country] ?? entry.country}
        </div>
        <div className="font-mono text-[10px] mt-0.5 truncate" style={{ color: 'var(--text3)', letterSpacing: '0.02em' }}>
          {entry.visa_type.replace(/_/g, ' ')} · {formatDateFull(entry.entry_date)}
        </div>
      </div>
      <span
        className="font-mono text-[10px] shrink-0"
        style={{ color: isExpired ? 'var(--text4)' : 'var(--text2)' }}
      >
        {badge}
      </span>
      <ChevronRight size={14} className="shrink-0 ml-1" style={{ color: 'var(--text4)' }} />
    </button>
  )
}

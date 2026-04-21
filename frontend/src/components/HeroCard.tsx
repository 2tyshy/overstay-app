import { COUNTRY_FLAGS, COUNTRY_NAMES, getRiskLevel, type VisaEntry } from '@/types'
import { formatDateFull } from '@/lib/dates'
import RingProgress from './RingProgress'
import SegmentedBar from './SegmentedBar'

interface Props {
  entry: VisaEntry
  stats: { countries: number; totalDays: number; runs: number }
  onClick?: () => void
}

export default function HeroCard({ entry, stats, onClick }: Props) {
  const isExpired = entry.days_left === 0
  const risk = isExpired ? 'danger' as const : getRiskLevel(entry.days_left, entry.max_days)
  const riskLabels = { safe: 'SAFE', warn: 'WARN', danger: isExpired ? 'EXPIRED' : 'DANGER' }
  const usedDays = Math.max(0, entry.max_days - entry.days_left)

  return (
    <div
      className="mx-0 my-3.5 border rounded-[14px] overflow-hidden cursor-pointer active:scale-[0.98] transition-all duration-200 hover:border-[var(--text4)]"
      style={{ background: 'var(--bg2)', borderColor: 'var(--border)', animation: 'cardIn 0.5s cubic-bezier(0.16,1,0.3,1) both' }}
      onClick={onClick}
    >
      {/* Top row */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2.5">
          <span className="text-2xl" aria-hidden="true">{COUNTRY_FLAGS[entry.country] ?? '🏳️'}</span>
          <div>
            <div className="text-[15px] font-semibold" style={{ color: 'var(--text1)', letterSpacing: '-0.01em' }}>
              {COUNTRY_NAMES[entry.country] ?? entry.country}
            </div>
            <div className="font-mono text-[10px] mt-px" style={{ color: 'var(--text3)', letterSpacing: '0.04em' }}>
              {entry.visa_type.replace(/_/g, ' ')} · {entry.max_days} дн
            </div>
          </div>
        </div>
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded border text-[9px] font-semibold uppercase"
          style={{
            color: risk === 'safe' ? 'var(--text3)' : 'var(--alert-text)',
            borderColor: risk === 'safe' ? 'var(--border)' : 'var(--alert-border)',
            background: risk === 'safe' ? 'transparent' : 'var(--alert-bg)',
            letterSpacing: '0.1em',
          }}
        >
          {risk !== 'safe' && (
            <span
              className="w-[5px] h-[5px] rounded-full"
              style={{ background: 'var(--alert-dot)', animation: isExpired ? undefined : 'pulse 2s ease-in-out infinite' }}
            />
          )}
          {riskLabels[risk]}
        </div>
      </div>

      {/* Ring section */}
      <div className="flex items-center gap-5 px-4 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
        <RingProgress daysLeft={entry.days_left} maxDays={entry.max_days} entryDate={entry.entry_date} />
        <div className="flex-1 space-y-1.5">
          {[
            ['Въезд', formatDateFull(entry.entry_date)],
            ['Дедлайн', formatDateFull(entry.deadline)],
            ['Использовано', `${usedDays} / ${entry.max_days} дн`],
            ['Тип', entry.visa_type.replace(/_/g, ' ')],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between items-baseline gap-2">
              <span className="font-mono text-[9px] uppercase shrink-0" style={{ color: 'var(--text4)', letterSpacing: '0.08em' }}>{label}</span>
              <span className="text-[13px] font-medium text-right truncate" style={{ color: 'var(--text2)' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Segmented bar */}
      <SegmentedBar daysLeft={entry.days_left} maxDays={entry.max_days} />

      {/* Stats */}
      <div className="grid grid-cols-3">
        {[
          [String(stats.countries).padStart(2, '0'), 'Стран'],
          [String(stats.totalDays), 'Дней'],
          [String(stats.runs).padStart(2, '0'), 'Ранов'],
        ].map(([val, label], i) => (
          <div
            key={label}
            className="text-center py-2.5"
            style={{
              borderRight: i < 2 ? '1px solid var(--border)' : undefined,
              animation: `cardIn 0.4s cubic-bezier(0.16,1,0.3,1) ${0.4 + i * 0.05}s both`,
            }}
          >
            <span className="text-[18px] font-semibold tabular-nums block" style={{ color: 'var(--text1)', letterSpacing: '-0.02em' }}>{val}</span>
            <span className="font-mono text-[8px] uppercase mt-0.5 block" style={{ color: 'var(--text4)', letterSpacing: '0.1em' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

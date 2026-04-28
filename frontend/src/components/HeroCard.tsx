import { COUNTRY_FLAGS, COUNTRY_NAMES, getRiskLevel, type VisaEntry } from '@/types'
import { formatDateFull } from '@/lib/dates'
import SegmentedBar from './SegmentedBar'

interface Props {
  entry: VisaEntry
  onClick?: () => void
}

export default function HeroCard({ entry, onClick }: Props) {
  const isExpired = entry.days_left === 0
  const risk = isExpired ? 'danger' as const : getRiskLevel(entry.days_left, entry.max_days)
  const usedDays = Math.max(0, entry.max_days - entry.days_left)

  const riskLabel = isExpired ? 'ИСТЕКЛО' : risk === 'safe' ? 'ОК' : risk === 'warn' ? 'СКОРО' : 'СРОЧНО'
  const badgeColor = risk === 'safe' ? 'var(--text3)' : 'var(--alert-text)'
  const badgeBg = risk === 'safe' ? 'transparent' : 'var(--alert-bg)'
  const badgeBorder = risk === 'safe' ? 'var(--border)' : 'var(--alert-border)'

  return (
    <div
      className="my-3.5 border rounded-[18px] p-5 cursor-pointer active:scale-[0.98] transition-all duration-200"
      style={{ background: 'var(--bg2)', borderColor: 'var(--border)', animation: 'cardIn 0.5s cubic-bezier(0.16,1,0.3,1) both' }}
      onClick={onClick}
    >
      {/* Row 1: flag + country + status badge */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <span className="text-3xl" aria-hidden="true">{COUNTRY_FLAGS[entry.country] ?? '🏳️'}</span>
          <div>
            <div className="text-[15px] font-semibold" style={{ color: 'var(--text1)', letterSpacing: '-0.01em' }}>
              {COUNTRY_NAMES[entry.country] ?? entry.country}
            </div>
            <div className="font-mono text-[10px] mt-px" style={{ color: 'var(--text3)', letterSpacing: '0.04em' }}>
              {entry.visa_type.replace(/_/g, ' ')}
            </div>
          </div>
        </div>
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded border text-[9px] font-semibold uppercase shrink-0"
          style={{ color: badgeColor, borderColor: badgeBorder, background: badgeBg, letterSpacing: '0.1em' }}
        >
          {risk !== 'safe' && !isExpired && (
            <span
              className="w-[5px] h-[5px] rounded-full"
              style={{ background: 'var(--alert-dot)', animation: 'pulse 2s ease-in-out infinite' }}
            />
          )}
          {riskLabel}
        </div>
      </div>

      {/* Row 2: big days left number */}
      <div className="mb-4">
        <div
          className="text-[52px] font-bold leading-none tabular-nums"
          style={{ color: isExpired ? 'var(--text4)' : 'var(--text1)', letterSpacing: '-0.03em' }}
        >
          {entry.days_left}
        </div>
        <div className="font-mono text-[10px] mt-1.5" style={{ color: 'var(--text3)' }}>
          {isExpired ? 'истекло' : 'дней осталось'} · дедлайн {formatDateFull(entry.deadline)}
        </div>
      </div>

      {/* Row 3: progress bar */}
      <SegmentedBar daysLeft={entry.days_left} maxDays={entry.max_days} />

      {/* Row 4: meta */}
      <div className="flex gap-6 mt-4">
        <div>
          <div className="font-mono text-[9px] uppercase mb-0.5" style={{ color: 'var(--text4)', letterSpacing: '0.12em' }}>Въезд</div>
          <div className="text-[13px] font-medium" style={{ color: 'var(--text2)' }}>{formatDateFull(entry.entry_date)}</div>
        </div>
        <div>
          <div className="font-mono text-[9px] uppercase mb-0.5" style={{ color: 'var(--text4)', letterSpacing: '0.12em' }}>Использовано</div>
          <div className="text-[13px] font-medium" style={{ color: 'var(--text2)' }}>{usedDays} / {entry.max_days} дн</div>
        </div>
      </div>
    </div>
  )
}

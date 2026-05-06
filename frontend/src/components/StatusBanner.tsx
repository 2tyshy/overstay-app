import { COUNTRY_FLAGS, COUNTRY_NAMES } from '@/types'

interface Props { daysLeft: number; country: string }

export default function StatusBanner({ daysLeft, country }: Props) {
  const isDanger = daysLeft <= 7
  const isWarn = !isDanger && daysLeft <= 14
  const accent = isDanger ? 'var(--danger-text)' : isWarn ? 'var(--alert-text)' : 'var(--text3)'
  const badgeText = isDanger ? 'СРОЧНО' : isWarn ? 'СКОРО' : 'НОРМА'
  return (
    <div className="border rounded my-3.5 px-4 py-4 relative overflow-hidden" style={{ borderColor: 'var(--border)', borderLeftWidth: 2, borderLeftColor: accent }}>
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, var(--border), ${accent} 40%, var(--border))` }} />
      <div className="flex items-center justify-between mb-1.5">
        <div className="font-mono text-[9px] uppercase" style={{ color: 'var(--text4)', letterSpacing: '0.26em' }}>Текущий статус</div>
        <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded border" style={{ color: accent, borderColor: accent, letterSpacing: '0.1em' }}>
          {badgeText}
        </span>
      </div>
      <span className="text-[42px] font-bold leading-none block mb-0.5" style={{ color: 'var(--text1)', letterSpacing: '-0.03em' }}>{daysLeft}</span>
      <div className="font-mono text-[11px]" style={{ color: 'var(--text3)' }}>
        дней до конца · <span style={{ color: 'var(--text2)' }}>{COUNTRY_FLAGS[country]} {COUNTRY_NAMES[country]}</span>
      </div>
    </div>
  )
}

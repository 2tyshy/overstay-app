import { getSegments } from '@/lib/dates'

interface Props {
  daysLeft: number
  maxDays: number
}

export default function SegmentedBar({ daysLeft, maxDays }: Props) {
  const segments = getSegments(daysLeft, maxDays)
  const pct = maxDays > 0 ? Math.round(((maxDays - daysLeft) / maxDays) * 100) : 0

  return (
    <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
      <div className="flex justify-between mb-1.5">
        <span className="font-mono text-[9px] uppercase" style={{ color: 'var(--text4)', letterSpacing: '0.1em' }}>
          Прогресс
        </span>
        <span className="font-mono text-[9px] uppercase tabular-nums" style={{ color: 'var(--text4)', letterSpacing: '0.1em' }}>
          {pct}%
        </span>
      </div>
      <div className="flex gap-0.5">
        {segments.map((type, i) => {
          let bg: string
          if (type === 'danger') bg = 'var(--alert-dot)'
          else if (type === 'warn') bg = 'var(--alert-dot)'
          else if (type === 'used') bg = 'var(--text3)'
          else bg = 'var(--border2)'
          const opacity = type === 'warn' ? 0.7 : 1
          return (
            <div
              key={i}
              className="flex-1 h-1 rounded-sm transition-colors duration-300"
              style={{
                background: bg,
                opacity,
                animation: `cardIn 0.3s cubic-bezier(0.16,1,0.3,1) ${0.4 + i * 0.03}s both`,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

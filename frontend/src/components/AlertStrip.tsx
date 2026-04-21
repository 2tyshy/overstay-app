import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { VisaEntry } from '@/types'
import { COUNTRY_NAMES } from '@/types'

interface Props {
  entry: VisaEntry
}

export default function AlertStrip({ entry }: Props) {
  const { days_left } = entry

  // Expired state — different visual treatment
  if (days_left === 0) {
    return (
      <div
        className="flex gap-2.5 items-start p-2.5 rounded-[10px] border border-l-2 mb-3"
        style={{
          background: 'var(--alert-bg)',
          borderColor: 'var(--alert-border)',
          borderLeftColor: 'var(--alert-dot)',
          animation: 'cardIn 0.5s cubic-bezier(0.16,1,0.3,1) 0.15s both',
        }}
      >
        <div className="mt-0.5 shrink-0" style={{ color: 'var(--alert-dot)' }}>
          <AlertTriangle size={14} strokeWidth={1.5} />
        </div>
        <div>
          <div className="text-xs font-semibold mb-px" style={{ color: 'var(--alert-text)' }}>
            Овер-стей
          </div>
          <div className="font-mono text-[10px]" style={{ color: 'var(--alert-text)', opacity: 0.7 }}>
            Виза истекла — возможен штраф при выезде
          </div>
        </div>
      </div>
    )
  }

  // Warn zone — 14 days or less
  if (days_left <= 14) {
    const country = COUNTRY_NAMES[entry.country] ?? entry.country
    return (
      <div
        className="flex gap-2.5 items-start p-2.5 rounded-[10px] border border-l-2 mb-3"
        style={{
          background: 'var(--alert-bg)',
          borderColor: 'var(--alert-border)',
          borderLeftColor: 'var(--alert-dot)',
          animation: 'cardIn 0.5s cubic-bezier(0.16,1,0.3,1) 0.15s both',
        }}
      >
        <div className="mt-0.5 shrink-0" style={{ color: 'var(--alert-dot)', animation: 'pulse 2s ease-in-out infinite' }}>
          <AlertTriangle size={14} strokeWidth={1.5} />
        </div>
        <div>
          <div className="text-xs font-semibold mb-px" style={{ color: 'var(--alert-text)' }}>
            Планируй ран · {days_left} {pluralDays(days_left)}
          </div>
          <div className="font-mono text-[10px]" style={{ color: 'var(--alert-text)', opacity: 0.7 }}>
            Посмотри схемы из {country} — раздел «Схемы»
          </div>
        </div>
      </div>
    )
  }

  // Safe zone — show mild positive confirmation instead of empty space
  if (days_left >= 30) return null

  return (
    <div
      className="flex gap-2.5 items-center p-2.5 rounded-[10px] border mb-3"
      style={{
        background: 'var(--bg2)',
        borderColor: 'var(--border)',
        animation: 'cardIn 0.5s cubic-bezier(0.16,1,0.3,1) 0.15s both',
      }}
    >
      <div style={{ color: 'var(--text3)' }}>
        <CheckCircle2 size={14} strokeWidth={1.5} />
      </div>
      <div className="font-mono text-[10px]" style={{ color: 'var(--text3)' }}>
        Комфортная зона · {days_left} {pluralDays(days_left)} до дедлайна
      </div>
    </div>
  )
}

function pluralDays(n: number): string {
  const abs = Math.abs(n)
  if (abs % 10 === 1 && abs % 100 !== 11) return 'день'
  if ([2, 3, 4].includes(abs % 10) && ![12, 13, 14].includes(abs % 100)) return 'дня'
  return 'дней'
}

import { AlertTriangle } from 'lucide-react'

interface Props {
  daysLeft: number
  schemesCount: number
  countries: string[]
}

export default function AlertStrip({ daysLeft, schemesCount, countries }: Props) {
  if (daysLeft > 14) return null

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
        <div className="text-xs font-semibold mb-px" style={{ color: 'var(--alert-text)' }}>Планируй ран</div>
        <div className="font-mono text-[10px]" style={{ color: 'var(--alert-text)', opacity: 0.55 }}>
          {schemesCount} схем доступно · {countries.join(', ')}
        </div>
      </div>
    </div>
  )
}

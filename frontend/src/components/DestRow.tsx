import { ChevronRight, Ban } from 'lucide-react'
import { COUNTRY_FLAGS, COUNTRY_NAMES } from '@/types'

interface Rule {
  country: string
  visa_type: string
  max_days: number
  notes?: string
  schemesCount: number
  airports: string
  cities: string
  cost_range: string
  unavailable: boolean
}

interface Props {
  rule: Rule
  index: number
  onClick: () => void
}

export default function DestRow({ rule, index, onClick }: Props) {
  const disabled = rule.unavailable
  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`flex items-center gap-3 border rounded p-3 mb-1.5 transition-all duration-150 ${
        disabled ? '' : 'cursor-pointer hover:border-[var(--text3)] active:scale-[0.99]'
      }`}
      style={{
        borderColor: 'var(--border)',
        opacity: disabled ? 0.5 : 1,
        animation: `cardIn 0.28s cubic-bezier(0.16,1,0.3,1) ${0.04 * (index + 1)}s both`,
      }}
    >
      <span className="text-[26px] shrink-0">{COUNTRY_FLAGS[rule.country]}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold mb-1 flex items-center gap-1.5" style={{ color: 'var(--text1)', letterSpacing: '-0.01em' }}>
          {COUNTRY_NAMES[rule.country] ?? rule.country}
          {disabled && <Ban size={12} strokeWidth={1.5} style={{ color: 'var(--alert-dot)' }} />}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {disabled ? (
            <Tag>недоступно</Tag>
          ) : (
            <Tag highlight>{rule.visa_type} {rule.max_days} дн</Tag>
          )}
          <Tag>{rule.cost_range}/мес</Tag>
          <Tag>{rule.cities}</Tag>
        </div>
        {rule.notes && (
          <div className="font-mono text-[9px] mt-1" style={{ color: 'var(--text3)' }}>{rule.notes}</div>
        )}
      </div>
      <div className="text-right shrink-0">
        <div className="text-[15px] font-semibold tabular-nums" style={{ color: 'var(--text2)', letterSpacing: '-0.02em' }}>
          {String(rule.schemesCount).padStart(2, '0')}
        </div>
        <div className="font-mono text-[8px]" style={{ color: 'var(--text3)' }}>схем</div>
      </div>
      <ChevronRight size={15} style={{ color: 'var(--text4)', visibility: disabled ? 'hidden' : 'visible' }} className="shrink-0 ml-1" />
    </div>
  )
}

function Tag({ children, highlight }: { children: React.ReactNode; highlight?: boolean }) {
  return (
    <span
      className="font-mono text-[9px] border rounded px-1.5 py-0.5"
      style={{
        color: highlight ? 'var(--text2)' : 'var(--text3)',
        borderColor: highlight ? 'var(--text3)' : 'var(--border)',
      }}
    >
      {children}
    </span>
  )
}

import { ChevronRight } from 'lucide-react'
import { COUNTRY_FLAGS, COUNTRY_NAMES, type VisaRule } from '@/types'

interface Props {
  rule: VisaRule
  schemesCount: number
  index: number
  onClick: () => void
}

export default function DestRow({ rule, schemesCount, index, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 border rounded p-3 mb-1.5 cursor-pointer transition-all duration-150 hover:border-[var(--text3)]"
      style={{
        borderColor: 'var(--border)',
        animation: `cardIn 0.28s cubic-bezier(0.16,1,0.3,1) ${0.04 * (index + 1)}s both`,
      }}
    >
      <span className="text-[26px] shrink-0">{COUNTRY_FLAGS[rule.country]}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold mb-1" style={{ color: 'var(--text1)', letterSpacing: '-0.01em' }}>
          {COUNTRY_NAMES[rule.country] ?? rule.country}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <Tag highlight>{rule.visa_type.replace(/_/g, ' ')} {rule.max_days} дн</Tag>
          {rule.cost_of_living_usd && <Tag>~${rule.cost_of_living_usd}/мес</Tag>}
          {rule.cities && <Tag>{rule.cities}</Tag>}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-[15px] font-semibold" style={{ color: 'var(--text2)', letterSpacing: '-0.02em' }}>
          {String(schemesCount).padStart(2, '0')}
        </div>
        <div className="font-mono text-[8px]" style={{ color: 'var(--text3)' }}>схем</div>
      </div>
      <ChevronRight size={15} style={{ color: 'var(--text4)' }} className="shrink-0 ml-1" />
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

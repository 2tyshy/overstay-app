import { COUNTRY_FLAGS, COUNTRY_NAMES, type VisaEntry } from '@/types'

interface Props {
  entry: VisaEntry
  index: number
}

export default function HistoryItem({ entry, index }: Props) {
  const badge = entry.max_days <= 3 ? 'РАН' : `${entry.max_days} ДН`

  return (
    <div
      className="flex items-center gap-3 border rounded-[10px] p-2.5 mb-1.5 opacity-50 cursor-pointer transition-all duration-200 hover:opacity-[0.75]"
      style={{
        background: 'var(--bg2)',
        borderColor: 'var(--border)',
        animation: `cardIn 0.4s cubic-bezier(0.16,1,0.3,1) ${index * 0.05}s both`,
      }}
    >
      <span className="text-lg shrink-0">{COUNTRY_FLAGS[entry.country]}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium" style={{ color: 'var(--text1)' }}>
          {COUNTRY_NAMES[entry.country] ?? entry.country}
        </div>
        <div className="font-mono text-[9px] mt-px" style={{ color: 'var(--text3)' }}>
          {entry.visa_type.replace(/_/g, ' ')} · {entry.entry_date}
        </div>
      </div>
      <span
        className="font-mono text-[9px] border rounded px-1.5 py-0.5 shrink-0"
        style={{ color: 'var(--text3)', borderColor: 'var(--border)', letterSpacing: '0.04em' }}
      >
        {badge}
      </span>
    </div>
  )
}

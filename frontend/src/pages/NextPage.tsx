import StatusBanner from '@/components/StatusBanner'
import DestRow from '@/components/DestRow'
import type { VisaRule, Screen } from '@/types'

interface Props { onNavigate: (screen: Screen) => void }

const MOCK_RULES: Array<VisaRule & { schemesCount: number }> = [
  { passport: 'RU', country: 'TH', visa_type: 'dtv_180', max_days: 180, cost_of_living_usd: 700, cities: 'BKK · CNX', notes: '', schemesCount: 12 },
  { passport: 'RU', country: 'MY', visa_type: 'visa_exempt', max_days: 90, cost_of_living_usd: 800, cities: 'KL · Penang', notes: '', schemesCount: 8 },
  { passport: 'RU', country: 'KH', visa_type: 'visa_on_arrival', max_days: 30, cost_of_living_usd: 600, cities: 'PP · SR', notes: '', schemesCount: 5 },
  { passport: 'RU', country: 'ID', visa_type: 'voa_60', max_days: 60, cost_of_living_usd: 700, cities: 'Bali', notes: '', schemesCount: 7 },
  { passport: 'RU', country: 'PH', visa_type: 'visa_exempt', max_days: 30, cost_of_living_usd: 650, cities: 'Cebu', notes: '', schemesCount: 4 },
]

export default function NextPage({ onNavigate }: Props) {
  return (
    <div className="h-full overflow-y-auto px-[18px] pb-4" style={{ scrollbarWidth: 'none' }}>
      <StatusBanner daysLeft={14} country="VN" />

      <div
        className="font-mono text-[9px] uppercase mb-2 flex items-center gap-2.5"
        style={{ color: 'var(--text4)', letterSpacing: '0.24em' }}
      >
        Подходящие · RU паспорт
        <span className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      </div>

      {MOCK_RULES.map((rule, i) => (
        <DestRow key={rule.country} rule={rule} schemesCount={rule.schemesCount} index={i} onClick={() => onNavigate('schemes')} />
      ))}
    </div>
  )
}

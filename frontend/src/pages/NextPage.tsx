import { useMemo } from 'react'
import StatusBanner from '@/components/StatusBanner'
import DestRow from '@/components/DestRow'
import type { Screen, VisaEntry, PassportCountry } from '@/types'
import { COUNTRY_DATA } from '@/lib/visaRules'

interface Props {
  onNavigate: (screen: Screen) => void
  entries: VisaEntry[]
  passport: PassportCountry
}

interface DestRule {
  country: string
  visa_type: string
  max_days: number
  notes: string
  schemesCount: number
  airports: string
  cities: string
  cost_range: string
  unavailable: boolean
}

function getRulesForPassport(passport: PassportCountry): DestRule[] {
  return Object.entries(COUNTRY_DATA).map(([country, data]) => ({
    country,
    visa_type: data.visa_type,
    max_days: data.max_days[passport],
    notes: data.notes_by_passport?.[passport] ?? data.description,
    schemesCount: data.schemesCount,
    airports: data.airports,
    cities: data.cities,
    cost_range: data.cost_of_living_usd,
    unavailable: data.max_days[passport] === 0,
  }))
  // Put available destinations first, then sort by schemesCount desc
  .sort((a, b) => {
    if (a.unavailable !== b.unavailable) return a.unavailable ? 1 : -1
    return b.schemesCount - a.schemesCount
  })
}

export default function NextPage({ onNavigate, entries, passport }: Props) {
  const current = entries[0]
  const rules = useMemo(() => getRulesForPassport(passport), [passport])

  return (
    <div className="h-full overflow-y-auto px-[18px] pb-4" style={{ scrollbarWidth: 'none' }}>
      {current && <StatusBanner daysLeft={current.days_left} country={current.country} />}

      <div
        className="font-mono text-[9px] uppercase mb-2 flex items-center gap-2.5"
        style={{ color: 'var(--text4)', letterSpacing: '0.24em' }}
      >
        Подходящие · {passport} паспорт
        <span className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      </div>

      {rules.map((rule, i) => (
        <DestRow key={rule.country} rule={rule} index={i} onClick={() => onNavigate('schemes')} />
      ))}
    </div>
  )
}

import { useMemo, useState, useRef } from 'react'
import { RefreshCw, WifiOff, X } from 'lucide-react'
import StatusBanner from '@/components/StatusBanner'
import DestRow from '@/components/DestRow'
import SchemeCard from '@/components/SchemeCard'
import type { VisaEntry, PassportCountry } from '@/types'
import { COUNTRY_DATA } from '@/lib/visaRules'
import { useSchemes } from '@/hooks/useSchemes'
import { useCommentCounts } from '@/hooks/useSchemeComments'
import { useUser } from '@/hooks/useUser'
import { isUuid } from '@/lib/uuid'

interface Props {
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

export default function NextPage({ entries, passport }: Props) {
  const current = entries[0]
  const rules = useMemo(() => getRulesForPassport(passport), [passport])

  const { user } = useUser(passport)
  const userId = user?.id
  const { schemes, votes, loading: schemesLoading, error: schemesError, vote, refetch } = useSchemes(passport, userId)
  const schemeIds = useMemo(() => schemes.map(s => s.id), [schemes])
  const commentCounts = useCommentCounts(schemeIds)

  const [filterCountry, setFilterCountry] = useState<string | null>(null)
  const schemesRef = useRef<HTMLDivElement>(null)

  const filteredSchemes = useMemo(() => {
    if (!filterCountry) return schemes
    const c = filterCountry.toUpperCase()
    return schemes.filter(s =>
      s.from_country?.toUpperCase() === c || s.to_country?.toUpperCase() === c
    )
  }, [schemes, filterCountry])

  const handleDestClick = (country: string) => {
    setFilterCountry(country)
    setTimeout(() => schemesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

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
        <DestRow key={rule.country} rule={rule} index={i} onClick={() => handleDestClick(rule.country)} />
      ))}

      {/* Визараны section */}
      <div
        ref={schemesRef}
        className="font-mono text-[9px] uppercase mt-6 mb-3 flex items-center gap-2.5"
        style={{ color: 'var(--text4)', letterSpacing: '0.24em' }}
      >
        Визараны
        {filterCountry && (
          <button
            onClick={() => setFilterCountry(null)}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors active:opacity-70"
            style={{ borderColor: 'var(--border)', background: 'var(--bg2)', color: 'var(--text2)', letterSpacing: '0.04em' }}
          >
            {filterCountry}
            <X size={9} />
          </button>
        )}
        <span className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        {!schemesLoading && (
          <button onClick={refetch} className="opacity-40 active:opacity-100 transition-opacity">
            <RefreshCw size={11} />
          </button>
        )}
      </div>

      {schemesLoading && (
        <div className="font-mono text-[10px] py-4 text-center" style={{ color: 'var(--text4)' }}>
          Загрузка…
        </div>
      )}

      {schemesError && !schemesLoading && (
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded border font-mono text-[10px] mb-2"
          style={{ background: 'var(--bg2)', borderColor: 'var(--border)', color: 'var(--text3)' }}
        >
          <WifiOff size={12} className="shrink-0" />
          <span>Не удалось загрузить схемы</span>
        </div>
      )}

      {!schemesLoading && !schemesError && filteredSchemes.length === 0 && (
        <div className="font-mono text-[10px] py-4 text-center" style={{ color: 'var(--text4)' }}>
          {filterCountry ? `Схем для ${filterCountry} пока нет` : 'Схем пока нет — будь первым!'}
        </div>
      )}

      {filteredSchemes.map((scheme, i) => (
        <SchemeCard
          key={scheme.id}
          scheme={scheme}
          index={i}
          userVote={votes[scheme.id] ?? null}
          onVote={(id, v) => { if (isUuid(userId)) void vote(id, v) }}
          userId={userId}
          commentCount={commentCounts[scheme.id] ?? 0}
          currentCountry={current?.country}
        />
      ))}
    </div>
  )
}

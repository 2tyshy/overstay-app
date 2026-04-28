import { MapPin, ChevronRight } from 'lucide-react'
import { COUNTRY_FLAGS, COUNTRY_NAMES } from '@/types'
import { COUNTRY_DATA } from '@/lib/visaRules'

interface Props {
  countryCode: string
  onCityClick?: (city: string, country: string) => void
}

export default function CountryCard({ countryCode, onCityClick }: Props) {
  const data = COUNTRY_DATA[countryCode]
  if (!data) return null

  const flag = COUNTRY_FLAGS[countryCode] ?? '🏳️'
  const name = COUNTRY_NAMES[countryCode] ?? countryCode
  const cities = data.cities ? data.cities.split(', ').map((c: string) => c.trim()).filter(Boolean) : []

  return (
    <div
      className="border rounded-[12px] mb-3 overflow-hidden"
      style={{
        background: 'var(--bg2)',
        borderColor: 'var(--border)',
        animation: 'cardIn 0.5s cubic-bezier(0.16,1,0.3,1) 0.1s both',
      }}
    >
      {/* Country header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <span className="text-2xl" aria-hidden="true">{flag}</span>
        <div>
          <div className="text-[15px] font-semibold" style={{ color: 'var(--text1)' }}>
            {name}
          </div>
          <div className="font-mono text-[9px] mt-px" style={{ color: 'var(--text3)', letterSpacing: '0.04em' }}>
            Текущая страна пребывания
          </div>
        </div>
      </div>

      {/* Cost of living */}
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="font-mono text-[9px] uppercase mb-1" style={{ color: 'var(--text4)', letterSpacing: '0.12em' }}>
          Стоимость жизни
        </div>
        <div className="text-[13px] font-medium" style={{ color: 'var(--text1)' }}>
          {data.cost_of_living_usd} <span className="font-mono text-[10px]" style={{ color: 'var(--text3)' }}>в месяц</span>
        </div>
      </div>

      {/* Cities as clickable rows */}
      {cities.length > 0 && (
        <div>
          <div className="px-4 pt-3 pb-1 font-mono text-[9px] uppercase" style={{ color: 'var(--text4)', letterSpacing: '0.12em' }}>
            Популярные города
          </div>
          {cities.map((city: string) => (
            <button
              key={city}
              onClick={() => onCityClick?.(city, name)}
              className="w-full flex items-center gap-3 px-4 py-2.5 border-t active:opacity-70 transition-opacity"
              style={{ borderColor: 'var(--border)' }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'var(--bg3)' }}
              >
                <MapPin size={12} strokeWidth={1.5} style={{ color: 'var(--text3)' }} />
              </div>
              <span className="flex-1 font-mono text-[12px] text-left" style={{ color: 'var(--text2)' }}>{city}</span>
              <ChevronRight size={12} className="shrink-0" style={{ color: 'var(--text4)' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

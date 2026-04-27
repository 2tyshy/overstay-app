import { COUNTRY_FLAGS, COUNTRY_NAMES } from '@/types'
import { COUNTRY_DATA } from '@/lib/visaRules'

interface Props {
  countryCode: string
}

export default function CountryCard({ countryCode }: Props) {
  const data = COUNTRY_DATA[countryCode]
  if (!data) return null

  const flag = COUNTRY_FLAGS[countryCode] ?? '🏳️'
  const name = COUNTRY_NAMES[countryCode] ?? countryCode

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

      {/* Stats row */}
      <div className="grid grid-cols-2">
        <div
          className="px-4 py-3 border-r"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="font-mono text-[9px] uppercase mb-1" style={{ color: 'var(--text4)', letterSpacing: '0.12em' }}>
            Стоимость жизни
          </div>
          <div className="text-[13px] font-medium" style={{ color: 'var(--text1)' }}>
            {data.cost_of_living_usd}
          </div>
          <div className="font-mono text-[9px] mt-0.5" style={{ color: 'var(--text3)' }}>
            в месяц
          </div>
        </div>

        <div className="px-4 py-3">
          <div className="font-mono text-[9px] uppercase mb-1" style={{ color: 'var(--text4)', letterSpacing: '0.12em' }}>
            Популярные города
          </div>
          <div className="text-[13px] font-medium leading-snug" style={{ color: 'var(--text1)' }}>
            {data.cities}
          </div>
        </div>
      </div>
    </div>
  )
}

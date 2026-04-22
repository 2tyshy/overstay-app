import type { PassportCountry } from '@/types'

// Canonical source of truth for all visa data shown across the app.
// Keep country/passport logic here — DO NOT duplicate in components.

export interface CountryData {
  visa_type: string                                   // default label for user picker
  max_days: Record<PassportCountry, number>           // 0 = not available for this passport
  cost_of_living_usd: string
  airports: string
  cities: string
  description: string
  schemesCount: number
  notes_by_passport?: Partial<Record<PassportCountry, string>>
  visa_options: Array<{ label: string; days: number }> // options in AddEntrySheet
}

export const COUNTRY_DATA: Record<string, CountryData> = {
  VN: {
    visa_type: 'e-visa 90',
    max_days: { RU: 90, UA: 90, KZ: 90 },
    cost_of_living_usd: '$800-1200',
    airports: 'SGN · HAN · DAD · CXR',
    cities: 'Нячанг, HCMC, Дананг',
    description: 'E-visa 90 дней, также visa exempt 45 дней',
    schemesCount: 8,
    visa_options: [
      { label: 'e-visa 90', days: 90 },
      { label: 'e-visa 30', days: 30 },
      { label: 'visa exempt 45', days: 45 },
      { label: 'visa on arrival 30', days: 30 },
    ],
  },
  TH: {
    visa_type: 'visa exempt 60',
    max_days: { RU: 60, UA: 60, KZ: 60 },
    cost_of_living_usd: '$1000-1500',
    airports: 'BKK · DMK · CNX · HKT',
    cities: 'Бангкок, Чиангмай, Пхукет',
    description: 'Безвиз 60 дней + продление +30 в иммиграции',
    schemesCount: 12,
    visa_options: [
      { label: 'visa exempt 60', days: 60 },
      { label: 'tourist 60', days: 60 },
      { label: 'dtv 180', days: 180 },
    ],
  },
  KH: {
    visa_type: 'visa on arrival 30',
    max_days: { RU: 30, UA: 30, KZ: 30 },
    cost_of_living_usd: '$600-1000',
    airports: 'PNH · REP',
    cities: 'Пномпень, Сиемрип',
    description: 'VOA $30 на месте',
    schemesCount: 5,
    visa_options: [
      { label: 'visa on arrival 30', days: 30 },
      { label: 'e-visa 30', days: 30 },
    ],
  },
  LA: {
    visa_type: 'visa on arrival 30',
    max_days: { RU: 30, UA: 30, KZ: 30 },
    cost_of_living_usd: '$500-800',
    airports: 'VTE · LPQ',
    cities: 'Вьентьян, Луанг-Прабанг',
    description: 'VOA $42 на месте',
    schemesCount: 4,
    visa_options: [
      { label: 'visa on arrival 30', days: 30 },
      { label: 'e-visa 30', days: 30 },
    ],
  },
  MY: {
    visa_type: 'visa exempt 30',
    max_days: { RU: 30, UA: 30, KZ: 30 },
    cost_of_living_usd: '$900-1400',
    airports: 'KUL · PEN',
    cities: 'KL, Пенанг, Лангкави',
    description: 'Безвиз 30 дней',
    schemesCount: 6,
    visa_options: [
      { label: 'visa exempt 30', days: 30 },
    ],
  },
  ID: {
    visa_type: 'voa 30',
    max_days: { RU: 30, UA: 30, KZ: 30 },
    cost_of_living_usd: '$1000-1800',
    airports: 'DPS · CGK',
    cities: 'Бали, Джакарта',
    description: 'VOA $35 + продление +30 дней',
    schemesCount: 7,
    visa_options: [
      { label: 'voa 30', days: 30 },
      { label: 'voa 60', days: 60 },
    ],
  },
  PH: {
    visa_type: 'visa free 30',
    max_days: { RU: 30, UA: 30, KZ: 30 },
    cost_of_living_usd: '$800-1200',
    airports: 'MNL · CEB',
    cities: 'Манила, Себу',
    description: 'Безвиз 30 дней',
    schemesCount: 4,
    visa_options: [
      { label: 'visa free 30', days: 30 },
    ],
  },
  KR: {
    visa_type: 'visa free 60',
    // Korea: visa-free suspended for RU since 2022; UA/KZ still have 30d
    max_days: { RU: 0, UA: 30, KZ: 30 },
    cost_of_living_usd: '$1500-2500',
    airports: 'ICN · GMP',
    cities: 'Сеул, Пусан',
    description: 'Безвиз 30 дней (UA/KZ)',
    schemesCount: 3,
    notes_by_passport: {
      RU: 'Безвиз приостановлен с 2022. Нужна виза.',
      UA: 'Безвиз 30 дней',
      KZ: 'Безвиз 30 дней',
    },
    // No "visa free 60" option: RU suspended, UA/KZ capped at 30.
    // Listing it caused computeMaxDays() to clamp 60→30 silently, masking the rule.
    visa_options: [
      { label: 'visa free 30', days: 30 },
    ],
  },
}

export const COUNTRY_CODES = Object.keys(COUNTRY_DATA) as Array<keyof typeof COUNTRY_DATA>

// Map stored visa_type strings (both legacy underscore and new space form)
// to their max_days. Extracts trailing number as fallback.
export function parseMaxDaysFromVisaType(visaType: string): number {
  const match = visaType.match(/(\d+)(?!.*\d)/) // last number in string
  if (!match) return 30
  const n = parseInt(match[1], 10)
  return isFinite(n) && n > 0 ? n : 30
}

// Compute max_days for a given country+visaType+passport combo.
// Applies passport-specific overrides (Korea for RU, etc).
export function computeMaxDays(
  country: string,
  visaType: string,
  passport: PassportCountry,
): number {
  const cd = COUNTRY_DATA[country]
  const fallback = parseMaxDaysFromVisaType(visaType)

  if (!cd) return fallback

  // If passport can't enter (e.g., KR for RU) — return 0
  if (cd.max_days[passport] === 0) return 0

  // Try to match the chosen visa_type to an option
  const normalized = visaType.toLowerCase().replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim()
  const option = cd.visa_options.find(o =>
    o.label.toLowerCase().replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim() === normalized
  )
  if (option) {
    // Trust explicit option selection. visa_options is curated per country and
    // must already exclude passport-incompatible options (e.g. KR no longer lists
    // "visa free 60" because no RU/UA/KZ passport actually gets 60 days).
    // Earlier versions clamped option.days to max_days[passport], which silently
    // turned DTV 180 into TH's default 60 and VOA 60 into ID's default 30.
    return option.days
  }
  // Unrecognized visa_type — fall back to the last number in the string, but cap
  // at the country's default (we don't know what rule they meant, so be conservative).
  return Math.min(fallback, cd.max_days[passport])
}

// Pretty-print a visa_type regardless of storage format
export function formatVisaType(visaType: string): string {
  return visaType.replace(/[_]/g, ' ').trim()
}

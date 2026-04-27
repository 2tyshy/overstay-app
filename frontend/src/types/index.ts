export type PassportCountry = 'RU' | 'UA' | 'KZ'

export interface User {
  id: string
  telegram_id: number
  passport_country: PassportCountry
  created_at: string
}

export interface VisaEntry {
  id: string
  user_id: string
  country: string
  entry_date: string
  visa_type: string
  max_days: number
  notes?: string
  created_at: string
  deadline: string
  days_left: number
  visa_start?: string
  visa_end?: string
}

export interface Scheme {
  id: string
  author_id?: string | null
  passport: PassportCountry
  from_country: string
  to_country: string
  border_crossing?: string
  cost_usd?: number
  duration_hours?: number
  description: string
  tip?: string
  verified_at: string
  works_count: number
  broken_count: number
  created_at: string
}

export interface SchemeVote {
  user_id: string
  scheme_id: string
  vote: 'works' | 'broken'
}

export interface SchemeComment {
  id: string
  scheme_id: string
  user_id: string
  content: string
  created_at: string
}


export interface ChatMessage {
  id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  context_screen?: string
  created_at: string
}

export type RiskLevel = 'safe' | 'warn' | 'danger'

export function getRiskLevel(daysLeft: number, maxDays: number): RiskLevel {
  const pct = daysLeft / maxDays
  if (pct > 0.25) return 'safe'
  if (pct > 0.1) return 'warn'
  return 'danger'
}

export type Screen = 'status' | 'schemes' | 'next'

export const COUNTRY_FLAGS: Record<string, string> = {
  VN: '🇻🇳', TH: '🇹🇭', KH: '🇰🇭', LA: '🇱🇦',
  MY: '🇲🇾', ID: '🇮🇩', PH: '🇵🇭', KR: '🇰🇷',
  SG: '🇸🇬', RU: '🇷🇺', UA: '🇺🇦', KZ: '🇰🇿',
}

export const COUNTRY_NAMES: Record<string, string> = {
  VN: 'Вьетнам', TH: 'Таиланд', KH: 'Камбоджа', LA: 'Лаос',
  MY: 'Малайзия', ID: 'Индонезия', PH: 'Филиппины', KR: 'Корея',
  SG: 'Сингапур', RU: 'Россия', UA: 'Украина', KZ: 'Казахстан',
}

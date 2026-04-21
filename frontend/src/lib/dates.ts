import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

// Parse a YYYY-MM-DD string as LOCAL date (not UTC).
// Fixes off-by-one errors for users in timezones away from UTC.
export function parseLocalDate(dateStr: string): Date {
  // Accept either YYYY-MM-DD or full ISO. For YYYY-MM-DD we construct
  // manually to avoid Date() treating it as UTC midnight.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr)
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  }
  return new Date(dateStr)
}

// Midnight today in local time.
export function todayLocal(): Date {
  const t = new Date()
  t.setHours(0, 0, 0, 0)
  return t
}

// Add N days to a local YYYY-MM-DD string, return YYYY-MM-DD.
export function addDaysLocal(dateStr: string, days: number): string {
  const d = parseLocalDate(dateStr)
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

// Calculate deadline (inclusive last day) from entry date and max days.
// entry + maxDays - 1, because day of entry counts as day 1.
export function calcDeadline(entryDate: string, maxDays: number): string {
  if (maxDays <= 0) return entryDate
  return addDaysLocal(entryDate, maxDays - 1)
}

// Days remaining until and including the deadline day (local time).
// 0 means today IS the deadline or it's already past.
export function calcDaysLeft(deadline: string): number {
  const dl = parseLocalDate(deadline)
  dl.setHours(0, 0, 0, 0)
  const today = todayLocal()
  const diff = Math.floor((dl.getTime() - today.getTime()) / 86400000)
  return Math.max(0, diff + 1)
}

export function getDaysLeft(entryDate: string, maxDays: number): number {
  return calcDaysLeft(calcDeadline(entryDate, maxDays))
}

export function getDeadline(entryDate: string, maxDays: number): string {
  return format(parseLocalDate(calcDeadline(entryDate, maxDays)), 'd MMM yyyy', { locale: ru })
}

export function formatDate(dateStr: string): string {
  return format(parseLocalDate(dateStr), 'd MMM', { locale: ru })
}

export function formatDateFull(dateStr: string): string {
  return format(parseLocalDate(dateStr), 'd MMM yyyy', { locale: ru })
}

// Segments for the progress bar. Only the last few USED blocks are flagged
// as "warn" when the user is actually in the warning zone (<25% left).
export function getSegments(daysLeft: number, maxDays: number, total = 22) {
  const daysUsed = Math.max(0, maxDays - daysLeft)
  const used = Math.min(total, Math.round((daysUsed / maxDays) * total))
  const pctLeft = daysLeft / maxDays
  const showWarn = pctLeft <= 0.25 && daysLeft > 0
  const showDanger = pctLeft <= 0.1 || daysLeft === 0
  return Array.from({ length: total }, (_, i) => {
    if (i >= used) return 'empty'
    // Mark the last 2-3 used blocks as warn/danger when actually in risk zone
    const inTail = i >= used - 3 && i < used
    if (showDanger && inTail) return 'danger'
    if (showWarn && inTail) return 'warn'
    return 'used'
  })
}

// Ring shows REMAINING time — full when just arrived, empty at deadline.
// Circle r=50, so circumference = 2π * 50 = ~314.159.
// strokeDashoffset: C → nothing drawn, 0 → full circle drawn.
// To show `remaining` fraction as drawn: offset = C * (1 - remaining).
export function getRingOffset(daysLeft: number, maxDays: number): number {
  const circumference = 2 * Math.PI * 50
  const remaining = maxDays > 0 ? Math.max(0, Math.min(1, daysLeft / maxDays)) : 0
  return circumference * (1 - remaining)
}

export function pluralDays(n: number): string {
  const abs = Math.abs(n)
  if (abs % 10 === 1 && abs % 100 !== 11) return 'день'
  if ([2, 3, 4].includes(abs % 10) && ![12, 13, 14].includes(abs % 100)) return 'дня'
  return 'дней'
}

import { differenceInDays, addDays, format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'

export function getDaysLeft(entryDate: string, maxDays: number): number {
  const deadline = addDays(parseISO(entryDate), maxDays)
  return differenceInDays(deadline, new Date())
}

export function getDeadline(entryDate: string, maxDays: number): string {
  return format(addDays(parseISO(entryDate), maxDays), 'd MMM yyyy', { locale: ru })
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'd MMM', { locale: ru })
}

export function formatDateFull(dateStr: string): string {
  return format(parseISO(dateStr), 'd MMM yyyy', { locale: ru })
}

export function getSegments(daysLeft: number, maxDays: number, total = 22) {
  const daysUsed = maxDays - daysLeft
  const used = Math.round((daysUsed / maxDays) * total)
  return Array.from({ length: total }, (_, i) => {
    if (i >= used) return 'empty'
    if (i >= used - 3 && i < used) return 'warn'
    return 'used'
  })
}

export function getRingOffset(daysLeft: number, maxDays: number): number {
  const circumference = 2 * Math.PI * 50
  const remaining = daysLeft / maxDays
  return circumference * remaining
}

export function pluralDays(n: number): string {
  const abs = Math.abs(n)
  if (abs % 10 === 1 && abs % 100 !== 11) return 'день'
  if ([2, 3, 4].includes(abs % 10) && ![12, 13, 14].includes(abs % 100)) return 'дня'
  return 'дней'
}

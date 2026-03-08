import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(price)
}

export function formatKm(km: number | null): string {
  if (!km) return '–'
  return new Intl.NumberFormat('de-DE').format(km) + ' km'
}

export function formatRegistration(month: number | null, year: number | null): string {
  if (!year) return '–'
  if (!month) return String(year)
  return `${String(month).padStart(2, '0')}/${year}`
}

export function formatDate(dateStr: string): string {
  return format(new Date(dateStr), 'dd.MM.yyyy', { locale: de })
}

export function formatRelativeTime(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: de })
}

export function getDaysUntil(targetDate: Date): number {
  const now = new Date()
  const diff = targetDate.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

import { format, parseISO, isWeekend, getDaysInMonth, startOfMonth } from 'date-fns'
import { UserSettings } from '@/types'

export function getTodayString(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function getCurrentTime(): string {
  return format(new Date(), 'HH:mm')
}

export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

export function formatCurrency(amount: number, currency: string): string {
  return `${currency}${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function isRestDay(date: string, settings: UserSettings): boolean {
  const d = parseISO(date)
  return settings.restDays.includes(d.getDay())
}

export function isHoliday(date: string, settings: UserSettings): boolean {
  return settings.holidays.includes(date)
}

export function getWorkingDaysInMonth(year: number, month: number, settings: UserSettings): string[] {
  const days: string[] = []
  const total = getDaysInMonth(new Date(year, month))
  for (let d = 1; d <= total; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    if (!isRestDay(dateStr, settings) && !isHoliday(dateStr, settings)) {
      days.push(dateStr)
    }
  }
  return days
}

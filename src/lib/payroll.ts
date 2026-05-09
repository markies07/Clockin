import { AttendanceRecord } from '@/types'
import { format, endOfMonth, addMonths } from 'date-fns'

/**
 * Philippine semi-monthly payroll:
 *   Cutoff 1 : 1st  – 15th  → Payout on 25th of same month
 *   Cutoff 2 : 16th – EOM   → Payout on 10th of next month
 */

export interface PayPeriod {
  label: string         // e.g. "May 1–15"
  cutoffStart: string   // yyyy-MM-dd
  cutoffEnd: string     // yyyy-MM-dd
  payDate: string       // yyyy-MM-dd
  payDateLabel: string  // e.g. "May 25"
}

export function getPayPeriods(ref: Date = new Date()): { current: PayPeriod; next: PayPeriod } {
  const day = ref.getDate()
  const year = ref.getFullYear()
  const month = ref.getMonth()

  const eom = endOfMonth(ref)
  const eomStr = format(eom, 'yyyy-MM-dd')

  // Period A: 1–15, pay on 25th of same month
  const pay25 = new Date(year, month, 25)
  const periodA_thisMonth: PayPeriod = {
    label: `${format(ref, 'MMM')} 1–15`,
    cutoffStart: format(new Date(year, month, 1), 'yyyy-MM-dd'),
    cutoffEnd:   format(new Date(year, month, 15), 'yyyy-MM-dd'),
    payDate:     format(pay25, 'yyyy-MM-dd'),
    payDateLabel: format(pay25, 'MMM d'),
  }

  // Period B: 16–EOM, pay on 10th of next month
  const nextMonthDate = addMonths(ref, 1)
  const nextYear = nextMonthDate.getFullYear()
  const nextMonth = nextMonthDate.getMonth()
  const pay10next = new Date(nextYear, nextMonth, 10)

  const periodB_thisMonth: PayPeriod = {
    label: `${format(ref, 'MMM')} 16–${format(eom, 'd')}`,
    cutoffStart: format(new Date(year, month, 16), 'yyyy-MM-dd'),
    cutoffEnd:   eomStr,
    payDate:     format(pay10next, 'yyyy-MM-dd'),
    payDateLabel: format(pay10next, 'MMM d'),
  }

  // Period A of next month: 1–15, pay on 25th of next month
  const pay25next = new Date(nextYear, nextMonth, 25)
  const periodA_nextMonth: PayPeriod = {
    label: `${format(nextMonthDate, 'MMM')} 1–15`,
    cutoffStart: format(new Date(nextYear, nextMonth, 1), 'yyyy-MM-dd'),
    cutoffEnd:   format(new Date(nextYear, nextMonth, 15), 'yyyy-MM-dd'),
    payDate:     format(pay25next, 'yyyy-MM-dd'),
    payDateLabel: format(pay25next, 'MMM d'),
  }

  if (day <= 15) {
    return { current: periodA_thisMonth, next: periodB_thisMonth }
  } else {
    return { current: periodB_thisMonth, next: periodA_nextMonth }
  }
}

export function earningsForPeriod(records: AttendanceRecord[], period: PayPeriod): number {
  return records
    .filter((r) => r.date >= period.cutoffStart && r.date <= period.cutoffEnd)
    .reduce((sum, r) => sum + (r.dailyEarnings || 0), 0)
}

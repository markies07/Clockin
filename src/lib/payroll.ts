import { AttendanceRecord, UserSettings } from '@/types'
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

export function getPayPeriods(settings: UserSettings, ref: Date = new Date()): { current: PayPeriod; next: PayPeriod } {
  const day = ref.getDate()
  const year = ref.getFullYear()
  const month = ref.getMonth()

  const c1 = settings.payrollFirstCutoff || 15
  const c2 = settings.payrollSecondCutoff || 0 // 0 means end of month
  const p1 = settings.payrollFirstPayday || 25
  const p2 = settings.payrollSecondPayday || 10

  function getEom(d: Date) {
    return endOfMonth(d).getDate()
  }

  function createPeriod(y: number, m: number, startDay: number, endDay: number, payDay: number, isNextMonthPay: boolean): PayPeriod {
    const dStart = new Date(y, m, startDay)
    const actualEndDay = endDay === 0 ? getEom(new Date(y, m, 1)) : endDay
    const dEnd = new Date(y, m, actualEndDay)

    let payYear = y
    let payMonth = m
    if (isNextMonthPay) {
      payMonth++
      if (payMonth > 11) { payMonth = 0; payYear++ }
    }

    const dPay = new Date(payYear, payMonth, payDay === 0 ? getEom(new Date(payYear, payMonth, 1)) : payDay)

    return {
      label: `${format(dStart, 'MMM')} ${startDay}–${actualEndDay === getEom(dStart) ? 'End of the Month' : actualEndDay}`,
      cutoffStart: format(dStart, 'yyyy-MM-dd'),
      cutoffEnd: format(dEnd, 'yyyy-MM-dd'),
      payDate: format(dPay, 'yyyy-MM-dd'),
      payDateLabel: format(dPay, 'MMM d'),
    }
  }

  // Period 1: Start of month to C1 -> Pay on P1
  const period1_this = createPeriod(year, month, 1, c1, p1, false)

  // Period 2: C1+1 to C2 (or EOM) -> Pay on P2 (usually next month)
  const period2_this = createPeriod(year, month, c1 + 1, c2, p2, true)

  // Period 1 of next month
  const nextMonthDate = addMonths(ref, 1)
  const period1_next = createPeriod(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), 1, c1, p1, false)

  if (day <= c1) {
    return { current: period1_this, next: period2_this }
  } else {
    return { current: period2_this, next: period1_next }
  }
}

export function earningsForPeriod(records: AttendanceRecord[], period: PayPeriod): number {
  return records
    .filter((r) => r.date >= period.cutoffStart && r.date <= period.cutoffEnd)
    .reduce((sum, r) => sum + (r.dailyEarnings || 0), 0)
}

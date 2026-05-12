import { AttendanceRecord, UserSettings } from '@/types'
import { format, endOfMonth, addMonths, addDays, parseISO, differenceInDays, startOfMonth } from 'date-fns'

export interface PayPeriod {
  label: string         // e.g. "May 1–15"
  cutoffStart: string   // yyyy-MM-dd
  cutoffEnd: string     // yyyy-MM-dd
  payDate: string       // yyyy-MM-dd
  payDateLabel: string  // e.g. "May 25"
}

// ─── Semi-monthly helpers ────────────────────────────────────────────────────

function getEom(d: Date) {
  return endOfMonth(d).getDate()
}

function semiMonthlyPeriod(
  y: number, m: number,
  startDay: number, endDay: number,
  payDay: number, nextMonthPay: boolean
): PayPeriod {
  const dStart = new Date(y, m, startDay)
  const actualEnd = endDay === 0 ? getEom(new Date(y, m, 1)) : endDay
  const dEnd = new Date(y, m, actualEnd)
  let py = y, pm = m
  if (nextMonthPay) { pm++; if (pm > 11) { pm = 0; py++ } }
  const dPay = new Date(py, pm, payDay === 0 ? getEom(new Date(py, pm, 1)) : payDay)
  return {
    label: `${format(dStart, 'MMM')} ${startDay}–${actualEnd === getEom(dStart) ? 'End' : actualEnd}`,
    cutoffStart: format(dStart, 'yyyy-MM-dd'),
    cutoffEnd: format(dEnd, 'yyyy-MM-dd'),
    payDate: format(dPay, 'yyyy-MM-dd'),
    payDateLabel: format(dPay, 'MMM d'),
  }
}

// ─── Custom cycle helpers ─────────────────────────────────────────────────────

function customPeriod(anchor: Date, idx: number, periodDays: number, pay1After: number, pay2After: number): PayPeriod {
  const start = addDays(anchor, idx * periodDays)
  const end = addDays(start, periodDays - 1)
  const isFirst = idx % 2 === 0
  const payAfter = isFirst ? pay1After : pay2After
  const payDate = addDays(end, payAfter)
  return {
    label: `${format(start, 'MMM d')} – ${format(end, 'MMM d')}`,
    cutoffStart: format(start, 'yyyy-MM-dd'),
    cutoffEnd: format(end, 'yyyy-MM-dd'),
    payDate: format(payDate, 'yyyy-MM-dd'),
    payDateLabel: format(payDate, 'MMM d'),
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getPayPeriods(settings: UserSettings, ref: Date = new Date()): { current: PayPeriod; next: PayPeriod } {
  if (settings.payrollCycleType === 'custom' && settings.payrollAnchorDate) {
    const anchor = parseISO(settings.payrollAnchorDate)
    const days = settings.payrollPeriodDays || 15
    const pay1 = settings.payrollPayDaysAfterCutoff ?? 2
    const pay2 = settings.payrollSecondPayDaysAfterCutoff ?? 2
    const diff = differenceInDays(ref, anchor)
    const idx = diff < 0 ? 0 : Math.floor(diff / days)
    return {
      current: customPeriod(anchor, idx, days, pay1, pay2),
      next:    customPeriod(anchor, idx + 1, days, pay1, pay2),
    }
  }

  // Semi-monthly (default)
  const day = ref.getDate()
  const year = ref.getFullYear()
  const month = ref.getMonth()
  const c1 = settings.payrollFirstCutoff || 15
  const c2 = settings.payrollSecondCutoff || 0
  const p1 = settings.payrollFirstPayday || 25
  const p2 = settings.payrollSecondPayday || 10

  const period1_this = semiMonthlyPeriod(year, month, 1, c1, p1, false)
  const period2_this = semiMonthlyPeriod(year, month, c1 + 1, c2, p2, true)
  const nextDate = addMonths(ref, 1)
  const period1_next = semiMonthlyPeriod(nextDate.getFullYear(), nextDate.getMonth(), 1, c1, p1, false)

  return day <= c1
    ? { current: period1_this, next: period2_this }
    : { current: period2_this, next: period1_next }
}

/** Generate all pay periods from `fromDate` up to `toDate` (inclusive), oldest first. */
export function getAllPayPeriods(settings: UserSettings, fromDate: Date, toDate: Date = new Date()): PayPeriod[] {
  const periods: PayPeriod[] = []

  if (settings.payrollCycleType === 'custom' && settings.payrollAnchorDate) {
    const anchor = parseISO(settings.payrollAnchorDate)
    const days = settings.payrollPeriodDays || 15
    const pay1 = settings.payrollPayDaysAfterCutoff ?? 2
    const pay2 = settings.payrollSecondPayDaysAfterCutoff ?? 2

    const diffFrom = differenceInDays(fromDate, anchor)
    const startIdx = Math.max(0, Math.floor(diffFrom / days))

    let idx = startIdx
    while (true) {
      const p = customPeriod(anchor, idx, days, pay1, pay2)
      if (p.cutoffStart > format(toDate, 'yyyy-MM-dd')) break
      periods.push(p)
      idx++
      if (idx > startIdx + 200) break // safety cap
    }
  } else {
    // Semi-monthly: iterate month by month
    const c1 = settings.payrollFirstCutoff || 15
    const c2 = settings.payrollSecondCutoff || 0
    const p1 = settings.payrollFirstPayday || 25
    const p2 = settings.payrollSecondPayday || 10

    let cur = startOfMonth(fromDate)
    const end = format(toDate, 'yyyy-MM-dd')

    while (true) {
      const y = cur.getFullYear()
      const m = cur.getMonth()
      const pa = semiMonthlyPeriod(y, m, 1, c1, p1, false)
      const pb = semiMonthlyPeriod(y, m, c1 + 1, c2, p2, true)

      if (pa.cutoffStart <= end) periods.push(pa)
      if (pb.cutoffStart <= end) periods.push(pb)

      cur = addMonths(cur, 1)
      if (format(cur, 'yyyy-MM') > format(toDate, 'yyyy-MM')) break
      if (periods.length > 200) break
    }

    // Remove future periods and duplicates
    const seen = new Set<string>()
    return periods.filter((p) => {
      if (p.cutoffStart > end) return false
      if (seen.has(p.cutoffStart)) return false
      seen.add(p.cutoffStart)
      return true
    })
  }

  return periods
}

export function earningsForPeriod(records: AttendanceRecord[], period: PayPeriod): number {
  return records
    .filter((r) => r.date >= period.cutoffStart && r.date <= period.cutoffEnd)
    .reduce((sum, r) => sum + (r.dailyEarnings || 0), 0)
}

export function detailedEarningsForPeriod(records: AttendanceRecord[], period: PayPeriod) {
  const recs = records.filter((r) => r.date >= period.cutoffStart && r.date <= period.cutoffEnd)
  const daysWorked = recs.filter((r) => r.timeIn).length
  const totalHours = recs.reduce((s, r) => s + (r.hoursWorked || 0), 0)
  const otHours = recs.reduce((s, r) => s + (r.otHours || 0), 0)
  const lateMinutes = recs.reduce((s, r) => s + (r.lateMinutes || 0), 0)
  const lateDeductions = recs.reduce((s, r) => s + (r.lateDeduction || 0), 0)
  const grossPay = recs.reduce((s, r) => s + (r.dailyEarnings || 0), 0)
  return { recs, daysWorked, totalHours, otHours, lateMinutes, lateDeductions, grossPay }
}

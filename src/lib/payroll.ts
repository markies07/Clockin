import { AttendanceRecord, UserSettings } from '@/types'
import { format, endOfMonth, addMonths, addDays, startOfMonth } from 'date-fns'

export interface PayPeriod {
  label: string
  cutoffStart: string   // yyyy-MM-dd
  cutoffEnd: string     // yyyy-MM-dd
  payDate: string       // yyyy-MM-dd
  payDateLabel: string
}

// ─── Semi-monthly ─────────────────────────────────────────────────────────────

function getEom(d: Date) { return endOfMonth(d).getDate() }

function semiMonthlyPeriod(y: number, m: number, startDay: number, endDay: number, payDay: number, nextMonthPay: boolean): PayPeriod {
  const dStart = new Date(y, m, startDay)
  const actualEnd = endDay === 0 ? getEom(new Date(y, m, 1)) : endDay
  const dEnd = new Date(y, m, actualEnd)
  let py = y, pm = m
  if (nextMonthPay) { pm++; if (pm > 11) { pm = 0; py++ } }
  const dPay = new Date(py, pm, payDay === 0 ? getEom(new Date(py, pm, 1)) : payDay)
  return {
    label: `${format(dStart, 'MMM d')} – ${actualEnd === getEom(dStart) ? format(dEnd, 'MMM d') : format(dEnd, 'MMM d')}`,
    cutoffStart: format(dStart, 'yyyy-MM-dd'),
    cutoffEnd: format(dEnd, 'yyyy-MM-dd'),
    payDate: format(dPay, 'yyyy-MM-dd'),
    payDateLabel: format(dPay, 'MMM d'),
  }
}

// ─── Custom cycle ─────────────────────────────────────────────────────────────

function customPeriodsForMonth(y: number, m: number, s: UserSettings): [PayPeriod, PayPeriod] {
  const p1StartDay = s.payrollP1StartDay ?? 29
  const p1StartOff = s.payrollP1StartOffset ?? -1
  const p1EndDay   = s.payrollP1EndDay ?? 13
  const p1EndOff   = s.payrollP1EndOffset ?? 0
  const p1PayDay   = s.payrollP1PayDay ?? 15
  const p1PayOff   = s.payrollP1PayOffset ?? 0
  const p2EndDay   = s.payrollP2EndDay ?? 28
  const p2EndOff   = s.payrollP2EndOffset ?? 0
  const p2PayDay   = s.payrollP2PayDay ?? 10
  const p2PayOff   = s.payrollP2PayOffset ?? 1

  const p1Start = new Date(y, m + p1StartOff, p1StartDay)
  const p1End   = new Date(y, m + p1EndOff,   p1EndDay)
  const p1Pay   = new Date(y, m + p1PayOff,   p1PayDay)
  const p2Start = addDays(p1End, 1)
  const p2End   = new Date(y, m + p2EndOff,   p2EndDay)
  const p2Pay   = new Date(y, m + p2PayOff,   p2PayDay)

  return [
    {
      label: `${format(p1Start, 'MMM d')} – ${format(p1End, 'MMM d')}`,
      cutoffStart: format(p1Start, 'yyyy-MM-dd'),
      cutoffEnd: format(p1End, 'yyyy-MM-dd'),
      payDate: format(p1Pay, 'yyyy-MM-dd'),
      payDateLabel: format(p1Pay, 'MMM d'),
    },
    {
      label: `${format(p2Start, 'MMM d')} – ${format(p2End, 'MMM d')}`,
      cutoffStart: format(p2Start, 'yyyy-MM-dd'),
      cutoffEnd: format(p2End, 'yyyy-MM-dd'),
      payDate: format(p2Pay, 'yyyy-MM-dd'),
      payDateLabel: format(p2Pay, 'MMM d'),
    },
  ]
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Returns the two pay periods for a given month. */
export function getPeriodsForMonth(settings: UserSettings, month: Date): [PayPeriod, PayPeriod] {
  const y = month.getFullYear()
  const m = month.getMonth()
  if (settings.payrollCycleType === 'custom') {
    return customPeriodsForMonth(y, m, settings)
  }
  const c1 = settings.payrollFirstCutoff || 15
  const c2 = settings.payrollSecondCutoff || 0
  const p1 = semiMonthlyPeriod(y, m, 1, c1, settings.payrollFirstPayday || 25, false)
  const p2 = semiMonthlyPeriod(y, m, c1 + 1, c2, settings.payrollSecondPayday || 10, true)
  return [p1, p2]
}

/** Current and next pay periods relative to a reference date. */
export function getPayPeriods(settings: UserSettings, ref: Date = new Date()): { current: PayPeriod; next: PayPeriod } {
  const today = format(ref, 'yyyy-MM-dd')
  const y = ref.getFullYear()
  const m = ref.getMonth()

  if (settings.payrollCycleType === 'custom') {
    const [p1, p2] = customPeriodsForMonth(y, m, settings)
    if (today >= p1.cutoffStart && today <= p1.cutoffEnd) return { current: p1, next: p2 }
    if (today >= p2.cutoffStart && today <= p2.cutoffEnd) {
      const [nextP1] = customPeriodsForMonth(addMonths(ref, 1).getFullYear(), addMonths(ref, 1).getMonth(), settings)
      return { current: p2, next: nextP1 }
    }
    if (today < p1.cutoffStart) {
      const prevRef = addMonths(ref, -1)
      const [, prevP2] = customPeriodsForMonth(prevRef.getFullYear(), prevRef.getMonth(), settings)
      return { current: prevP2, next: p1 }
    }
    const [nextP1] = customPeriodsForMonth(addMonths(ref, 1).getFullYear(), addMonths(ref, 1).getMonth(), settings)
    return { current: p2, next: nextP1 }
  }

  const day = ref.getDate()
  const c1 = settings.payrollFirstCutoff || 15
  const c2 = settings.payrollSecondCutoff || 0
  const p1 = settings.payrollFirstPayday || 25
  const p2 = settings.payrollSecondPayday || 10
  const period1 = semiMonthlyPeriod(y, m, 1, c1, p1, false)
  const period2 = semiMonthlyPeriod(y, m, c1 + 1, c2, p2, true)
  const nextRef = addMonths(ref, 1)
  const period1Next = semiMonthlyPeriod(nextRef.getFullYear(), nextRef.getMonth(), 1, c1, p1, false)

  return day <= c1
    ? { current: period1, next: period2 }
    : { current: period2, next: period1Next }
}

/** All pay periods from fromDate up to toDate, oldest first. */
export function getAllPayPeriods(settings: UserSettings, fromDate: Date, toDate: Date = new Date()): PayPeriod[] {
  const periods: PayPeriod[] = []
  const endStr = format(toDate, 'yyyy-MM-dd')
  let cur = startOfMonth(fromDate)
  let safety = 0

  while (format(cur, 'yyyy-MM') <= format(toDate, 'yyyy-MM') && safety < 200) {
    const [p1, p2] = getPeriodsForMonth(settings, cur)
    if (p1.cutoffStart <= endStr) periods.push(p1)
    if (p2.cutoffStart <= endStr) periods.push(p2)
    cur = addMonths(cur, 1)
    safety++
  }

  const seen = new Set<string>()
  return periods.filter((p) => {
    if (seen.has(p.cutoffStart)) return false
    seen.add(p.cutoffStart)
    return true
  })
}

export function earningsForPeriod(records: AttendanceRecord[], period: PayPeriod): number {
  return records
    .filter((r) => r.date >= period.cutoffStart && r.date <= period.cutoffEnd)
    .reduce((sum, r) => sum + (r.dailyEarnings || 0), 0)
}

export function detailedEarningsForPeriod(records: AttendanceRecord[], period: PayPeriod) {
  const recs = records.filter((r) => r.date >= period.cutoffStart && r.date <= period.cutoffEnd)
  const daysWorked    = recs.filter((r) => r.timeIn).length
  const totalHours    = recs.reduce((s, r) => s + (r.hoursWorked || 0), 0)
  const otHours       = recs.reduce((s, r) => s + (r.otHours || 0), 0)
  const lateMinutes   = recs.reduce((s, r) => s + (r.lateMinutes || 0), 0)
  const lateDeductions = recs.reduce((s, r) => s + (r.lateDeduction || 0), 0)
  const grossPay      = recs.reduce((s, r) => s + (r.dailyEarnings || 0), 0)
  return { recs, daysWorked, totalHours, otHours, lateMinutes, lateDeductions, grossPay }
}

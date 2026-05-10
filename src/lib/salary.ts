import { UserSettings, AttendanceRecord } from '@/types'

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100
}

export function computeRecord(
  timeIn: string,
  timeOut: string | null,
  settings: UserSettings,
  isHoliday: boolean,
  offsetUsed: number = 0
): Omit<AttendanceRecord, 'id' | 'date' | 'timeIn' | 'timeOut' | 'notes' | 'isHoliday' | 'isRestDay' | 'createdAt' | 'updatedAt'> {
  const LUNCH_MINUTES = 60

  // 1. Calculate Expected Hours
  const startMinutes = timeToMinutes(settings.startTime)
  const endMinutes = timeToMinutes(settings.endTime)
  const regularMinutes = endMinutes - startMinutes
  // Standard regular hours (usually 8)
  const expectedHours = minutesToHours(Math.max(1, regularMinutes - LUNCH_MINUTES))
  
  const hourlyRate =
    settings.rateType === 'daily'
      ? settings.rateAmount / expectedHours
      : settings.rateAmount

  // 2. Handle Late (Only for Fixed Hours)
  const inMinutes = timeToMinutes(timeIn)
  const lateMinutes = settings.fixedWorkingHours ? Math.max(0, inMinutes - startMinutes) : 0
  const lateDeduction = lateMinutes * 1 // ₱1 per minute late
  const status: AttendanceRecord['status'] = lateMinutes > 0 ? 'late' : 'on-time'

  if (!timeOut) {
    return {
      status,
      isOT: false,
      lateMinutes,
      otHours: 0,
      hoursWorked: 0,
      offsetUsed,
      lateDeduction,
      dailyEarnings: 0,
    }
  }

  // 3. Handle Worked Time
  const outMinutes = timeToMinutes(timeOut)
  const rawWorkedMinutes = outMinutes - inMinutes
  const workedMinutes = Math.max(0, rawWorkedMinutes - LUNCH_MINUTES)
  const actualHoursWorked = minutesToHours(workedMinutes)
  const hoursWorked = actualHoursWorked + offsetUsed

  // 4. Handle OT
  let otHours = 0
  let isOT = false

  if (settings.fixedWorkingHours) {
    // Fixed: OT is time after scheduled end + threshold
    const otThreshold = endMinutes + settings.otThresholdMinutes
    isOT = outMinutes >= otThreshold
    const otMinutes = isOT ? outMinutes - endMinutes : 0
    otHours = minutesToHours(Math.max(0, otMinutes))
  } else {
    // Flexible: OT is hours worked beyond expected hours
    const thresholdHours = settings.otThresholdMinutes / 60
    // OT is only for actual work, not offset usage
    const rawOT = Math.max(0, actualHoursWorked - expectedHours)
    isOT = rawOT >= thresholdHours
    otHours = isOT ? rawOT : 0
  }

  // 5. Handle Earnings
  let baseEarnings: number
  if (settings.rateType === 'daily') {
    // For daily rate, if flexible and worked less than expected, pay proportional? 
    // Usually daily rate expects full shift (8h). 
    // offsetUsed counts towards this.
    const workRatio = settings.fixedWorkingHours ? 1 : Math.min(1, hoursWorked / expectedHours)
    baseEarnings = isHoliday
      ? settings.rateAmount * settings.holidayMultiplier
      : settings.rateAmount * workRatio
  } else {
    // Hourly rate
    // offsetUsed counts towards fulfilling the expectedHours
    const billableHours = Math.min(hoursWorked, expectedHours)
    baseEarnings = billableHours * hourlyRate
    if (isHoliday) baseEarnings *= settings.holidayMultiplier
  }

  // 6. OT Pay vs Offset
  let otPay = 0
  if (settings.otType === 'paid') {
    otPay = otHours * hourlyRate * settings.otMultiplier
  } else {
    // OT is offset, so no pay added to dailyEarnings
    otPay = 0
  }

  const dailyEarnings = Math.max(0, baseEarnings + otPay - lateDeduction)

  return {
    status,
    isOT,
    lateMinutes,
    otHours,
    hoursWorked,
    offsetUsed,
    lateDeduction,
    dailyEarnings,
  }
}

export function computeMonthlyEarnings(records: AttendanceRecord[]): number {
  return records.reduce((sum, r) => sum + (r.dailyEarnings || 0), 0)
}

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
  isHoliday: boolean
): Omit<AttendanceRecord, 'id' | 'date' | 'timeIn' | 'timeOut' | 'notes' | 'isHoliday' | 'createdAt' | 'updatedAt'> {
  const startMinutes = timeToMinutes(settings.startTime)
  const endMinutes = timeToMinutes(settings.endTime)
  const regularMinutes = endMinutes - startMinutes
  const regularHours = minutesToHours(regularMinutes)
  const hourlyRate =
    settings.rateType === 'daily'
      ? settings.rateAmount / regularHours
      : settings.rateAmount

  const inMinutes = timeToMinutes(timeIn)
  const lateMinutes = Math.max(0, inMinutes - startMinutes)
  const lateDeduction = lateMinutes * 1 // ₱1 per minute late
  const status: AttendanceRecord['status'] = lateMinutes > 0 ? 'late' : 'on-time'

  if (!timeOut) {
    return {
      status,
      isOT: false,
      lateMinutes,
      otHours: 0,
      hoursWorked: 0,
      lateDeduction,
      dailyEarnings: 0,
    }
  }

  const outMinutes = timeToMinutes(timeOut)
  const workedMinutes = outMinutes - inMinutes
  const hoursWorked = minutesToHours(Math.max(0, workedMinutes))

  const otThreshold = endMinutes + settings.otThresholdMinutes
  const isOT = outMinutes > otThreshold
  const otMinutes = isOT ? outMinutes - endMinutes : 0
  const otHours = minutesToHours(Math.max(0, otMinutes))

  let baseEarnings: number
  if (settings.rateType === 'daily') {
    baseEarnings = isHoliday
      ? settings.rateAmount * settings.holidayMultiplier
      : settings.rateAmount
  } else {
    const billableHours = Math.min(hoursWorked, regularHours)
    baseEarnings = billableHours * hourlyRate
    if (isHoliday) baseEarnings *= settings.holidayMultiplier
  }

  const otPay = otHours * hourlyRate * settings.otMultiplier
  const dailyEarnings = Math.max(0, baseEarnings + otPay - lateDeduction)

  return {
    status,
    isOT,
    lateMinutes,
    otHours,
    hoursWorked,
    lateDeduction,
    dailyEarnings,
  }
}

export function computeMonthlyEarnings(records: AttendanceRecord[]): number {
  return records.reduce((sum, r) => sum + (r.dailyEarnings || 0), 0)
}

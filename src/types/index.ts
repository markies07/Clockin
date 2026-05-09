export interface UserSettings {
  uid: string
  name: string
  email: string
  startTime: string // "08:00"
  endTime: string   // "17:00"
  rateType: 'daily' | 'hourly'
  rateAmount: number
  otMultiplier: number
  holidayMultiplier: number
  otThresholdMinutes: number
  restDays: number[] // 0=Sun,1=Mon,...,6=Sat
  holidays: string[] // ["2026-12-25"]
  darkMode: boolean
  fixedRestDays: boolean      // true if rest days are same every week
  fixedWorkingHours: boolean   // true if working hours are same every day
  payrollFirstCutoff: number  // e.g. 15
  payrollSecondCutoff: number // e.g. 0 for end of month
  payrollFirstPayday: number  // e.g. 25
  payrollSecondPayday: number // e.g. 10 (of next month)
  currency?: string           // e.g. "₱"
  createdAt?: string
  updatedAt?: string
}

export interface AttendanceRecord {
  id: string        // date string "2026-05-09"
  date: string
  timeIn: string    // "08:05"
  timeOut: string | null
  status: 'on-time' | 'late' | 'absent' | 'rest-day' | 'holiday'
  isRestDay: boolean // manual rest day
  isOT: boolean
  isHoliday: boolean
  lateMinutes: number
  otHours: number
  hoursWorked: number
  lateDeduction: number
  dailyEarnings: number
  notes: string
  createdAt?: string
  updatedAt?: string
}

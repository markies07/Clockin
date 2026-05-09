export interface UserSettings {
  uid: string
  name: string
  email: string
  startTime: string // "08:00"
  endTime: string   // "17:00"
  rateType: 'daily' | 'hourly'
  rateAmount: number
  currency: string
  otMultiplier: number
  otThresholdMinutes: number
  holidayMultiplier: number
  restDays: number[] // 0=Sun,1=Mon,...,6=Sat
  holidays: string[] // ["2026-12-25"]
  darkMode: boolean
  createdAt?: string
  updatedAt?: string
}

export interface AttendanceRecord {
  id: string        // date string "2026-05-09"
  date: string
  timeIn: string    // "08:05"
  timeOut: string | null
  status: 'on-time' | 'late' | 'absent'
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

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'ot' | 'rest' | 'holiday'

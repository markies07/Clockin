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
  // Semi-monthly payroll (legacy / default)
  payrollFirstCutoff: number  // e.g. 15
  payrollSecondCutoff: number // e.g. 0 for end of month
  payrollFirstPayday: number  // e.g. 25
  payrollSecondPayday: number // e.g. 10 (of next month)
  // Flexible payroll cycle
  payrollCycleType?: 'semi-monthly' | 'custom'
  // Custom cycle – Period 1 (all offsets: -1=prev month, 0=current, 1=next)
  payrollP1StartDay?: number
  payrollP1StartOffset?: number   // typically -1 (previous month)
  payrollP1EndDay?: number
  payrollP1EndOffset?: number     // typically 0 (current month)
  payrollP1PayDay?: number
  payrollP1PayOffset?: number     // typically 0 (current month)
  // Custom cycle – Period 2 (start is auto = P1 end + 1 day)
  payrollP2EndDay?: number
  payrollP2EndOffset?: number     // typically 0 (current month)
  payrollP2PayDay?: number
  payrollP2PayOffset?: number     // typically 1 (next month)
  currency?: string           // e.g. "₱"
  otType: 'paid' | 'offset'
  offsetBalance: number       // in hours
  createdAt?: string
  updatedAt?: string
}

export interface PayrollRecord {
  id: string           // "cutoffStart_cutoffEnd"
  periodStart: string  // yyyy-MM-dd
  periodEnd: string    // yyyy-MM-dd
  payDate: string      // yyyy-MM-dd
  periodLabel: string  // "Apr 29 – May 13"
  status: 'pending' | 'paid'
  paidDate?: string
  grossPay: number
  regularPay: number
  otPay: number
  holidayPay: number
  lateDeductions: number
  netPay: number
  daysWorked: number
  totalHours: number
  otHours: number
  lateMinutes: number
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
  offsetUsed: number // hours used as offset
  lateDeduction: number
  dailyEarnings: number
  notes: string
  createdAt?: string
  updatedAt?: string
}

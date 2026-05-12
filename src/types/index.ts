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
  payrollAnchorDate?: string  // yyyy-MM-dd – known period start date (for custom cycle)
  payrollPeriodDays?: number  // days per period (e.g. 15)
  payrollPayDaysAfterCutoff?: number        // pay N days after period-1 end
  payrollSecondPayDaysAfterCutoff?: number  // pay N days after period-2 end
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

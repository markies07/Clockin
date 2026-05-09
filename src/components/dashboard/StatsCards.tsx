'use client'
import { Card, CardContent } from '@/components/ui/card'
import { Wallet, CalendarCheck, CalendarX, Timer } from 'lucide-react'
import { AttendanceRecord, UserSettings } from '@/types'
import { formatCurrency, getWorkingDaysInMonth } from '@/lib/attendance'
import { computeMonthlyEarnings } from '@/lib/salary'
import { format } from 'date-fns'

interface Props {
  records: AttendanceRecord[]
  settings: UserSettings
}

export default function StatsCards({ records, settings }: Props) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const monthStr = format(now, 'yyyy-MM')

  const monthRecords = records.filter((r) => r.date.startsWith(monthStr))
  const presentRecords = monthRecords.filter((r) => r.timeIn)
  const workingDays = getWorkingDaysInMonth(year, month, settings)
  const today = format(now, 'yyyy-MM-dd')
  const pastWorkingDays = workingDays.filter((d) => d <= today)
  const absences = pastWorkingDays.filter((d) => !monthRecords.find((r) => r.date === d && r.timeIn)).length
  const totalOTHours = monthRecords.reduce((sum, r) => sum + (r.otHours || 0), 0)
  const expectedSalary = computeMonthlyEarnings(monthRecords)

  const stats = [
    {
      label: 'Expected Salary',
      value: formatCurrency(expectedSalary, settings.currency),
      sub: format(now, 'MMMM yyyy'),
      icon: Wallet,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-900/30',
    },
    {
      label: 'Days Worked',
      value: presentRecords.length.toString(),
      sub: `of ${pastWorkingDays.length} working days`,
      icon: CalendarCheck,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/30',
    },
    {
      label: 'Absences',
      value: absences.toString(),
      sub: 'this month',
      icon: CalendarX,
      color: 'text-red-500 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-900/30',
    },
    {
      label: 'OT Hours',
      value: `${totalOTHours.toFixed(1)}h`,
      sub: 'overtime this month',
      icon: Timer,
      color: 'text-orange-500 dark:text-orange-400',
      bg: 'bg-orange-50 dark:bg-orange-900/30',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(({ label, value, sub, icon: Icon, color, bg }) => (
        <Card key={label} className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">{label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>
              </div>
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

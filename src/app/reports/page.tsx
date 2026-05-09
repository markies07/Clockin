'use client'
import { useState } from 'react'
import AuthGuard from '@/components/AuthGuard'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useApp } from '@/context/AppContext'
import { useAttendance } from '@/hooks/useAttendance'
import { formatCurrency, getWorkingDaysInMonth } from '@/lib/attendance'
import { computeMonthlyEarnings } from '@/lib/salary'
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, subWeeks } from 'date-fns'
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

function ReportsPage() {
  const { user, settings } = useApp()
  const { records } = useAttendance(user?.uid ?? null, settings)
  const [currentDate, setCurrentDate] = useState(new Date())

  if (!settings) return null

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const monthStr = format(currentDate, 'yyyy-MM')
  const monthRecords = records.filter((r) => r.date.startsWith(monthStr))
  const presentRecords = monthRecords.filter((r) => r.timeIn)
  const workingDays = getWorkingDaysInMonth(year, month, settings)
  const today = format(new Date(), 'yyyy-MM-dd')
  const pastWorkingDays = workingDays.filter((d) => d <= today)
  const absences = pastWorkingDays.filter((d) => !monthRecords.find((r) => r.date === d && r.timeIn)).length
  const lateDays = monthRecords.filter((r) => r.status === 'late').length
  const totalOTHours = monthRecords.reduce((sum, r) => sum + (r.otHours || 0), 0)
  const totalLateDeduction = monthRecords.reduce((sum, r) => sum + (r.lateDeduction || 0), 0)
  const regularHours = (() => {
    const [sh, sm] = settings.startTime.split(':').map(Number)
    const [eh, em] = settings.endTime.split(':').map(Number)
    return ((eh * 60 + em) - (sh * 60 + sm)) / 60
  })()
  const hourly = settings.rateType === 'daily' ? settings.rateAmount / regularHours : settings.rateAmount
  const totalOTPay = totalOTHours * hourly * settings.otMultiplier
  const basePay = computeMonthlyEarnings(monthRecords) - totalOTPay + totalLateDeduction
  const totalSalary = computeMonthlyEarnings(monthRecords)

  // Streak
  const sortedRecords = [...records].sort((a, b) => b.date.localeCompare(a.date))
  let streak = 0
  const todayStr = today
  for (let i = 0; i < sortedRecords.length; i++) {
    const r = sortedRecords[i]
    if (r.timeIn) { streak++; } else break
    if (i === 0 && r.date !== todayStr) break
  }

  // Weekly bar chart — last 4 weeks
  const weekData = Array.from({ length: 4 }, (_, i) => {
    const weekStart = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 })
    const weekEnd = endOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 })
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd })
    const totalHours = days.reduce((sum, d) => {
      const rec = records.find((r) => r.date === format(d, 'yyyy-MM-dd'))
      return sum + (rec?.hoursWorked || 0)
    }, 0)
    return { week: `Week ${4 - i}`, hours: Math.round(totalHours * 10) / 10 }
  }).reverse()

  const summaryStats = [
    { label: 'Days Worked', value: presentRecords.length, color: 'text-blue-600' },
    { label: 'Absences', value: absences, color: 'text-red-500' },
    { label: 'Late Days', value: lateDays, color: 'text-yellow-600' },
    { label: 'OT Hours', value: `${totalOTHours.toFixed(1)}h`, color: 'text-orange-500' },
  ]

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Reports" />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Month selector */}
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" className="w-8 h-8"
              onClick={() => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-semibold text-gray-900 dark:text-white w-36 text-center">
              {format(currentDate, 'MMMM yyyy')}
            </span>
            <Button variant="outline" size="icon" className="w-8 h-8"
              onClick={() => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Streak */}
          <Card className="border-0 shadow-sm bg-gradient-to-r from-green-500 to-emerald-600 text-white">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Flame className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-green-100">Current Streak</p>
                <p className="text-3xl font-bold">{streak} day{streak !== 1 ? 's' : ''}</p>
                <p className="text-xs text-green-100 mt-0.5">Consecutive days worked</p>
              </div>
            </CardContent>
          </Card>

          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {summaryStats.map(({ label, value, color }) => (
              <Card key={label} className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">{label}</p>
                  <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Salary breakdown */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <p className="font-semibold text-gray-900 dark:text-white">Salary Breakdown</p>
                <p className="text-xs text-gray-400">{format(currentDate, 'MMMM yyyy')}</p>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  { label: 'Base Pay', value: formatCurrency(Math.max(0, basePay), settings.currency), color: '' },
                  { label: 'OT Pay', value: `+${formatCurrency(totalOTPay, settings.currency)}`, color: 'text-orange-500' },
                  { label: 'Late Deductions', value: `-${formatCurrency(totalLateDeduction, settings.currency)}`, color: 'text-red-500' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex justify-between py-2 border-b border-gray-50 dark:border-gray-800">
                    <span className="text-gray-500 dark:text-gray-400">{label}</span>
                    <span className={`font-medium ${color}`}>{value}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2">
                  <span className="font-semibold text-gray-900 dark:text-white">Total Expected</span>
                  <span className="font-bold text-green-600 text-base">{formatCurrency(totalSalary, settings.currency)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Weekly chart */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <p className="font-semibold text-gray-900 dark:text-white">Weekly Hours</p>
                <p className="text-xs text-gray-400">Last 4 weeks</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={weekData} barSize={36}>
                    <XAxis dataKey="week" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: '#f9fafb' }}
                      itemStyle={{ color: '#34d399' }}
                      formatter={(v) => [`${v}h`, 'Hours']}
                    />
                    <Bar dataKey="hours" radius={[6, 6, 0, 0]}>
                      {weekData.map((_, i) => (
                        <Cell key={i} fill={i === weekData.length - 1 ? '#22c55e' : '#d1fae5'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

export default function Reports() {
  return <AuthGuard><ReportsPage /></AuthGuard>
}

'use client'
import { useState } from 'react'
import AuthGuard from '@/components/AuthGuard'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import { useApp } from '@/context/AppContext'
import { useAttendance } from '@/hooks/useAttendance'
import { formatCurrency, getWorkingDaysInMonth, maskCurrency } from '@/lib/attendance'
import { computeMonthlyEarnings } from '@/lib/salary'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, subWeeks } from 'date-fns'
import { ChevronLeft, ChevronRight, Flame, Calendar, Clock, AlertCircle, TrendingUp, Info, Eye, EyeOff } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import ReportsSkeleton from '@/components/skeletons/ReportsSkeleton'
import BottomNav from '@/components/layout/BottomNav'

function ReportsPage() {
  const { user, settings, updateSettings } = useApp()
  const { records, loading } = useAttendance(user?.uid ?? null, settings, updateSettings)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showSalary, setShowSalary] = useState(false)

  if (!settings) return null

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const monthStr = format(currentDate, 'yyyy-MM')
  const monthRecords = records.filter((r) => r.date.startsWith(monthStr))
  const presentRecords = monthRecords.filter((r) => r.timeIn)
  const workingDays = getWorkingDaysInMonth(year, month, settings)
  const today = format(new Date(), 'yyyy-MM-dd')
  const pastWorkingDays = workingDays.filter((d) => {
    if (d > today) return false
    const record = monthRecords.find((r) => r.date === d)
    if (record?.isRestDay) return false
    return true
  })
  const absences = pastWorkingDays.filter((d) => !monthRecords.find((r) => r.date === d && r.timeIn)).length
  const lateDays = monthRecords.filter((r) => r.status === 'late').length
  const totalOTHours = monthRecords.reduce((sum, r) => sum + (r.otHours || 0), 0)
  const totalLateDeduction = monthRecords.reduce((sum, r) => sum + (r.lateDeduction || 0), 0)
  const [sh, sm] = settings.startTime.split(':').map(Number)
  const [eh, em] = settings.endTime.split(':').map(Number)
  const regularHours = ((eh * 60 + em) - (sh * 60 + sm)) / 60
  const hourly = settings.rateType === 'daily' ? settings.rateAmount / regularHours : settings.rateAmount
  const totalOTPay = totalOTHours * hourly * settings.otMultiplier
  const basePay = computeMonthlyEarnings(monthRecords) - totalOTPay + totalLateDeduction
  const totalSalary = computeMonthlyEarnings(monthRecords)



  const sortedRecords = [...records].sort((a, b) => b.date.localeCompare(a.date))
  let streak = 0
  for (let i = 0; i < sortedRecords.length; i++) {
    const r = sortedRecords[i]
    if (r.timeIn) { streak++ } else break
    if (i === 0 && r.date !== today) break
  }

  const weekData = Array.from({ length: 4 }, (_, i) => {
    const weekStart = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 })
    const weekEnd = endOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 })
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd })
    const totalHours = days.reduce((sum, d) => {
      const rec = records.find((r) => r.date === format(d, 'yyyy-MM-dd'))
      return sum + (rec?.hoursWorked || 0)
    }, 0)
    return { week: `Wk ${4 - i}`, hours: Math.round(totalHours * 10) / 10 }
  }).reverse()

  const summaryStats = [
    { label: 'Days Worked',  value: presentRecords.length,         icon: Calendar,      badgeCls: 'bg-blue-500',   textCls: 'text-blue-600' },
    { label: 'Absences',     value: absences,                       icon: AlertCircle,   badgeCls: 'bg-amber-400',  textCls: 'text-amber-600' },
    { label: 'Late Days',    value: lateDays,                       icon: Clock,         badgeCls: 'bg-red-400',    textCls: 'text-red-500' },
    { label: 'OT Hours',     value: `${totalOTHours.toFixed(1)}h`,  icon: TrendingUp,    badgeCls: 'bg-orange-400', textCls: 'text-orange-500' },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar title="Reports" />
        {loading ? <ReportsSkeleton /> : <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 lg:space-y-5 pb-24 lg:pb-6">

          {/* Page header + month nav */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-extrabold text-gray-900">Monthly Reports</h2>
              <p className="text-sm text-gray-400 mt-0.5">Detailed breakdown of your attendance & earnings</p>
            </div>
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-1 py-1">
              <button
                onClick={() => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1))}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold text-gray-800 text-sm w-32 text-center">{format(currentDate, 'MMMM yyyy')}</span>
              <button
                onClick={() => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1))}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Streak banner */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100 shrink-0">
              <Flame className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Current Streak</p>
              <p className="text-2xl font-extrabold text-gray-900 leading-tight">
                {streak} <span className="text-base font-semibold text-gray-400">day{streak !== 1 ? 's' : ''}</span>
              </p>
            </div>
            <div className="ml-auto hidden sm:block text-right">
              <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${streak > 0 ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {streak > 0 ? `🔥 Keep it up!` : 'Start your streak'}
              </span>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {summaryStats.map(({ label, value, badgeCls, textCls }) => (
              <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-500">{label}</p>
                  <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${badgeCls}`}>
                    {typeof value === 'number' ? `${value}` : value}
                  </span>
                </div>
                <p className={`text-3xl font-extrabold ${textCls}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Bottom two panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Salary breakdown */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-5 pb-4 border-b border-gray-50">
                <p className="font-bold text-gray-800 text-sm">Salary Breakdown</p>
                <button 
                  onClick={() => setShowSalary(!showSalary)}
                  className="p-1 hover:bg-gray-100 rounded-md transition-colors text-gray-400 hover:text-gray-600 cursor-pointer ml-1"
                >
                  {showSalary ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <Info className="w-3.5 h-3.5 text-gray-300" />
                <span className="ml-auto text-xs text-gray-400">{format(currentDate, 'MMMM yyyy')}</span>
              </div>
              <div className="space-y-1">
                {[
                  { 
                    label: 'Base Pay',         
                    value: showSalary ? formatCurrency(Math.max(0, basePay), settings.currency) : maskCurrency(formatCurrency(Math.max(0, basePay), settings.currency)), 
                    cls: 'text-gray-900' 
                  },
                  { 
                    label: 'Overtime Pay',      
                    value: showSalary ? `+${formatCurrency(totalOTPay, settings.currency)}` : `+${maskCurrency(formatCurrency(totalOTPay, settings.currency))}`,     
                    cls: 'text-orange-500' 
                  },
                  { 
                    label: 'Late Deductions',   
                    value: showSalary ? `-${formatCurrency(totalLateDeduction, settings.currency)}` : `-${maskCurrency(formatCurrency(totalLateDeduction, settings.currency))}`, 
                    cls: 'text-red-500' 
                  },
                ].map(({ label, value, cls }) => (
                  <div key={label} className="flex justify-between items-center py-3 border-b border-gray-50">
                    <span className="text-sm text-gray-500">{label}</span>
                    <span className={`text-sm font-bold ${cls}`}>{value}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-3">
                  <span className="font-bold text-gray-900 text-sm">Total Expected</span>
                  <span className="font-extrabold text-emerald-600 text-lg">
                    {showSalary ? formatCurrency(totalSalary, settings.currency) : maskCurrency(formatCurrency(totalSalary, settings.currency))}
                  </span>
                </div>
              </div>
            </div>

            {/* Weekly chart */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-5 pb-4 border-b border-gray-50">
                <p className="font-bold text-gray-800 text-sm">Weekly Hours</p>
                <Info className="w-3.5 h-3.5 text-gray-300" />
                <span className="ml-auto text-xs text-gray-400">Last 4 weeks</span>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={weekData} barSize={44}>
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 12, fontSize: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                    labelStyle={{ color: '#374151', fontWeight: 700 }}
                    itemStyle={{ color: '#10b981', fontWeight: 600 }}
                    formatter={(v) => [`${v}h`, 'Hours Worked']}
                    cursor={{ fill: '#f8fafc', radius: 8 }}
                  />
                  <Bar dataKey="hours" radius={[8, 8, 4, 4]}>
                    {weekData.map((_, i) => (
                      <Cell key={i} fill={i === weekData.length - 1 ? '#10b981' : '#d1fae5'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </main>}
      </div>
      <BottomNav />
    </div>
  )
}

export default function Reports() {
  return <AuthGuard><ReportsPage /></AuthGuard>
}

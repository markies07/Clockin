'use client'
import { AttendanceRecord, UserSettings } from '@/types'
import { formatCurrency, getWorkingDaysInMonth, maskCurrency, formatDuration } from '@/lib/attendance'
import { format } from 'date-fns'
import { TrendingUp, TrendingDown, CalendarClock, Eye, EyeOff, Clock } from 'lucide-react'
import { getPayPeriods, earningsForPeriod } from '@/lib/payroll'
import { useState } from 'react'

interface Props {
  records: AttendanceRecord[]
  settings: UserSettings
}

function MiniBarChart({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1)
  const w = 5, gap = 2
  const totalW = values.length * (w + gap) - gap
  return (
    <svg width={totalW} height={28} viewBox={`0 0 ${totalW} 28`} className="overflow-visible">
      {values.map((v, i) => {
        const barH = Math.max(3, (v / max) * 24)
        return (
          <rect key={i} x={i * (w + gap)} y={28 - barH} width={w} height={barH}
            rx={2} fill={color} opacity={i === values.length - 1 ? 1 : 0.3} />
        )
      })}
    </svg>
  )
}

function MiniProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  )
}

export default function StatsCards({ records, settings }: Props) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const monthStr = format(now, 'yyyy-MM')

  const [showSalary, setShowSalary] = useState(false)
  const monthRecords = records.filter((r) => r.date.startsWith(monthStr))
  const presentRecords = monthRecords.filter((r) => r.timeIn)
  const workingDays = getWorkingDaysInMonth(year, month, settings)
  const today = format(now, 'yyyy-MM-dd')
  const pastWorkingDays = workingDays.filter((d) => {
    if (d > today) return false
    const record = monthRecords.find((r) => r.date === d)
    if (record?.isRestDay) return false
    return true
  })
  const absences = pastWorkingDays.filter(
    (d) => !monthRecords.find((r) => r.date === d && r.timeIn)
  ).length
  const totalOTHours = monthRecords.reduce((sum, r) => sum + (r.otHours || 0), 0)

  // Payroll cutoff logic
  const { current: currentPeriod, next: nextPeriod } = getPayPeriods(settings, now)
  const periodEarnings = earningsForPeriod(records, currentPeriod)
  const nextPeriodEarnings = earningsForPeriod(records, nextPeriod)

  const attendancePct = pastWorkingDays.length > 0
    ? Math.round((presentRecords.length / pastWorkingDays.length) * 100)
    : 0
  const absencePct = pastWorkingDays.length > 0
    ? Math.round((absences / pastWorkingDays.length) * 100)
    : 0

  const last7 = records.slice(0, 7).reverse()
  const salaryBars = last7.length ? last7.map((r) => r.dailyEarnings || 0) : [1, 2, 3, 4, 5, 6, 7]
  const hoursBars = last7.length ? last7.map((r) => r.hoursWorked || 0) : [6, 8, 7, 9, 8, 8, 9]

  const stats = [
    {
      label: 'Expected Salary',
      value: showSalary 
        ? formatCurrency(periodEarnings, settings.currency) 
        : maskCurrency(formatCurrency(periodEarnings, settings.currency)),
      sub: (
        <span>
          Period: <strong>{currentPeriod.label}</strong>
          <br />
          Pay date: <strong className="text-emerald-600">{currentPeriod.payDateLabel}</strong>
        </span>
      ),
      badge: { label: `${attendancePct}%`, positive: true },
      visual: <MiniBarChart values={salaryBars} color="#10b981" />,
      action: (
        <button 
          onClick={() => setShowSalary(!showSalary)}
          className="p-1 hover:bg-gray-100 rounded-md transition-colors text-gray-400 hover:text-gray-600 cursor-pointer"
          title={showSalary ? "Hide Salary" : "Show Salary"}
        >
          {showSalary ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      )
    },
    {
      label: 'Days Worked',
      value: `${presentRecords.length}`,
      sub: <span>{presentRecords.length} of {pastWorkingDays.length} working days</span>,
      badge: { label: `${attendancePct}%`, positive: true },
      visual: <MiniBarChart values={[3, 5, 4, 6, 5, 7, presentRecords.length || 1]} color="#6366f1" />,
    },
    {
      label: 'Absences',
      value: `${absences}`,
      sub: <span>{absences} day{absences !== 1 ? 's' : ''} missed this month</span>,
      badge: { label: `${absencePct}%`, positive: false },
      visual: <MiniProgressBar value={absences} max={Math.max(pastWorkingDays.length, 1)} color="#f59e0b" />,
    },
    {
      label: settings.otType === 'offset' ? 'Offset Balance' : 'Overtime Hours',
      value: settings.otType === 'offset' 
        ? formatDuration(settings.offsetBalance || 0)
        : formatDuration(totalOTHours),
      sub: settings.otType === 'offset'
        ? <span>Available hours for time-off</span>
        : <span>total OT logged this month</span>,
      badge: { 
        label: settings.otType === 'offset' ? 'Active' : formatDuration(totalOTHours), 
        positive: true 
      },
      visual: settings.otType === 'offset' ? (
        <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center border border-purple-100">
          <Clock className="w-6 h-6 text-purple-500" />
        </div>
      ) : (
        <MiniBarChart values={hoursBars} color="#f97316" />
      ),
    },
  ]

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, sub, badge, visual }) => (
          <div key={label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-500">{label}</p>
                {(stats.find(s => s.label === label) as any)?.action}
              </div>
              <span className={`flex items-center gap-0.5 text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ml-1 ${
                badge.positive ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-white'
              }`}>
                {badge.positive
                  ? <TrendingUp className="w-2.5 h-2.5 mr-0.5" />
                  : <TrendingDown className="w-2.5 h-2.5 mr-0.5" />
                }
                {badge.label}
              </span>
            </div>
            <div className="flex items-end justify-between gap-2">
              <div className="min-w-0">
                <p className="text-2xl font-extrabold text-gray-900 leading-none truncate">{value}</p>
                <p className="text-[11px] text-gray-400 mt-1.5 leading-snug">{sub}</p>
              </div>
              <div className="shrink-0 pb-1">{visual}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Payroll schedule strip */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 lg:px-5 py-4 flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
        <div className="flex items-center gap-2 shrink-0">
          <CalendarClock className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Payroll Schedule</span>
        </div>
        <div className="flex-1 space-y-4 lg:space-y-0 lg:flex lg:flex-row lg:items-center lg:gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-bold text-gray-600">Current period:</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 ml-3.5 sm:ml-0">
              <span className="text-gray-500">{currentPeriod.label}</span>
              <span className="text-gray-300 mx-1 hidden sm:inline">·</span>
              <span className="font-bold text-gray-600">Pay on:</span>
              <span className="font-bold text-emerald-600">{currentPeriod.payDateLabel}</span>
              <span className="text-gray-300 mx-1 hidden sm:inline">·</span>
              <span className="font-black text-emerald-700">{formatCurrency(periodEarnings, settings.currency)}</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 text-xs lg:ml-auto opacity-60 lg:opacity-100">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-gray-300" />
              <span className="font-bold text-gray-400">Next period:</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 ml-3.5 sm:ml-0">
              <span className="text-gray-400">{nextPeriod.label}</span>
              <span className="text-gray-300 mx-1 hidden sm:inline">·</span>
              <span className="text-gray-400">Pay on {nextPeriod.payDateLabel}</span>
              <span className="text-gray-300 mx-1 hidden sm:inline">·</span>
              <span className="text-gray-400">{formatCurrency(nextPeriodEarnings, settings.currency)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

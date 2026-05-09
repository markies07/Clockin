'use client'
import AuthGuard from '@/components/AuthGuard'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import { useApp } from '@/context/AppContext'
import { useAttendance } from '@/hooks/useAttendance'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatTime, formatCurrency } from '@/lib/attendance'
import { format, parseISO } from 'date-fns'
import { useState } from 'react'
import { Download } from 'lucide-react'

function LogPage() {
  const { user, settings } = useApp()
  const { records } = useAttendance(user?.uid ?? null, settings)
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'))

  if (!settings) return null

  const filtered = filterMonth
    ? records.filter((r) => r.date.startsWith(filterMonth))
    : records

  function exportCSV() {
    if (!settings) return
    const header = 'Date,Day,Time In,Time Out,Hours Worked,Status,Late (min),Late Deduction,OT Hours,OT Pay,Daily Earnings,Notes'
    const rows = filtered.map((r) => {
      const regularHours = (() => {
        const [sh, sm] = settings!.startTime.split(':').map(Number)
        const [eh, em] = settings!.endTime.split(':').map(Number)
        return ((eh * 60 + em) - (sh * 60 + sm)) / 60
      })()
      const hourly = settings!.rateType === 'daily' ? settings!.rateAmount / regularHours : settings!.rateAmount
      const otPay = (r.otHours * hourly * settings!.otMultiplier).toFixed(2)
      return [
        r.date,
        format(parseISO(r.date), 'EEEE'),
        r.timeIn || '',
        r.timeOut || '',
        r.hoursWorked.toFixed(2),
        r.status,
        r.lateMinutes,
        r.lateDeduction.toFixed(2),
        r.otHours.toFixed(2),
        otPay,
        r.dailyEarnings.toFixed(2),
        r.notes,
      ].join(',')
    })
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `clockin-${filterMonth || 'all'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const STATUS_STYLE: Record<string, string> = {
    'on-time': 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
    late: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
    absent: 'bg-red-100 text-red-500 dark:bg-red-900/40 dark:text-red-400',
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Attendance Log" />
        <main className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            />
            <Button onClick={exportCSV} variant="outline" className="gap-2 text-sm">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>

          <Card className="border-0 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                      {['Date', 'Day', 'Time In', 'Time Out', 'Hours', 'Status', 'Late', 'OT Hours', 'Earnings', 'Notes'].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="text-center py-10 text-gray-400 dark:text-gray-500">
                          No records found for this period.
                        </td>
                      </tr>
                    ) : (
                      filtered.map((r) => (
                        <tr key={r.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{r.date}</td>
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{format(parseISO(r.date), 'EEE')}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{r.timeIn ? formatTime(r.timeIn) : <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{r.timeOut ? formatTime(r.timeOut) : <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.hoursWorked > 0 ? `${r.hoursWorked.toFixed(1)}h` : '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLE[r.status] ?? ''}`}>
                              {r.status === 'on-time' ? 'On Time' : r.status === 'late' ? 'Late' : 'Absent'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-yellow-600 dark:text-yellow-400">
                            {r.lateMinutes > 0 ? `${r.lateMinutes}min` : '—'}
                          </td>
                          <td className="px-4 py-3 text-orange-500 dark:text-orange-400">
                            {r.otHours > 0 ? `${r.otHours.toFixed(1)}h` : '—'}
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                            {formatCurrency(r.dailyEarnings, settings.currency)}
                          </td>
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-[150px] truncate">{r.notes || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}

export default function Log() {
  return <AuthGuard><LogPage /></AuthGuard>
}

'use client'
import AuthGuard from '@/components/AuthGuard'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import { useApp } from '@/context/AppContext'
import { useAttendance } from '@/hooks/useAttendance'
import { formatTime, formatCurrency } from '@/lib/attendance'
import { format, parseISO } from 'date-fns'
import { useState } from 'react'
import { Download, FileText, Info, ChevronLeft, ChevronRight } from 'lucide-react'
import LogSkeleton from '@/components/skeletons/LogSkeleton'
import BottomNav from '@/components/layout/BottomNav'
import { cn } from '@/lib/utils'

function LogPage() {
  const { user, settings } = useApp()
  const { records, loading } = useAttendance(user?.uid ?? null, settings)
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  if (!settings) return null

  const filtered = (filterMonth
    ? records.filter((r) => r.date.startsWith(filterMonth))
    : records).sort((a, b) => b.date.localeCompare(a.date))
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function exportCSV() {
    if (!settings) return
    const header = 'Date,Day,Time In,Time Out,Hours Worked,Status,Late (min),Late Deduction,OT Hours,OT Pay,Daily Earnings,Notes'
    const rows = filtered.map((r) => {
      const [sh, sm] = settings!.startTime.split(':').map(Number)
      const [eh, em] = settings!.endTime.split(':').map(Number)
      const regularHours = ((eh * 60 + em) - (sh * 60 + sm)) / 60
      const hourly = settings!.rateType === 'daily' ? settings!.rateAmount / regularHours : settings!.rateAmount
      const otPay = (r.otHours * hourly * settings!.otMultiplier).toFixed(2)
      return [
        r.date, format(parseISO(r.date), 'EEEE'),
        r.timeIn || '', r.timeOut || '',
        r.hoursWorked.toFixed(2), r.status,
        r.lateMinutes, r.lateDeduction.toFixed(2),
        r.otHours.toFixed(2), otPay,
        r.dailyEarnings.toFixed(2), r.notes,
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
    'on-time': 'bg-emerald-50 text-emerald-600 border border-emerald-100',
    late:      'bg-amber-50 text-amber-600 border border-amber-100',
    absent:    'bg-red-50 text-red-500 border border-red-100',
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar title="Attendance" />
        {loading ? <LogSkeleton /> : <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 lg:space-y-5 pb-24 lg:pb-6">

          {/* Page header */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-extrabold text-gray-900">Attendance Log</h2>
              <p className="text-sm text-gray-400 mt-0.5">{filtered.length} {filtered.length === 1 ? 'record' : 'records'} found</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => { setFilterMonth(e.target.value); setPage(1) }}
                className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 cursor-pointer"
              />
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl transition-colors cursor-pointer shadow-sm shadow-emerald-200"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Table card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {['Date', 'Day', 'Time In', 'Time Out', 'Hours', 'Status', 'Late', 'OT', 'Earnings', 'Notes'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
                            <FileText className="w-5 h-5 text-gray-400" />
                          </div>
                          <p className="text-sm font-bold text-gray-500">No records found</p>
                          <p className="text-xs text-gray-400">Try a different month or start clocking in</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paged.map((r) => (
                      <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/70 transition-colors">
                        <td className="px-4 py-3.5 font-bold text-gray-800 whitespace-nowrap">{r.date}</td>
                        <td className="px-4 py-3.5 text-gray-400 whitespace-nowrap">{format(parseISO(r.date), 'EEE')}</td>
                        <td className="px-4 py-3.5 tabular-nums text-gray-700 whitespace-nowrap">{r.timeIn ? formatTime(r.timeIn) : <span className="text-gray-300">—</span>}</td>
                        <td className="px-4 py-3.5 tabular-nums text-gray-700 whitespace-nowrap">{r.timeOut ? formatTime(r.timeOut) : <span className="text-gray-300">—</span>}</td>
                        <td className="px-4 py-3.5 text-gray-600">{r.hoursWorked > 0 ? `${r.hoursWorked.toFixed(1)}h` : <span className="text-gray-300">—</span>}</td>
                        <td className="px-4 py-3.5">
                          <span className={cn('text-[11px] px-2 py-1 rounded-full font-bold whitespace-nowrap', STATUS_STYLE[r.status] ?? '')}>
                            {r.status === 'on-time' ? 'On Time' : r.status === 'late' ? 'Late' : 'Absent'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-amber-500 font-semibold">
                          {r.lateMinutes > 0 ? `${r.lateMinutes}m` : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3.5 text-orange-500 font-semibold">
                          {r.otHours > 0 ? `${r.otHours.toFixed(1)}h` : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3.5 font-extrabold text-gray-900 whitespace-nowrap">
                          {formatCurrency(r.dailyEarnings, settings.currency)}
                        </td>
                        <td className="px-4 py-3.5 text-gray-400 max-w-32 truncate">{r.notes || <span className="text-gray-300">—</span>}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filtered.length > PAGE_SIZE && (
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} records
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        p === page ? 'bg-emerald-500 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>}
      </div>
      <BottomNav />
    </div>
  )
}

export default function Log() {
  return <AuthGuard><LogPage /></AuthGuard>
}

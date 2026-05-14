'use client'
import AuthGuard from '@/components/AuthGuard'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import { useApp } from '@/context/AppContext'
import { useAttendance } from '@/hooks/useAttendance'
import { formatTime, formatCurrency } from '@/lib/attendance'
import { format, parseISO, startOfMonth } from 'date-fns'
import { useState, useMemo } from 'react'
import { Download, FileText, ChevronLeft, ChevronRight } from 'lucide-react'
import LogSkeleton from '@/components/skeletons/LogSkeleton'
import BottomNav from '@/components/layout/BottomNav'
import { cn } from '@/lib/utils'
import { getPeriodsForMonth } from '@/lib/payroll'

type Cutoff = 'all' | '1st' | '2nd'

function LogPage() {
  const { user, settings, updateSettings } = useApp()
  const { records, loading } = useAttendance(user?.uid ?? null, settings, updateSettings)
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [cutoff, setCutoff] = useState<Cutoff>('all')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  if (!settings) return null

  const monthDate = startOfMonth(parseISO(selectedMonth + '-01'))
  const [period1, period2] = getPeriodsForMonth(settings, monthDate)

  // Filter records to the selected month + cutoff
  const filtered = useMemo(() => {
    let start = selectedMonth + '-01'
    let end   = selectedMonth + '-31'
    if (cutoff === '1st') { start = period1.cutoffStart; end = period1.cutoffEnd }
    if (cutoff === '2nd') { start = period2.cutoffStart; end = period2.cutoffEnd }
    return records
      .filter((r) => r.date >= start && r.date <= end)
      .sort((a, b) => a.date.localeCompare(b.date)) // ascending
  }, [records, selectedMonth, cutoff, period1, period2])

  const totalEarnings = filtered.reduce((s, r) => s + (r.dailyEarnings || 0), 0)

  // Pagination: only active in 'all' view
  const usePaging = cutoff === 'all'
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const displayed = usePaging ? filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : filtered

  function exportCSV() {
    const header = 'Date,Day,Time In,Time Out,Hours Worked,Status,Late (min),Late Deduction,OT Hours,Daily Earnings,Notes'
    const rows = filtered.map((r) => [
      format(parseISO(r.date), 'MMMM d, yyyy'),
      format(parseISO(r.date), 'EEEE'),
      r.timeIn || '', r.timeOut || '',
      r.hoursWorked.toFixed(2), r.status,
      r.lateMinutes, r.lateDeduction.toFixed(2),
      r.otHours.toFixed(2),
      r.dailyEarnings.toFixed(2), r.notes,
    ].join(','))
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `clockin-${selectedMonth}-${cutoff}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const STATUS_STYLE: Record<string, string> = {
    'on-time':  'bg-emerald-50 text-emerald-600 border border-emerald-100',
    late:       'bg-amber-50 text-amber-600 border border-amber-100',
    absent:     'bg-red-50 text-red-500 border border-red-100',
    'rest-day': 'bg-gray-50 text-gray-400 border border-gray-200',
    holiday:    'bg-purple-50 text-purple-600 border border-purple-100',
  }
  const STATUS_LABELS: Record<string, string> = {
    'on-time':  'On Time',
    late:       'Late',
    absent:     'Absent',
    'rest-day': 'Rest Day',
    holiday:    'Holiday',
  }

  const cutoffLabel = cutoff === '1st'
    ? `${format(parseISO(period1.cutoffStart), 'MMM d')} – ${format(parseISO(period1.cutoffEnd), 'MMM d, yyyy')}`
    : cutoff === '2nd'
    ? `${format(parseISO(period2.cutoffStart), 'MMM d')} – ${format(parseISO(period2.cutoffEnd), 'MMM d, yyyy')}`
    : format(monthDate, 'MMMM yyyy')

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar title="Attendance Log" />
        {loading ? <LogSkeleton /> : (
          <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 lg:space-y-5 pb-24 lg:pb-6">

            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900">Attendance Log</h2>
                <p className="text-sm text-gray-400 mt-0.5">{cutoffLabel} · {filtered.length} {filtered.length === 1 ? 'record' : 'records'}</p>
              </div>
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl transition-colors cursor-pointer shadow-sm shadow-emerald-200"
              >
                <Download className="w-4 h-4" /> Export CSV
              </button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Month picker */}
              <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-1 py-1">
                <button
                  onClick={() => {
                    const d = new Date(selectedMonth + '-01')
                    d.setMonth(d.getMonth() - 1)
                    setSelectedMonth(format(d, 'yyyy-MM'))
                    setPage(1)
                  }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 text-sm font-bold text-gray-800 min-w-25 text-center">
                  {format(monthDate, 'MMMM yyyy')}
                </span>
                <button
                  onClick={() => {
                    const d = new Date(selectedMonth + '-01')
                    d.setMonth(d.getMonth() + 1)
                    setSelectedMonth(format(d, 'yyyy-MM'))
                    setPage(1)
                  }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Cutoff tabs */}
              <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 gap-1">
                {([
                  { key: 'all', label: 'All' },
                  { key: '1st', label: '1st Cutoff' },
                  { key: '2nd', label: '2nd Cutoff' },
                ] as { key: Cutoff; label: string }[]).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => { setCutoff(key); setPage(1) }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      cutoff === key ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-400 hover:text-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {['Date', 'Time In', 'Time Out', 'Hours', 'Status', 'Late', 'OT', 'Earnings', 'Notes'].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
                              <FileText className="w-5 h-5 text-gray-400" />
                            </div>
                            <p className="text-sm font-bold text-gray-500">No records found</p>
                            <p className="text-xs text-gray-400">Try a different month or cutoff period</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      displayed.map((r) => {
                        const statusKey = r.isHoliday && !r.timeIn ? 'holiday' : r.status
                        return (
                          <tr key={r.id} className={cn(
                            'border-b border-gray-50 hover:bg-gray-50/70 transition-colors',
                            r.isHoliday ? 'bg-purple-50/30' : r.isRestDay ? 'bg-gray-50/50' : ''
                          )}>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <p className="font-bold text-gray-800">{format(parseISO(r.date), 'MMMM d, yyyy')}</p>
                              <p className="text-[11px] text-gray-400">{format(parseISO(r.date), 'EEEE')}</p>
                            </td>
                            <td className="px-4 py-3.5 tabular-nums text-gray-700 whitespace-nowrap">
                              {r.timeIn ? formatTime(r.timeIn) : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-4 py-3.5 tabular-nums text-gray-700 whitespace-nowrap">
                              {r.timeOut ? formatTime(r.timeOut) : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-4 py-3.5 text-gray-600">
                              {r.hoursWorked > 0 ? `${r.hoursWorked.toFixed(1)}h` : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-4 py-3.5">
                              <span className={cn('text-[11px] px-2 py-1 rounded-full font-bold whitespace-nowrap', STATUS_STYLE[statusKey] ?? STATUS_STYLE['on-time'])}>
                                {STATUS_LABELS[statusKey] || statusKey}
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
                            <td className="px-4 py-3.5 text-gray-400 max-w-32 truncate">
                              {r.notes || <span className="text-gray-300">—</span>}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer: pagination (all) or total (cutoff) */}
              {filtered.length > 0 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
                  {usePaging ? (
                    <>
                      <p className="text-xs text-gray-400">
                        {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} records
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                          <button
                            key={p}
                            onClick={() => setPage(p)}
                            className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                              p === page ? 'bg-emerald-500 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                        <button
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                          className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-bold text-gray-500">{filtered.length} records</p>
                      <p className="text-sm font-extrabold text-gray-900">Total: {formatCurrency(totalEarnings, settings.currency)}</p>
                    </>
                  )}
                </div>
              )}
            </div>

          </main>
        )}
      </div>
      <BottomNav />
    </div>
  )
}

export default function Log() {
  return <AuthGuard><LogPage /></AuthGuard>
}

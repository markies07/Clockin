'use client'
import { useState } from 'react'
import { AttendanceRecord, UserSettings } from '@/types'
import { formatTime, formatCurrency } from '@/lib/attendance'
import { format, parseISO } from 'date-fns'
import Link from 'next/link'
import { ArrowRight, Info, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  records: AttendanceRecord[]
  settings: UserSettings
}

const STATUS: Record<string, { label: string; cls: string }> = {
  'on-time': { label: 'On Time',  cls: 'bg-emerald-50 text-emerald-600 border border-emerald-100' },
  late:      { label: 'Late',     cls: 'bg-amber-50 text-amber-600 border border-amber-100' },
  absent:    { label: 'Absent',   cls: 'bg-red-50 text-red-500 border border-red-100' },
}

const PAGE_SIZE = 3

export default function RecentActivity({ records, settings }: Props) {
  const [page, setPage] = useState(1)
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date))
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <div className="flex items-center gap-2">
          <p className="font-bold text-gray-800 text-sm">Recent Activity</p>
          <Info className="w-3.5 h-3.5 text-gray-300" />
        </div>
        <Link
          href="/log"
          className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer border border-emerald-200 hover:border-emerald-300 rounded-full px-3 py-1.5"
        >
          See Details
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 px-5 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
            <Info className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-sm font-bold text-gray-600">No records yet</p>
          <p className="text-xs text-gray-400 mt-1">Clock in today to start tracking attendance</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
          {/* Column headers */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-2.5 bg-gray-50 border-b border-gray-50 min-w-120">
            {['Date', 'Time In', 'Time Out', 'Status', 'Earnings'].map((h) => (
              <p key={h} className="text-[10px] font-bold text-gray-400 uppercase tracking-widest last:text-right">{h}</p>
            ))}
          </div>

          <div className="divide-y divide-gray-50">
            {paged.map((r) => {
              const s = STATUS[r.status] ?? STATUS['on-time']
              return (
                <div
                  key={r.id}
                  className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 items-center px-5 py-3.5 hover:bg-gray-50/80 transition-colors min-w-120"
                >
                  <div>
                    <p className="text-sm font-bold text-gray-800">{format(parseISO(r.date), 'EEE, MMM d')}</p>
                    {r.isOT && (
                      <span className="text-[10px] font-bold text-orange-500">+{r.otHours.toFixed(1)}h OT</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 tabular-nums">{r.timeIn ? formatTime(r.timeIn) : '—'}</p>
                  <p className="text-sm text-gray-600 tabular-nums">{r.timeOut ? formatTime(r.timeOut) : '—'}</p>
                  <span className={cn('text-[11px] px-2.5 py-1 rounded-full font-bold w-fit', s.cls)}>
                    {s.label}
                  </span>
                  <p className="text-sm font-extrabold text-gray-900 text-right">
                    {formatCurrency(r.dailyEarnings, settings.currency)}
                  </p>
                </div>
              )
            })}
          </div>
          </div>{/* end overflow-x-auto */}

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50">
            <p className="text-xs text-gray-400">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
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
                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

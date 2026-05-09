'use client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ChevronLeft, ChevronRight, Info, Pencil, LogIn, LogOut, Trash2 } from 'lucide-react'
import { AttendanceRecord, UserSettings } from '@/types'
import { formatTime, formatCurrency, isRestDay, isHoliday } from '@/lib/attendance'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, parseISO, isToday, isFuture
} from 'date-fns'

interface Props {
  records: AttendanceRecord[]
  settings: UserSettings
  onSaveRecord: (date: string, timeIn: string, timeOut: string | null, notes: string) => Promise<void>
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

type DayVariant = 'rest' | 'holiday' | 'future' | 'absent' | 'ot' | 'late' | 'present' | 'today-empty'

function getDayVariant(date: Date, recordMap: Record<string, AttendanceRecord>, settings: UserSettings): DayVariant {
  const dateStr = format(date, 'yyyy-MM-dd')
  const record = recordMap[dateStr]
  if (isRestDay(dateStr, settings)) return 'rest'
  if (isHoliday(dateStr, settings)) return 'holiday'
  if (isFuture(date) && !isToday(date)) return 'future'
  if (!record || !record.timeIn) return isToday(date) ? 'today-empty' : 'absent'
  if (record.isOT) return 'ot'
  if (record.status === 'late') return 'late'
  return 'present'
}

const CELL_STYLES: Record<DayVariant, string> = {
  rest:          'text-gray-400 bg-red-50/30',
  holiday:       'text-purple-600 bg-purple-50',
  future:        'text-gray-300',
  absent:        'text-red-400 bg-red-50',
  'today-empty': 'text-gray-800 bg-white ring-2 ring-emerald-500 ring-offset-1',
  ot:            'text-orange-600 bg-orange-50',
  late:          'text-amber-700 bg-amber-50',
  present:       'text-emerald-700 bg-emerald-50',
}

const LEGEND = [
  { label: 'On Time',  color: 'bg-emerald-500' },
  { label: 'Late',     color: 'bg-amber-400' },
  { label: 'Overtime', color: 'bg-orange-400' },
  { label: 'Absent',   color: 'bg-red-400' },
  { label: 'Holiday',  color: 'bg-purple-400' },
  { label: 'Rest Day', color: 'bg-gray-200' },
]

interface EditState {
  date: string
  timeIn: string
  timeOut: string
  notes: string
  existing: AttendanceRecord | null
}

export default function AttendanceCalendar({ records, settings, onSaveRecord }: Props) {
  const [current, setCurrent] = useState(new Date())
  const [viewRecord, setViewRecord] = useState<AttendanceRecord | null>(null)
  const [editState, setEditState] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)

  const monthStart = startOfMonth(current)
  const days = eachDayOfInterval({ start: monthStart, end: endOfMonth(current) })
  const startPad = getDay(monthStart)
  const recordMap = Object.fromEntries(records.map((r) => [r.date, r]))

  function openDay(date: Date) {
    const dateStr = format(date, 'yyyy-MM-dd')
    // Don't allow editing future dates
    if (isFuture(date) && !isToday(date)) return
    const existing = recordMap[dateStr] ?? null

    if (existing) {
      // Show detail view with edit option
      setViewRecord(existing)
    } else {
      // Open edit modal for blank day (absent/today)
      const variant = getDayVariant(date, recordMap, settings)
      if (variant === 'rest' || variant === 'holiday') return
      setEditState({
        date: dateStr,
        timeIn: settings.startTime,
        timeOut: settings.endTime,
        notes: '',
        existing: null,
      })
    }
  }

  function openEdit(record: AttendanceRecord) {
    setViewRecord(null)
    setEditState({
      date: record.date,
      timeIn: record.timeIn,
      timeOut: record.timeOut ?? '',
      notes: record.notes ?? '',
      existing: record,
    })
  }

  async function handleSave() {
    if (!editState) return
    setSaving(true)
    await onSaveRecord(
      editState.date,
      editState.timeIn,
      editState.timeOut || null,
      editState.notes,
    )
    setSaving(false)
    setEditState(null)
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <p className="font-bold text-gray-800 text-sm">{format(current, 'MMMM yyyy')}</p>
            <Info className="w-3.5 h-3.5 text-gray-300" />
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrent((d) => new Date(d.getFullYear(), d.getMonth() - 1))}
              className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrent((d) => new Date(d.getFullYear(), d.getMonth() + 1))}
              className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 flex-wrap mb-3">
          {LEGEND.map(({ label, color }) => (
            <span key={label} className="flex items-center gap-1 text-[10px] text-gray-500 font-semibold">
              <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
              {label}
            </span>
          ))}
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 gap-1 mb-0.5">
          {DAY_LABELS.map((d) => (
            <div key={d} className="text-center text-[10px] font-bold text-gray-400 py-1">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startPad }).map((_, i) => <div key={`p-${i}`} />)}
          {days.map((date) => {
            const dateStr = format(date, 'yyyy-MM-dd')
            const variant = getDayVariant(date, recordMap, settings)
            const today = isToday(date)
            const clickable = !isFuture(date) || today
            const isRestOrHoliday = variant === 'rest' || variant === 'holiday'

            return (
              <button
                key={dateStr}
                onClick={() => clickable && !isRestOrHoliday && openDay(date)}
                title={clickable && !isRestOrHoliday ? 'Click to view or edit' : undefined}
                className={`
                  relative h-9 flex items-center justify-center rounded-xl text-[11px] font-bold transition-all
                  ${CELL_STYLES[variant]}
                  ${today && variant !== 'today-empty' ? 'ring-2 ring-emerald-500 ring-offset-1' : ''}
                  ${clickable && !isRestOrHoliday ? 'cursor-pointer hover:opacity-75 hover:scale-105' : 'cursor-default'}
                `}
              >
                {format(date, 'd')}
                {recordMap[dateStr]?.isOT && (
                  <span className="absolute top-0.5 right-0.5 w-1 h-1 bg-orange-500 rounded-full" />
                )}
              </button>
            )
          })}
        </div>

        <p className="text-[10px] text-gray-400 mt-3 text-center">
          Click any past day to view details or add/edit your attendance record
        </p>
      </div>

      {/* ── View detail modal ── */}
      <Dialog open={!!viewRecord} onOpenChange={() => setViewRecord(null)}>
        {viewRecord && (
          <DialogContent className="max-w-sm rounded-2xl border-0 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-gray-900">
                {format(parseISO(viewRecord.date), 'EEEE, MMMM d, yyyy')}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 rounded-xl p-3.5 border border-emerald-100">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide mb-1.5">Time In</p>
                  <p className="font-extrabold text-gray-900">{formatTime(viewRecord.timeIn)}</p>
                  {viewRecord.lateMinutes > 0 && (
                    <p className="text-xs text-amber-500 font-semibold mt-1">{viewRecord.lateMinutes}min late</p>
                  )}
                </div>
                <div className="bg-red-50 rounded-xl p-3.5 border border-red-100">
                  <p className="text-[10px] font-bold text-red-500 uppercase tracking-wide mb-1.5">Time Out</p>
                  <p className="font-extrabold text-gray-900">{viewRecord.timeOut ? formatTime(viewRecord.timeOut) : '—'}</p>
                  {viewRecord.isOT && (
                    <p className="text-xs text-orange-500 font-semibold mt-1">+{viewRecord.otHours.toFixed(1)}h OT</p>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Hours Worked</span>
                  <span className="font-bold text-gray-900">{viewRecord.hoursWorked.toFixed(1)}h</span>
                </div>
                {viewRecord.lateDeduction > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Late Deduction</span>
                    <span className="font-bold text-red-500">-{formatCurrency(viewRecord.lateDeduction, settings.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
                  <span className="font-bold text-gray-900">Daily Earnings</span>
                  <span className="font-extrabold text-emerald-600">{formatCurrency(viewRecord.dailyEarnings, settings.currency)}</span>
                </div>
              </div>

              {viewRecord.notes && (
                <div className="bg-gray-50 rounded-xl p-3.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Notes</p>
                  <p className="text-sm text-gray-700">{viewRecord.notes}</p>
                </div>
              )}

              <button
                onClick={() => openEdit(viewRecord)}
                className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-bold py-2.5 rounded-xl text-sm transition-colors cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit this record
              </button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* ── Add / Edit record modal ── */}
      <Dialog open={!!editState} onOpenChange={() => setEditState(null)}>
        {editState && (
          <DialogContent className="max-w-sm rounded-2xl border-0 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-gray-900">
                {editState.existing ? 'Edit Record — ' : 'Add Record — '}
                {format(parseISO(editState.date), 'MMM d, yyyy')}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Time In */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 uppercase tracking-wide">
                  <LogIn className="w-3.5 h-3.5 text-emerald-500" /> Time In
                </label>
                <input
                  type="time"
                  value={editState.timeIn}
                  onChange={(e) => setEditState((s) => s && ({ ...s, timeIn: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 cursor-pointer"
                />
              </div>

              {/* Time Out */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 uppercase tracking-wide">
                  <LogOut className="w-3.5 h-3.5 text-red-500" /> Time Out
                  <span className="text-gray-400 font-normal normal-case tracking-normal">(optional)</span>
                </label>
                <input
                  type="time"
                  value={editState.timeOut}
                  onChange={(e) => setEditState((s) => s && ({ ...s, timeOut: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-400/30 cursor-pointer"
                />
                <p className="text-[11px] text-gray-400">Leave blank if you haven&apos;t clocked out yet.</p>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Notes (optional)</label>
                <input
                  placeholder="e.g. WFH, Half day, Client visit…"
                  value={editState.notes}
                  onChange={(e) => setEditState((s) => s && ({ ...s, notes: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300/40 placeholder:text-gray-400"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setEditState(null)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-bold text-sm rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !editState.timeIn}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer shadow-sm shadow-emerald-200"
                >
                  {saving
                    ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : editState.existing ? 'Save Changes' : 'Add Record'
                  }
                </button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  )
}

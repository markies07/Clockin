'use client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ChevronLeft, ChevronRight, Info, Pencil, LogIn, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { AttendanceRecord, UserSettings } from '@/types'
import { formatTime, formatCurrency, isRestDay, isHoliday, formatDuration } from '@/lib/attendance'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, parseISO, isToday, isFuture
} from 'date-fns'

interface Props {
  records: AttendanceRecord[]
  settings: UserSettings
  onSaveRecord: (date: string, timeIn: string | null, timeOut: string | null, notes: string, isRestDay?: boolean, offsetUsed?: number) => Promise<void>
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

type DayVariant = 'rest' | 'holiday' | 'future' | 'absent' | 'ot' | 'late' | 'present' | 'today-empty'

function getDayVariant(date: Date, recordMap: Record<string, AttendanceRecord>, settings: UserSettings): DayVariant {
  const dateStr = format(date, 'yyyy-MM-dd')
  const record = recordMap[dateStr]
  if (record?.isRestDay) return 'rest'
  if (isRestDay(dateStr, settings)) return 'rest'
  if (isHoliday(dateStr, settings)) return 'holiday'
  if (isFuture(date) && !isToday(date)) return 'future'
  if (!record || !record.timeIn) return isToday(date) ? 'today-empty' : 'absent'
  if (record.isOT) return 'ot'
  if (record.status === 'late') return 'late'
  return 'present'
}

const CELL_STYLES: Record<DayVariant, string> = {
  rest:          'text-gray-600 bg-gray-200/60',
  holiday:       'text-purple-600 bg-purple-50',
  future:        'text-gray-300',
  absent:        'text-rose-500 bg-rose-50/40',
  'today-empty': 'text-gray-800 bg-white ring-2 ring-emerald-500 ring-offset-1',
  ot:            'text-indigo-700 bg-indigo-50',
  late:          'text-amber-600 bg-amber-50/80',
  present:       'text-emerald-700 bg-emerald-50',
}

const LEGEND = [
  { label: 'On Time',  color: 'bg-emerald-500' },
  { label: 'Late',     color: 'bg-amber-400' },
  { label: 'Overtime', color: 'bg-indigo-500' },
  { label: 'Absent',   color: 'bg-rose-500' },
  { label: 'Holiday',  color: 'bg-purple-400' },
  { label: 'Rest Day', color: 'bg-gray-300' },
]

interface EditState {
  date: string
  timeIn: string
  timeOut: string
  notes: string
  isRestDay: boolean
  offsetUsed: number
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
      setEditState({
        date: dateStr,
        timeIn: settings.startTime,
        timeOut: settings.endTime,
        notes: '',
        isRestDay: variant === 'rest',
        offsetUsed: 0,
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
      isRestDay: record.isRestDay ?? false,
      offsetUsed: record.offsetUsed ?? 0,
      existing: record,
    })
  }

  async function handleSave() {
    if (!editState) return
    setSaving(true)
    await onSaveRecord(
      editState.date,
      editState.isRestDay ? null : editState.timeIn,
      editState.isRestDay ? null : (editState.timeOut || null),
      editState.notes,
      editState.isRestDay,
      editState.offsetUsed,
    )
    setSaving(false)
    setEditState(null)
    toast.success('Record updated successfully!')
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-full flex flex-col">
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

            return (
              <button
                key={dateStr}
                onClick={() => clickable && openDay(date)}
                title={clickable ? 'Click to view or edit' : undefined}
                className={`
                  relative h-9 flex items-center justify-center rounded-xl text-[11px] font-bold transition-all
                  ${CELL_STYLES[variant]}
                  ${today && variant !== 'today-empty' ? 'ring-2 ring-emerald-500 ring-offset-1' : ''}
                  ${clickable ? 'cursor-pointer hover:opacity-75 hover:scale-105' : 'cursor-default'}
                `}
              >
                {format(date, 'd')}
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
              {viewRecord.isRestDay ? (
                <div className="bg-gray-100 rounded-2xl p-6 text-center border border-gray-200">
                   <p className="text-lg font-extrabold text-gray-700">Rest Day</p>
                   <p className="text-sm text-gray-400 mt-1">No attendance records for this day</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-emerald-50 rounded-xl p-3.5 border border-emerald-100">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide mb-1.5">Time In</p>
                    <p className="font-extrabold text-gray-900">{viewRecord.timeIn ? formatTime(viewRecord.timeIn) : '—'}</p>
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
              )}

              {!viewRecord.isRestDay && (
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
              )}

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
              {/* Rest Day Toggle */}
              <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div>
                  <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Rest Day</p>
                  <p className="text-[10px] text-gray-400">Mark this day as a day off</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditState(s => s && ({ ...s, isRestDay: !s.isRestDay }))}
                  className={`w-10 h-5 rounded-full transition-colors relative ${editState.isRestDay ? 'bg-emerald-500' : 'bg-gray-200'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${editState.isRestDay ? 'left-6' : 'left-1'}`} />
                </button>
              </div>

              {!editState.isRestDay && (
                <>
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
                </>
              )}

              {/* Offset Usage */}
              {settings.otType === 'offset' && !editState.isRestDay && (
                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wide">Use Offset</p>
                      <p className="text-[9px] text-purple-400">Available: {formatDuration(settings.offsetBalance || 0)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                       <input 
                         type="number" 
                         step="5"
                         min="0"
                         max={Math.round(((settings.offsetBalance || 0) + (editState.existing?.offsetUsed || 0)) * 60)}
                         value={Math.round(editState.offsetUsed * 60)}
                         onChange={(e) => setEditState(s => s && ({ ...s, offsetUsed: (parseFloat(e.target.value) || 0) / 60 }))}
                         className="w-16 px-2 py-1 bg-white border border-purple-200 rounded-lg text-xs font-bold text-purple-700 text-center focus:outline-none focus:ring-1 focus:ring-purple-400"
                       />
                       <span className="text-xs font-bold text-purple-600">minutes</span>
                    </div>
                  </div>
                  <p className="text-[9px] text-purple-400 leading-tight italic">
                    * Using offset adds hours to your daily total without working.
                  </p>
                </div>
              )}

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
                  disabled={saving || (!editState.isRestDay && !editState.timeIn)}
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

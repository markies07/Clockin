'use client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ChevronLeft, ChevronRight, Info, Pencil, LogIn, LogOut, UserX, Trash2 } from 'lucide-react'
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
  onSaveRecord: (date: string, timeIn: string | null, timeOut: string | null, notes: string, isRestDay?: boolean, offsetUsed?: number, isHolidayOverride?: boolean) => Promise<void>
  onDeleteRecord: (date: string) => Promise<void>
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

type DayVariant = 'rest' | 'holiday' | 'future' | 'absent' | 'ot' | 'late' | 'present' | 'today-empty'

function getDayVariant(date: Date, recordMap: Record<string, AttendanceRecord>, settings: UserSettings): DayVariant {
  const dateStr = format(date, 'yyyy-MM-dd')
  const record = recordMap[dateStr]
  if (record?.isRestDay) return 'rest'
  if (isRestDay(dateStr, settings)) return 'rest'
  if (record?.isHoliday) return 'holiday'
  if (isHoliday(dateStr, settings)) return 'holiday'
  if (isFuture(date) && !isToday(date)) return 'future'
  if (!record || !record.timeIn) return isToday(date) ? 'today-empty' : 'absent'
  if (record.isOT) return 'ot'
  if (record.status === 'late') return 'late'
  return 'present'
}

const CELL_STYLES: Record<DayVariant, string> = {
  rest:          'text-gray-600 bg-gray-200/60',
  holiday:       'text-purple-700 bg-purple-100 font-extrabold',
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

type DayType = 'normal' | 'holiday' | 'rest' | 'absent'

interface EditState {
  date: string
  timeIn: string
  timeOut: string
  notes: string
  dayType: DayType
  offsetUsed: number
  existing: AttendanceRecord | null
  workedOnHoliday: boolean
}

export default function AttendanceCalendar({ records, settings, onSaveRecord, onDeleteRecord }: Props) {
  const [current, setCurrent] = useState(new Date())
  const [viewRecord, setViewRecord] = useState<AttendanceRecord | null>(null)
  const [editState, setEditState] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const monthStart = startOfMonth(current)
  const days = eachDayOfInterval({ start: monthStart, end: endOfMonth(current) })
  const startPad = getDay(monthStart)
  const recordMap = Object.fromEntries(records.map((r) => [r.date, r]))

  function openDay(date: Date) {
    const dateStr = format(date, 'yyyy-MM-dd')
    if (isFuture(date) && !isToday(date)) return
    const existing = recordMap[dateStr] ?? null

    if (existing) {
      setViewRecord(existing)
    } else {
      const variant = getDayVariant(date, recordMap, settings)
      setEditState({
        date: dateStr,
        timeIn: settings.startTime,
        timeOut: settings.endTime,
        notes: '',
        dayType: variant === 'rest' ? 'rest' : 'normal',
        offsetUsed: 0,
        existing: null,
        workedOnHoliday: false,
      })
    }
  }

  function openEdit(record: AttendanceRecord) {
    setViewRecord(null)
    setConfirmDelete(false)
    const dayType: DayType = record.isRestDay ? 'rest'
      : record.isHoliday ? 'holiday'
      : (!record.timeIn ? 'absent' : 'normal')
    setEditState({
      date: record.date,
      timeIn: record.timeIn || settings.startTime,
      timeOut: record.timeOut ?? '',
      notes: record.notes ?? '',
      dayType,
      offsetUsed: record.offsetUsed ?? 0,
      existing: record,
      workedOnHoliday: record.isHoliday && !!record.timeIn,
    })
  }

  async function handleDelete(date: string) {
    setDeleting(true)
    await onDeleteRecord(date)
    setDeleting(false)
    setViewRecord(null)
    setEditState(null)
    setConfirmDelete(false)
    toast.success('Record deleted')
  }

  async function handleSave() {
    if (!editState) return
    setSaving(true)
    const isRestDayVal = editState.dayType === 'rest'
    const isAbsent    = editState.dayType === 'absent'
    const isHolidayVal = editState.dayType === 'holiday'
    const noWork = isRestDayVal || isAbsent || (isHolidayVal && !editState.workedOnHoliday)
    await onSaveRecord(
      editState.date,
      noWork ? null : editState.timeIn,
      noWork ? null : (editState.timeOut || null),
      editState.notes,
      isRestDayVal,
      editState.offsetUsed,
      isHolidayVal ? true : (isRestDayVal ? false : undefined),
    )
    setSaving(false)
    setEditState(null)
    toast.success('Record saved!')
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
                {variant === 'holiday' && <span className="absolute top-0.5 right-0.5 text-[7px]">🎉</span>}
              </button>
            )
          })}
        </div>

        <p className="text-[10px] text-gray-400 mt-3 text-center">
          Click any past day to view details or add/edit your attendance record
        </p>
      </div>

      {/* ── View detail modal ── */}
      <Dialog open={!!viewRecord} onOpenChange={() => { setViewRecord(null); setConfirmDelete(false) }}>
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
              ) : viewRecord.isHoliday && !viewRecord.timeIn ? (
                <div className="bg-purple-50 rounded-2xl p-6 text-center border border-purple-100">
                  <span className="text-3xl block mb-2">🎉</span>
                  <p className="text-lg font-extrabold text-purple-700">Holiday</p>
                  <p className="text-sm text-purple-400 mt-1">Non-working holiday — no work recorded</p>
                </div>
              ) : !viewRecord.timeIn ? (
                <div className="bg-rose-50 rounded-2xl p-6 text-center border border-rose-100">
                  <UserX className="w-8 h-8 text-rose-400 mx-auto mb-2" />
                  <p className="text-lg font-extrabold text-rose-600">Absent</p>
                  <p className="text-sm text-rose-400 mt-1">No attendance recorded for this day</p>
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

              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(viewRecord)}
                  className="flex-1 flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-bold py-2.5 rounded-xl text-sm transition-colors cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit Record
                </button>
                {!confirmDelete ? (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center justify-center gap-1.5 bg-white hover:bg-rose-50 text-rose-500 font-bold py-2.5 px-3.5 rounded-xl text-sm border border-rose-200 hover:border-rose-300 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleDelete(viewRecord.date)}
                    disabled={deleting}
                    className="flex items-center justify-center gap-1.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-60 text-white font-bold py-2.5 px-3.5 rounded-xl text-sm transition-colors cursor-pointer"
                  >
                    {deleting ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : 'Confirm Delete'}
                  </button>
                )}
              </div>
              {confirmDelete && (
                <p className="text-[11px] text-rose-400 text-center -mt-1">This will permanently remove the record. Click again to confirm.</p>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* ── Add / Edit record modal ── */}
      <Dialog open={!!editState} onOpenChange={() => { setEditState(null); setConfirmDelete(false) }}>
        {editState && (
          <DialogContent className="max-w-sm rounded-2xl border-0 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-gray-900">
                {editState.existing ? 'Edit Record — ' : 'Add Record — '}
                {format(parseISO(editState.date), 'MMM d, yyyy')}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Day type selector */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Day Type</p>
                <div className="grid grid-cols-4 gap-2">
                  {([
                    { type: 'normal',  label: 'Normal',   color: 'emerald' },
                    { type: 'holiday', label: 'Holiday',  color: 'purple' },
                    { type: 'rest',    label: 'Rest Day', color: 'gray' },
                    { type: 'absent',  label: 'Absent',   color: 'rose' },
                  ] as { type: DayType; label: string; color: string }[]).map(({ type, label, color }) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setEditState(s => s && ({ ...s, dayType: type, workedOnHoliday: false }))}
                      className={`flex flex-col items-center py-2.5 px-1 rounded-xl border-2 transition-all cursor-pointer text-center ${
                        editState.dayType === type
                          ? color === 'emerald' ? 'border-emerald-500 bg-emerald-50'
                            : color === 'purple' ? 'border-purple-400 bg-purple-50'
                            : color === 'rose'   ? 'border-rose-400 bg-rose-50'
                            : 'border-gray-400 bg-gray-100'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <p className={`text-xs font-extrabold ${
                        editState.dayType === type
                          ? color === 'emerald' ? 'text-emerald-700'
                            : color === 'purple' ? 'text-purple-700'
                            : color === 'rose'   ? 'text-rose-600'
                            : 'text-gray-700'
                          : 'text-gray-500'
                      }`}>{label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Normal work day */}
              {editState.dayType === 'normal' && (
                <>
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
                  </div>
                </>
              )}

              {/* Holiday */}
              {editState.dayType === 'holiday' && (
                <div className="space-y-3">
                  <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 flex items-start gap-2">
                    <span className="text-base mt-0.5">🎉</span>
                    <p className="text-xs text-purple-700 font-medium">Holiday — {settings.holidayMultiplier}× pay applies if you worked this day.</p>
                  </div>
                  {/* Toggle: did you go to work? */}
                  <button
                    type="button"
                    onClick={() => setEditState(s => s && ({ ...s, workedOnHoliday: !s.workedOnHoliday }))}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all cursor-pointer ${
                      editState.workedOnHoliday
                        ? 'border-purple-400 bg-purple-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <span className={`text-sm font-bold ${editState.workedOnHoliday ? 'text-purple-700' : 'text-gray-500'}`}>
                      I went to work this holiday
                    </span>
                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      editState.workedOnHoliday ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                    }`}>
                      {editState.workedOnHoliday && <span className="w-2 h-2 rounded-full bg-white block" />}
                    </span>
                  </button>
                  {editState.workedOnHoliday && (
                    <>
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
                      </div>
                    </>
                  )}
                </div>
              )}

              {editState.dayType === 'absent' && (
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex items-center gap-2.5">
                  <UserX className="w-4 h-4 text-rose-400 shrink-0" />
                  <p className="text-xs text-rose-600 font-medium">This day will be recorded as <strong>Absent</strong>. No earnings will be counted.</p>
                </div>
              )}

              {editState.dayType === 'rest' && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center gap-2.5">
                  <span className="text-lg">🧘</span>
                  <p className="text-xs text-gray-600 font-medium">This day will be marked as a <strong>Rest Day</strong>. No deductions will apply.</p>
                </div>
              )}

              {/* Offset Usage */}
              {settings.otType === 'offset' && (editState.dayType === 'normal' || (editState.dayType === 'holiday' && editState.workedOnHoliday)) && (
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

              <div className="flex gap-2 pt-1">
                {editState.existing && (
                  !confirmDelete ? (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="flex items-center justify-center gap-1.5 bg-white hover:bg-rose-50 text-rose-500 font-bold py-2.5 px-3.5 rounded-xl text-sm border border-rose-200 hover:border-rose-300 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDelete(editState.date)}
                      disabled={deleting}
                      className="flex items-center justify-center gap-1.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-60 text-white font-bold py-2.5 px-3 rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      {deleting ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : 'Confirm Delete'}
                    </button>
                  )
                )}
                <button
                  onClick={() => { setEditState(null); setConfirmDelete(false) }}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-bold text-sm rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || (editState.dayType === 'normal' && !editState.timeIn)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer shadow-sm shadow-emerald-200"
                >
                  {saving
                    ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : editState.existing ? 'Save Changes' : 'Add Record'
                  }
                </button>
              </div>
              {confirmDelete && (
                <p className="text-[11px] text-rose-400 text-center -mt-2">Tap Confirm Delete to permanently remove this record.</p>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  )
}

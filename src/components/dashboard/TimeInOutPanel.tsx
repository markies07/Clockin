'use client'
import { useState, useEffect } from 'react'
import { LogIn, LogOut, CheckCircle2, Info, Clock, UserX } from 'lucide-react'
import { AttendanceRecord } from '@/types'
import { formatTime, getCurrentTime } from '@/lib/attendance'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface Props {
  todayRecord: AttendanceRecord | null
  startTime: string
  onTimeIn: (time: string) => Promise<void>
  onTimeOut: (time?: string) => Promise<void>
  onAddNote: (note: string) => Promise<void>
  onMarkAbsent: () => Promise<void>
  onMarkHoliday: () => Promise<void>
  isRestDay?: boolean
  holidayMultiplier?: number
}

export default function TimeInOutPanel({ todayRecord, startTime, onTimeIn, onTimeOut, onAddNote, onMarkAbsent, onMarkHoliday, isRestDay, holidayMultiplier = 2 }: Props) {
  const [timeInValue, setTimeInValue] = useState(startTime)
  const [timeOutValue, setTimeOutValue] = useState(getCurrentTime())
  const [useCurrentTimeOut, setUseCurrentTimeOut] = useState(true)
  const [note, setNote] = useState(todayRecord?.notes ?? '')
  const [loading, setLoading] = useState(false)
  const [liveTime, setLiveTime] = useState(new Date())
  const [workedOnHoliday, setWorkedOnHoliday] = useState(false)
  const [workedOnRestDay, setWorkedOnRestDay] = useState(false)

  useEffect(() => {
    const t = setInterval(() => {
      setLiveTime(new Date())
      // keep the clock-out "current time" in sync while toggle is on
      if (useCurrentTimeOut) setTimeOutValue(getCurrentTime())
    }, 1000)
    return () => clearInterval(t)
  }, [useCurrentTimeOut])

  const hasTimeIn = !!todayRecord?.timeIn
  const hasTimeOut = !!todayRecord?.timeOut

  async function handleTimeIn() {
    setLoading(true)
    await onTimeIn(timeInValue)
    setLoading(false)
    toast.success('Clocked in successfully!')
  }

  async function handleTimeOut() {
    setLoading(true)
    await onTimeOut(useCurrentTimeOut ? undefined : timeOutValue)
    setLoading(false)
    toast.success('Clocked out successfully!')
  }

  async function handleNoteBlur() {
    if (note !== todayRecord?.notes) await onAddNote(note)
  }

  const isAbsent  = todayRecord?.status === 'absent' && !todayRecord?.timeIn
  const isTodayHoliday = todayRecord?.isHoliday ?? false

  const statusCfg = isRestDay
    ? { label: 'Rest Day',    dotColor: 'bg-emerald-400', badgeCls: 'bg-emerald-50 text-emerald-600' }
    : isAbsent
    ? { label: 'Absent',      dotColor: 'bg-rose-500',    badgeCls: 'bg-rose-50 text-rose-600' }
    : isTodayHoliday && !hasTimeIn
    ? { label: 'Holiday',     dotColor: 'bg-purple-500',  badgeCls: 'bg-purple-50 text-purple-600' }
    : isTodayHoliday && hasTimeIn
    ? { label: 'Holiday Work', dotColor: 'bg-purple-500', badgeCls: 'bg-purple-50 text-purple-600' }
    : !hasTimeIn
    ? { label: 'Not Checked In', dotColor: 'bg-gray-400', badgeCls: 'bg-gray-100 text-gray-500' }
    : todayRecord?.status === 'late'
    ? { label: 'Late', dotColor: 'bg-amber-400', badgeCls: 'bg-amber-50 text-amber-600' }
    : hasTimeOut
    ? { label: 'Complete', dotColor: 'bg-emerald-500', badgeCls: 'bg-emerald-50 text-emerald-600' }
    : { label: 'On Time', dotColor: 'bg-emerald-500', badgeCls: 'bg-emerald-50 text-emerald-600' }

  const restQuotes = [
    "Enjoy your rest day! You deserve it. 🌴",
    "Time to relax and recharge. See you soon! ☕",
    "Rest today, conquer tomorrow. Happy day off! ✨",
    "Take a deep breath and enjoy the break. 🧘",
    "No work today! Time for hobbies and happiness. 🎨",
    "Unplug and unwind. Have a great rest day! 🛌",
    "Your hard work paid off. Now, time to chill! 🍦",
    "Enjoy the silence. Happy rest day! 🎧"
  ]

  const [quote] = useState(() => restQuotes[Math.floor(Math.random() * restQuotes.length)])

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-50">
        <div className="flex items-center gap-2">
          <p className="font-bold text-gray-800 text-sm">Daily Attendance</p>
          <Info className="w-3.5 h-3.5 text-gray-300" />
        </div>
        <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${statusCfg.badgeCls}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotColor}`} />
          {statusCfg.label}
        </span>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Date + live clock — same row, no extra spacing */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400 font-medium">{format(new Date(), 'EEEE, MMMM d')}</p>
          <div className="text-right">
            <p className="text-2xl font-extrabold text-gray-900 tabular-nums leading-none">
              {format(liveTime, 'hh:mm')}
              <span className="text-emerald-500 text-lg">{format(liveTime, ':ss')}</span>
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">{format(liveTime, 'a')}</p>
          </div>
        </div>

        {isRestDay ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center text-center space-y-4 animate-in fade-in zoom-in duration-500 py-6">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-100 shadow-sm">
                <span className="text-4xl">🧘</span>
              </div>
              <div className="space-y-2">
                <p className="text-xl font-black text-gray-900 tracking-tight">Time to Relax!</p>
                <p className="text-sm text-gray-500 font-medium leading-relaxed max-w-60 mx-auto">
                  {quote}
                </p>
              </div>
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-4 py-1.5 rounded-full uppercase tracking-widest border border-emerald-100">
                Scheduled Rest Day
              </span>
            </div>
            {/* Option to work on rest day */}
            <button
              type="button"
              onClick={() => setWorkedOnRestDay(v => !v)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all cursor-pointer ${
                workedOnRestDay ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <span className={`text-sm font-bold ${workedOnRestDay ? 'text-emerald-700' : 'text-gray-500'}`}>I went to work today</span>
              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${workedOnRestDay ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'}`}>
                {workedOnRestDay && <span className="w-2 h-2 rounded-full bg-white block" />}
              </span>
            </button>
            {workedOnRestDay && (
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Set your arrival time</p>
                <input
                  type="time"
                  value={timeInValue}
                  onChange={(e) => setTimeInValue(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 cursor-pointer"
                />
                <button
                  onClick={handleTimeIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl transition-colors cursor-pointer text-sm shadow-sm bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200"
                >
                  {loading
                    ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : <><LogIn className="w-4 h-4" /> Clock In</>
                  }
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Time In / Time Out display boxes */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <LogIn className="w-3.5 h-3.5 text-emerald-600" />
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Time In</p>
                </div>
                <p className="text-lg font-extrabold text-gray-900">
                  {hasTimeIn ? formatTime(todayRecord!.timeIn) : '— : —'}
                </p>
                {todayRecord?.lateMinutes ? (
                  <p className="text-[11px] text-amber-500 font-semibold mt-0.5">{todayRecord.lateMinutes}min late</p>
                ) : hasTimeIn ? (
                  <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">On time ✓</p>
                ) : (
                  <p className="text-[11px] text-gray-400 mt-0.5">Not yet</p>
                )}
              </div>

              <div className="bg-red-50 rounded-xl p-3 border border-red-100">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <LogOut className="w-3.5 h-3.5 text-red-500" />
                  <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Time Out</p>
                </div>
                <p className="text-lg font-extrabold text-gray-900">
                  {hasTimeOut ? formatTime(todayRecord!.timeOut!) : '— : —'}
                </p>
                {todayRecord?.isOT ? (
                  <p className="text-[11px] text-orange-500 font-semibold mt-0.5">+{todayRecord.otHours.toFixed(1)}h OT</p>
                ) : hasTimeOut ? (
                  <p className="text-[11px] text-gray-400 mt-0.5">No overtime</p>
                ) : (
                  <p className="text-[11px] text-gray-400 mt-0.5">Not yet</p>
                )}
              </div>
            </div>

            {/* ── ABSENT state ── */}
            {isAbsent && (
              <div className="bg-rose-50 rounded-xl border border-rose-100 p-4 text-center space-y-2">
                <UserX className="w-8 h-8 text-rose-300 mx-auto" />
                <p className="text-sm font-bold text-rose-600">Marked as Absent</p>
                <p className="text-[11px] text-rose-400">You&apos;ve recorded today as absent. No earnings counted.</p>
              </div>
            )}

            {/* ── HOLIDAY state (not worked yet) ── */}
            {isTodayHoliday && !hasTimeIn && !isAbsent && (
              <div className="space-y-3">
                <div className="bg-purple-50 rounded-xl border border-purple-100 p-4 text-center space-y-1">
                  <span className="text-2xl block">🎉</span>
                  <p className="text-sm font-bold text-purple-700">Today is a Holiday</p>
                  <p className="text-[11px] text-purple-400">{holidayMultiplier}× pay applies if you worked.</p>
                </div>
                {/* Toggle */}
                <button
                  type="button"
                  onClick={() => setWorkedOnHoliday(v => !v)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all cursor-pointer ${
                    workedOnHoliday ? 'border-purple-400 bg-purple-50' : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <span className={`text-sm font-bold ${workedOnHoliday ? 'text-purple-700' : 'text-gray-500'}`}>I went to work today</span>
                  <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${workedOnHoliday ? 'border-purple-500 bg-purple-500' : 'border-gray-300'}`}>
                    {workedOnHoliday && <span className="w-2 h-2 rounded-full bg-white block" />}
                  </span>
                </button>
                {workedOnHoliday && (
                  <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Set your arrival time</p>
                    <input
                      type="time"
                      value={timeInValue}
                      onChange={(e) => setTimeInValue(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400 cursor-pointer"
                    />
                    <button
                      onClick={handleTimeIn}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl transition-colors cursor-pointer text-sm shadow-sm bg-purple-500 hover:bg-purple-600 shadow-purple-200"
                    >
                      {loading
                        ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        : <><LogIn className="w-4 h-4" /> Clock In (Holiday)</>
                      }
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={async () => { setLoading(true); await onMarkAbsent(); setLoading(false); toast.success('Marked as absent') }}
                    disabled={loading}
                    className="flex items-center justify-center gap-1.5 bg-white hover:bg-rose-50 disabled:opacity-60 text-rose-500 font-bold py-2 rounded-xl border border-rose-200 hover:border-rose-300 transition-colors cursor-pointer text-xs"
                  >
                    <UserX className="w-3.5 h-3.5" /> Mark Absent
                  </button>
                  <button
                    disabled
                    className="flex items-center justify-center gap-1.5 bg-purple-50 text-purple-400 font-bold py-2 rounded-xl border border-purple-200 text-xs cursor-default"
                  >
                    🎉 Holiday Set
                  </button>
                </div>
              </div>
            )}

            {/* ── CLOCK IN form (normal day) ── */}
            {!hasTimeIn && !isAbsent && !isTodayHoliday && (
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Set your arrival time</p>
                <input
                  type="time"
                  value={timeInValue}
                  onChange={(e) => setTimeInValue(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 cursor-pointer"
                />
                <p className="text-[11px] text-gray-400">Enter the time you actually arrived — even if you&apos;re logging in late.</p>
                <button
                  onClick={handleTimeIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl transition-colors cursor-pointer text-sm shadow-sm bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200"
                >
                  {loading
                    ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : <><LogIn className="w-4 h-4" /> Clock In</>
                  }
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={async () => { setLoading(true); await onMarkAbsent(); setLoading(false); toast.success('Marked as absent') }}
                    disabled={loading}
                    className="flex items-center justify-center gap-1.5 bg-white hover:bg-rose-50 disabled:opacity-60 text-rose-500 font-bold py-2 rounded-xl border border-rose-200 hover:border-rose-300 transition-colors cursor-pointer text-xs"
                  >
                    <UserX className="w-3.5 h-3.5" /> Mark Absent
                  </button>
                  <button
                    onClick={async () => { setLoading(true); await onMarkHoliday(); setLoading(false); toast.success('Marked as holiday') }}
                    disabled={loading}
                    className="flex items-center justify-center gap-1.5 bg-white hover:bg-purple-50 disabled:opacity-60 text-purple-500 font-bold py-2 rounded-xl border border-purple-200 hover:border-purple-300 transition-colors cursor-pointer text-xs"
                  >
                    🎉 Mark Holiday
                  </button>
                </div>
              </div>
            )}

            {/* ── CLOCK OUT form ── */}
            {hasTimeIn && !hasTimeOut && (
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Clock out time</p>
                  {/* Toggle: current time vs manual */}
                  <div className="flex items-center bg-white border border-gray-200 rounded-lg p-0.5 gap-0.5">
                    <button
                      type="button"
                      onClick={() => setUseCurrentTimeOut(true)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        useCurrentTimeOut ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      <Clock className="w-3 h-3" /> Now
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseCurrentTimeOut(false)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        !useCurrentTimeOut ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      Manual
                    </button>
                  </div>
                </div>

                {useCurrentTimeOut ? (
                  <div className="px-3.5 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-sm font-bold text-emerald-700 tabular-nums">
                    {format(liveTime, 'hh:mm:ss a')} <span className="text-emerald-400 font-medium text-xs">(live)</span>
                  </div>
                ) : (
                  <input
                    type="time"
                    value={timeOutValue}
                    onChange={(e) => setTimeOutValue(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 cursor-pointer"
                  />
                )}

                <input
                  placeholder="Add a note… (WFH, Half day, etc.)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onBlur={handleNoteBlur}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300/40 placeholder:text-gray-400"
                />

                <button
                  onClick={handleTimeOut}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl transition-colors shadow-sm shadow-red-200 cursor-pointer text-sm"
                >
                  {loading
                    ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : <><LogOut className="w-4 h-4" /> Clock Out</>
                  }
                </button>
              </div>
            )}

            {hasTimeOut && (
              <div className="flex items-center justify-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl py-3 text-sm text-emerald-700 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Day complete — great work!
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

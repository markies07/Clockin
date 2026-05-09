'use client'
import { useState, useEffect } from 'react'
import { LogIn, LogOut, CheckCircle2, Info, Clock } from 'lucide-react'
import { AttendanceRecord } from '@/types'
import { formatTime, getCurrentTime } from '@/lib/attendance'
import { format } from 'date-fns'

interface Props {
  todayRecord: AttendanceRecord | null
  startTime: string
  onTimeIn: (time: string) => Promise<void>
  onTimeOut: (time?: string) => Promise<void>
  onAddNote: (note: string) => Promise<void>
}

export default function TimeInOutPanel({ todayRecord, startTime, onTimeIn, onTimeOut, onAddNote }: Props) {
  const [timeInValue, setTimeInValue] = useState(startTime)
  const [timeOutValue, setTimeOutValue] = useState(getCurrentTime())
  const [useCurrentTimeOut, setUseCurrentTimeOut] = useState(true)
  const [note, setNote] = useState(todayRecord?.notes ?? '')
  const [loading, setLoading] = useState(false)
  const [liveTime, setLiveTime] = useState(new Date())

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
  }

  async function handleTimeOut() {
    setLoading(true)
    await onTimeOut(useCurrentTimeOut ? undefined : timeOutValue)
    setLoading(false)
  }

  async function handleNoteBlur() {
    if (note !== todayRecord?.notes) await onAddNote(note)
  }

  const statusCfg = !hasTimeIn
    ? { label: 'Not Checked In', dotColor: 'bg-gray-400', badgeCls: 'bg-gray-100 text-gray-500' }
    : todayRecord?.status === 'late'
    ? { label: 'Late', dotColor: 'bg-amber-400', badgeCls: 'bg-amber-50 text-amber-600' }
    : hasTimeOut
    ? { label: 'Complete', dotColor: 'bg-emerald-500', badgeCls: 'bg-emerald-50 text-emerald-600' }
    : { label: 'On Time', dotColor: 'bg-emerald-500', badgeCls: 'bg-emerald-50 text-emerald-600' }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
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

        {/* ── CLOCK IN form ── */}
        {!hasTimeIn && (
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
            <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Set your arrival time</p>
            <input
              type="time"
              value={timeInValue}
              onChange={(e) => setTimeInValue(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 cursor-pointer"
            />
            <p className="text-[11px] text-gray-400">Enter the time you actually arrived — even if you're logging in late.</p>
            <button
              onClick={handleTimeIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl transition-colors shadow-sm shadow-emerald-200 cursor-pointer text-sm"
            >
              {loading
                ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <><LogIn className="w-4 h-4" /> Clock In</>
              }
            </button>
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
      </div>
    </div>
  )
}

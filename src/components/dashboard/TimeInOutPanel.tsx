'use client'
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { LogIn, LogOut, Clock } from 'lucide-react'
import { AttendanceRecord } from '@/types'
import { formatTime, getCurrentTime } from '@/lib/attendance'
import { format } from 'date-fns'

interface Props {
  todayRecord: AttendanceRecord | null
  onTimeIn: (time?: string) => Promise<void>
  onTimeOut: () => Promise<void>
  onAddNote: (note: string) => Promise<void>
}

export default function TimeInOutPanel({ todayRecord, onTimeIn, onTimeOut, onAddNote }: Props) {
  const [manualTime, setManualTime] = useState(getCurrentTime())
  const [useManual, setUseManual] = useState(false)
  const [note, setNote] = useState(todayRecord?.notes ?? '')
  const [loading, setLoading] = useState(false)

  const hasTimeIn = !!todayRecord?.timeIn
  const hasTimeOut = !!todayRecord?.timeOut

  async function handleTimeIn() {
    setLoading(true)
    await onTimeIn(useManual ? manualTime : undefined)
    setLoading(false)
  }

  async function handleTimeOut() {
    setLoading(true)
    await onTimeOut()
    setLoading(false)
  }

  async function handleNoteBlur() {
    if (note !== todayRecord?.notes) await onAddNote(note)
  }

  const statusColor = !hasTimeIn
    ? 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
    : todayRecord?.status === 'late'
    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400'
    : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'

  const statusLabel = !hasTimeIn ? 'Not Checked In' : todayRecord?.status === 'late' ? 'Late' : 'On Time'

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider font-medium">Today</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">
              {format(new Date(), 'EEEE, MMM d')}
            </p>
          </div>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusColor}`}>{statusLabel}</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Time In</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {hasTimeIn ? formatTime(todayRecord!.timeIn) : '--:--'}
            </p>
            {todayRecord?.lateMinutes ? (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-0.5">{todayRecord.lateMinutes}min late</p>
            ) : null}
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Time Out</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {hasTimeOut ? formatTime(todayRecord!.timeOut!) : '--:--'}
            </p>
            {todayRecord?.isOT && (
              <p className="text-xs text-orange-500 dark:text-orange-400 mt-0.5">+{todayRecord.otHours.toFixed(1)}h OT</p>
            )}
          </div>
        </div>

        {!hasTimeIn && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setUseManual(!useManual)}
                className="text-xs text-green-600 dark:text-green-400 underline"
              >
                {useManual ? 'Use current time instead' : 'Set time manually'}
              </button>
            </div>
            {useManual && (
              <Input type="time" value={manualTime} onChange={(e) => setManualTime(e.target.value)} className="w-full" />
            )}
          </div>
        )}

        {hasTimeIn && !hasTimeOut && (
          <div className="space-y-2">
            <Input
              placeholder="Add a note (optional)..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={handleNoteBlur}
              className="text-sm"
            />
          </div>
        )}

        <div className="flex gap-2">
          {!hasTimeIn && (
            <Button
              onClick={handleTimeIn}
              disabled={loading}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white gap-2"
            >
              <LogIn className="w-4 h-4" />
              {loading ? 'Clocking in...' : 'Clock In'}
            </Button>
          )}
          {hasTimeIn && !hasTimeOut && (
            <Button
              onClick={handleTimeOut}
              disabled={loading}
              variant="outline"
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950 gap-2"
            >
              <LogOut className="w-4 h-4" />
              {loading ? 'Clocking out...' : 'Clock Out'}
            </Button>
          )}
          {hasTimeOut && (
            <div className="flex-1 flex items-center justify-center gap-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl py-2.5 text-sm text-gray-500 dark:text-gray-400">
              <Clock className="w-4 h-4" />
              Day complete
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

'use client'
import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { AttendanceRecord, UserSettings } from '@/types'
import { formatTime, formatCurrency, isRestDay, isHoliday } from '@/lib/attendance'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isSameMonth, parseISO, isToday, isFuture
} from 'date-fns'

interface Props {
  records: AttendanceRecord[]
  settings: UserSettings
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function AttendanceCalendar({ records, settings }: Props) {
  const [current, setCurrent] = useState(new Date())
  const [selected, setSelected] = useState<AttendanceRecord | null>(null)

  const monthStart = startOfMonth(current)
  const monthEnd = endOfMonth(current)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startPad = getDay(monthStart)

  const recordMap = Object.fromEntries(records.map((r) => [r.date, r]))

  function getDayStyle(date: Date) {
    const dateStr = format(date, 'yyyy-MM-dd')
    const record = recordMap[dateStr]
    const rest = isRestDay(dateStr, settings)
    const holiday = isHoliday(dateStr, settings)
    const future = isFuture(date) && !isToday(date)

    if (rest) return 'bg-gray-100 dark:bg-gray-800/50 text-gray-400 dark:text-gray-600'
    if (holiday) return 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
    if (future) return 'bg-transparent text-gray-400 dark:text-gray-600'
    if (!record || !record.timeIn) return 'bg-red-100 dark:bg-red-900/20 text-red-500 dark:text-red-400'
    if (record.isOT && record.status === 'late') return 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
    if (record.isOT) return 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
    if (record.status === 'late') return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
    return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
  }

  function handleDayClick(date: Date) {
    const dateStr = format(date, 'yyyy-MM-dd')
    const record = recordMap[dateStr]
    if (record) setSelected(record)
  }

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{format(current, 'MMMM yyyy')}</p>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {[
                { color: 'bg-green-400', label: 'On Time' },
                { color: 'bg-yellow-400', label: 'Late' },
                { color: 'bg-orange-400', label: 'OT' },
                { color: 'bg-red-400', label: 'Absent' },
                { color: 'bg-purple-400', label: 'Holiday' },
                { color: 'bg-gray-300', label: 'Rest' },
              ].map(({ color, label }) => (
                <span key={label} className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <span className={`w-2 h-2 rounded-full ${color}`} />
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" className="w-8 h-8" onClick={() => setCurrent((d) => new Date(d.getFullYear(), d.getMonth() - 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="w-8 h-8" onClick={() => setCurrent((d) => new Date(d.getFullYear(), d.getMonth() + 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAY_LABELS.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 dark:text-gray-500 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
            {days.map((date) => {
              const dateStr = format(date, 'yyyy-MM-dd')
              const record = recordMap[dateStr]
              const style = getDayStyle(date)
              const today = isToday(date)
              return (
                <button
                  key={dateStr}
                  onClick={() => handleDayClick(date)}
                  className={`
                    relative aspect-square flex items-center justify-center rounded-xl text-sm font-medium transition-all
                    ${style}
                    ${today ? 'ring-2 ring-green-500' : ''}
                    ${record ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}
                  `}
                >
                  {format(date, 'd')}
                  {record?.isOT && (
                    <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-orange-500 rounded-full" />
                  )}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        {selected && (
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{format(parseISO(selected.date), 'EEEE, MMMM d, yyyy')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Time In</p>
                  <p className="font-semibold">{formatTime(selected.timeIn)}</p>
                  {selected.lateMinutes > 0 && <p className="text-xs text-yellow-600">{selected.lateMinutes}min late</p>}
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Time Out</p>
                  <p className="font-semibold">{selected.timeOut ? formatTime(selected.timeOut) : 'N/A'}</p>
                  {selected.isOT && <p className="text-xs text-orange-500">+{selected.otHours.toFixed(1)}h OT</p>}
                </div>
              </div>
              <div className="flex justify-between py-2 border-t dark:border-gray-700">
                <span className="text-gray-500">Hours Worked</span>
                <span className="font-medium">{selected.hoursWorked.toFixed(1)}h</span>
              </div>
              {selected.lateDeduction > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Late Deduction</span>
                  <span className="font-medium text-red-500">-₱{selected.lateDeduction.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-t dark:border-gray-700">
                <span className="font-semibold">Daily Earnings</span>
                <span className="font-bold text-green-600">₱{selected.dailyEarnings.toFixed(2)}</span>
              </div>
              {selected.notes && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Notes</p>
                  <p>{selected.notes}</p>
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  )
}

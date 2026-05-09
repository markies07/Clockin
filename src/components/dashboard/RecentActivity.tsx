'use client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AttendanceRecord, UserSettings } from '@/types'
import { formatTime, formatCurrency } from '@/lib/attendance'
import { format, parseISO } from 'date-fns'
import Link from 'next/link'

interface Props {
  records: AttendanceRecord[]
  settings: UserSettings
}

const STATUS_BADGE: Record<string, string> = {
  'on-time': 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  late: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
  absent: 'bg-red-100 text-red-500 dark:bg-red-900/40 dark:text-red-400',
}

export default function RecentActivity({ records, settings }: Props) {
  const recent = records.slice(0, 7)

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <p className="font-semibold text-gray-900 dark:text-white">Recent Activity</p>
        <Link href="/log" className="text-xs text-green-600 dark:text-green-400 hover:underline font-medium">
          See All
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {recent.length === 0 ? (
          <div className="px-5 pb-5 text-sm text-gray-400 dark:text-gray-500">No records yet. Clock in to get started!</div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {recent.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {format(parseISO(r.date), 'EEE, MMM d')}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {r.timeIn ? formatTime(r.timeIn) : '--'} → {r.timeOut ? formatTime(r.timeOut) : '--'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_BADGE[r.status] ?? ''}`}>
                    {r.status === 'on-time' ? 'On Time' : r.status === 'late' ? 'Late' : 'Absent'}
                  </span>
                  {r.isOT && (
                    <span className="text-xs px-2 py-1 rounded-full font-medium bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400">OT</span>
                  )}
                  <span className="text-sm font-semibold text-gray-900 dark:text-white w-20 text-right">
                    {formatCurrency(r.dailyEarnings, settings.currency)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

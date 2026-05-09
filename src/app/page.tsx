'use client'
import AuthGuard from '@/components/AuthGuard'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import StatsCards from '@/components/dashboard/StatsCards'
import TimeInOutPanel from '@/components/dashboard/TimeInOutPanel'
import AttendanceCalendar from '@/components/dashboard/AttendanceCalendar'
import RecentActivity from '@/components/dashboard/RecentActivity'
import { useApp } from '@/context/AppContext'
import { useAttendance } from '@/hooks/useAttendance'

function Dashboard() {
  const { user, settings } = useApp()
  const { records, todayRecord, timeIn, timeOut, addNote } = useAttendance(user?.uid ?? null, settings)

  if (!settings) return null

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Overview" />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <StatsCards records={records} settings={settings} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <TimeInOutPanel
                todayRecord={todayRecord}
                onTimeIn={timeIn}
                onTimeOut={timeOut}
                onAddNote={addNote}
              />
            </div>
            <div className="lg:col-span-2">
              <AttendanceCalendar records={records} settings={settings} />
            </div>
          </div>
          <RecentActivity records={records} settings={settings} />
        </main>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <AuthGuard>
      <Dashboard />
    </AuthGuard>
  )
}

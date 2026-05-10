'use client'
import AuthGuard from '@/components/AuthGuard'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import BottomNav from '@/components/layout/BottomNav'
import StatsCards from '@/components/dashboard/StatsCards'
import TimeInOutPanel from '@/components/dashboard/TimeInOutPanel'
import AttendanceCalendar from '@/components/dashboard/AttendanceCalendar'
import RecentActivity from '@/components/dashboard/RecentActivity'
import DashboardSkeleton from '@/components/skeletons/DashboardSkeleton'
import { useApp } from '@/context/AppContext'
import { useAttendance } from '@/hooks/useAttendance'

function Dashboard() {
  const { user, settings, authLoading, settingsLoading, updateSettings } = useApp()
  const { 
    records, loading, todayRecord, 
    timeIn, timeOut, addNote, saveRecordForDate 
  } = useAttendance(user?.uid ?? null, settings, updateSettings)

  if (!settings) return null

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const todayDayIndex = new Date().getDay()
  const isRestDay = settings.fixedRestDays 
    ? settings.restDays.includes(todayDayIndex) 
    : todayRecord?.isRestDay ?? false

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar title="Dashboard" />
        {loading ? <DashboardSkeleton /> : (
          <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 lg:space-y-5 pb-24 lg:pb-6">

            {/* Greeting */}
            <div>
              <h2 className="text-lg lg:text-xl font-extrabold text-gray-900">
                {greeting}, {settings.name?.split(' ')[0] ?? 'there'} 👋
              </h2>
              <p className="text-sm text-gray-400 mt-0.5">
                Here&apos;s your attendance overview for {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.
              </p>
            </div>

            {/* Stats + payroll strip */}
            <StatsCards records={records} settings={settings} />

            {/* Calendar + Time panel */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-5 items-start">
              <div className="lg:col-span-3">
                <AttendanceCalendar records={records} settings={settings} onSaveRecord={saveRecordForDate} />
              </div>
              <div className="lg:col-span-2">
                <TimeInOutPanel
                  todayRecord={todayRecord}
                  startTime={settings.startTime}
                  onTimeIn={timeIn}
                  onTimeOut={timeOut}
                  onAddNote={addNote}
                  isRestDay={isRestDay}
                />
              </div>
            </div>

            {/* Recent activity */}
            <RecentActivity records={records} settings={settings} />
          </main>
        )}
      </div>
      <BottomNav />
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

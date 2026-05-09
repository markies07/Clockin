'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CalendarDays, BarChart2, Settings, Clock, ChevronRight } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

const NAV = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/log', label: 'Attendance', icon: CalendarDays },
  { href: '/reports', label: 'Reports', icon: BarChart2 },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { settings, user } = useApp()

  const initials = settings?.name
    ? settings.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? '?'

  return (
    <aside className="hidden lg:flex w-55 h-full bg-white flex-col shrink-0 border-r border-gray-100">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-2.5">
        <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center shrink-0 shadow-sm shadow-emerald-200">
          <Clock className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="font-extrabold text-gray-900 text-base tracking-tight leading-none">ClockIn</span>
          <p className="text-[9px] text-gray-400 font-semibold tracking-widest uppercase mt-0.5">Attendance</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2">
        <p className="text-[10px] font-semibold text-gray-400 px-3 pb-2 uppercase tracking-widest">Home</p>
        <div className="space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link key={href} href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer',
                  active ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                )}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" />
                <span className="flex-1">{label}</span>
                {!active && <ChevronRight className="w-3.5 h-3.5 text-gray-300" />}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Bottom card */}
      <div className="p-3 pb-4">
        <div className="bg-emerald-50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-700 text-[10px] font-bold shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-800 truncate">{settings?.name ?? 'User'}</p>
              <p className="text-[10px] text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
          <p className="text-[10px] font-semibold text-emerald-700 mt-1">
            Work hours: {settings?.startTime ?? '08:00'} – {settings?.endTime ?? '17:00'}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">{format(new Date(), 'EEE, MMM d, yyyy')}</p>
        </div>
      </div>
    </aside>
  )
}

'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CalendarDays, BarChart2, Settings, Banknote } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/',         label: 'Home',    icon: LayoutDashboard },
  { href: '/log',      label: 'Log',     icon: CalendarDays },
  { href: '/reports',  label: 'Reports', icon: BarChart2 },
  { href: '/payroll',  label: 'Payroll', icon: Banknote },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 flex items-center safe-area-pb">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href
        return (
          <Link key={href} href={href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors',
              active ? 'text-emerald-500' : 'text-gray-400'
            )}
          >
            <Icon className="w-[18px] h-[18px]" />
            <span className={cn('text-[9px] font-bold', active ? 'text-emerald-500' : 'text-gray-400')}>
              {label}
            </span>
            {active && <span className="w-1 h-1 rounded-full bg-emerald-500" />}
          </Link>
        )
      })}
    </nav>
  )
}

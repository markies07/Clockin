'use client'
import { useApp } from '@/context/AppContext'
import { format } from 'date-fns'
import { LogOut, ChevronDown } from 'lucide-react'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function TopBar({ title }: { title: string }) {
  const { user, settings } = useApp()
  const router = useRouter()
  const [showMenu, setShowMenu] = useState(false)

  const initials = settings?.name
    ? settings.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? '?'

  async function handleSignOut() {
    await signOut(auth)
    router.replace('/login')
  }

  return (
    <header className="h-14 lg:h-17 bg-white border-b border-gray-100 flex items-center px-4 lg:px-6 shrink-0 gap-3">
      {/* Mobile: show page title */}
      <p className="lg:hidden font-extrabold text-gray-900 text-base flex-1">{title}</p>

      <div className="flex items-center gap-2 ml-auto">
        {/* User profile dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-bold text-gray-800 leading-tight">{settings?.name?.split(' ')[0] ?? 'User'}</p>
              <p className="text-[10px] text-gray-400 leading-tight">Employee</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden md:block" />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-20">
                <div className="px-4 py-3 border-b border-gray-50">
                  <p className="text-sm font-bold text-gray-800 truncate">{settings?.name ?? 'User'}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{user?.email}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors cursor-pointer font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

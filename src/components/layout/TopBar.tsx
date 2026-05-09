'use client'
import { useApp } from '@/context/AppContext'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { format } from 'date-fns'

export default function TopBar({ title }: { title: string }) {
  const { user, settings } = useApp()
  const initials = settings?.name
    ? settings.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? '?'

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-6">
      <div>
        <h1 className="font-semibold text-gray-900 dark:text-white text-base">{title}</h1>
        <p className="text-xs text-gray-400 dark:text-gray-500">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{settings?.name ?? 'User'}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{user?.email}</p>
        </div>
        <Avatar className="w-9 h-9">
          <AvatarFallback className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-400 text-sm font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}

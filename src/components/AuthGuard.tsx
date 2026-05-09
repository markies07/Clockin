'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/context/AppContext'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, authLoading, settings, settingsLoading } = useApp()
  const router = useRouter()

  useEffect(() => {
    if (authLoading || settingsLoading) return
    if (!user) { router.replace('/login'); return }
    if (!settings) { router.replace('/onboarding'); return }
  }, [user, authLoading, settings, settingsLoading, router])

  if (authLoading || settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !settings) return null
  return <>{children}</>
}

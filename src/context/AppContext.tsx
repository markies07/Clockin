'use client'
import { createContext, useContext, ReactNode } from 'react'
import { User } from 'firebase/auth'
import { UserSettings } from '@/types'
import { useAuth } from '@/hooks/useAuth'
import { useSettings } from '@/hooks/useSettings'

interface AppContextType {
  user: User | null
  authLoading: boolean
  settings: UserSettings | null
  settingsLoading: boolean
  updateSettings: (data: Partial<UserSettings>) => Promise<void>
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const { settings, loading: settingsLoading, update } = useSettings(user?.uid ?? null)

  return (
    <AppContext.Provider
      value={{
        user,
        authLoading,
        settings,
        settingsLoading,
        updateSettings: update,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

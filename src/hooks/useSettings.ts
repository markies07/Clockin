'use client'
import { useState, useEffect } from 'react'
import { getSettings, saveSettings } from '@/lib/firestore'
import { UserSettings } from '@/types'

export const DEFAULT_SETTINGS: Partial<UserSettings> = {
  startTime: '08:00',
  endTime: '17:00',
  rateType: 'daily',
  rateAmount: 500,
  otMultiplier: 1.25,
  otThresholdMinutes: 30,
  holidayMultiplier: 2,
  holidays: [],
  darkMode: false,
  fixedRestDays: true,
  fixedWorkingHours: true,
  restDays: [0, 6], // Sunday, Saturday
  payrollFirstCutoff: 15,
  payrollSecondCutoff: 0, // end of month
  payrollFirstPayday: 25,
  payrollSecondPayday: 10,
  currency: '₱',
}

export function useSettings(uid: string | null) {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [prevUid, setPrevUid] = useState<string | null>(null)

  if (uid !== prevUid) {
    setPrevUid(uid)
    if (uid) setLoading(true)
    else setLoading(false)
  }

  useEffect(() => {
    if (!uid) {
      setSettings(null)
      setLoading(false)
      return
    }

    setLoading(true)
    getSettings(uid).then((data) => {
      if (data) {
        setSettings(data as UserSettings)
      } else {
        setSettings(null)
      }
      setLoading(false)
    })
  }, [uid])

  async function updateSettings(newSettings: Partial<UserSettings>) {
    if (!uid) return
    const updated = settings ? { ...settings, ...newSettings } : (newSettings as UserSettings)
    setSettings(updated)
    await saveSettings(uid, updated)
  }

  return { settings, loading, updateSettings, update: updateSettings }
}

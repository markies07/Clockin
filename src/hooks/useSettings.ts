'use client'
import { useState, useEffect } from 'react'
import { getSettings, saveSettings } from '@/lib/firestore'
import { UserSettings } from '@/types'

export const DEFAULT_SETTINGS: Omit<UserSettings, 'uid' | 'email' | 'name'> = {
  startTime: '08:00',
  endTime: '17:00',
  rateType: 'daily',
  rateAmount: 0,
  currency: '₱',
  otMultiplier: 1.25,
  otThresholdMinutes: 30,
  holidayMultiplier: 2,
  restDays: [0, 5], // Sunday, Friday
  holidays: [],
  darkMode: false,
}

export function useSettings(uid: string | null) {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) { setLoading(false); return }
    getSettings(uid).then((s) => {
      setSettings(s)
      setLoading(false)
    })
  }, [uid])

  async function update(data: Partial<UserSettings>) {
    if (!uid || !settings) return
    const updated = { ...settings, ...data }
    setSettings(updated)
    await saveSettings(uid, updated)
  }

  return { settings, loading, update }
}

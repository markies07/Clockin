'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/context/AppContext'
import { saveSettings } from '@/lib/firestore'
import { DEFAULT_SETTINGS } from '@/hooks/useSettings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Clock } from 'lucide-react'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function OnboardingPage() {
  const router = useRouter()
  const { user, authLoading, settings } = useApp()

  const [name, setName] = useState('')
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('17:00')
  const [rateType, setRateType] = useState<'daily' | 'hourly'>('daily')
  const [rateAmount, setRateAmount] = useState('')
  const [otMultiplier, setOtMultiplier] = useState('1.25')
  const [holidayMultiplier, setHolidayMultiplier] = useState('2')
  const [otThresholdMinutes, setOtThresholdMinutes] = useState('30')
  const [restDays, setRestDays] = useState<number[]>([0, 5])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
    if (!authLoading && settings) router.replace('/')
  }, [user, authLoading, settings, router])

  function toggleRestDay(day: number) {
    setRestDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    await saveSettings(user.uid, {
      ...DEFAULT_SETTINGS,
      uid: user.uid,
      name,
      email: user.email ?? '',
      startTime,
      endTime,
      rateType,
      rateAmount: parseFloat(rateAmount) || 0,
      otMultiplier: parseFloat(otMultiplier) || 1.25,
      holidayMultiplier: parseFloat(holidayMultiplier) || 2,
      otThresholdMinutes: parseInt(otThresholdMinutes) || 30,
      restDays,
      createdAt: new Date().toISOString(),
    })
    router.replace('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Welcome to ClockIn!</h1>
          <p className="text-sm text-gray-500 text-center">Set up your profile so we can track your attendance and salary correctly.</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input placeholder="Juan dela Cruz" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Work Start Time</Label>
                  <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Work End Time</Label>
                  <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Rest Days</Label>
                <div className="flex gap-2 flex-wrap">
                  {DAYS.map((d, i) => (
                    <button
                      type="button"
                      key={d}
                      onClick={() => toggleRestDay(i)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        restDays.includes(i)
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Pay Rate Type</Label>
                <div className="grid grid-cols-2 gap-3">
                  {(['daily', 'hourly'] as const).map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setRateType(t)}
                      className={`py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                        rateType === t
                          ? 'border-green-500 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {t === 'daily' ? 'Daily Rate' : 'Hourly Rate'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>{rateType === 'daily' ? 'Daily Rate (₱)' : 'Hourly Rate (₱)'}</Label>
                <Input
                  type="number"
                  placeholder={rateType === 'daily' ? 'e.g. 800' : 'e.g. 100'}
                  value={rateAmount}
                  onChange={(e) => setRateAmount(e.target.value)}
                  required
                  min={0}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">OT Multiplier</Label>
                  <Input type="number" step="0.25" value={otMultiplier} onChange={(e) => setOtMultiplier(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Holiday Multiplier</Label>
                  <Input type="number" step="0.25" value={holidayMultiplier} onChange={(e) => setHolidayMultiplier(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">OT Threshold (min)</Label>
                  <Input type="number" value={otThresholdMinutes} onChange={(e) => setOtThresholdMinutes(e.target.value)} />
                </div>
              </div>

              <Button type="submit" className="w-full bg-green-500 hover:bg-green-600 mt-2" disabled={loading}>
                {loading ? 'Saving...' : 'Get Started'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

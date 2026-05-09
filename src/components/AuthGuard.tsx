'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/context/AppContext'
import { saveSettings } from '@/lib/firestore'
import { DEFAULT_SETTINGS } from '@/hooks/useSettings'
import { Clock, ArrowRight } from 'lucide-react'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const inputCls = "w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 transition-all placeholder:text-gray-400"

function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="bg-white rounded-3xl shadow-xl px-12 py-10 flex flex-col items-center gap-6 border border-gray-100">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-200">
            <Clock className="w-8 h-8 text-white" />
          </div>
          <svg className="absolute -inset-2 w-20 h-20 animate-spin" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="36" fill="none" stroke="#10b981" strokeWidth="3"
              strokeDasharray="60 160" strokeLinecap="round" />
          </svg>
        </div>
        <div className="text-center">
          <p className="font-extrabold text-gray-900 text-xl tracking-tight">ClockIn</p>
          <p className="text-sm text-gray-400 mt-1">Loading your workspace…</p>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce"
              style={{ animationDelay: `${i * 0.12}s` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

function OnboardingForm() {
  const { user, updateSettings } = useApp()
  const [name, setName] = useState('')
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('17:00')
  const [rateType, setRateType] = useState<'daily' | 'hourly'>('daily')
  const [rateAmount, setRateAmount] = useState('')
  const [otMultiplier, setOtMultiplier] = useState('1.25')
  const [holidayMultiplier, setHolidayMultiplier] = useState('2')
  const [otThresholdMinutes, setOtThresholdMinutes] = useState('30')
  const [restDays, setRestDays] = useState<number[]>([0, 6])
  const [loading, setLoading] = useState(false)

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
      startTime, endTime, rateType,
      rateAmount: parseFloat(rateAmount) || 0,
      otMultiplier: parseFloat(otMultiplier) || 1.25,
      holidayMultiplier: parseFloat(holidayMultiplier) || 2,
      otThresholdMinutes: parseInt(otThresholdMinutes) || 30,
      restDays,
      createdAt: new Date().toISOString(),
    })
    // updateSettings will update the context so AuthGuard re-renders to show the app
    await updateSettings({
      uid: user.uid, name, email: user.email ?? '',
      startTime, endTime, rateType,
      rateAmount: parseFloat(rateAmount) || 0,
      otMultiplier: parseFloat(otMultiplier) || 1.25,
      holidayMultiplier: parseFloat(holidayMultiplier) || 2,
      otThresholdMinutes: parseInt(otThresholdMinutes) || 30,
      restDays,
    })
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm shadow-emerald-200">
            <Clock className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">Welcome to ClockIn!</h1>
          <p className="text-gray-400 text-sm mt-1">Set up your profile to get started</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Full Name</label>
              <input className={inputCls} placeholder="Juan dela Cruz" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Start Time</label>
                <input type="time" className={`${inputCls} cursor-pointer`} value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">End Time</label>
                <input type="time" className={`${inputCls} cursor-pointer`} value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Rest Days</label>
              <div className="flex gap-2 flex-wrap">
                {DAYS.map((d, i) => (
                  <button type="button" key={d} onClick={() => toggleRestDay(i)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      restDays.includes(i) ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Pay Rate Type</label>
              <div className="grid grid-cols-2 gap-2">
                {(['daily', 'hourly'] as const).map((t) => (
                  <button type="button" key={t} onClick={() => setRateType(t)}
                    className={`py-2.5 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                      rateType === t ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-gray-50'
                    }`}>
                    {t === 'daily' ? 'Daily Rate' : 'Hourly Rate'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
                {rateType === 'daily' ? 'Daily Rate (₱)' : 'Hourly Rate (₱)'}
              </label>
              <input type="number" placeholder={rateType === 'daily' ? 'e.g. 800' : 'e.g. 100'}
                value={rateAmount} onChange={(e) => setRateAmount(e.target.value)} required min={0} className={inputCls} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'OT Multiplier',     value: otMultiplier,       set: setOtMultiplier,       step: '0.25' },
                { label: 'Holiday Multi.',    value: holidayMultiplier,  set: setHolidayMultiplier,  step: '0.25' },
                { label: 'OT Threshold (min)', value: otThresholdMinutes, set: setOtThresholdMinutes, step: undefined },
              ].map(({ label, value, set, step }) => (
                <div key={label} className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">{label}</label>
                  <input type="number" step={step} value={value} onChange={(e) => set(e.target.value)} className={inputCls} />
                </div>
              ))}
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition-colors shadow-sm shadow-emerald-200 cursor-pointer mt-2">
              {loading
                ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <><ArrowRight className="w-4 h-4" /> Get Started</>
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, authLoading, settings, settingsLoading } = useApp()
  const router = useRouter()

  // Only redirect to login — never redirect to onboarding (to avoid URL flash)
  if (!authLoading && !user) {
    router.replace('/login')
    return <LoadingScreen />
  }

  // Show loading while auth or settings are being fetched
  if (authLoading || settingsLoading) return <LoadingScreen />

  // Settings not set up yet — show onboarding inline (no URL change)
  if (!settings) return <OnboardingForm />

  return <>{children}</>
}

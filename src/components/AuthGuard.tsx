'use client'
import { useState, ReactNode, useEffect } from 'react'
import { useApp } from '@/context/AppContext'
import { loginWithGoogle, register, login, saveSettings } from '@/lib/firestore'
import { toast } from 'sonner'
import { DEFAULT_SETTINGS } from '@/hooks/useSettings'
import { LogIn, UserPlus, Clock, LogOut, ChevronRight } from 'lucide-react'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const inputCls = "w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 transition-all placeholder:text-gray-400"

export default function AuthGuard({ children }: { children: ReactNode }) {
  const { user, settings, authLoading, settingsLoading, updateSettings } = useApp()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  // Onboarding state
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('17:00')
  const [fixedWorkingHours, setFixedWorkingHours] = useState(true)
  const [rateType, setRateType] = useState<'daily' | 'hourly'>('daily')
  const [rateAmount, setRateAmount] = useState('500')
  const [otMultiplier, setOtMultiplier] = useState('1.25')
  const [holidayMultiplier, setHolidayMultiplier] = useState('2')
  const [otThresholdMinutes, setOtThresholdMinutes] = useState('30')
  const [restDays, setRestDays] = useState<number[]>([0, 6])
  const [fixedRestDays, setFixedRestDays] = useState(true)
  const [cutoff1, setCutoff1] = useState('15')
  const [cutoff2, setCutoff2] = useState('0')
  const [payday1, setPayday1] = useState('25')
  const [payday2, setPayday2] = useState('10')
  const [otType, setOtType] = useState<'paid' | 'offset'>('paid')

  function toggleRestDay(day: number) {
    setRestDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) {
      setLoading(true)
      try {
        if (mode === 'login') {
          await login(email, password)
          toast.success('Login successful!')
        } else {
          await register(email, password)
          toast.success('Registration successful!')
        }
      } catch (err: any) {
        toast.error(err.message || 'Authentication failed')
      } finally {
        setLoading(false)
      }
      return
    }

    // Onboarding submit
    setLoading(true)
    const onboardingData = {
      ...DEFAULT_SETTINGS,
      uid: user.uid,
      name,
      email: user.email ?? '',
      startTime, endTime, 
      fixedWorkingHours,
      rateType,
      rateAmount: parseFloat(rateAmount) || 0,
      otMultiplier: parseFloat(otMultiplier) || 1.25,
      holidayMultiplier: parseFloat(holidayMultiplier) || 2,
      otThresholdMinutes: parseInt(otThresholdMinutes) || 30,
      restDays: fixedRestDays ? restDays : [],
      fixedRestDays,
      payrollFirstCutoff: parseInt(cutoff1) || 15,
      payrollSecondCutoff: parseInt(cutoff2) || 0,
      payrollFirstPayday: parseInt(payday1) || 25,
      payrollSecondPayday: parseInt(payday2) || 10,
      otType,
      offsetBalance: 0,
      createdAt: new Date().toISOString(),
    }
    await saveSettings(user.uid, onboardingData)
    await updateSettings(onboardingData)
    setLoading(false)
    toast.success(`Welcome to ClockIn, ${name}!`)
  }

  async function handleGoogle() {
    setLoading(true)
    try {
      await loginWithGoogle()
      toast.success('Signed in with Google!')
    } catch (err: any) {
      toast.error(err.message || 'Google sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || settingsLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
          <div className="bg-emerald-500 p-8 text-center text-white">
            <h1 className="text-2xl font-black tracking-tight">ClockIn</h1>
            <p className="text-emerald-100 text-sm mt-1 font-medium">Professional Attendance & Payroll</p>
          </div>
          
          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            <div className="space-y-4">
              <input type="email" placeholder="Email Address" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} required />
              <input type="password" placeholder="Password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>

            <button type="submit" disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 cursor-pointer">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : mode === 'login' ? <><LogIn className="w-4 h-4" /> Sign In</> : <><UserPlus className="w-4 h-4" /> Create Account</>}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400 font-bold">Or continue with</span></div>
            </div>

            <button type="button" onClick={handleGoogle} disabled={loading} className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-3 cursor-pointer shadow-sm">
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/smartlock/google.svg" className="w-4 h-4" alt="Google" />
              Google
            </button>

            <p className="text-center text-sm text-gray-500 mt-6">
              {mode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
              <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-emerald-600 font-bold hover:underline cursor-pointer">
                {mode === 'login' ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </form>
        </div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-gray-50/50 py-4 lg:py-6 px-4 flex flex-col justify-center">
        <div className="max-w-5xl mx-auto w-full">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-200 mb-3">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">Complete your profile</h2>
            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">Configure your settings to unlock your dashboard.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              
              {/* Left Column: Basic & Schedule */}
              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-5 lg:p-6 shadow-xl shadow-gray-200/30 border border-gray-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                      <LogIn className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">Personal Info</h3>
                      <p className="text-[10px] text-gray-400">Basic details for your records</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Full Name</label>
                      <input className={inputCls} placeholder="Juan dela Cruz" value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>

                    <div className="flex items-center justify-between bg-gray-50 p-1.5 rounded-xl">
                      <p className="text-[10px] font-bold text-gray-400 pl-2 uppercase tracking-tight">Time Schedule</p>
                      <div className="flex bg-white shadow-sm p-0.5 rounded-lg border border-gray-100">
                        <button type="button" onClick={() => setFixedWorkingHours(true)} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${fixedWorkingHours ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>Fixed</button>
                        <button type="button" onClick={() => setFixedWorkingHours(false)} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${!fixedWorkingHours ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>Flexible</button>
                      </div>
                    </div>

                    {fixedWorkingHours ? (
                      <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-1 duration-300">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Start Time</label>
                          <input type="time" className={inputCls} value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">End Time</label>
                          <input type="time" className={inputCls} value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
                        </div>
                      </div>
                    ) : (
                      <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 flex gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
                        <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-blue-700 font-medium leading-tight">
                          Flexible mode is active. Your shift is set to 8 working hours (9h total including break). No "Late" penalties will be applied.
                        </p>
                      </div>
                    )}
                    
                    {!fixedWorkingHours && (
                      <p className="text-[9px] text-gray-400 leading-tight italic px-1">
                        * Flexible time means you won't be marked "Late" regardless of your clock-in time.
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 lg:p-6 shadow-xl shadow-gray-200/30 border border-gray-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                      <Clock className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">Work Days</h3>
                      <p className="text-[10px] text-gray-400">When do you usually work?</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-gray-50 p-1.5 rounded-xl">
                      <p className="text-[10px] font-bold text-gray-400 pl-2 uppercase tracking-tight">Schedule Type</p>
                      <div className="flex bg-white shadow-sm p-0.5 rounded-lg border border-gray-100">
                        <button type="button" onClick={() => setFixedRestDays(true)} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${fixedRestDays ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>Fixed</button>
                        <button type="button" onClick={() => setFixedRestDays(false)} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${!fixedRestDays ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>Flexible</button>
                      </div>
                    </div>
                    
                    {fixedRestDays ? (
                      <div className="grid grid-cols-4 gap-1.5">
                        {DAYS.map((d, i) => (
                          <button type="button" key={d} onClick={() => toggleRestDay(i)}
                            className={`py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                              restDays.includes(i) ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm' : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'
                            }`}>
                            {d}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3 flex gap-2">
                        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-amber-700 font-medium leading-tight">
                          Flexible schedule means you can mark your rest days directly on the calendar.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Rate & Payroll */}
              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-5 lg:p-6 shadow-xl shadow-gray-200/30 border border-gray-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                      <LogOut className="w-4 h-4 text-emerald-500 rotate-180" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">Salary Config</h3>
                      <p className="text-[10px] text-gray-400">Set your pay rates</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rate Type</label>
                      <select className={inputCls} value={rateType} onChange={(e) => setRateType(e.target.value as any)}>
                        <option value="daily">Daily Rate</option>
                        <option value="hourly">Hourly Rate</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Amount (₱)</label>
                      <input type="number" className={inputCls} value={rateAmount} onChange={(e) => setRateAmount(e.target.value)} required />
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-50 space-y-3">
                    <div className="flex items-center justify-between bg-gray-50 p-1.5 rounded-xl">
                      <p className="text-[10px] font-bold text-gray-400 pl-2 uppercase tracking-tight">OT Policy</p>
                      <div className="flex bg-white shadow-sm p-0.5 rounded-lg border border-gray-100">
                        <button type="button" onClick={() => setOtType('paid')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${otType === 'paid' ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>Standard (Paid)</button>
                        <button type="button" onClick={() => setOtType('offset')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${otType === 'offset' ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>Offset (Time Off)</button>
                      </div>
                    </div>
                    {otType === 'offset' && (
                      <p className="text-[9px] text-purple-600 leading-tight italic px-1">
                        * OT hours will be added to your "Offset Balance" instead of being paid out.
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 lg:p-6 shadow-xl shadow-gray-200/30 border border-gray-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                      <UserPlus className="w-4 h-4 text-purple-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">Payroll Cycle</h3>
                      <p className="text-[10px] text-gray-400">When do you get paid?</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest">1st Cutoff</label>
                        <select value={cutoff1} onChange={(e) => setCutoff1(e.target.value)} className={inputCls}>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest">1st Payday</label>
                        <select value={payday1} onChange={(e) => setPayday1(e.target.value)} className={inputCls}>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                          <option value="0">End of the Month</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest">2nd Cutoff</label>
                        <select value={cutoff2} onChange={(e) => setCutoff2(e.target.value)} className={inputCls}>
                          <option value="0">End of the Month</option>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest">2nd Payday</label>
                        <select value={payday2} onChange={(e) => setPayday2(e.target.value)} className={inputCls}>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                          <option value="0">End of the Month</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3.5 rounded-2xl transition-all shadow-xl shadow-emerald-200/50 flex items-center justify-center gap-2 cursor-pointer text-base group">
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Complete Setup & Start
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

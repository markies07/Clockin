'use client'
import { useState, useEffect } from 'react'
import AuthGuard from '@/components/AuthGuard'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import BottomNav from '@/components/layout/BottomNav'
import { useApp } from '@/context/AppContext'
import { useAttendance } from '@/hooks/useAttendance'
import { getAllRecords, deleteRecord } from '@/lib/firestore'
import { toast } from 'sonner'
import { Trash2, Download, User, Clock, Wallet, Database, Save, ChevronRight } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { formatDuration } from '@/lib/attendance'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const inputCls = "w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 transition-all placeholder:text-gray-400"

type TabId = 'profile' | 'schedule' | 'pay' | 'data'

const TABS: { id: TabId; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'profile',  label: 'Profile',        icon: User,     description: 'Your name and account info' },
  { id: 'schedule', label: 'Work Schedule',  icon: Clock,    description: 'Hours, rest days & holidays' },
  { id: 'pay',      label: 'Pay & Rates',    icon: Wallet,   description: 'Salary rate and OT settings' },
  { id: 'data',     label: 'Data',           icon: Database, description: 'Export or delete your data' },
]

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="py-4 lg:py-5 border-b border-gray-100 last:border-0">
      <div className="flex flex-col lg:flex-row items-start justify-between gap-3 lg:gap-6">
        <div className="lg:w-56 shrink-0 pt-0.5">
          <p className="text-sm font-bold text-gray-800">{label}</p>
          {hint && <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">{hint}</p>}
        </div>
        <div className="w-full lg:flex-1 lg:max-w-md">{children}</div>
      </div>
    </div>
  )
}

function SettingsPage() {
  const { user, settings, updateSettings } = useApp()
  const { records } = useAttendance(user?.uid ?? null, settings, updateSettings)
  const [activeTab, setActiveTab] = useState<TabId>('profile')

  const [name, setName] = useState('')
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('17:00')
  const [fixedWorkingHours, setFixedWorkingHours] = useState(true)
  const [rateType, setRateType] = useState<'daily' | 'hourly'>('daily')
  const [rateAmount, setRateAmount] = useState('')
  const [otMultiplier, setOtMultiplier] = useState('1.25')
  const [holidayMultiplier, setHolidayMultiplier] = useState('2')
  const [otThresholdMinutes, setOtThresholdMinutes] = useState('30')
  const [restDays, setRestDays] = useState<number[]>([])
  const [fixedRestDays, setFixedRestDays] = useState(true)
  const [cutoff1, setCutoff1] = useState('15')
  const [cutoff2, setCutoff2] = useState('0')
  const [payday1, setPayday1] = useState('25')
  const [payday2, setPayday2] = useState('10')
  const [payrollCycleType, setPayrollCycleType] = useState<'semi-monthly' | 'custom'>('semi-monthly')
  const [payrollAnchorDate, setPayrollAnchorDate] = useState('')
  const [payrollPeriodDays, setPayrollPeriodDays] = useState('15')
  const [payrollPayDaysAfter, setPayrollPayDaysAfter] = useState('2')
  const [payrollSecondPayDaysAfter, setPayrollSecondPayDaysAfter] = useState('2')
  const [otType, setOtType] = useState<'paid' | 'offset'>('paid')
  const [offsetBalance, setOffsetBalance] = useState(0)
  const [holidayInput, setHolidayInput] = useState('')
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    if (!settings) return
    setName(settings.name)
    setStartTime(settings.startTime)
    setEndTime(settings.endTime)
    setFixedWorkingHours(settings.fixedWorkingHours ?? true)
    setRateType(settings.rateType)
    setRateAmount(settings.rateAmount.toString())
    setOtMultiplier(settings.otMultiplier.toString())
    setHolidayMultiplier(settings.holidayMultiplier.toString())
    setOtThresholdMinutes(settings.otThresholdMinutes.toString())
    setRestDays(settings.restDays)
    setFixedRestDays(settings.fixedRestDays ?? true)
    setCutoff1(settings.payrollFirstCutoff?.toString() ?? '15')
    setCutoff2(settings.payrollSecondCutoff?.toString() ?? '0')
    setPayday1(settings.payrollFirstPayday?.toString() ?? '25')
    setPayday2(settings.payrollSecondPayday?.toString() ?? '10')
    setPayrollCycleType(settings.payrollCycleType ?? 'semi-monthly')
    setPayrollAnchorDate(settings.payrollAnchorDate ?? '')
    setPayrollPeriodDays(settings.payrollPeriodDays?.toString() ?? '15')
    setPayrollPayDaysAfter(settings.payrollPayDaysAfterCutoff?.toString() ?? '2')
    setPayrollSecondPayDaysAfter(settings.payrollSecondPayDaysAfterCutoff?.toString() ?? '2')
    setOtType(settings.otType ?? 'paid')
    setOffsetBalance(settings.offsetBalance ?? 0)
  }, [settings])

  function toggleRestDay(day: number) {
    setRestDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day])
  }

  function addHoliday() {
    if (!holidayInput || !settings) return
    const updated = [...new Set([...settings.holidays, holidayInput])]
    updateSettings({ holidays: updated })
    setHolidayInput('')
    toast.success('Holiday added')
  }

  function removeHoliday(date: string) {
    if (!settings) return
    updateSettings({ holidays: settings.holidays.filter((h) => h !== date) })
    toast.success('Holiday removed')
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await updateSettings({
      name, startTime, endTime, fixedWorkingHours, rateType,
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
      payrollCycleType,
      payrollAnchorDate: payrollAnchorDate || undefined,
      payrollPeriodDays: parseInt(payrollPeriodDays) || 15,
      payrollPayDaysAfterCutoff: parseInt(payrollPayDaysAfter) || 2,
      payrollSecondPayDaysAfterCutoff: parseInt(payrollSecondPayDaysAfter) || 2,
      otType,
    })
    setSaving(false)
    toast.success('Settings saved!')
  }

  function exportCSV() {
    if (!settings) return
    const header = 'Date,Day,Time In,Time Out,Hours Worked,Status,Late (min),Late Deduction,OT Hours,Daily Earnings,Notes'
    const rows = records.map((r) =>
      [r.date, format(parseISO(r.date), 'EEEE'), r.timeIn || '', r.timeOut || '',
       r.hoursWorked.toFixed(2), r.status, r.lateMinutes, r.lateDeduction.toFixed(2),
       r.otHours.toFixed(2), r.dailyEarnings.toFixed(2), r.notes].join(',')
    )
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'clockin-all-records.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  function exportJSON() {
    if (!settings) return
    const blob = new Blob([JSON.stringify({ settings, records }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'clockin-backup.json'; a.click()
    URL.revokeObjectURL(url)
  }

  async function handleReset() {
    if (!user) return
    setResetting(true)
    const all = await getAllRecords(user.uid)
    await Promise.all(all.map((r) => deleteRecord(user.uid, r.id)))
    setResetting(false)
    setShowResetDialog(false)
    toast.success('All attendance records deleted')
    window.location.reload()
  }

  if (!settings) return null

  const activeTabInfo = TABS.find((t) => t.id === activeTab)!

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar title="Settings" />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-24 lg:pb-6">
          <div className="max-w-5xl mx-auto space-y-5 lg:space-y-6">

            {/* Page header */}
            <div>
              <h2 className="text-xl font-extrabold text-gray-900">Settings</h2>
              <p className="text-sm text-gray-400 mt-0.5">Manage your account, schedule, and preferences</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-start">
              {/* Tab nav — icon grid on mobile, vertical sidebar on desktop */}
              <nav className="w-full lg:w-52 lg:shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Mobile: 4-column icon grid */}
                <div className="flex lg:hidden overflow-x-auto scrollbar-hide border-b border-gray-50">
                  {TABS.map(({ id, label, icon: Icon }) => (
                    <button key={id} type="button" onClick={() => setActiveTab(id)}
                      className={`flex flex-1 flex-col items-center justify-center py-2.5 px-1 gap-1 cursor-pointer transition-colors border-r border-gray-50 last:border-0 min-w-[70px] ${
                        activeTab === id ? 'bg-emerald-50' : 'bg-white hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${activeTab === id ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                        <Icon className={`w-3.5 h-3.5 ${activeTab === id ? 'text-emerald-600' : 'text-gray-400'}`} />
                      </div>
                      <span className={`text-[9px] font-bold leading-tight text-center ${activeTab === id ? 'text-emerald-600' : 'text-gray-400'}`}>
                        {label === 'Work Schedule' ? 'Schedule' : label === 'Pay & Rates' ? 'Pay' : label}
                      </span>
                    </button>
                  ))}
                </div>
                {/* Desktop: vertical list */}
                <div className="hidden lg:flex lg:flex-col">
                  {TABS.map(({ id, label, icon: Icon, description }) => (
                    <button key={id} type="button" onClick={() => setActiveTab(id)}
                      className={`flex items-center gap-3 px-4 py-3.5 text-left transition-colors border-b border-gray-50 last:border-0 cursor-pointer w-full ${
                        activeTab === id ? 'bg-emerald-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${activeTab === id ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                        <Icon className={`w-4 h-4 ${activeTab === id ? 'text-emerald-600' : 'text-gray-500'}`} />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold leading-tight ${activeTab === id ? 'text-emerald-700' : 'text-gray-700'}`}>{label}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 leading-tight truncate">{description}</p>
                      </div>
                      {activeTab === id && <ChevronRight className="w-3.5 h-3.5 text-emerald-400 ml-auto shrink-0" />}
                    </button>
                  ))}
                </div>
              </nav>

              {/* Right content panel */}
              <div className="flex-1 min-w-0 w-full">
                <form onSubmit={handleSave}>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                    {/* Panel header */}
                    <div className="px-5 lg:px-6 py-4 lg:py-5 border-b border-gray-100">
                      <p className="font-bold text-gray-900 text-sm lg:text-base">{activeTabInfo.label}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{activeTabInfo.description}</p>
                    </div>

                    {/* Panel content */}
                    <div className="px-5 lg:px-6">

                      {/* ── Profile ── */}
                      {activeTab === 'profile' && (
                        <>
                          <Field label="Full Name" hint="Your display name across the app">
                            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
                          </Field>
                          <Field label="Email Address" hint="Linked to your account login">
                            <input disabled value={user?.email || ''} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium text-gray-400" />
                          </Field>

                          {settings.otType === 'offset' && (
                            <Field label="Offset Balance" hint="Your accumulated overtime hours (available for time-off)">
                              <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 flex items-center justify-between">
                                <span className="text-sm font-bold text-purple-700">Available Offset</span>
                                <span className="text-lg font-black text-purple-800">{formatDuration(offsetBalance)}</span>
                              </div>
                            </Field>
                          )}
                        </>
                      )}

                      {/* ── Schedule ── */}
                      {activeTab === 'schedule' && (
                        <>
                          <Field label="Work Hours" hint="Your official start and end time">
                            <div className="space-y-4">
                              <div className="flex bg-gray-100 p-0.5 rounded-lg w-fit">
                                <button type="button" onClick={() => setFixedWorkingHours(true)} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${fixedWorkingHours ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}>Fixed Hours</button>
                                <button type="button" onClick={() => setFixedWorkingHours(false)} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${!fixedWorkingHours ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}>Flexible Schedule</button>
                              </div>

                              {fixedWorkingHours ? (
                                <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-1 duration-300">
                                  <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Start</label>
                                    <input type="time" className={`${inputCls} cursor-pointer`} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">End</label>
                                    <input type="time" className={`${inputCls} cursor-pointer`} value={endTime} onChange={(e) => setEndTime(e.target.value)} />
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
                                <p className="text-[10px] text-gray-400 leading-tight italic mt-1 px-1">
                                  * Flexible time means no late deductions are applied.
                                </p>
                              )}
                            </div>
                          </Field>
                          <Field label="Rest Days" hint="Days off that won't count as absent">
                            <div className="space-y-4">
                              <div className="flex bg-gray-100 p-0.5 rounded-lg w-fit">
                                <button type="button" onClick={() => setFixedRestDays(true)} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${fixedRestDays ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}>Fixed Schedule</button>
                                <button type="button" onClick={() => setFixedRestDays(false)} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${!fixedRestDays ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}>Flexible / Manual</button>
                              </div>
                              
                              {fixedRestDays ? (
                                <div className="flex gap-2 flex-wrap">
                                  {DAYS.map((d, i) => (
                                    <button
                                      type="button"
                                      key={d}
                                      onClick={() => toggleRestDay(i)}
                                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                        restDays.includes(i)
                                          ? 'bg-emerald-500 text-white'
                                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                      }`}
                                    >
                                      {d}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-400 bg-gray-50 p-3 rounded-xl border border-gray-100 leading-relaxed">
                                  Your rest days are not fixed. You can mark any day as a <strong>Rest Day</strong> manually by clicking the day in your dashboard calendar.
                                </p>
                              )}
                            </div>
                          </Field>
                           <Field label="Public Holidays" hint="Dates marked as holidays (holiday pay applies)">
                            <div className="flex flex-col sm:flex-row gap-2">
                              <input type="date" className={`${inputCls} flex-1 cursor-pointer`} value={holidayInput} onChange={(e) => setHolidayInput(e.target.value)} />
                              <button
                                type="button"
                                onClick={addHoliday}
                                className="w-full sm:w-auto px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold rounded-lg transition-colors cursor-pointer"
                              >
                                Add
                              </button>
                            </div>
                            {settings.holidays.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-3">
                                {settings.holidays.map((h) => (
                                  <span key={h} className="flex items-center gap-1.5 bg-purple-50 text-purple-600 text-xs px-3 py-1.5 rounded-full font-semibold border border-purple-100">
                                    {h}
                                    <button type="button" onClick={() => removeHoliday(h)} className="hover:text-red-500 transition-colors cursor-pointer font-bold">×</button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </Field>
                        </>
                      )}

                      {/* ── Pay ── */}
                      {activeTab === 'pay' && (
                        <>
                          <Field label="Rate Type" hint="How your salary is calculated">
                            <div className="flex gap-2">
                              {(['daily', 'hourly'] as const).map((t) => (
                                <button
                                  type="button"
                                  key={t}
                                  onClick={() => setRateType(t)}
                                  className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all cursor-pointer ${
                                    rateType === t
                                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                  }`}
                                >
                                  {t === 'daily' ? 'Daily Rate' : 'Hourly Rate'}
                                </button>
                              ))}
                            </div>
                          </Field>
                          <Field label={rateType === 'daily' ? 'Daily Rate (₱)' : 'Hourly Rate (₱)'} hint="Base pay per day or per hour">
                            <input type="number" min={0} className={inputCls} value={rateAmount} onChange={(e) => setRateAmount(e.target.value)} />
                          </Field>
                          <Field label="OT Multiplier" hint="Extra pay rate for overtime hours (1.0 = same rate, 1.25 = 25% extra)">
                            <input type="number" step="0.25" min="1" className={inputCls} value={otMultiplier} onChange={(e) => setOtMultiplier(e.target.value)} />
                          </Field>
                          <Field label="Holiday Multiplier" hint="Pay rate on holidays (2.0 = double pay)">
                            <input type="number" step="0.25" min="1" className={inputCls} value={holidayMultiplier} onChange={(e) => setHolidayMultiplier(e.target.value)} />
                          </Field>
                          <Field label="OT Threshold (minutes)" hint="How many minutes past end time before OT is counted">
                            <input type="number" min={0} className={inputCls} value={otThresholdMinutes} onChange={(e) => setOtThresholdMinutes(e.target.value)} />
                          </Field>
                          <Field label="OT Policy" hint="Choose how your extra hours are rewarded">
                            <div className="space-y-3">
                              <div className="flex bg-gray-100 p-0.5 rounded-lg w-fit">
                                <button type="button" onClick={() => setOtType('paid')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${otType === 'paid' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}>Paid OT</button>
                                <button type="button" onClick={() => setOtType('offset')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${otType === 'offset' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}>Offset OT</button>
                              </div>
                              <p className="text-[10px] text-gray-400 leading-tight italic">
                                {otType === 'paid' 
                                  ? '* OT hours are multiplied by your rate and multiplier, then added to your salary.' 
                                  : '* OT hours are accumulated as an "Offset Balance" which you can use for time off.'}
                              </p>
                            </div>
                          </Field>
                          <Field label="Payroll Schedule" hint="Choose how your pay periods are defined">
                            <div className="space-y-4">
                              {/* Cycle type toggle */}
                              <div className="flex bg-gray-100 p-0.5 rounded-lg w-fit">
                                <button type="button" onClick={() => setPayrollCycleType('semi-monthly')}
                                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${payrollCycleType === 'semi-monthly' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}>
                                  Semi-Monthly
                                </button>
                                <button type="button" onClick={() => setPayrollCycleType('custom')}
                                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${payrollCycleType === 'custom' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}>
                                  Custom Cycle
                                </button>
                              </div>

                              {payrollCycleType === 'semi-monthly' && (
                                <div className="space-y-3">
                                  <p className="text-[10px] text-gray-400 leading-tight">
                                    Standard semi-monthly: Period 1 runs from the 1st to the cutoff day. Period 2 runs from the next day to the end of the month.
                                  </p>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">1st Cutoff (Day)</label>
                                      <select className={inputCls} value={cutoff1} onChange={(e) => setCutoff1(e.target.value)}>
                                        {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">1st Payday (Day)</label>
                                      <select className={inputCls} value={payday1} onChange={(e) => setPayday1(e.target.value)}>
                                        {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
                                        <option value="0">End of Month</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">2nd Cutoff (Day)</label>
                                      <select className={inputCls} value={cutoff2} onChange={(e) => setCutoff2(e.target.value)}>
                                        <option value="0">End of Month</option>
                                        {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">2nd Payday (Day)</label>
                                      <select className={inputCls} value={payday2} onChange={(e) => setPayday2(e.target.value)}>
                                        {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
                                        <option value="0">End of Month</option>
                                      </select>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {payrollCycleType === 'custom' && (
                                <div className="space-y-3">
                                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                                    <p className="text-[11px] text-blue-700 font-semibold leading-snug">
                                      Custom cycle: Set a known period start date and how many days each period lasts.
                                      Example: anchor = Apr 29, period = 15 days → Apr 29–May 13, then May 14–May 28, and so on.
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Anchor Date (known period start)</label>
                                    <input type="date" className={`${inputCls} cursor-pointer`} value={payrollAnchorDate} onChange={(e) => setPayrollAnchorDate(e.target.value)} />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Days per Period</label>
                                    <input type="number" min={1} max={31} className={inputCls} value={payrollPeriodDays} onChange={(e) => setPayrollPeriodDays(e.target.value)} placeholder="15" />
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Odd Period Pay (days after cutoff)</label>
                                      <input type="number" min={0} className={inputCls} value={payrollPayDaysAfter} onChange={(e) => setPayrollPayDaysAfter(e.target.value)} placeholder="2" />
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Even Period Pay (days after cutoff)</label>
                                      <input type="number" min={0} className={inputCls} value={payrollSecondPayDaysAfter} onChange={(e) => setPayrollSecondPayDaysAfter(e.target.value)} placeholder="2" />
                                    </div>
                                  </div>
                                  {payrollAnchorDate && (
                                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-[11px] text-emerald-700 font-medium">
                                      Next periods: <strong>{payrollAnchorDate}</strong> + every <strong>{payrollPeriodDays} days</strong>, pay <strong>{payrollPayDaysAfter} days</strong> after each cutoff.
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </Field>
                        </>
                      )}

                      {/* ── Data ── */}
                      {activeTab === 'data' && (
                        <>
                           <Field label="Export CSV" hint="Download all attendance records as a spreadsheet">
                            <button
                              type="button"
                              onClick={exportCSV}
                              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-sm font-bold rounded-lg transition-colors cursor-pointer"
                            >
                              <Download className="w-4 h-4" /> Export CSV
                            </button>
                          </Field>
                          <Field label="JSON Backup" hint="Download a full backup of your settings and records">
                            <button
                              type="button"
                              onClick={exportJSON}
                              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-sm font-bold rounded-lg transition-colors cursor-pointer"
                            >
                              <Download className="w-4 h-4" /> Download Backup
                            </button>
                          </Field>
                          <Field label="Delete All Records" hint="Permanently removes all your attendance history">
                            <button
                              type="button"
                              onClick={() => setShowResetDialog(true)}
                              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-500 text-sm font-bold rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" /> Delete All Records
                            </button>
                          </Field>
                        </>
                      )}
                    </div>

                    {/* Save footer — only for editable tabs */}
                    {activeTab !== 'data' && (
                      <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
                        <button
                          type="submit"
                          disabled={saving}
                          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-bold px-6 py-2.5 rounded-xl transition-colors shadow-sm shadow-emerald-200 cursor-pointer text-sm"
                        >
                          {saving
                            ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            : <><Save className="w-4 h-4" /> Save Changes</>
                          }
                        </button>
                      </div>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </main>
      </div>

      <BottomNav />
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="max-w-sm rounded-2xl border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900 font-extrabold">Delete All Records?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">
            This will permanently delete all your attendance records. This action cannot be undone.
          </p>
          <div className="flex gap-3 mt-2">
            <button
              onClick={() => setShowResetDialog(false)}
              className="flex-1 py-2.5 border border-gray-200 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleReset}
              disabled={resetting}
              className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer"
            >
              {resetting ? 'Deleting…' : 'Delete All'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function Settings() {
  return <AuthGuard><SettingsPage /></AuthGuard>
}

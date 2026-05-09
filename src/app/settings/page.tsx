'use client'
import { useState, useEffect } from 'react'
import AuthGuard from '@/components/AuthGuard'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { useApp } from '@/context/AppContext'
import { useAttendance } from '@/hooks/useAttendance'
import { getAllRecords, deleteRecord } from '@/lib/firestore'
import { formatCurrency } from '@/lib/attendance'
import { toast } from 'sonner'
import { Trash2, Download } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { format, parseISO } from 'date-fns'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function SettingsPage() {
  const { user, settings, updateSettings } = useApp()
  const { records } = useAttendance(user?.uid ?? null, settings)

  const [name, setName] = useState('')
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('17:00')
  const [rateType, setRateType] = useState<'daily' | 'hourly'>('daily')
  const [rateAmount, setRateAmount] = useState('')
  const [otMultiplier, setOtMultiplier] = useState('1.25')
  const [holidayMultiplier, setHolidayMultiplier] = useState('2')
  const [otThresholdMinutes, setOtThresholdMinutes] = useState('30')
  const [restDays, setRestDays] = useState<number[]>([])
  const [darkMode, setDarkMode] = useState(false)
  const [holidayInput, setHolidayInput] = useState('')
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    if (!settings) return
    setName(settings.name)
    setStartTime(settings.startTime)
    setEndTime(settings.endTime)
    setRateType(settings.rateType)
    setRateAmount(settings.rateAmount.toString())
    setOtMultiplier(settings.otMultiplier.toString())
    setHolidayMultiplier(settings.holidayMultiplier.toString())
    setOtThresholdMinutes(settings.otThresholdMinutes.toString())
    setRestDays(settings.restDays)
    setDarkMode(settings.darkMode)
  }, [settings])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

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
      name,
      startTime,
      endTime,
      rateType,
      rateAmount: parseFloat(rateAmount) || 0,
      otMultiplier: parseFloat(otMultiplier) || 1.25,
      holidayMultiplier: parseFloat(holidayMultiplier) || 2,
      otThresholdMinutes: parseInt(otThresholdMinutes) || 30,
      restDays,
      darkMode,
    })
    setSaving(false)
    toast.success('Settings saved')
  }

  async function handleToggleDark(val: boolean) {
    setDarkMode(val)
    await updateSettings({ darkMode: val })
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

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Settings" />
        <main className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSave} className="max-w-2xl space-y-6">

            {/* Personal Info */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <p className="font-semibold text-gray-900 dark:text-white">Personal Info</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Full Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input value={user?.email ?? ''} disabled className="opacity-60" />
                </div>
              </CardContent>
            </Card>

            {/* Work Schedule */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <p className="font-semibold text-gray-900 dark:text-white">Work Schedule</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Start Time</Label>
                    <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>End Time</Label>
                    <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Rest Days</Label>
                  <div className="flex gap-2 flex-wrap">
                    {DAYS.map((d, i) => (
                      <button type="button" key={d} onClick={() => toggleRestDay(i)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          restDays.includes(i)
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }`}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Holidays</Label>
                  <div className="flex gap-2">
                    <Input type="date" value={holidayInput} onChange={(e) => setHolidayInput(e.target.value)} className="flex-1" />
                    <Button type="button" variant="outline" onClick={addHoliday}>Add</Button>
                  </div>
                  {settings.holidays.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {settings.holidays.map((h) => (
                        <span key={h} className="flex items-center gap-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs px-2.5 py-1 rounded-full">
                          {h}
                          <button type="button" onClick={() => removeHoliday(h)} className="hover:text-red-500">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Pay Config */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <p className="font-semibold text-gray-900 dark:text-white">Pay Configuration</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Late deduction is fixed at ₱1/minute</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Rate Type</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['daily', 'hourly'] as const).map((t) => (
                      <button type="button" key={t} onClick={() => setRateType(t)}
                        className={`py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                          rateType === t
                            ? 'border-green-500 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400'
                            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                        }`}>
                        {t === 'daily' ? 'Daily Rate' : 'Hourly Rate'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>{rateType === 'daily' ? 'Daily Rate (₱)' : 'Hourly Rate (₱)'}</Label>
                  <Input type="number" min={0} value={rateAmount} onChange={(e) => setRateAmount(e.target.value)} />
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
              </CardContent>
            </Card>

            {/* Appearance */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <p className="font-semibold text-gray-900 dark:text-white">Appearance</p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Dark Mode</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Switch between light and dark theme</p>
                  </div>
                  <Switch checked={darkMode} onCheckedChange={handleToggleDark} />
                </div>
              </CardContent>
            </Card>

            <Button type="submit" className="bg-green-500 hover:bg-green-600 w-full" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>

          {/* Data Management */}
          <div className="max-w-2xl mt-6">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <p className="font-semibold text-gray-900 dark:text-white">Data Management</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-3 flex-wrap">
                  <Button variant="outline" className="gap-2" onClick={exportCSV}>
                    <Download className="w-4 h-4" /> Export CSV
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={exportJSON}>
                    <Download className="w-4 h-4" /> Export JSON Backup
                  </Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">Delete All Records</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Permanently delete all attendance data</p>
                  </div>
                  <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 gap-2"
                    onClick={() => setShowResetDialog(true)}>
                    <Trash2 className="w-4 h-4" /> Delete All
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete All Records?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This will permanently delete all your attendance records. This action cannot be undone.
          </p>
          <div className="flex gap-3 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowResetDialog(false)}>Cancel</Button>
            <Button className="flex-1 bg-red-500 hover:bg-red-600" onClick={handleReset} disabled={resetting}>
              {resetting ? 'Deleting...' : 'Delete All'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function Settings() {
  return <AuthGuard><SettingsPage /></AuthGuard>
}

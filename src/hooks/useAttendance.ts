'use client'
import { useState, useEffect } from 'react'
import { getAllRecords, saveRecord, updateRecord, deleteRecord as deleteFirestoreRecord } from '@/lib/firestore'
import { AttendanceRecord, UserSettings } from '@/types'
import { computeRecord } from '@/lib/salary'
import { getTodayString, getCurrentTime, isHoliday } from '@/lib/attendance'

export function useAttendance(uid: string | null, settings: UserSettings | null, updateSettings?: (data: Partial<UserSettings>) => Promise<void>) {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)

  const [prevUid, setPrevUid] = useState<string | null>(uid)
  const [prevSettings, setPrevSettings] = useState<UserSettings | null>(settings)

  if (uid !== prevUid || settings !== prevSettings) {
    setPrevUid(uid)
    setPrevSettings(settings)
    if (!uid || !settings) setLoading(false)
    else setLoading(true)
  }

  useEffect(() => {
    if (!uid || !settings) return
    getAllRecords(uid).then((raw) => {
      // Recompute every record with current settings so stored stale values are corrected.
      // Always trust the stored r.isHoliday flag — it was set manually by the user.
      const recomputed = raw.map((r) => {
        const holiday = r.isHoliday || isHoliday(r.date, settings)
        if (!r.timeIn) {
          // Holiday takes priority over rest day for both status and earnings
          const status: AttendanceRecord['status'] = holiday ? 'holiday' : (r.isRestDay ? 'rest-day' : 'absent')
          // Non-working holiday earns 1× regular daily pay even if it falls on a rest day
          const dailyEarnings = holiday ? settings.rateAmount : 0
          return { ...r, status, isHoliday: holiday, dailyEarnings }
        }
        const computed = computeRecord(r.timeIn, r.timeOut ?? null, settings, holiday, r.offsetUsed || 0)
        return { ...r, isHoliday: holiday, ...computed }
      })
      setRecords(recomputed)
      setLoading(false)
    })
  }, [uid, settings])

  const today = getTodayString()
  const todayRecord = records.find((r) => r.id === today) ?? null

  async function timeIn(manualTime?: string) {
    if (!uid || !settings || todayRecord?.timeIn) return
    const time = manualTime || getCurrentTime()
    // Preserve manual holiday flag if already set on today's record
    const holiday = todayRecord?.isHoliday !== undefined ? todayRecord.isHoliday : isHoliday(today, settings)
    const computed = computeRecord(time, null, settings, holiday)

    const record: AttendanceRecord = {
      id: today, date: today, timeIn: time, timeOut: null,
      isHoliday: holiday, isRestDay: false, notes: todayRecord?.notes ?? '', createdAt: todayRecord?.createdAt ?? new Date().toISOString(), ...computed,
    } as AttendanceRecord
    await saveRecord(uid, record)
    setRecords((prev) => [record, ...prev.filter((r) => r.id !== today)])
  }

  async function timeOut(manualTime?: string) {
    if (!uid || !settings || !todayRecord || todayRecord.timeOut) return
    const time = manualTime || getCurrentTime()
    const holiday = todayRecord.isHoliday || isHoliday(today, settings)
    const computed = computeRecord(todayRecord.timeIn, time, settings, holiday, todayRecord.offsetUsed || 0)
    
    // Update Offset Balance if applicable
    if (settings.otType === 'offset' && updateSettings) {
      const oldOT = todayRecord.otHours || 0
      const oldUsed = todayRecord.offsetUsed || 0
      const newOT = (computed as any).otHours || 0
      const newUsed = (computed as any).offsetUsed || 0
      
      const balanceDelta = (newOT - oldOT) - (newUsed - oldUsed)
      if (balanceDelta !== 0) {
        await updateSettings({ offsetBalance: (settings.offsetBalance || 0) + balanceDelta })
      }
    }

    const updated = { ...todayRecord, timeOut: time, ...computed, updatedAt: new Date().toISOString() }
    await updateRecord(uid, today, { timeOut: time, ...computed })
    setRecords((prev) => [updated, ...prev.filter((r) => r.id !== today)])
  }

  async function addNote(note: string) {
    if (!uid || !todayRecord) return
    await updateRecord(uid, today, { notes: note })
    setRecords((prev) => prev.map((r) => (r.id === today ? { ...r, notes: note } : r)))
  }

  /** Save or overwrite a record for any past date */
  async function saveRecordForDate(date: string, timeInVal: string | null, timeOutVal: string | null, notes: string, isRestDayVal: boolean = false, offsetUsedVal: number = 0, isHolidayOverride?: boolean) {
    if (!uid || !settings) return
    const holiday = isHolidayOverride !== undefined ? isHolidayOverride : isHoliday(date, settings)
    const existing = records.find((r) => r.id === date)

    const computed = timeInVal ? computeRecord(timeInVal, timeOutVal, settings, holiday, offsetUsedVal) : {
      isOT: false, lateMinutes: 0, otHours: 0, hoursWorked: 0, offsetUsed: offsetUsedVal, lateDeduction: 0,
      // Holiday earns 1× regular daily pay even when it falls on a rest day
      dailyEarnings: holiday ? settings.rateAmount : 0,
    }
    
    // Update Offset Balance if applicable
    if (settings.otType === 'offset' && updateSettings) {
      const oldOT = existing?.otHours || 0
      const oldUsed = existing?.offsetUsed || 0
      const newOT = (computed as any).otHours || 0
      const newUsed = offsetUsedVal
      
      const balanceDelta = (newOT - oldOT) - (newUsed - oldUsed)
      if (balanceDelta !== 0) {
        await updateSettings({ offsetBalance: (settings.offsetBalance || 0) + balanceDelta })
      }
    }

    const record: AttendanceRecord = {
      id: date, date, timeIn: timeInVal || '', timeOut: timeOutVal,
      isHoliday: holiday, isRestDay: isRestDayVal, notes,
      status: timeInVal ? (computed as any).status : (isRestDayVal ? 'rest-day' : (holiday ? 'holiday' : 'absent')),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...computed,
    } as AttendanceRecord
    
    await saveRecord(uid, record)
    setRecords((prev) => [record, ...prev.filter((r) => r.id !== date)])
  }

  async function deleteRecordForDate(date: string) {
    if (!uid) return
    await deleteFirestoreRecord(uid, date)
    setRecords((prev) => prev.filter((r) => r.id !== date))
  }

  return { records, loading, todayRecord, timeIn, timeOut, addNote, saveRecordForDate, deleteRecordForDate }
}

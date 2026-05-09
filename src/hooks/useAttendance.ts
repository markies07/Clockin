'use client'
import { useState, useEffect } from 'react'
import { getAllRecords, saveRecord, updateRecord } from '@/lib/firestore'
import { AttendanceRecord, UserSettings } from '@/types'
import { computeRecord } from '@/lib/salary'
import { getTodayString, getCurrentTime, isHoliday } from '@/lib/attendance'

export function useAttendance(uid: string | null, settings: UserSettings | null) {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid || !settings) { setLoading(false); return }
    getAllRecords(uid).then((raw) => {
      // Recompute every record with current settings so stored stale values are corrected
      const recomputed = raw.map((r) => {
        if (!r.timeIn) return r
        const holiday = isHoliday(r.date, settings)
        const computed = computeRecord(r.timeIn, r.timeOut ?? null, settings, holiday)
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
    const holiday = isHoliday(today, settings)
    const computed = computeRecord(time, null, settings, holiday)
    const record: AttendanceRecord = {
      id: today, date: today, timeIn: time, timeOut: null,
      isHoliday: holiday, notes: '', createdAt: new Date().toISOString(), ...computed,
    }
    await saveRecord(uid, record)
    setRecords((prev) => [record, ...prev.filter((r) => r.id !== today)])
  }

  async function timeOut(manualTime?: string) {
    if (!uid || !settings || !todayRecord || todayRecord.timeOut) return
    const time = manualTime || getCurrentTime()
    const holiday = isHoliday(today, settings)
    const computed = computeRecord(todayRecord.timeIn, time, settings, holiday)
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
  async function saveRecordForDate(date: string, timeInVal: string, timeOutVal: string | null, notes: string) {
    if (!uid || !settings) return
    const holiday = isHoliday(date, settings)
    const computed = computeRecord(timeInVal, timeOutVal, settings, holiday)
    const existing = records.find((r) => r.id === date)
    const record: AttendanceRecord = {
      id: date, date, timeIn: timeInVal, timeOut: timeOutVal,
      isHoliday: holiday, notes,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...computed,
    }
    await saveRecord(uid, record)
    setRecords((prev) => [record, ...prev.filter((r) => r.id !== date)])
  }

  return { records, loading, todayRecord, timeIn, timeOut, addNote, saveRecordForDate }
}

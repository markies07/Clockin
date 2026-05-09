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
    if (!uid) { setLoading(false); return }
    getAllRecords(uid).then((r) => {
      setRecords(r)
      setLoading(false)
    })
  }, [uid])

  const today = getTodayString()
  const todayRecord = records.find((r) => r.id === today) ?? null

  async function timeIn(manualTime?: string) {
    if (!uid || !settings || todayRecord?.timeIn) return
    const time = manualTime || getCurrentTime()
    const holiday = isHoliday(today, settings)
    const computed = computeRecord(time, null, settings, holiday)
    const record: AttendanceRecord = {
      id: today,
      date: today,
      timeIn: time,
      timeOut: null,
      isHoliday: holiday,
      notes: '',
      createdAt: new Date().toISOString(),
      ...computed,
    }
    await saveRecord(uid, record)
    setRecords((prev) => [record, ...prev.filter((r) => r.id !== today)])
  }

  async function timeOut() {
    if (!uid || !settings || !todayRecord || todayRecord.timeOut) return
    const time = getCurrentTime()
    const holiday = isHoliday(today, settings)
    const computed = computeRecord(todayRecord.timeIn, time, settings, holiday)
    const updated = { ...todayRecord, timeOut: time, ...computed, updatedAt: new Date().toISOString() }
    await updateRecord(uid, today, { timeOut: time, ...computed })
    setRecords((prev) => [updated, ...prev.filter((r) => r.id !== today)])
  }

  async function addNote(note: string) {
    if (!uid || !todayRecord) return
    await updateRecord(uid, today, { notes: note })
    setRecords((prev) =>
      prev.map((r) => (r.id === today ? { ...r, notes: note } : r))
    )
  }

  return { records, loading, todayRecord, timeIn, timeOut, addNote }
}

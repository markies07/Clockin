import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth'
import { db, auth } from './firebase'
import { UserSettings, AttendanceRecord } from '@/types'

// Auth
export async function login(email: string, pass: string) {
  return signInWithEmailAndPassword(auth, email, pass)
}
export async function register(email: string, pass: string) {
  return createUserWithEmailAndPassword(auth, email, pass)
}
export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider()
  return signInWithPopup(auth, provider)
}

// Settings
export async function getSettings(uid: string): Promise<UserSettings | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'data', 'settings'))
  return snap.exists() ? (snap.data() as UserSettings) : null
}

export async function saveSettings(uid: string, settings: Partial<UserSettings>): Promise<void> {
  await setDoc(
    doc(db, 'users', uid, 'data', 'settings'),
    { ...settings, updatedAt: new Date().toISOString() },
    { merge: true }
  )
}

// Attendance records
export async function getRecord(uid: string, date: string): Promise<AttendanceRecord | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'records', date))
  return snap.exists() ? (snap.data() as AttendanceRecord) : null
}

export async function saveRecord(uid: string, record: AttendanceRecord): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'records', record.id), {
    ...record,
    updatedAt: new Date().toISOString(),
  })
}

export async function updateRecord(uid: string, date: string, data: Partial<AttendanceRecord>): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'records', date), {
    ...data,
    updatedAt: new Date().toISOString(),
  })
}

export async function getAllRecords(uid: string): Promise<AttendanceRecord[]> {
  const q = query(collection(db, 'users', uid, 'records'), orderBy('date', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data() as AttendanceRecord)
}

export async function deleteRecord(uid: string, date: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'records', date))
}

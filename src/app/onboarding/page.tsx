'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Onboarding is now handled inline by AuthGuard — redirect anyone who lands here
export default function OnboardingPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/') }, [router])
  return null
}

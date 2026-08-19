'use server'

import { headers } from 'next/headers'
import { signIn, signOut } from '@/auth'

async function getCallbackUrl(): Promise<string> {
  const hdrs = await headers()
  const referer = hdrs.get('referer') ?? ''
  try {
    const url = new URL(referer)
    const cb = url.searchParams.get('callbackUrl')
    // Only allow same-origin relative paths to prevent open-redirect
    if (cb && cb.startsWith('/') && !cb.startsWith('//')) return cb
  } catch {
    // ignore
  }
  return '/dashboard'
}

export async function loginWithGoogle(): Promise<void> {
  await signIn('google', { redirectTo: await getCallbackUrl() })
}

export async function logout(): Promise<void> {
  await signOut({ redirectTo: '/login' })
}

// Same as logout(), but lands back on a specific /login?callbackUrl=... instead
// of the bare /login page — used by the invite email-mismatch screen so
// switching Google accounts drops the person straight back on the invite
// they were trying to accept, instead of the generic dashboard login.
export async function logoutAndReturnTo(callbackUrl: string): Promise<void> {
  const target = callbackUrl.startsWith('/') && !callbackUrl.startsWith('//')
    ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : '/login'
  await signOut({ redirectTo: target })
}

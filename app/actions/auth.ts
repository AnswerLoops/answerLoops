'use server'

import { headers } from 'next/headers'
import { signIn, signOut } from '@/auth'
import { getPlan, parseBillingInterval } from '@/lib/billing/plans'

async function getCallbackUrl(): Promise<string> {
  const hdrs = await headers()
  const referer = hdrs.get('referer') ?? ''
  try {
    const url = new URL(referer)

    // A plan chosen on the pricing page arrives as /login?plan=<id>. Signing in
    // is only step one of starting a trial, so send them on to checkout for the
    // plan they actually clicked rather than dropping them at the dashboard —
    // which the access gate would bounce anyway, losing the choice.
    //
    // Resolved through getPlan so only real plan ids are honoured: this value
    // ends up in a redirect target, so it must be one this codebase defines.
    // The billing interval is narrowed the same way and for the same reason —
    // it also lands in the redirect, and downstream it selects which Stripe
    // price the person is charged.
    const requestedPlan = url.searchParams.get('plan')
    if (requestedPlan && getPlan(requestedPlan)) {
      const interval = parseBillingInterval(url.searchParams.get('interval'))
      const target = `/start-trial?plan=${encodeURIComponent(requestedPlan)}`
      return interval ? `${target}&interval=${interval}` : target
    }

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

// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import path from 'node:path'

// The form calls a server action, which reaches auth.ts and the whole next-auth
// runtime. None of that is under test here — the rendered label is.
vi.mock('@/app/actions/auth', () => ({ loginWithGoogle: vi.fn() }))

import { LoginForm } from '@/components/login-form'

/**
 * The front door, for someone who has never been here.
 *
 * Google is the only configured provider, so signing in and signing up run the
 * identical OAuth call — Google creates or reuses the account on its side
 * either way. That makes the wording the entire user-facing difference, and
 * getting it wrong costs real signups in both directions: a new visitor told
 * only "sign in" assumes an account is a prerequisite, and a returning one told
 * only "create an account" wonders whether they are about to make a second.
 */

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), 'utf-8')

describe('the marketing header speaks to someone with no account', () => {
  it('offers to create an account rather than to sign in', () => {
    // "anonymous" covers a brand-new visitor and a returning one whose session
    // expired, and nothing can tell them apart before they authenticate. The
    // new visitor is the one with something to lose from the wrong label.
    const src = read('components/marketing/chrome.tsx')
    const anonBlock = src.slice(src.indexOf("state === 'anonymous'"), src.indexOf("state === 'anonymous'") + 300)
    expect(anonBlock).toContain('Create account')
  })
})

describe('the login form matches the mode it was opened in', () => {
  it('says sign up by default, because that is who arrives cold', () => {
    render(<LoginForm />)
    expect(screen.getByRole('button', { name: /sign up with google/i })).toBeTruthy()
  })

  it('says sign in when the page is in sign-in mode', () => {
    render(<LoginForm signingIn />)
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeTruthy()
  })

  it('reports its pending state rather than looking dead on click', () => {
    // The OAuth redirect is a full navigation, so the gap between click and
    // Google's page is long enough to look broken without this.
    const src = read('components/login-form.tsx')
    expect(src).toContain('Redirecting…')
    expect(src).toContain('disabled={googlePending}')
  })
})

describe('the login page offers both modes without losing the plan', () => {
  const src = () => read('app/login/page.tsx')

  it('defaults to the create-account framing and offers sign-in as the alternative', () => {
    const s = src()
    expect(s).toContain("mode === 'signin'")
    expect(s).toContain('Create your account')
    expect(s).toContain('Welcome back')
  })

  it('carries plan, interval and callbackUrl across the mode toggle', () => {
    // These three are the only reason this page can send someone into checkout
    // instead of dropping them at pricing. A toggle that drops them turns a
    // chosen annual plan into a generic signup — the same class of bug as the
    // interval being lost on the /login redirect.
    const s = src()
    const carried = s.slice(s.indexOf('const carried'), s.indexOf('const toggleHref'))
    expect(carried).toContain("carried.set('plan'")
    expect(carried).toContain("carried.set('interval'")
    expect(carried).toContain("carried.set('callbackUrl'")
  })

  it('states the trial length from the billing config rather than a hardcoded number', () => {
    // A "14-day trial" hardcoded here silently disagrees with Stripe the day
    // TRIAL_DAYS changes.
    expect(src()).toContain('TRIAL_DAYS')
  })
})

describe('signing in with no plan goes straight to pricing', () => {
  it('does not route through the dashboard, which the gate would only bounce', () => {
    // Signing in does not grant access — a trial needs a card. /dashboard
    // therefore bounced to /start-trial, which had no plan to resume and
    // forwarded to /pricing: three server round trips to reach the page this
    // now returns directly.
    const src = read('app/actions/auth.ts')
    const fallback = src.slice(src.indexOf('const cb = url.searchParams'))
    expect(fallback).toContain("return '/pricing?resume=1'")
    expect(fallback, 'the dashboard fallback is what caused the detour').not.toContain(
      "return '/dashboard'",
    )
  })

  it('still sends someone who picked a plan straight into checkout', () => {
    // The direct-to-pricing default must not swallow the plan-first path,
    // which is the one that actually converts.
    const src = read('app/actions/auth.ts')
    expect(src).toContain('/start-trial?plan=')
    expect(src).toContain('getPlan(requestedPlan)')
  })
})

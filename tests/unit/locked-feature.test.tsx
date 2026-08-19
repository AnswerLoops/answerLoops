// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LockedFeature } from '@/components/billing/locked-feature'
import { PLANS } from '@/lib/billing/plans'

// Gates a plan-restricted feature (e.g. simulation, knowledge gaps) behind an
// upgrade CTA. Regression risk: the plan-name rename (old "Scale" -> "Pro")
// silently breaking this copy is exactly the class of bug this file guards
// against — a stale hardcoded label wouldn't be caught by the entitlements
// unit tests, which only check plan ids, never the rendered copy.

describe('LockedFeature', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('names the actual plan required, not a stale label', () => {
    render(<LockedFeature requiredPlan="pro" featureLabel="Simulation" />)
    // PLANS.pro.name is "Pro" post-rename — asserting against the live
    // PLANS object (not a hardcoded string) so this fails loudly if the
    // display name ever changes again without updating this copy.
    expect(screen.getByText(`Simulation is available on ${PLANS.pro.name} and above`)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: `Upgrade to ${PLANS.pro.name} →` })).toBeInTheDocument()
  })

  it('names a different required plan correctly for a different gate', () => {
    render(<LockedFeature requiredPlan="enterprise" featureLabel="Custom AI model config" />)
    expect(screen.getByText(`Custom AI model config is available on ${PLANS.enterprise.name} and above`)).toBeInTheDocument()
  })

  it('starts the checkout flow for the required plan on click', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ url: 'https://checkout.stripe.com/session/123' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    render(<LockedFeature requiredPlan="pro" featureLabel="Simulation" />)

    await user.click(screen.getByRole('button', { name: /Upgrade to/ }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: 'pro' }),
      })
    })
  })

  it('disables the button while the upgrade request is pending', async () => {
    let resolveFetch!: (v: unknown) => void
    const fetchMock = vi.fn().mockReturnValue(new Promise((resolve) => { resolveFetch = resolve }))
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    render(<LockedFeature requiredPlan="pro" featureLabel="Simulation" />)

    const button = screen.getByRole('button', { name: /Upgrade to/ })
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Redirecting…' })).toBeDisabled()
    })

    resolveFetch({ json: () => Promise.resolve({ url: 'https://checkout.stripe.com/session/123' }) })
  })
})

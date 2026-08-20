// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PricingToggle } from '@/components/marketing/pricing-toggle'
import { ORDERED_PLANS, ANNUAL_DISCOUNT_PCT, annualMonthlyPrice } from '@/lib/billing/plans'

// New standalone /pricing page (Roadmap "Pricing page — Managed SaaS" item).
//
// Each plan now has a real annual Stripe price, so the toggle sells rather than
// merely displays. What these tests guard is that the two halves of the choice
// travel together: a CTA carries the billing period as well as the plan. They
// have been rewritten twice, once when the CTAs stopped pointing at a waitlist
// and again here, because both times the annual figures and the button beneath
// them came apart — which is invisible on the page and shows up on a card.

describe('lib/billing/plans.ts — annualMonthlyPrice', () => {
  it('discounts by ANNUAL_DISCOUNT_PCT off the monthly price', () => {
    const plan = ORDERED_PLANS.find((p) => p.id === 'standard')!
    expect(annualMonthlyPrice(plan)).toBe(Math.round(plan.priceMonthly * (1 - ANNUAL_DISCOUNT_PCT / 100)))
  })

  it('is strictly less than the monthly price for every paid plan', () => {
    for (const plan of ORDERED_PLANS) {
      expect(annualMonthlyPrice(plan)).toBeLessThan(plan.priceMonthly)
    }
  })
})

describe('PricingToggle', () => {
  it('defaults to annual and shows the discounted price for every plan', () => {
    render(<PricingToggle plans={ORDERED_PLANS} />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
    for (const plan of ORDERED_PLANS) {
      expect(screen.getAllByText(`$${(annualMonthlyPrice(plan) / 100).toFixed(0)}`).length).toBeGreaterThan(0)
    }
  })

  it('shows full monthly pricing when toggled off', async () => {
    const user = userEvent.setup()
    render(<PricingToggle plans={ORDERED_PLANS} />)
    await user.click(screen.getByRole('switch'))
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
    const standard = ORDERED_PLANS.find((p) => p.id === 'standard')!
    expect(screen.getAllByText(`$${(standard.priceMonthly / 100).toFixed(0)}`).length).toBeGreaterThan(0)
    expect(screen.queryByText(/billed annually/)).not.toBeInTheDocument()
  })

  it('carries interval=annual on every CTA while annual is selected', () => {
    // The regression this guards: annual figures on screen above a button that
    // starts a monthly subscription.
    render(<PricingToggle plans={ORDERED_PLANS} />)
    const ctas = screen.getAllByRole('link', { name: /start .* free trial/i })
    expect(ctas).toHaveLength(ORDERED_PLANS.length)
    for (const cta of ctas) expect(cta.getAttribute('href')).toContain('interval=annual')
  })

  it('carries interval=monthly once toggled off', async () => {
    const user = userEvent.setup()
    render(<PricingToggle plans={ORDERED_PLANS} />)
    await user.click(screen.getByRole('switch'))
    for (const cta of screen.getAllByRole('link', { name: /start .* free trial/i })) {
      expect(cta.getAttribute('href')).toContain('interval=monthly')
    }
  })

  it('pairs each plan with its own interval, never a bare plan link', async () => {
    const user = userEvent.setup()
    render(<PricingToggle plans={ORDERED_PLANS} />)
    for (const expected of ['annual', 'monthly'] as const) {
      if (expected === 'monthly') await user.click(screen.getByRole('switch'))
      const hrefs = screen
        .getAllByRole('link', { name: /start .* free trial/i })
        .map((c) => c.getAttribute('href') ?? '')
      for (const plan of ORDERED_PLANS) {
        expect(hrefs).toContain(`/login?plan=${plan.id}&interval=${expected}`)
      }
    }
  })

  // This previously asserted every CTA pointed at the waitlist, on the grounds
  // that the product was pre-launch. That was a deliberate product decision and
  // it has been deliberately reversed: a visitor now picks a plan and starts a
  // trial, because a card up front is the commitment signal the funnel depends
  // on. The coverage is kept rather than dropped — it just pins the new
  // behaviour, including that each CTA carries its own plan.
  it('every plan CTA starts a trial for that specific plan', () => {
    render(<PricingToggle plans={ORDERED_PLANS} />)
    const ctas = screen.getAllByRole('link', { name: /start .* free trial/i })
    expect(ctas.length).toBe(ORDERED_PLANS.length)

    // Asserts the plan is carried rather than pinning the whole query string:
    // the interval rides alongside it now, and the case above already pins the
    // exact pairing.
    const hrefs = ctas.map((c) => c.getAttribute('href') ?? '')
    for (const plan of ORDERED_PLANS) {
      expect(
        hrefs.some((h) => h.startsWith(`/login?plan=${plan.id}&`)),
        `no CTA carries plan "${plan.id}" — a visitor clicking it would lose their choice`,
      ).toBe(true)
    }
  })

  it('no CTA points at the waitlist any more', () => {
    render(<PricingToggle plans={ORDERED_PLANS} />)
    expect(screen.queryByRole('link', { name: 'Join the waitlist' })).toBeNull()
  })

  it('tells the visitor a card is needed and will not be charged', () => {
    // The two facts that decide whether someone clicks through: yes it wants a
    // card, no it will not charge you yet.
    render(<PricingToggle plans={ORDERED_PLANS} />)
    const notes = screen.getAllByText(/card required.*not charged/i)
    expect(notes.length).toBe(ORDERED_PLANS.length)
  })

  it('marks the Pro plan as most popular', () => {
    render(<PricingToggle plans={ORDERED_PLANS} />)
    expect(screen.getByText('Most popular')).toBeInTheDocument()
  })

  it('puts the "Most popular" badge on the middle tier (id "pro"), not the cheapest one', () => {
    // Regression guard: isHighlight used to check plan.id === 'standard'
    // (the old, pre-rename literal 'pro') would badge the *cheapest* paid
    // tier as most popular — the opposite of the intended upsell. Only
    // asserting the text exists (as the test above does) wouldn't catch
    // that regression; this pins which specific plan card it's on.
    render(<PricingToggle plans={ORDERED_PLANS} />)
    const proPlan = ORDERED_PLANS.find((p) => p.id === 'pro')!
    const badge = screen.getByText('Most popular')
    // The card is the badge's nearest ancestor that also contains the
    // plan's own name heading — walk up until we find it.
    const card = badge.closest('div[class*="rounded-"]')
    expect(card).not.toBeNull()
    expect(card).toHaveTextContent(proPlan.name)

    for (const plan of ORDERED_PLANS) {
      if (plan.id === 'pro') continue
      const otherCard = screen.getByText(plan.name).closest('div[class*="rounded-"]')
      expect(otherCard).not.toBeNull()
      expect(otherCard).not.toHaveTextContent('Most popular')
    }
  })
})

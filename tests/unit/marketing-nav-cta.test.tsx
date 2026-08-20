// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Nav, navState } from '@/components/marketing/chrome'

/**
 * The marketing header used to decide its call to action from authentication
 * alone. Access is scoped to a subscription, so those are different questions:
 * somebody who has signed in without choosing a plan is authenticated and still
 * cannot enter the product.
 *
 * The result was a loop. The header offered "Go to dashboard", the access gate
 * returned them to /pricing?resume=1, and the header offered the same door
 * again — with nothing on screen explaining why they kept arriving back.
 *
 * What matters below is the negative case: in the no-plan state there must be
 * no link to the dashboard at all.
 */

describe('navState', () => {
  it('maps the three real situations', () => {
    expect(navState(false, false)).toBe('anonymous')
    expect(navState(true, false)).toBe('no-plan')
    expect(navState(true, true)).toBe('active')
  })

  it('treats access without a session as anonymous rather than trusting it', () => {
    // Not reachable through resolveNavState, but the type allows it and the
    // safe reading is the one that does not hand out a dashboard link.
    expect(navState(false, true)).toBe('anonymous')
  })
})

describe('the header CTA matches what the visitor can actually do', () => {
  it('offers the dashboard only when the plan is active', () => {
    render(<Nav state="active" />)
    const cta = screen.getByRole('link', { name: /go to dashboard/i })
    expect(cta.getAttribute('href')).toMatch(/\/dashboard$/)
  })

  it('sends a signed-in visitor with no plan to pricing, never to the dashboard', () => {
    render(<Nav state="no-plan" />)

    expect(screen.queryByRole('link', { name: /go to dashboard/i })).toBeNull()
    for (const link of screen.getAllByRole('link')) {
      expect(
        link.getAttribute('href') ?? '',
        'a dashboard link here sends them straight back to /pricing',
      ).not.toMatch(/\/dashboard$/)
    }

    const cta = screen.getByRole('link', { name: /finish setting up/i })
    expect(cta.getAttribute('href')).toBe('/pricing')
  })

  it('offers sign-in to a signed-out visitor', () => {
    render(<Nav state="anonymous" />)
    const cta = screen.getByRole('link', { name: /sign in/i })
    expect(cta.getAttribute('href')).toBe('/login')
    expect(screen.queryByRole('link', { name: /go to dashboard/i })).toBeNull()
  })

  it('no longer advertises early access, which closed when signup opened', () => {
    for (const state of ['anonymous', 'no-plan', 'active'] as const) {
      const { unmount } = render(<Nav state={state} />)
      expect(screen.queryByText(/early access/i)).toBeNull()
      unmount()
    }
  })
})

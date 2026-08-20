// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import path from 'node:path'
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

    const cta = screen.getByRole('link', { name: /choose a plan/i })
    expect(cta.getAttribute('href')).toBe('/pricing#plans')
  })

  it('lands the no-plan CTA on the plan cards, not the top of /pricing', () => {
    // The gate already puts this visitor on /pricing, so a bare /pricing link
    // is a button that does nothing on the one page they are most likely to be
    // reading. The hash keeps it an action wherever it is clicked from.
    render(<Nav state="no-plan" />)
    const cta = screen.getByRole('link', { name: /choose a plan/i })
    expect(cta.getAttribute('href'), 'CTA must move the visitor somewhere').toMatch(/#plans$/)
  })

  it('names the action instead of describing a state', () => {
    // "Finish setting up" said there was setup in progress somewhere and gave
    // no clue that the next step is picking a plan.
    render(<Nav state="no-plan" />)
    expect(screen.queryByRole('link', { name: /finish setting up/i })).toBeNull()
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

describe('the header fits the narrowest phones', () => {
  it('drops the wordmark text below 394px, keeping the mark', () => {
    // Measured at 375px: mark + wordmark + CTA + menu button need ~348px of a
    // 333px content box, and the wordmark neither wraps nor truncates, so it
    // ran underneath the CTA. Every CTA label is affected, so the fix belongs
    // on the wordmark rather than on any one label.
    const { container } = render(<Nav state="no-plan" />)
    const wordmark = [...container.querySelectorAll('span')].find(
      (el) => el.textContent === 'answerLoops' && el.className.includes('font-semibold'),
    )
    expect(wordmark, 'the header wordmark span').toBeTruthy()
    expect(wordmark!.className).toContain('hidden')
    expect(wordmark!.className).toContain('min-[394px]:inline')
  })

  it('keeps the logo mark itself at every width', () => {
    const { container } = render(<Nav state="no-plan" />)
    expect(container.querySelector('svg')).toBeTruthy()
  })
})

describe('the plan cards the header CTA points at', () => {
  const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), 'utf-8')

  it('has an anchor for the header CTA to land on', () => {
    // Without the id the hash is inert and the CTA silently degrades back to
    // "reload /pricing".
    expect(read('app/pricing/page.tsx')).toContain('id="plans"')
  })

  it('clears the sticky header so the cards are not hidden under it', () => {
    const src = read('app/pricing/page.tsx')
    const section = src.slice(src.indexOf('id="plans"'), src.indexOf('id="plans"') + 200)
    expect(section).toMatch(/scroll-mt-/)
  })

  it('carries the billing period through sign-in, not just the plan', () => {
    // The pricing cards link to /login?plan=..&interval=.. . An already
    // signed-in visitor is redirected straight on to /start-trial, which
    // defaults to monthly when no interval arrives — so dropping it here bills
    // the monthly price to someone who clicked an annual card.
    const src = read('app/login/page.tsx')
    expect(src).toContain('parseBillingInterval')
    expect(src).toMatch(/interval=\$\{parsed\}/)
  })
})

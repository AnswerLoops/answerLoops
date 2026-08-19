import { describe, it, expect } from 'vitest'
import nextConfig from '@/next.config'

/**
 * The widget route is the one page in this app that must be iframable — by
 * public/widget.js here and on every customer site embedding the snippet. A
 * blanket frame-blocking header rule silently broke that once already: the
 * route returned 200, the HTML was correct, and the browser refused to render
 * it in a frame, so the bubble opened onto a blank panel.
 *
 * These assertions pin both halves of the fix. Getting either wrong is
 * invisible in tests that only check status codes.
 */

type HeaderRule = { source: string; headers: { key: string; value: string }[] }

async function headerRules(): Promise<HeaderRule[]> {
  const rules = await nextConfig.headers?.()
  expect(rules, 'next.config must define headers()').toBeDefined()
  return rules as HeaderRule[]
}

const FRAME_BLOCKING = ['x-frame-options', 'content-security-policy']

function keysOf(rule: HeaderRule): string[] {
  return rule.headers.map((h) => h.key.toLowerCase())
}

describe('next.config: widget route must stay embeddable', () => {
  it('has a rule scoped to the widget route', async () => {
    const rules = await headerRules()
    const widgetRule = rules.find((r) => r.source.startsWith('/widget/'))
    expect(widgetRule, 'no header rule targets /widget/').toBeDefined()
  })

  it('does not send frame-blocking headers on the widget route', async () => {
    const rules = await headerRules()
    const widgetRule = rules.find((r) => r.source.startsWith('/widget/'))!
    for (const blocked of FRAME_BLOCKING) {
      expect(
        keysOf(widgetRule),
        `${blocked} on /widget/ prevents the embed from rendering anywhere`
      ).not.toContain(blocked)
    }
  })

  it('still applies the non-frame security headers to the widget route', async () => {
    const rules = await headerRules()
    const widgetRule = rules.find((r) => r.source.startsWith('/widget/'))!
    // Opting out of frame blocking must not mean opting out of everything.
    expect(keysOf(widgetRule)).toContain('x-content-type-options')
    expect(keysOf(widgetRule)).toContain('referrer-policy')
    expect(keysOf(widgetRule)).toContain('strict-transport-security')
  })

  it('excludes the widget route from the catch-all rule rather than relying on rule order', async () => {
    const rules = await headerRules()
    const catchAll = rules.find((r) => r.headers.some((h) => h.key.toLowerCase() === 'x-frame-options'))
    expect(catchAll, 'no rule sends X-Frame-Options at all').toBeDefined()
    // A plain '/(.*)' would match /widget/ too. Next merges matching rules
    // rather than letting a later one unset an earlier header, so the
    // exclusion has to live in the pattern itself.
    expect(catchAll!.source).not.toBe('/(.*)')
    expect(catchAll!.source).toContain('widget')
  })

  it('keeps frame blocking for ordinary routes', async () => {
    const rules = await headerRules()
    const catchAll = rules.find((r) => r.headers.some((h) => h.key.toLowerCase() === 'x-frame-options'))!
    const values = Object.fromEntries(catchAll.headers.map((h) => [h.key.toLowerCase(), h.value]))
    expect(values['x-frame-options']).toBe('DENY')
    expect(values['content-security-policy']).toContain("frame-ancestors 'none'")
  })
})

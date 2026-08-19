import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

// The waitlist endpoint is public, unauthenticated, and sends an outbound
// confirmation email per call to an address the caller supplies. Anything
// with that shape needs the same controls as the widget lead endpoint, and
// needs them to stay in place: a per-IP rate limit via lib/ratelimit's
// rateLimitShared, a capped body read via readBodyCapped, and a
// length-bounded, shape-checked address.
//
// The sending domain's reputation is shared with every other transactional
// email the platform sends, so these are not local to this route.
//
// Source-file structural assertions — same convention as
// widget-abuse-hardening.test.ts.

const ROOT = process.cwd()

function read(relPath: string): string {
  const absPath = path.join(ROOT, relPath)
  expect(fs.existsSync(absPath), `File not found: ${relPath}`).toBe(true)
  return fs.readFileSync(absPath, 'utf-8')
}

describe('waitlist route carries the same abuse controls as widget lead', () => {
  it('uses the shared limiter and capped body reader instead of no controls', () => {
    const src = read('app/api/waitlist/route.ts')
    expect(src).toContain("import { rateLimitShared } from '@/lib/ratelimit'")
    expect(src).toContain("import { readBodyCapped } from '@/lib/http/read-body-capped'")
    expect(src).toContain("import { clientIp } from '@/lib/http/client-ip'")
  })

  it('rate-limits by IP before reading the body', () => {
    const src = read('app/api/waitlist/route.ts')
    const limitIdx = src.indexOf('rateLimitShared(`waitlist-ip:')
    const bodyIdx = src.indexOf('readBodyCapped(req')
    expect(limitIdx).toBeGreaterThan(-1)
    expect(bodyIdx).toBeGreaterThan(-1)
    expect(bodyIdx).toBeGreaterThan(limitIdx)
  })

  it('rejects with 429 when the limiter trips and 413 when the body is too large', () => {
    const src = read('app/api/waitlist/route.ts')
    expect(src).toContain('status: 429')
    expect(src).toContain('status: 413')
  })

  it('bounds the email address by length and shape instead of a bare @ check', () => {
    const src = read('app/api/waitlist/route.ts')
    expect(src).toContain('const MAX_EMAIL_CHARS = 254')
    const capIdx = src.indexOf('normalized.length > MAX_EMAIL_CHARS')
    const patternIdx = src.indexOf('EMAIL_PATTERN.test(normalized)')
    expect(capIdx).toBeGreaterThan(-1)
    expect(patternIdx).toBeGreaterThan(-1)
  })
})

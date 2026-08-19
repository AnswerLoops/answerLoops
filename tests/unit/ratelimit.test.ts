import { describe, it, expect, vi, afterEach } from 'vitest'
import { rateLimit } from '@/lib/ratelimit'

afterEach(() => {
  vi.useRealTimers()
})

// Use a unique key per test to avoid cross-test bucket state.
let keyCounter = 0
function uniqueKey() {
  return `test-${++keyCounter}`
}

describe('rateLimit', () => {
  it('allows first request', () => {
    const r = rateLimit(uniqueKey(), 5, 60_000)
    expect(r.ok).toBe(true)
    expect(r.retryAfterMs).toBe(0)
  })

  it('allows requests up to max', () => {
    const key = uniqueKey()
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(key, 5, 60_000).ok).toBe(true)
    }
  })

  it('denies request over max', () => {
    const key = uniqueKey()
    for (let i = 0; i < 3; i++) rateLimit(key, 3, 60_000)
    const r = rateLimit(key, 3, 60_000)
    expect(r.ok).toBe(false)
    expect(r.retryAfterMs).toBeGreaterThan(0)
  })

  it('retryAfterMs is ≤ windowMs', () => {
    const key = uniqueKey()
    const windowMs = 60_000
    for (let i = 0; i < 3; i++) rateLimit(key, 3, windowMs)
    const r = rateLimit(key, 3, windowMs)
    expect(r.retryAfterMs).toBeLessThanOrEqual(windowMs)
  })

  it('resets after window expires', () => {
    vi.useFakeTimers()
    const key = uniqueKey()
    for (let i = 0; i < 3; i++) rateLimit(key, 3, 1_000)

    // Bucket exhausted
    expect(rateLimit(key, 3, 1_000).ok).toBe(false)

    // Advance past window
    vi.advanceTimersByTime(1_001)
    expect(rateLimit(key, 3, 1_000).ok).toBe(true)
  })

  it('independent keys do not interfere', () => {
    const a = uniqueKey()
    const b = uniqueKey()
    for (let i = 0; i < 3; i++) rateLimit(a, 3, 60_000)
    expect(rateLimit(a, 3, 60_000).ok).toBe(false)
    expect(rateLimit(b, 3, 60_000).ok).toBe(true)
  })

  it('max=1 allows exactly one request', () => {
    const key = uniqueKey()
    expect(rateLimit(key, 1, 60_000).ok).toBe(true)
    expect(rateLimit(key, 1, 60_000).ok).toBe(false)
  })
})

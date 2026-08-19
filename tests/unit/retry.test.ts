import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { withRetry } from '@/lib/retry'

function transientError(msg = 'rate limit exceeded') {
  return new Error(msg)
}

function nonTransientError(msg = 'invalid request') {
  return new Error(msg)
}

describe('withRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns value on first success', async () => {
    const fn = vi.fn().mockResolvedValueOnce('ok')
    const result = await withRetry(fn, 'test', { baseDelayMs: 0 })
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('throws immediately on non-transient error', async () => {
    const err = nonTransientError('bad request')
    const fn = vi.fn().mockRejectedValue(err)
    await expect(withRetry(fn, 'test', { baseDelayMs: 0 })).rejects.toThrow('bad request')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries on transient error, succeeds on retry', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(transientError('429 rate limit'))
      .mockResolvedValueOnce('result')
    const result = await withRetry(fn, 'test', { attempts: 3, baseDelayMs: 0 })
    expect(result).toBe('result')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('exhausts all attempts on repeated transient errors → throws', async () => {
    const fn = vi.fn().mockRejectedValue(transientError('502 bad gateway'))
    await expect(withRetry(fn, 'test', { attempts: 3, baseDelayMs: 0 })).rejects.toThrow()
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('recognises 5xx status code as transient', async () => {
    const err = Object.assign(new Error('server error'), { statusCode: 503 })
    const fn = vi.fn()
      .mockRejectedValueOnce(err)
      .mockResolvedValueOnce('done')
    const result = await withRetry(fn, 'test', { baseDelayMs: 0 })
    expect(result).toBe('done')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('recognises 429 status code as transient', async () => {
    const err = Object.assign(new Error('too many requests'), { statusCode: 429 })
    const fn = vi.fn()
      .mockRejectedValueOnce(err)
      .mockResolvedValueOnce('done')
    const result = await withRetry(fn, 'test', { baseDelayMs: 0 })
    expect(result).toBe('done')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('recognises ECONNRESET as transient', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce('ok')
    const result = await withRetry(fn, 'test', { baseDelayMs: 0 })
    expect(result).toBe('ok')
  })

  it('recognises "overloaded" as transient', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('model is overloaded'))
      .mockResolvedValueOnce('ok')
    const result = await withRetry(fn, 'test', { baseDelayMs: 0 })
    expect(result).toBe('ok')
  })

  it('defaults to 3 attempts', async () => {
    const fn = vi.fn().mockRejectedValue(transientError('503'))
    await expect(withRetry(fn, 'test', { baseDelayMs: 0 })).rejects.toThrow()
    expect(fn).toHaveBeenCalledTimes(3)
  })
})

import { logger } from './logger'

interface RetryOptions {
  attempts?: number   // default 3
  baseDelayMs?: number // default 500
  module?: string
  ticketId?: number
}

function isTransient(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    // Rate limit, overloaded, gateway errors, network resets
    if (/429|rate.?limit|too many request/.test(msg)) return true
    if (/5[0-9]{2}|overloaded|server error|bad gateway|service unavail/.test(msg)) return true
    if (/econnreset|econnrefused|etimedout|fetch failed|network/.test(msg)) return true
  }
  // AI SDK wraps status in a statusCode property
  const code = (err as { statusCode?: number })?.statusCode
  if (code && (code === 429 || (code >= 500 && code < 600))) return true
  return false
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  opts: RetryOptions = {}
): Promise<T> {
  const { attempts = 3, baseDelayMs = 500, module: mod, ticketId } = opts

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      const transient = isTransient(err)
      const last = attempt === attempts

      if (!transient || last) {
        logger.error(`${label} failed${transient ? ' (max retries)' : ' (non-transient)'}`, {
          module: mod,
          ticketId,
          attempt,
          error: err,
        })
        throw err
      }

      const delay = baseDelayMs * 2 ** (attempt - 1)
      logger.warn(`${label} transient error — retrying`, {
        module: mod,
        ticketId,
        attempt,
        nextDelayMs: delay,
        error: err,
      })
      await new Promise((r) => setTimeout(r, delay))
    }
  }

  // unreachable
  throw new Error('withRetry: exhausted')
}

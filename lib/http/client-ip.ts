/**
 * Resolves the client IP for rate-limiting purposes without trusting
 * caller-supplied header values.
 *
 * `x-forwarded-for` is a *list* that each hop appends to, so its leftmost
 * entry is whatever the original client claimed — an unauthenticated caller
 * can put an arbitrary value there and mint a fresh rate-limit bucket per
 * request, which defeats every per-IP limiter keyed on it (Issues Backlog
 * item 8). Only the entries appended by infrastructure we control are
 * trustworthy, and those are the *rightmost* ones.
 *
 * `TRUST_PROXY_HOPS` is how many proxies sit between the public internet and
 * this process, each of which appends one entry. Default 1, matching the
 * single-edge deployment (Railway, or Cloudflare in front of it). Set it to
 * the real hop count if you add another layer — too high and you read a
 * spoofed entry, too low and every request behind the edge shares one bucket.
 */
const DEFAULT_TRUST_PROXY_HOPS = 1

export function trustedProxyHops(): number {
  const raw = Number(process.env.TRUST_PROXY_HOPS ?? DEFAULT_TRUST_PROXY_HOPS)
  if (!Number.isFinite(raw) || raw < 1) return DEFAULT_TRUST_PROXY_HOPS
  return Math.floor(raw)
}

/** Takes anything with headers — NextRequest and plain Request both qualify. */
export function clientIp(req: { headers: Headers }): string {
  // Cloudflare overwrites (never appends to) this header, so it can't be
  // spoofed from outside the edge — prefer it when present.
  const cf = req.headers.get('cf-connecting-ip')?.trim()
  if (cf) return cf

  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const hops = xff
      .split(',')
      .map((h) => h.trim())
      .filter(Boolean)
    if (hops.length) {
      // Count in from the right: with one trusted proxy, the last entry is the
      // one that proxy appended and is the real peer address. Anything the
      // client injected sits to the left of it and is ignored. Clamp so a
      // shorter-than-expected chain reads the leftmost entry rather than
      // undefined.
      const index = Math.max(0, hops.length - trustedProxyHops())
      return hops[index]
    }
  }

  // x-real-ip is set by the proxy in single-hop setups and is not a list, so
  // there is no attacker-controlled prefix to strip.
  return req.headers.get('x-real-ip')?.trim() || 'unknown'
}

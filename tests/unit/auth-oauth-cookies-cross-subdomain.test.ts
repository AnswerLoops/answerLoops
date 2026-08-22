import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

/**
 * The cross-subdomain login path only shared the session cookie, not the
 * three Auth.js sets during the OAuth handshake itself: pkceCodeVerifier,
 * state, nonce. All three are host-only by Auth.js's own default, which
 * never mattered on a single-domain deployment — every step of one sign-in
 * attempt necessarily happened on the same host.
 *
 * It started mattering the moment sign-in was forced to begin on
 * app.answerloops.com (auth.ts's platform-host redirect). Confirmed in
 * production logs, not assumed: InvalidCheck: pkceCodeVerifier value could
 * not be parsed, for every account — new and returning alike, which is what
 * marks this as a cookie-host mismatch rather than an account-level problem.
 * The verifier was set on one host and Auth.js went looking for it on
 * another.
 */

describe('auth.ts — the OAuth handshake cookies share the apex domain too', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'auth.ts'), 'utf-8')
  const cookiesBlock = src.slice(src.indexOf('cookies: {'), src.indexOf('callbacks: {'))

  it.each(['pkceCodeVerifier', 'state', 'nonce'] as const)(
    '%s is configured, not left on Auth.js\'s host-only default',
    (cookieKey) => {
      expect(cookiesBlock, `${cookieKey} must have a custom cookie entry`).toContain(`${cookieKey}: {`)
    },
  )

  it.each(['pkceCodeVerifier', 'state', 'nonce'] as const)(
    '%s carries the domain option, or sharing it across the apex does nothing',
    (cookieKey) => {
      const start = cookiesBlock.indexOf(`${cookieKey}: {`)
      const entry = cookiesBlock.slice(start, start + 400)
      expect(entry, `${cookieKey}'s options must set domain: cookieDomain`).toContain('domain: cookieDomain')
    },
  )

  it.each(['pkceCodeVerifier', 'state', 'nonce'] as const)(
    '%s does not reuse Auth.js\'s default name',
    (cookieKey) => {
      // Same reasoning as the sessionToken guardrail this one sits beside:
      // this cookie's Domain is broader than what a browser held under the
      // default name pre-fix, so reusing that name risks ambiguous
      // resolution for anyone who hit the broken version before this shipped.
      const start = cookiesBlock.indexOf(`${cookieKey}: {`)
      const entry = cookiesBlock.slice(start, start + 200)
      const match = entry.match(/name: useSecureCookies \? '([^']+)' : '([^']+)'/)
      expect(match, `could not find ${cookieKey}'s name config`).not.toBeNull()
      const [, secureName, plainName] = match!
      expect(secureName.startsWith('__Host-'), `${cookieKey} must not use __Host-, which forbids Domain`).toBe(false)
      expect(plainName).not.toMatch(/^authjs\.(pkce\.code_verifier|state|nonce)$/)
    },
  )

  it('pkceCodeVerifier and state keep Auth.js\'s 15-minute expiry — a session cookie sitting around forever waiting to be reused is worse than the default', () => {
    for (const cookieKey of ['pkceCodeVerifier', 'state']) {
      const start = cookiesBlock.indexOf(`${cookieKey}: {`)
      const entry = cookiesBlock.slice(start, start + 400)
      expect(entry, `${cookieKey} must set maxAge: 60 * 15`).toContain('maxAge: 60 * 15')
    }
  })

  it('none of the three new cookies use __Host-, which forbids the Domain attribute Auth.js needs to reject the write entirely', () => {
    for (const cookieKey of ['pkceCodeVerifier', 'state', 'nonce']) {
      const start = cookiesBlock.indexOf(`${cookieKey}: {`)
      const entry = cookiesBlock.slice(start, start + 200)
      expect(entry).not.toContain("'__Host-")
    }
  })
})

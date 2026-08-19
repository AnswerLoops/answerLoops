import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

// Guardrail for a fixed session-identity bug in the cross-subdomain login
// path (AUTH_COOKIE_DOMAIN). Full detail tracked internally — see the
// internal security page. Renaming the shared-domain cookie away from
// Auth.js's default name is the fix; this test keeps it from silently
// regressing back to the default.

describe('auth.ts — shared session cookie never reuses Auth.js\'s default name', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'auth.ts'), 'utf-8')

  it('the shared-domain cookie name is not the Auth.js default authjs.session-token', () => {
    const match = src.match(/name: useSecureCookies \? '([^']+)' : '([^']+)'/)
    expect(match, 'could not find the sessionToken cookie name config in auth.ts').not.toBeNull()
    const [, secureName, plainName] = match!
    expect(plainName).not.toBe('authjs.session-token')
    expect(secureName).not.toBe('__Secure-authjs.session-token')
  })

  it('the shared-domain cookie still carries the domain option so cross-subdomain sharing keeps working', () => {
    expect(src).toContain('domain: cookieDomain')
  })
})

import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

// Guardrail for a real production bug: every route that authenticates a
// caller by its own means (webhook signature, Bearer API key, shared secret)
// rather than a session cookie must be listed in auth.ts's PUBLIC_PATHS, or
// the session-auth middleware 401s every request before the route's own
// handler — and unlike a normal 401, it fails silently for a webhook, since
// nothing surfaces the rejection to a human. /api/email/ingest shipped
// without ever being added to this list, so the inbound email channel has
// never actually been reachable in production.

describe('auth.ts PUBLIC_PATHS covers every self-authenticating API route', () => {
  const authSrc = fs.readFileSync(path.join(process.cwd(), 'auth.ts'), 'utf-8')
  const match = authSrc.match(/const PUBLIC_PATHS = \[([\s\S]*?)\]/)
  if (!match) throw new Error('Could not find PUBLIC_PATHS in auth.ts')
  const publicPaths = match[1].split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean)

  const selfAuthenticatingRoutes = [
    '/api/email/ingest', // Svix signature / legacy shared-secret header
    '/api/github/webhook', // GitHub HMAC signature
    '/api/widget/chat', // widget token in body
    '/api/billing/webhook', // Stripe signature
    '/api/slack/events', // Slack signing secret
    '/api/google-chat/events', // Google-signed OIDC bearer token
  ]

  it.each(selfAuthenticatingRoutes)('%s is listed in (or covered by a prefix in) PUBLIC_PATHS', (route) => {
    const covered = publicPaths.some((p) => route === p || route.startsWith(`${p}/`))
    expect(covered, `${route} is not covered by any PUBLIC_PATHS entry — the session-auth middleware will 401 it`).toBe(true)
  })

  // Same root cause, different symptom: unauthenticated *page* routes (no
  // session cookie at all, since visitors aren't logged in) 307-redirect to
  // /login instead of 401ing. /vs/* shipped with this bug before being added
  // here; /pricing repeated it.
  const publicPageRoutes = [
    '/vs', // comparison pages
    '/pricing', // pricing page
  ]

  it.each(publicPageRoutes)('%s is listed in (or covered by a prefix in) PUBLIC_PATHS', (route) => {
    const covered = publicPaths.some((p) => route === p || route.startsWith(`${p}/`))
    expect(covered, `${route} is not covered by any PUBLIC_PATHS entry — unauthenticated visitors get 307'd to /login before the page ever renders`).toBe(true)
  })
})

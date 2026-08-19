import { NextRequest, NextResponse } from 'next/server'
import { resolveApiKey } from '@/lib/db/queries/api-keys'
import { isValidApiKeyFormat } from '@/lib/mcp/keys'
import { rateLimitShared } from '@/lib/ratelimit'
import { readBodyCapped } from '@/lib/http/read-body-capped'
import { clientIp } from '@/lib/http/client-ip'
import { verifyOriginProxy } from '@/lib/http/origin-guard'
import { orgRateLimitPerMinute } from '@/lib/billing/entitlements-server'

/**
 * Auth + rate-limit gate shared by every /api/agent/* REST route. Mirrors
 * app/api/mcp/route.ts's posture exactly (same api_keys table, same Bearer
 * format, same generic "invalid or revoked" message so neither surface leaks
 * key validity as an oracle) but returns plain REST JSON errors instead of a
 * JSON-RPC envelope, since this surface has no JSON-RPC method to route
 * through.
 *
 * Rate-limit buckets are namespaced "agent:"/"agent-ip:" — deliberately
 * separate from MCP's "mcp:"/"mcp-ip:" buckets, so a client hammering the
 * REST surface can't starve its own MCP quota (or vice versa) even though
 * both surfaces share the same org and the same underlying pipeline cost.
 *
 * Both buckets use the Postgres-backed `rateLimitShared`, matching MCP. They
 * previously used the in-process limiter, which meant a key throttled at
 * 60/min on /api/mcp got an independent, per-instance, restart-resettable
 * bucket just by calling /api/agent/* instead — the same key, the same
 * lib/agent/core.ts work, one door with a real ceiling and one without.
 */

// Same cost-abuse posture as the MCP route: this endpoint runs LLM calls
// (generate_answer) and DB reads on behalf of an external caller. The
// ceiling itself is plan-scaled — see orgRateLimitPerMinute — Enterprise
// gets a real, enforced higher limit rather than a marketing-only claim.
const RATE_LIMIT_WINDOW_MS = 60_000

// Per-IP limit, checked before any key is resolved — generous ceiling, exists
// to stop scanner traffic, not to throttle real clients sharing a NAT gateway.
const IP_RATE_LIMIT_MAX = 300
const IP_RATE_LIMIT_WINDOW_MS = 60_000

// Largest legitimate payload is create_ticket's 4000-char content plus JSON
// envelope — 64KB is generous headroom.
export const MAX_BODY_BYTES = 64 * 1024

export interface AgentErrorBody {
  error: { message: string }
}

export function agentError(status: number, message: string): NextResponse<AgentErrorBody> {
  return NextResponse.json({ error: { message } }, { status })
}

/**
 * 429 with a `Retry-After` header. The limiter already computes how long the
 * window has left; without surfacing it, a client has nothing to back off
 * against and its only option is to keep hammering until something succeeds.
 * Header is in whole seconds per RFC 9110, minimum 1.
 */
function rateLimitedResponse(retryAfterMs: number): NextResponse<AgentErrorBody> {
  const seconds = Math.max(1, Math.ceil(retryAfterMs / 1000))
  return NextResponse.json(
    { error: { message: 'Rate limit exceeded' } },
    { status: 429, headers: { 'Retry-After': String(seconds) } }
  )
}

export type AgentAuthResult =
  | { orgId: number; keyId: number }
  | { response: NextResponse<AgentErrorBody> }

/**
 * Runs the per-IP rate limit, resolves the Bearer key, and runs the per-org
 * rate limit. Callers should check for `.response` first and return it
 * immediately if present; otherwise `.orgId` is ready to use.
 */
export async function authenticateAgentRequest(req: NextRequest): Promise<AgentAuthResult> {
  // Rejects requests that bypassed our edge proxy before trusting clientIp()'s
  // proxy-supplied client-IP read below — see lib/http/origin-guard.ts. No-op
  // until ORIGIN_VERIFY_SECRET is set.
  const originRejection = verifyOriginProxy(req)
  if (originRejection) return { response: NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 }) }

  const ip = clientIp(req)
  const ipLimit = await rateLimitShared(`agent-ip:${ip}`, IP_RATE_LIMIT_MAX, IP_RATE_LIMIT_WINDOW_MS)
  if (!ipLimit.ok) {
    return { response: rateLimitedResponse(ipLimit.retryAfterMs) }
  }

  const authHeader = req.headers.get('authorization') ?? ''
  const bearerKey = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  if (!bearerKey) {
    return { response: agentError(401, 'Missing Authorization: Bearer <key> header') }
  }

  // Cheap format check before hashing + hitting the DB — a malformed key can
  // never match, so junk/scanner traffic is rejected without a query. Same
  // response as an unknown key, so this leaks nothing about key validity.
  if (!isValidApiKeyFormat(bearerKey)) {
    return { response: agentError(401, 'Invalid or revoked API key') }
  }

  const resolved = await resolveApiKey(bearerKey)
  if (!resolved) {
    return { response: agentError(401, 'Invalid or revoked API key') }
  }
  const { orgId, keyId } = resolved

  const orgRateLimitMax = await orgRateLimitPerMinute(orgId)
  const orgLimit = await rateLimitShared(`agent:${orgId}`, orgRateLimitMax, RATE_LIMIT_WINDOW_MS)
  if (!orgLimit.ok) {
    return { response: rateLimitedResponse(orgLimit.retryAfterMs) }
  }

  return { orgId, keyId }
}

export type AgentBodyResult =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; response: NextResponse<AgentErrorBody> }

/**
 * Reads and JSON-parses a POST body under the shared byte cap, returning a
 * ready-to-return error response on either failure so route handlers don't
 * each re-implement the same two checks.
 *
 * Discriminated on a literal `ok` field rather than `'response' in result` —
 * a plain `Record<string, unknown> | { response: ... }` union doesn't narrow
 * cleanly, because the Record branch's index signature makes `'response' in
 * result` true-typed as `unknown` in both branches instead of eliminating
 * the error-shape branch, which silently widens every call site's return
 * type to `Promise<unknown>` and fails the Next.js route-handler type check.
 */
export async function readAgentJsonBody(req: NextRequest): Promise<AgentBodyResult> {
  const contentLength = Number(req.headers.get('content-length') ?? 0)
  if (contentLength > MAX_BODY_BYTES) {
    return { ok: false, response: agentError(413, 'Request body too large') }
  }

  const raw = await readBodyCapped(req, MAX_BODY_BYTES)
  if (raw === null) {
    return { ok: false, response: agentError(413, 'Request body too large') }
  }
  if (!raw) return { ok: true, body: {} }

  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { ok: false, response: agentError(400, 'Request body must be a JSON object') }
    }
    return { ok: true, body: parsed as Record<string, unknown> }
  } catch {
    return { ok: false, response: agentError(400, 'Invalid JSON') }
  }
}

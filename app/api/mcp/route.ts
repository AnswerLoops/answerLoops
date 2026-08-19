import { NextRequest } from 'next/server'
import { resolveApiKey } from '@/lib/db/queries/api-keys'
import { isValidApiKeyFormat } from '@/lib/mcp/keys'
import { MCP_TOOLS, callMcpTool } from '@/lib/mcp/tools'
import { rpcError, rpcResult, normalizeRpcId, JsonRpcErrorCode, type JsonRpcRequest } from '@/lib/mcp/protocol'
import { rateLimitShared } from '@/lib/ratelimit'
import { readBodyCapped } from '@/lib/http/read-body-capped'
import { clientIp } from '@/lib/http/client-ip'
import { verifyOriginProxy } from '@/lib/http/origin-guard'
import { logger } from '@/lib/logger'
import { orgRateLimitPerMinute } from '@/lib/billing/entitlements-server'

const MOD = 'api/mcp'
const SERVER_INFO = { name: 'answerloops', version: '1.0.0' }
const PROTOCOL_VERSION = '2024-11-05'

// Protocol revisions this server can actually serve. A client that pins a
// revision we don't implement gets told so explicitly, rather than having its
// header silently ignored and then hitting shape mismatches mid-session.
const SUPPORTED_PROTOCOL_VERSIONS = new Set([PROTOCOL_VERSION])

/**
 * 429 carrying `Retry-After` (whole seconds, RFC 9110) and a rate-limit-
 * specific JSON-RPC code. The limiter already knows how long the window has
 * left; without surfacing it the client can only guess and keep retrying.
 */
function rateLimited(id: string | number | null, retryAfterMs: number): Response {
  const seconds = Math.max(1, Math.ceil(retryAfterMs / 1000))
  return Response.json(rpcError(id, JsonRpcErrorCode.RATE_LIMITED, 'Rate limit exceeded'), {
    status: 429,
    headers: { 'Retry-After': String(seconds) },
  })
}

// Per-key rate limit — this endpoint runs LLM calls (generate_answer) and DB
// reads on behalf of an external caller with no human in the loop; same
// cost-abuse posture as the public widget chat endpoint. The ceiling itself
// is plan-scaled — see orgRateLimitPerMinute — Enterprise gets a real,
// enforced higher limit rather than a marketing-only claim.
const RATE_LIMIT_WINDOW_MS = 60_000

// Per-IP limit, checked before any key is resolved. The per-org limit above
// only kicks in once a key resolves — unauthenticated/malformed-key traffic
// was otherwise unthrottled, paying only for a body-size check and (for a
// well-formed-but-wrong key) a hash + one indexed lookup. Generous ceiling:
// one IP can legitimately front many orgs' MCP clients behind NAT/a shared
// gateway, so this exists to stop a single scanner from hammering the route,
// not to rate-limit real traffic.
const IP_RATE_LIMIT_MAX = 300
const IP_RATE_LIMIT_WINDOW_MS = 60_000

// Largest legitimate payload is create_ticket's 4000-char content plus JSON
// envelope — 64KB is generous headroom. Enforced while the body streams in,
// because this path runs before auth: without it, an unauthenticated client
// can make the server buffer arbitrarily large bodies (same posture as the
// email ingest route's MAX_BODY_BYTES).
const MAX_BODY_BYTES = 64 * 1024

export async function POST(req: NextRequest) {
  // Rejects any request that didn't pass through our edge proxy, before
  // anything else runs — otherwise the proxy-supplied client-IP header
  // (trusted unconditionally below) is spoofable by hitting the origin
  // directly. No-op until ORIGIN_VERIFY_SECRET is set. See lib/http/origin-guard.ts.
  const originRejection = verifyOriginProxy(req)
  if (originRejection) return originRejection

  // Resolved through the trusted-proxy chain, not from the raw header — see
  // lib/http/client-ip.ts. Keying on a caller-controlled value let an
  // unauthenticated client mint a fresh bucket per request (and, since the
  // limiter became Postgres-backed, a durable row per request too).
  const clientVersion = req.headers.get('mcp-protocol-version')
  if (clientVersion && !SUPPORTED_PROTOCOL_VERSIONS.has(clientVersion)) {
    return Response.json(
      rpcError(
        null,
        JsonRpcErrorCode.INVALID_REQUEST,
        `Unsupported MCP-Protocol-Version: ${clientVersion}. This server speaks ${PROTOCOL_VERSION}.`
      ),
      { status: 400 }
    )
  }

  const ip = clientIp(req)
  const ipLimit = await rateLimitShared(`mcp-ip:${ip}`, IP_RATE_LIMIT_MAX, IP_RATE_LIMIT_WINDOW_MS)
  if (!ipLimit.ok) {
    return rateLimited(null, ipLimit.retryAfterMs)
  }

  const contentLength = Number(req.headers.get('content-length') ?? 0)
  if (contentLength > MAX_BODY_BYTES) {
    return Response.json(rpcError(null, JsonRpcErrorCode.INVALID_REQUEST, 'Request body too large'), { status: 413 })
  }

  const authHeader = req.headers.get('authorization') ?? ''
  const bearerKey = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null

  // content-length can lie (or be absent on chunked transfer) — enforce the
  // cap on actual bytes as the body streams in.
  const raw = await readBodyCapped(req, MAX_BODY_BYTES)
  if (raw === null) {
    return Response.json(rpcError(null, JsonRpcErrorCode.INVALID_REQUEST, 'Request body too large'), { status: 413 })
  }

  let body: JsonRpcRequest
  try {
    body = JSON.parse(raw) as JsonRpcRequest
  } catch {
    return Response.json(rpcError(null, JsonRpcErrorCode.PARSE_ERROR, 'Invalid JSON'), { status: 400 })
  }

  // Valid JSON isn't necessarily a JSON-RPC envelope: "null" parses to null
  // (which would throw on the .id access below), and arrays/primitives aren't
  // requests we support either.
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return Response.json(rpcError(null, JsonRpcErrorCode.INVALID_REQUEST, 'Invalid JSON-RPC 2.0 request'), { status: 400 })
  }

  // JSON-RPC 2.0 allows only string/number/null here. Echoing back whatever
  // the caller sent would let it reflect an arbitrary object through the
  // response envelope.
  const id = normalizeRpcId(body.id)

  if (!body.jsonrpc || body.jsonrpc !== '2.0' || !body.method) {
    return Response.json(rpcError(id, JsonRpcErrorCode.INVALID_REQUEST, 'Invalid JSON-RPC 2.0 request'), { status: 400 })
  }

  // `initialize` is the only method allowed without auth — mirrors how MCP
  // clients probe a server's capabilities before a user has pasted a key in.
  if (body.method === 'initialize') {
    return Response.json(
      rpcResult(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      })
    )
  }

  if (body.method === 'notifications/initialized') {
    // Client notification, no response body expected.
    return new Response(null, { status: 202 })
  }

  if (!bearerKey) {
    return Response.json(rpcError(id, JsonRpcErrorCode.UNAUTHORIZED, 'Missing Authorization: Bearer <key> header'), { status: 401 })
  }

  // Cheap format check before hashing + hitting the DB — a malformed key can
  // never match, so junk/scanner traffic is rejected without a query. Same
  // response as an unknown key, so this leaks nothing about key validity.
  if (!isValidApiKeyFormat(bearerKey)) {
    return Response.json(rpcError(id, JsonRpcErrorCode.UNAUTHORIZED, 'Invalid or revoked API key'), { status: 401 })
  }

  const resolved = await resolveApiKey(bearerKey)
  if (!resolved) {
    return Response.json(rpcError(id, JsonRpcErrorCode.UNAUTHORIZED, 'Invalid or revoked API key'), { status: 401 })
  }
  const { orgId, keyId } = resolved

  const orgRateLimitMax = await orgRateLimitPerMinute(orgId)
  const limit = await rateLimitShared(`mcp:${orgId}`, orgRateLimitMax, RATE_LIMIT_WINDOW_MS)
  if (!limit.ok) {
    return rateLimited(id, limit.retryAfterMs)
  }

  if (body.method === 'tools/list') {
    return Response.json(rpcResult(id, { tools: MCP_TOOLS }))
  }

  if (body.method === 'tools/call') {
    const params = body.params ?? {}
    const toolName = typeof params.name === 'string' ? params.name : ''
    const toolArgs = (params.arguments ?? {}) as Record<string, unknown>

    if (!MCP_TOOLS.some((t) => t.name === toolName)) {
      return Response.json(rpcError(id, JsonRpcErrorCode.METHOD_NOT_FOUND, `Unknown tool: ${toolName}`), { status: 400 })
    }

    // keyId is logged alongside orgId so traffic can be attributed to a
    // specific credential. An org can hold up to 25 active keys across
    // different clients; without this, a suspected leak means revoking blind.
    logger.info('MCP tool call', { module: MOD, orgId, keyId, tool: toolName })
    const result = await callMcpTool(toolName, toolArgs, orgId, keyId)
    return Response.json(rpcResult(id, result))
  }

  return Response.json(rpcError(id, JsonRpcErrorCode.METHOD_NOT_FOUND, `Unknown method: ${body.method}`), { status: 400 })
}

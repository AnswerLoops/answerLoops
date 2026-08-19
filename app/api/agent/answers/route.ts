import { NextRequest, NextResponse } from 'next/server'
import { generateAnswerCore } from '@/lib/agent/core'
import { authenticateAgentRequest, readAgentJsonBody, agentError } from '@/lib/agent/http'

/**
 * POST /api/agent/answers
 * REST counterpart to the MCP generate_answer tool. Gated by the org's
 * monthly deflection limit before any LLM call runs.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateAgentRequest(req)
  if ('response' in auth) return auth.response

  const bodyResult = await readAgentJsonBody(req)
  if (!bodyResult.ok) return bodyResult.response

  const result = await generateAnswerCore(auth.orgId, bodyResult.body, auth.keyId)
  // The quota-reached cases (billed deflections, and total call attempts) are
  // quota errors, not validation errors — 429 (Too Many Requests) fits the
  // "come back later or upgrade" semantics better than a flat 400, and lets a
  // client's retry logic treat them the way it already treats rate limiting.
  if (!result.ok) {
    const quotaError =
      result.error.startsWith('Monthly deflection limit reached') ||
      result.error.startsWith('Monthly generate_answer call limit reached')
    const status = quotaError ? 429 : 400
    return agentError(status, result.error)
  }
  return NextResponse.json(result.data)
}

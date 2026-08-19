import { randomUUID } from 'crypto'
import path from 'path'
import type { APIRequestContext, Page, Route } from '@playwright/test'

export const FIXTURES_DIR = path.join(__dirname, 'fixtures')

export const BOT_SECRET = 'test-bot-secret'
export const BOT_AUTH = { Authorization: `Bearer ${BOT_SECRET}` }

export interface IngestOpts {
  content: string
  messageId?: string
  authorName?: string
  authorId?: string
  channelId?: string
  threadId?: string
}

/** POST /api/ingest as the bot would, returning the created ticket id. */
export async function ingest(request: APIRequestContext, opts: IngestOpts): Promise<number> {
  const messageId = opts.messageId ?? `msg-${randomUUID()}`
  const res = await request.post('/api/ingest', {
    headers: BOT_AUTH,
    data: {
      message_id: messageId,
      content: opts.content,
      author_id: opts.authorId ?? 'author-1',
      author_name: opts.authorName ?? 'tester',
      channel_id: opts.channelId ?? 'channel-1',
      ...(opts.threadId ? { thread_id: opts.threadId } : {}),
    },
  })
  if (!res.ok()) throw new Error(`ingest failed: ${res.status()} ${await res.text()}`)
  return ((await res.json()) as { ticket_id: number }).ticket_id
}

/**
 * The Discord message id the mock posts an AI answer under. Mirrors the mock in
 * lib/discord/send.ts (keyed on the channel), so a test that ingests with a
 * known channel knows the answer's message id without reading the database.
 */
export function answerMessageId(channelId: string): string {
  return `mock-msg-${channelId}`
}

/** Poll until `predicate` returns truthy or the timeout elapses. */
export async function waitFor<T>(
  fn: () => T | Promise<T>,
  { timeout = 15_000, interval = 150 }: { timeout?: number; interval?: number } = {}
): Promise<T> {
  const deadline = Date.now() + timeout
  for (;;) {
    const v = await fn()
    if (v) return v
    if (Date.now() > deadline) throw new Error('waitFor: timed out')
    await new Promise((r) => setTimeout(r, interval))
  }
}

interface TicketResponse {
  ticket: Record<string, unknown>
  assessment: Record<string, unknown> | null
}

async function fetchTicket(request: APIRequestContext, ticketId: number): Promise<TicketResponse | null> {
  const res = await request.get(`/api/tickets/${ticketId}`)
  if (!res.ok()) return null
  return (await res.json()) as TicketResponse
}

/** GET a ticket via the API (reads through the server's own db connection). */
export async function getTicket(
  request: APIRequestContext,
  ticketId: number
): Promise<Record<string, unknown> | null> {
  return (await fetchTicket(request, ticketId))?.ticket ?? null
}

/**
 * Block until the ingest pipeline's background work finishes. Polls through the
 * API (the server reads its own db connection); the app runs in a separate
 * process so we never read the SQLite file directly from the test runner.
 *
 * Waits for the assessment, which the agent saves at the end of the pipeline —
 * a later signal than ai_draft_status flipping off 'pending', so the ticket
 * detail page is guaranteed to have its confidence panel by the time we look.
 */
export async function waitForPipeline(
  request: APIRequestContext,
  ticketId: number
): Promise<Record<string, unknown>> {
  return waitFor(async () => (await fetchTicket(request, ticketId))?.assessment ?? false) as Promise<
    Record<string, unknown>
  >
}

/** Poll a ticket field through the API until it matches. */
export async function waitForTicketField(
  request: APIRequestContext,
  ticketId: number,
  field: string,
  value: unknown
): Promise<void> {
  await waitFor(async () => {
    const t = await getTicket(request, ticketId)
    return t != null && t[field] === value
  })
}

// ---------------------------------------------------------------------------
// Discord API mock helpers
// ---------------------------------------------------------------------------

export const MOCK_GUILD = { id: 'guild-1', name: 'Test Server' }
export const MOCK_CHANNELS = [
  { id: 'ch-general', name: 'general', type: 0 },
  { id: 'ch-support', name: 'support', type: 0 },
]

/**
 * Intercepts outbound Discord API calls made server-side from /api/discord/guilds.
 * Must be called before the page/request action that triggers the route.
 */
export async function mockDiscordApi(page: Page): Promise<void> {
  await page.route('https://discord.com/api/v10/users/@me/guilds', (route: Route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([MOCK_GUILD]) })
  )
  await page.route(`https://discord.com/api/v10/guilds/${MOCK_GUILD.id}/channels`, (route: Route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_CHANNELS) })
  )
}

// ---------------------------------------------------------------------------
// KB source helpers
// ---------------------------------------------------------------------------

export interface KBSourceResponse {
  id: number
  filename: string
  file_type: string
  size_bytes: number
  chunk_count: number
}

export async function listKBSources(request: APIRequestContext): Promise<KBSourceResponse[]> {
  const res = await request.get('/api/kb/sources')
  if (!res.ok()) throw new Error(`listKBSources failed: ${res.status()}`)
  return (await res.json()) as KBSourceResponse[]
}

export async function uploadFile(
  request: APIRequestContext,
  filename: string,
  mimeType: string,
  buffer: Buffer
): Promise<{ created: number; sourceId: number; filename: string }> {
  const res = await request.post('/api/kb/upload', {
    multipart: { file: { name: filename, mimeType, buffer } },
  })
  if (!res.ok()) throw new Error(`uploadFile failed: ${res.status()} ${await res.text()}`)
  return (await res.json()) as { created: number; sourceId: number; filename: string }
}

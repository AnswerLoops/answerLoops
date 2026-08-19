import { Memory } from '@mastra/memory'
import { PostgresStore } from '@mastra/pg'

// Global singleton, same pattern as lib/db/drizzle.ts — Next.js HMR would
// otherwise create a fresh PostgresStore (and its own connection pool) on
// every module reload in dev.
const globalForMastraMemory = globalThis as unknown as {
  __mastraWidgetMemory?: Memory
}

/**
 * Widget chat memory — Postgres-backed thread history keyed by
 * (org, visitor) so a returning visitor's conversation survives page
 * reloads. Manages its own tables (mastra_threads, mastra_messages, ...),
 * separate from the Drizzle-managed schema.
 */
export function getWidgetChatMemory(): Memory {
  if (!globalForMastraMemory.__mastraWidgetMemory) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL is not set')
    globalForMastraMemory.__mastraWidgetMemory = new Memory({
      storage: new PostgresStore({
        id: 'answerloops-widget-chat-memory',
        connectionString: url,
      }),
      options: {
        lastMessages: 20,
      },
    })
  }
  return globalForMastraMemory.__mastraWidgetMemory
}

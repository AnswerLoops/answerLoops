import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Production incident: DB config, channel IDs, guild ID, and enabled flag
// all confirmed correct, bot freshly deployed with LISTEN active, and it
// still received zero Discord gateway events for a test message — not even
// the debug logging added for the channel-mismatch case (see
// silent-channel-mismatch-logging.test.ts). bot/index.ts never logged
// anything from the discord.js Client about its own connection health
// (error, shard error, shard disconnect/reconnect/resume, warn), so a
// zombie WebSocket connection — the same class of bug as the Postgres
// LISTEN staleness fixed earlier — would be completely invisible even
// though discord.js normally auto-reconnects. This suite verifies those
// listeners are wired up and log with enough context to diagnose it.

const ROOT = process.cwd()

function read(relPath: string): string {
  const abs = path.join(ROOT, relPath)
  expect(fs.existsSync(abs), `File not found: ${relPath}`).toBe(true)
  return fs.readFileSync(abs, 'utf-8')
}

const src = read('bot/index.ts')

// All six listeners must be registered after `client` is constructed and
// before the ClientReady handler, matching where they were added.
const clientConstructIdx = src.indexOf('const client = new Client(')
const clientReadyIdx = src.indexOf('client.once(Events.ClientReady')

describe('bot/index.ts — Discord client connection health logging', () => {
  it('client is constructed before the health listeners, which are registered before ClientReady', () => {
    expect(clientConstructIdx).toBeGreaterThanOrEqual(0)
    expect(clientReadyIdx).toBeGreaterThan(clientConstructIdx)
  })

  const cases: Array<{ event: string; logCall: string }> = [
    { event: 'Events.Error', logCall: 'logger.error' },
    { event: 'Events.ShardError', logCall: 'logger.error' },
    { event: 'Events.ShardDisconnect', logCall: 'logger.warn' },
    { event: 'Events.ShardReconnecting', logCall: 'logger.warn' },
    { event: 'Events.ShardResume', logCall: 'logger.info' },
    { event: 'Events.Warn', logCall: 'logger.warn' },
  ]

  for (const { event, logCall } of cases) {
    it(`listens for ${event} between client construction and ClientReady, logging via ${logCall}`, () => {
      const onIdx = src.indexOf(`client.on(${event},`)
      expect(onIdx, `client.on(${event}, ...) not found`).toBeGreaterThanOrEqual(0)
      expect(onIdx).toBeGreaterThan(clientConstructIdx)
      expect(onIdx).toBeLessThan(clientReadyIdx)

      const closeIdx = src.indexOf('})', onIdx)
      const body = src.slice(onIdx, closeIdx)
      expect(body).toContain(logCall)
      expect(body).toContain("module: MOD")
    })
  }

  it('ShardDisconnect logs the close code and reason, not just that it happened', () => {
    const onIdx = src.indexOf('client.on(Events.ShardDisconnect,')
    const closeIdx = src.indexOf('})', onIdx)
    const body = src.slice(onIdx, closeIdx)
    expect(body).toContain('event.code')
    expect(body).toContain('event.reason')
  })

  it('ShardError and ShardDisconnect/Reconnecting/Resume all include the shardId', () => {
    for (const event of ['Events.ShardError', 'Events.ShardDisconnect', 'Events.ShardReconnecting', 'Events.ShardResume']) {
      const onIdx = src.indexOf(`client.on(${event},`)
      const closeIdx = src.indexOf('})', onIdx)
      const body = src.slice(onIdx, closeIdx)
      expect(body, `${event} handler should log shardId`).toContain('shardId')
    }
  })
})

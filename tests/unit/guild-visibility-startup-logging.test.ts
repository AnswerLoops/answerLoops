import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Production incident: after exhausting every application-level explanation
// (channel IDs, guild ID, enabled flag, DB endpoints, Discord client
// connection health all confirmed correct or logging cleanly), the bot still
// received zero gateway events for a channel it was supposedly connected to.
// The only remaining ground truth is what the bot's own Discord client
// actually sees — a channel or guild Discord silently denies visibility into
// produces no error anywhere, it just never generates events. This logs
// every guild/channel the client can see at ClientReady so that can be
// checked directly instead of by reading Discord's permission UI by hand.

const ROOT = process.cwd()

function read(relPath: string): string {
  const abs = path.join(ROOT, relPath)
  expect(fs.existsSync(abs), `File not found: ${relPath}`).toBe(true)
  return fs.readFileSync(abs, 'utf-8')
}

const src = read('bot/index.ts')

function extractClientReadyHandler(): string {
  const idx = src.indexOf('client.once(Events.ClientReady')
  expect(idx).toBeGreaterThanOrEqual(0)
  const braceStart = src.indexOf('{', src.indexOf('async', idx))
  let depth = 0
  let i = braceStart
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++
    else if (src[i] === '}') {
      depth--
      if (depth === 0) { i++; break }
    }
  }
  return src.slice(idx, i)
}

describe('ClientReady — logs guild/channel visibility ground truth', () => {
  const handler = extractClientReadyHandler()

  it('iterates every guild the client can see', () => {
    expect(handler).toMatch(/for\s*\(const \[guildId, guild\] of c\.guilds\.cache\)/)
  })

  it('logs at debug level with guild id, name, and every visible channel id', () => {
    const idx = handler.indexOf('guild visibility at startup')
    expect(idx).toBeGreaterThanOrEqual(0)
    const body = handler.slice(Math.max(0, idx - 50), idx + 250)
    expect(body).toContain('logger.debug(')
    expect(body).toContain('guildId')
    expect(body).toContain('guildName: guild.name')
    expect(body).toContain('channelIds: [...guild.channels.cache.keys()]')
  })

  it('runs after the existing guild channel map save, not instead of it', () => {
    const savedLogIdx = handler.indexOf("logger.info('guild channel map saved'")
    const visibilityIdx = handler.indexOf('guild visibility at startup')
    expect(savedLogIdx).toBeGreaterThanOrEqual(0)
    expect(visibilityIdx).toBeGreaterThan(savedLogIdx)
  })
})

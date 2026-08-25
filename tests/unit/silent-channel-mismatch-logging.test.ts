import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Production incident, twice: a message/forum post that looked correctly
// configured in Settings never produced a ticket, and the bot's logs had
// zero trace of it — MessageCreate's forwardMessage() returning
// `{ forwarded: false }` and ThreadCreate's channel-mismatch check were both
// bare early returns with no log line, indistinguishable from "nothing
// happened because there was nothing to do". This cost real debugging time
// tracking down what turned out to be a channel-ID mismatch. Both paths now
// log a debug line with enough context (guild/channel/thread id, resolved
// org, and the monitored channel list actually in effect) to diagnose this
// from the logs alone next time, instead of by elimination over chat.

const ROOT = process.cwd()

function read(relPath: string): string {
  const abs = path.join(ROOT, relPath)
  expect(fs.existsSync(abs), `File not found: ${relPath}`).toBe(true)
  return fs.readFileSync(abs, 'utf-8')
}

function extractHandler(src: string, eventName: string): string {
  const idx = src.indexOf(`client.on(Events.${eventName}`)
  expect(idx, `Could not find "client.on(Events.${eventName}" in source`).toBeGreaterThanOrEqual(0)
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

const src = read('bot/index.ts')

describe('MessageCreate — logs when a message is not forwarded', () => {
  const handler = extractHandler(src, 'MessageCreate')

  it('checks result.forwarded before falling through to the duplicate/appended/ticket branches', () => {
    const notForwardedIdx = handler.indexOf('if (!result.forwarded)')
    const duplicateIdx = handler.indexOf('result.data?.duplicate')
    expect(notForwardedIdx).toBeGreaterThanOrEqual(0)
    expect(duplicateIdx).toBeGreaterThan(notForwardedIdx)
  })

  it('logs at debug level with enough context to diagnose a channel/guild mismatch', () => {
    const notForwardedIdx = handler.indexOf('if (!result.forwarded)')
    const body = handler.slice(notForwardedIdx, notForwardedIdx + 700)
    expect(body).toContain('logger.debug(')
    expect(body).toContain('guildId: message.guildId')
    expect(body).toContain('channelId: message.channelId')
    expect(body).toContain('monitoredChannelIds: cfg.channelIds')
  })
})

describe('ThreadCreate — logs when a forum post is not forwarded', () => {
  const handler = extractHandler(src, 'ThreadCreate')

  it('the channel-mismatch check no longer bare-returns', () => {
    const idx = handler.indexOf("if (!cfg.channelIds.includes(thread.parentId))")
    expect(idx).toBeGreaterThanOrEqual(0)
    const body = handler.slice(idx, idx + 600)
    expect(body).toContain('logger.debug(')
    const debugIdx = body.indexOf('logger.debug(')
    const returnIdx = body.indexOf('return', debugIdx)
    expect(returnIdx).toBeGreaterThan(debugIdx)
  })

  it('logs enough context to diagnose a parent-channel mismatch', () => {
    const idx = handler.indexOf("if (!cfg.channelIds.includes(thread.parentId))")
    const body = handler.slice(idx, idx + 600)
    expect(body).toContain('threadId: thread.id')
    expect(body).toContain('parentChannelId: thread.parentId')
    expect(body).toContain('monitoredChannelIds: cfg.channelIds')
  })
})

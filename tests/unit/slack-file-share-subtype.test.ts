import { describe, it, expect } from 'vitest'
import { isIgnoredSlackSubtype } from '@/lib/slack/message-filters'
import fs from 'node:fs'
import path from 'node:path'

// Real bug found live: a user sent a genuine question with a screenshot
// attached in Slack and no ticket was ever created, with no error anywhere.
// Root cause: both Slack ingestion paths (the Events API webhook and the
// self-hosted/force-polling poller) rejected ANY message carrying a
// `subtype` — meant to filter out edits/deletions/channel-join noise, but
// Slack also sets `subtype: 'file_share'` on a perfectly normal message
// that just has a file attached, so every attachment silently killed the
// entire ticket, not just the attachment (a narrower, already-tracked gap
// in the Roadmap — this is strictly worse: total message loss).

const ROOT = process.cwd()
function read(relPath: string): string {
  const abs = path.join(ROOT, relPath)
  expect(fs.existsSync(abs), `File not found: ${relPath}`).toBe(true)
  return fs.readFileSync(abs, 'utf-8')
}

describe('lib/slack/message-filters.ts — isIgnoredSlackSubtype', () => {
  it('does not ignore file_share (a message with an attachment)', () => {
    expect(isIgnoredSlackSubtype('file_share')).toBe(false)
  })

  it('does not ignore thread_broadcast (a thread reply also shown in-channel)', () => {
    expect(isIgnoredSlackSubtype('thread_broadcast')).toBe(false)
  })

  it('does not ignore a message with no subtype at all', () => {
    expect(isIgnoredSlackSubtype(undefined)).toBe(false)
  })

  it('ignores real noise subtypes: edits, deletions, channel-join, bot messages', () => {
    expect(isIgnoredSlackSubtype('message_changed')).toBe(true)
    expect(isIgnoredSlackSubtype('message_deleted')).toBe(true)
    expect(isIgnoredSlackSubtype('channel_join')).toBe(true)
    expect(isIgnoredSlackSubtype('bot_message')).toBe(true)
  })
})

describe('Slack webhook and poller both use the shared filter, not a blanket subtype check', () => {
  it('app/api/slack/events/route.ts uses isIgnoredSlackSubtype, not a bare ev.subtype check', () => {
    const src = read('app/api/slack/events/route.ts')
    expect(src).toContain("import { isIgnoredSlackSubtype } from '@/lib/slack/message-filters'")
    expect(src).toContain('isIgnoredSlackSubtype(ev.subtype as string | undefined)')
    // The old blanket check must be gone, not just supplemented
    expect(src).not.toMatch(/if \(ev\.bot_id \|\| ev\.subtype\)/)
  })

  it('lib/slack/poller.ts uses isIgnoredSlackSubtype, not a bare !m.subtype check', () => {
    const src = read('lib/slack/poller.ts')
    expect(src).toContain("import { isIgnoredSlackSubtype } from './message-filters'")
    expect(src).toContain('!isIgnoredSlackSubtype(m.subtype)')
    expect(src).not.toContain('!m.subtype &&')
  })
})

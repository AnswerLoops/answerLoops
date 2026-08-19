import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

// Bug: a Mintlify preview-deploy bot comment (mintlify[bot], user.type "Bot")
// on a monitored PR got ingested as a support ticket ("User needs clarity on
// Mintlify Previews feature", 60% confidence) — the webhook ran every
// issue/comment/discussion through AI triage regardless of author type.
// Fix: skip bot-authored content in all four ticket-ingest branches before
// it ever reaches handleTicket/processCommunityMessage.
//
// Source-file structural assertion — vitest cannot POST a real GitHub
// webhook payload through Next.js route handling here. Same convention as
// tenant-isolation.test.ts.

const ROOT = process.cwd()

function read(relPath: string): string {
  const absPath = path.join(ROOT, relPath)
  expect(fs.existsSync(absPath), `File not found: ${relPath}`).toBe(true)
  return fs.readFileSync(absPath, 'utf-8')
}

describe('app/api/github/webhook/route.ts — bot-authored content is never ticketed', () => {
  const src = read('app/api/github/webhook/route.ts')

  it('checks user.type on all four ticket-ingest branches: issue opened, issue comment, discussion created, discussion comment', () => {
    const matches = src.match(/\.user\.type === 'Bot'/g) ?? []
    expect(matches.length).toBe(4)
  })

  it('bails out before calling handleTicket for each branch, not after', () => {
    for (const branchStart of [
      "if (event === 'issues' && (action === 'opened' || action === 'reopened')) {",
      "} else if (event === 'issue_comment' && action === 'created') {",
      "} else if (event === 'discussion' && action === 'created') {",
      "} else if (event === 'discussion_comment' && action === 'created') {",
    ]) {
      const branchIdx = src.indexOf(branchStart)
      expect(branchIdx, `branch not found: ${branchStart}`).toBeGreaterThan(-1)
      const botCheckIdx = src.indexOf(".user.type === 'Bot'", branchIdx)
      const handleTicketIdx = src.indexOf('await handleTicket(', branchIdx)
      expect(botCheckIdx, `no bot check in branch: ${branchStart}`).toBeGreaterThan(branchIdx)
      expect(botCheckIdx).toBeLessThan(handleTicketIdx)
    }
  })

  it('the bot check returns ok without processing, matching the existing early-return pattern used for unmonitored events', () => {
    const idx = src.indexOf(".user.type === 'Bot') return NextResponse.json({ ok: true })")
    expect(idx).toBeGreaterThan(-1)
  })
})

import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

/**
 * Validates the disclosure check.
 *
 * These fixtures are deliberately generic phrasings rather than real incident
 * text. The check matches vocabulary, not meaning, so a fixture only needs the
 * vocabulary — and a committed test file full of verbatim descriptions of this
 * product's past weaknesses would itself be the thing the check exists to
 * prevent. Every positive fixture below could describe any product; none names
 * a mechanism in this one.
 *
 * Each is marked `disclosure-ok` so it passes the staged-diff scan explicitly
 * and visibly, rather than by this file being added to an exemption list. An
 * exemption is invisible in review; a marker on the line is not.
 *
 * The negatives matter more than the positives. A check that fires on ordinary
 * prose gets bypassed with --no-verify, and then it protects nothing.
 */

const SCRIPT = path.join(process.cwd(), 'scripts/check-disclosure.mjs')

/** Runs the checker with `text` as the commit message. Returns true if blocked. */
function blocks(text: string): boolean {
  const tmp = path.join(os.tmpdir(), `disclosure-${Math.random().toString(36).slice(2)}.txt`)
  fs.writeFileSync(tmp, text)
  try {
    execFileSync('node', [SCRIPT, tmp], { stdio: 'pipe' })
    return false
  } catch {
    return true
  } finally {
    fs.rmSync(tmp, { force: true })
  }
}

// Generic phrasings that carry the vocabulary this check looks for. Marked so
// the staged-diff scan skips them without needing a file-level exemption.
const FLAGGED = [
  'an attacker could exhaust a victim org quota with rejected requests', // disclosure-ok: fixture
  'an unvalidated token acts as an unauthenticated INSERT primitive', // disclosure-ok: fixture
  'internal notes could be shown to an anonymous visitor', // disclosure-ok: fixture
  'a removed member kept full read and write access', // disclosure-ok: fixture
  'this would have given anyone with an account access to another tenant', // disclosure-ok: fixture
  'the reservation ran before validation, so a rejected request consumed quota', // disclosure-ok: fixture
  'a session cookie alone was enough to reach the admin area', // disclosure-ok: fixture
  'the previous escaper made this exploitable in any spreadsheet', // disclosure-ok: fixture
  // Advisory identifiers: the entire description is one lookup away, so the
  // wording around them does not matter.
  'fix: bump the parser to patch CVE-2026-41305', // disclosure-ok: fixture
  'advisory GHSA-1a2b-3c4d-5e6f affects the pinned range', // disclosure-ok: fixture
  // Advisory-status phrasing, which the original pattern set did not cover.
  'no patched version exists for the legacy line', // disclosure-ok: fixture
  'this one is unfixable in place and remains open', // disclosure-ok: fixture
  // Bare "could" carrying an impact word.
  'a malicious client could omit the length header', // disclosure-ok: fixture
  'the forwarding header could be spoofed by the caller', // disclosure-ok: fixture
]

// Invariant-style phrasings of the same subject matter. These must not fire.
const SANITIZED = [
  'Access is scoped to subscriptions rather than to sessions.',
  'attempts are capped at a multiple of the plan’s allowance, so a rejected request must not leave one behind',
  'the limiter persists this key and cannot bound what it is handed',
  'Resolved-ticket text is written for the one person who raised the ticket',
  'Each plan reads STRIPE_PRICE_<its own id>, and the alignment is load-bearing',
  'Membership is resolved live on every non-public request rather than cached in the token',
  'fix: patch a security issue in dependency handling',
  'Removing a member now ends their access on their next request.',
]

// Ordinary engineering prose that happens to use flagged vocabulary. These are
// the false positives that would get the check bypassed.
const INNOCENT = [
  'Previously this ran on every render, so it was memoised.',
  'The migration used to live in a side table before the schema was flattened.',
  'This could have been a single query, but the join order matters for the index.',
  'Anyone on the team can regenerate the fixtures with pnpm seed.',
  'refactor: extract the checkout session builder so the signup path can reuse it',
  'The webhook keeps the subscriptions table current.',
  // "could" is ordinary engineering vocabulary far more often than it is
  // narration, so these guard the precision of the bare-could pattern.
  'This could be simplified once the adapter lands.',
  'Could not reproduce the flake locally, so the retry stays.',
  'The importer could take the joined query instead of each part.',
  'bumps the framework to 16.2.11',
]

describe('the disclosure check catches weakness narration', () => {
  it.each(FLAGGED)('blocks: %s', (line) => {
    expect(blocks(line), 'this phrasing describes a weakness, not an invariant').toBe(true)
  })
})

describe('the disclosure check stays quiet on the rewordings', () => {
  it.each(SANITIZED)('allows: %s', (line) => {
    expect(blocks(line), 'the sanitized wording must not be blocked').toBe(false)
  })
})

describe('the disclosure check does not fire on ordinary prose', () => {
  it.each(INNOCENT)('allows: %s', (line) => {
    expect(
      blocks(line),
      'a check that flags normal engineering writing gets bypassed, and then protects nothing',
    ).toBe(false)
  })
})

describe('the escape hatch works', () => {
  it('allows a flagged line carrying the marker', () => {
    expect(blocks('a removed member kept full read access — disclosure-ok')).toBe(false)
  })

  it('still blocks the same line without it', () => {
    expect(blocks('a removed member kept full read access')).toBe(true) // disclosure-ok: fixture
  })
})

describe('the checker is wired into the commit path', () => {
  it('is called from the pre-commit hook', () => {
    // .git/hooks is not version-controlled, so the repo carries the installer
    // and the script; this asserts the wiring exists in the committed setup.
    const installer = fs.readFileSync(path.join(process.cwd(), 'scripts/install-hooks.sh'), 'utf-8')
    expect(installer).toContain('check-disclosure.mjs')
  })
})

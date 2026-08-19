import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

/**
 * Validates the PreToolUse gate on `gh` commands that publish text.
 *
 * The pre-commit hook cannot see a PR body, because `gh pr create` never
 * touches git. This gate covers that surface, so these tests exist to prove it
 * actually blocks there rather than merely being installed.
 *
 * Fixtures follow the same rule as `disclosure-check.test.ts`: generic
 * phrasings that carry the vocabulary and nothing else. None describes a
 * mechanism in this product, and each is marked so the staged-diff scan skips
 * it visibly rather than through a file-level exemption.
 *
 * The negatives carry the weight. This gate sits in front of every Bash call
 * the agent makes, so a version that fires on ordinary `gh` usage would be
 * removed within a day, and then it protects nothing. Read-only `gh` commands
 * and clean publishing commands must both pass untouched.
 */

const HOOK = path.join(process.cwd(), 'scripts/hooks/check-gh-disclosure.mjs')

/** Feeds a PreToolUse payload to the hook. Returns true if the call was blocked. */
function blocks(command: string, toolName = 'Bash'): boolean {
  const payload = JSON.stringify({ tool_name: toolName, tool_input: { command } })
  try {
    execFileSync('node', [HOOK], { input: payload, stdio: 'pipe' })
    return false
  } catch {
    return true
  }
}

function withTempFile(contents: string, run: (file: string) => void): void {
  const tmp = path.join(os.tmpdir(), `gh-body-${Math.random().toString(36).slice(2)}.md`)
  fs.writeFileSync(tmp, contents)
  try {
    run(tmp)
  } finally {
    fs.rmSync(tmp, { force: true })
  }
}

// Generic phrasings carrying the vocabulary the checker looks for.
const NARRATION = 'an attacker could bypass the auth check' // disclosure-ok: fixture

describe('gh disclosure gate — blocks publishing surfaces', () => {
  it('blocks a PR body containing weakness narration', () => {
    expect(blocks(`gh pr create --title "fix: thing" --body "${NARRATION}"`)).toBe(true)
  })

  it('blocks a PR comment', () => {
    expect(blocks(`gh pr comment 12 --body "${NARRATION}"`)).toBe(true)
  })

  it('blocks an issue body', () => {
    expect(blocks(`gh issue create --title "t" --body "${NARRATION}"`)).toBe(true)
  })

  it('blocks a release note', () => {
    expect(blocks(`gh release create v1.0.0 --notes "${NARRATION}"`)).toBe(true)
  })

  it('blocks a non-GET gh api call carrying a body', () => {
    expect(blocks(`gh api -X PATCH /repos/o/r/issues/comments/1 -f body="${NARRATION}"`)).toBe(true)
  })

  it('blocks narration that lives in a --body-file rather than the command', () => {
    withTempFile(`Some preamble.\n${NARRATION}\n`, (file) => {
      expect(blocks(`gh pr create --body-file ${file}`)).toBe(true)
    })
  })

  it('blocks narration reaching the body through a $(cat ...) expansion', () => {
    withTempFile(`${NARRATION}\n`, (file) => {
      expect(blocks(`gh pr create --body "$(cat ${file})"`)).toBe(true)
    })
  })
})

describe('gh disclosure gate — leaves everything else alone', () => {
  it('allows a clean PR body', () => {
    expect(blocks('gh pr create --title "fix: scope access" --body "Access is scoped to subscriptions."')).toBe(false)
  })

  it('allows a clean --body-file', () => {
    withTempFile('Access is scoped to subscriptions.\n', (file) => {
      expect(blocks(`gh pr create --body-file ${file}`)).toBe(false)
    })
  })

  it('allows read-only gh commands even when the text would otherwise match', () => {
    // Reading a body that contains narration is not publishing it. If this ever
    // blocks, investigating a past incident becomes impossible from the agent.
    expect(blocks(`gh pr view 12 --json body --jq '.body' | grep "${NARRATION}"`)).toBe(false)
    expect(blocks('gh pr list --state all --limit 100')).toBe(false)
    expect(blocks('gh api /repos/o/r/pulls/1')).toBe(false)
  })

  it('allows non-gh commands regardless of content', () => {
    expect(blocks(`grep -r "${NARRATION}" .`)).toBe(false)
    expect(blocks(`echo "${NARRATION}" > notes.md`)).toBe(false)
  })

  it('ignores tools other than Bash', () => {
    expect(blocks(`gh pr create --body "${NARRATION}"`, 'Read')).toBe(false)
  })

  it('does not block ordinary engineering prose in a PR body', () => {
    const ordinary = [
      'gh pr create --body "Refactors the retry loop and adds a test for the backoff path."',
      'gh pr create --body "Previously this returned a string; it now returns a typed result."',
      'gh pr comment 3 --body "Renamed the helper for clarity. No behaviour change."',
    ]
    for (const command of ordinary) expect(blocks(command)).toBe(false)
  })
})

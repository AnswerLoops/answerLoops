#!/usr/bin/env node
/**
 * PreToolUse gate on `gh` commands that publish text to GitHub.
 *
 * The pre-commit hook covers staged files, the commit message and the branch
 * name. It cannot cover a PR body, because `gh pr create` never touches git.
 * That is the gap this closes, and it is the one that matters: every recorded
 * disclosure incident on this repo involved a PR body, and none of them passed
 * through a git hook on the way out.
 *
 * Deliberately broad rather than precise. It does not parse the command line
 * properly — it decides whether the command publishes text, and if so scans the
 * whole command string plus any file the command reads its body from. A shell
 * command is not reliably parseable without reimplementing the shell, and the
 * error directions are not symmetric here: a false block costs one reword, a
 * false pass costs an incident. So it fails closed.
 *
 * What it cannot do: stop text reaching GitHub by a route it does not
 * recognise — a raw `curl` against the API, a script, a browser. It narrows the
 * habitual path, which is where the mistakes have actually happened. It is not
 * a boundary.
 *
 * Contract: reads the PreToolUse JSON payload on stdin, exits 2 to block with
 * the reason on stderr, exits 0 to allow.
 */

import fs from 'node:fs'
import path from 'node:path'
import { scanText } from '../check-disclosure.mjs'

/** Subcommands that write something durable and publicly visible. */
const PUBLISHING = [
  /\bgh\s+pr\s+(create|edit|comment|review)\b/,
  /\bgh\s+issue\s+(create|edit|comment)\b/,
  /\bgh\s+release\s+(create|edit)\b/,
  /\bgh\s+gist\s+create\b/,
  // Any non-GET call to the issues/pulls endpoints, which is how a comment or
  // body gets patched when the porcelain commands are inconvenient.
  /\bgh\s+api\b[^\n]*-X\s*(POST|PATCH|PUT)/i,
]

/** Flags whose value is a path holding the body text. */
const BODY_FILE_FLAGS = [
  /--body-file[=\s]+(\S+)/g,
  /--notes-file[=\s]+(\S+)/g,
  /-F\s+body=@(\S+)/g,
  /--field\s+body=@(\S+)/g,
  // `--body "$(cat some/file.md)"` — the shell would expand this before gh
  // ever sees it, so the text is not in the command string we are handed.
  /\$\(\s*cat\s+([^)\s]+)\s*\)/g,
]

function readPayload() {
  let raw = ''
  try {
    raw = fs.readFileSync(0, 'utf-8')
  } catch {
    return null
  }
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function bodyFilesIn(command) {
  const files = []
  for (const re of BODY_FILE_FLAGS) {
    re.lastIndex = 0
    let m
    while ((m = re.exec(command)) !== null) {
      files.push(m[1].replace(/^['"]|['"]$/g, ''))
    }
  }
  return files
}

const payload = readPayload()

// Anything we cannot understand is not ours to block — other hooks and the
// permission layer still apply.
if (!payload || payload.tool_name !== 'Bash') process.exit(0)

const command = String(payload.tool_input?.command ?? '')
if (!/\bgh\b/.test(command)) process.exit(0)
if (!PUBLISHING.some((re) => re.test(command))) process.exit(0)

const findings = [...scanText(command, 'gh command')]

for (const file of bodyFilesIn(command)) {
  const resolved = path.resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd(), file)
  let text
  try {
    text = fs.readFileSync(resolved, 'utf-8')
  } catch {
    // A path we cannot read is usually a heredoc, a process substitution, or a
    // file written later in the same command. Nothing to scan, and not a reason
    // to block on its own — the command string itself was still scanned above.
    continue
  }
  findings.push(...scanText(text, file))
}

if (findings.length === 0) process.exit(0)

console.error('')
console.error('  DISCLOSURE CHECK FAILED — gh command blocked')
console.error('')
console.error('This command publishes text to GitHub that describes a weakness rather than')
console.error('what the code guarantees. A PR body and a comment are permanent public')
console.error('surfaces: GitHub keeps edit history, so rewriting one later does not retract it.')
console.error('')

for (const f of findings) {
  console.error(`  ${f.where}`)
  console.error(`    ${f.text.slice(0, 160)}`)
  console.error(`    matched: ${f.hit.re}${f.hit.with ? ` + ${f.hit.with}` : ''}`)
  console.error('')
}

console.error('What to do:')
console.error('  Reword to state the invariant — what the code now guarantees — and put the')
console.error('  mechanism on the internal security page instead. Then re-run the command.')
console.error('')

process.exit(2)

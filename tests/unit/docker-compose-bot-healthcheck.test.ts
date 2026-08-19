import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Infra coverage for the bot container healthcheck fix:
//
// docker-compose.prod.yml previously gave the `bot` service no healthcheck
// override, so it inherited the image's Dockerfile HEALTHCHECK, which probes
// http://127.0.0.1:3000/api/health. The bot process never opens port 3000 or
// serves HTTP at all (its liveness is the Discord gateway connection + Slack
// poller, both visible only in logs) — so that inherited probe failed
// forever (556 consecutive failures observed in the running container before
// this fix). The fix adds `healthcheck: { disable: true }` to the `bot`
// service only.
//
// This deliberately does not do a whole-file substring check for
// "disable: true", since that would pass even if `app` also picked up a
// (wrong) disabled healthcheck, or if the line appeared under an unrelated
// service. Instead it isolates each service's own block by top-level (2-space
// indented) key boundaries and asserts on that slice alone. No YAML parser
// is added as a new dependency since none was already present in
// node_modules; this line-scoped approach doesn't need one.

const ROOT = process.cwd()
const COMPOSE_PATH = path.join(ROOT, 'docker-compose.prod.yml')

function readCompose(): string {
  expect(fs.existsSync(COMPOSE_PATH)).toBe(true)
  return fs.readFileSync(COMPOSE_PATH, 'utf-8')
}

/**
 * Extracts the raw block of lines belonging to a top-level service under
 * `services:` — from the service's own line (2-space indented, e.g. "  bot:")
 * up to (but not including) the next line at that same indentation level.
 */
function serviceBlock(yamlText: string, serviceName: string): string {
  const lines = yamlText.split('\n')
  const startIdx = lines.findIndex((l) => /^\s{2}\S/.test(l) && l.trim() === `${serviceName}:`)
  expect(startIdx, `service "${serviceName}:" not found at top-level indentation`).toBeGreaterThan(-1)

  let endIdx = lines.length
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (/^\s{2}\S/.test(lines[i])) {
      endIdx = i
      break
    }
  }
  return lines.slice(startIdx, endIdx).join('\n')
}

describe('docker-compose.prod.yml: bot service healthcheck disabled, app untouched', () => {
  it('the bot service block declares healthcheck: disable: true', () => {
    const bot = serviceBlock(readCompose(), 'bot')
    // Accept either inline ({ disable: true }) or block-mapping (disable:\n  true)
    // form of a healthcheck override, scoped to just this block.
    expect(bot).toMatch(/healthcheck:\s*\n?\s*disable:\s*true/)
  })

  it('the app service block is untouched — no healthcheck override at all, so it keeps the image default', () => {
    const app = serviceBlock(readCompose(), 'app')
    expect(app).not.toMatch(/healthcheck:/)
    expect(app).not.toMatch(/disable:\s*true/)
  })

  it('only one service in the whole file disables its healthcheck', () => {
    const compose = readCompose()
    const disableMatches = [...compose.matchAll(/disable:\s*true/g)]
    expect(disableMatches.length).toBe(1)
  })

  it('the bot service still depends on app and points at it via BOT_TARGET_URL, so disabling its healthcheck did not touch its own dependency wiring', () => {
    const bot = serviceBlock(readCompose(), 'bot')
    expect(bot).toMatch(/depends_on:\s*\n\s*-\s*app/)
    expect(bot).toContain('BOT_TARGET_URL=http://app:3000')
  })
})

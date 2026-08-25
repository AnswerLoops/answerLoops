import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Root-cause fix for a production bug: loadConfig() and
// loadOrgConfigForGuild() previously swallowed real DB errors via
// `.catch(() => null)`, which is indistinguishable from "no config exists".
// For loadOrgConfigForGuild, that `null` result then got permanently
// written to guildConfigCache and served as "unconfigured" until the next
// config_changed reload — a silent failure mode that looked identical to a
// guild that was never set up. Fix: catch errors explicitly, log them via
// logger.error with a distinct message, and — critically — return early
// WITHOUT writing to guildConfigCache on a DB error, so a transient failure
// gets retried on the next lookup instead of being cached as permanent
// "no config".

const ROOT = process.cwd()

function read(relPath: string): string {
  const abs = path.join(ROOT, relPath)
  expect(fs.existsSync(abs), `File not found: ${relPath}`).toBe(true)
  return fs.readFileSync(abs, 'utf-8')
}

// Top-level function/const declarations bound each extracted body — using
// these as the end marker avoids brace-depth counting getting thrown off by
// braces inside multi-line return-type annotations (e.g.
// `Promise<{ config: BotConfig; orgId: number } | null>`).
const TOP_LEVEL_BOUNDARIES = [
  '\nfunction startOrgPurgeSweep(',
  '\nfunction startStuckTicketSweep(',
  '\nfunction watchConfigChanges(',
  '\nfunction buildGuildChannelMap(',
  '\nfunction clearGuildConfigCache(',
  '\nasync function loadOrgConfigForGuild(',
  '\nasync function loadConfig(',
  '\nasync function main(',
]

function extractFunctionBody(src: string, signature: string): string {
  const startIdx = src.indexOf(signature)
  expect(startIdx, `Could not find "${signature}" in source`).toBeGreaterThan(-1)

  let endIdx = src.length
  for (const boundary of TOP_LEVEL_BOUNDARIES) {
    const boundaryIdx = src.indexOf(boundary, startIdx + signature.length)
    if (boundaryIdx !== -1 && boundaryIdx < endIdx) endIdx = boundaryIdx
  }

  return src.slice(startIdx, endIdx)
}

describe('bot/index.ts Discord config DB-error handling', () => {
  const src = read('bot/index.ts')

  it('neither loadConfig nor loadOrgConfigForGuild swallow errors with .catch(() => null) anymore', () => {
    const loadConfigBody = extractFunctionBody(src, 'async function loadConfig(')
    const loadOrgConfigBody = extractFunctionBody(src, 'async function loadOrgConfigForGuild(')

    expect(loadConfigBody).not.toMatch(/\.catch\(\s*\(\)\s*=>\s*null\s*\)/)
    expect(loadOrgConfigBody).not.toMatch(/\.catch\(\s*\(\)\s*=>\s*null\s*\)/)
  })

  it('loadOrgConfigForGuild logs a distinct logger.error on the guild-row DB lookup failure', () => {
    const body = extractFunctionBody(src, 'async function loadOrgConfigForGuild(')
    expect(body).toContain('getDiscordGuildByGuildId(guildId)')
    expect(body).toContain(
      'failed to resolve Discord guild config — DB lookup error, not treating as unconfigured'
    )
    expect(body).toMatch(/logger\.error\(\s*['"]failed to resolve Discord guild config/)
  })

  it('loadOrgConfigForGuild logs a distinct logger.error on the org-integration DB lookup failure', () => {
    const body = extractFunctionBody(src, 'async function loadOrgConfigForGuild(')
    expect(body).toContain(
      'failed to resolve org Discord integration — DB lookup error, not treating as unconfigured'
    )
    expect(body).toMatch(/logger\.error\(\s*['"]failed to resolve org Discord integration/)
  })

  it('loadConfig logs a distinct logger.error when the DB integration lookup fails', () => {
    const body = extractFunctionBody(src, 'async function loadConfig(')
    expect(body).toContain(
      'failed to load Discord integration from database — falling back to environment variables'
    )
    expect(body).toMatch(/logger\.error\(\s*['"]failed to load Discord integration from database/)
  })

  it('loadOrgConfigForGuild returns null before guildConfigCache.set on the guild-row DB-error path (does not cache the failure)', () => {
    const body = extractFunctionBody(src, 'async function loadOrgConfigForGuild(')

    // Locate the first catch block (guild-row lookup) and confirm its
    // `return null` occurs strictly before the guildConfigCache.set call
    // that only happens later, on the success path.
    const firstCatchIdx = body.indexOf('} catch (err) {')
    expect(firstCatchIdx).toBeGreaterThan(-1)
    const firstCatchEnd = body.indexOf('\n  }', firstCatchIdx) // end of the try/catch block
    const firstCatchBlock = body.slice(firstCatchIdx, firstCatchEnd === -1 ? undefined : firstCatchEnd)

    expect(firstCatchBlock).toMatch(/return null/)
    expect(firstCatchBlock).not.toContain('guildConfigCache.set')

    const returnNullIdx = body.indexOf('return null', firstCatchIdx)
    const cacheSetIdx = body.indexOf('guildConfigCache.set')
    expect(returnNullIdx).toBeGreaterThan(-1)
    expect(cacheSetIdx).toBeGreaterThan(-1)
    // The DB-error early return must textually precede the cache write —
    // the cache write is only reachable via the success path further down.
    expect(returnNullIdx).toBeLessThan(cacheSetIdx)
  })

  it('loadOrgConfigForGuild returns null before guildConfigCache.set on the org-integration DB-error path (does not cache the failure)', () => {
    const body = extractFunctionBody(src, 'async function loadOrgConfigForGuild(')

    const secondCatchIdx = body.indexOf(
      'failed to resolve org Discord integration'
    )
    expect(secondCatchIdx).toBeGreaterThan(-1)

    // The nearest `return null` after this log call must come before the
    // single guildConfigCache.set call in the function.
    const returnNullIdx = body.indexOf('return null', secondCatchIdx)
    const cacheSetIdx = body.indexOf('guildConfigCache.set')
    expect(returnNullIdx).toBeGreaterThan(-1)
    expect(cacheSetIdx).toBeGreaterThan(-1)
    expect(returnNullIdx).toBeLessThan(cacheSetIdx)
  })

  it('guildConfigCache.set is called exactly once in loadOrgConfigForGuild — only on the success path, not from either catch block', () => {
    const body = extractFunctionBody(src, 'async function loadOrgConfigForGuild(')
    const matches = body.match(/guildConfigCache\.set\(/g) ?? []
    expect(matches.length).toBe(1)
  })
})

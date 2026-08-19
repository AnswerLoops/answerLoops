import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Source-shape coverage for the ingest auto-deflect fix's call site:
//   lib/ai/agent.ts now goes through lib/billing/usage.ts's reserveAutoDeflect
//   instead of calling the old unlocked checkDeflectionLimit directly, which
//   let concurrent tickets near an org's cap all read "allowed" before any
//   write landed. The behavioural coverage for reserveAutoDeflect itself
//   (lock ordering, transaction identity, every branch writing its decision)
//   lives in tests/unit/auto-deflect-reservation.test.ts — this file only
//   asserts agent.ts is actually wired to the new function, and the old one
//   is gone from this call site for good.
//
// lib/db/queries/assessments.ts's saveAssessment signature (the optional
// Writer parameter that lets the write land inside reserveAutoDeflect's
// transaction) is asserted directly against its own source below.

const ROOT = process.cwd()

function readSrc(relPath: string): string {
  const absPath = path.join(ROOT, relPath)
  expect(fs.existsSync(absPath), `File not found: ${relPath}`).toBe(true)
  return fs.readFileSync(absPath, 'utf-8')
}

describe('lib/ai/agent.ts uses the locked reservation, not the old unlocked check', () => {
  const src = () => readSrc('lib/ai/agent.ts')

  it('no longer imports or calls checkDeflectionLimit', () => {
    const s = src()
    expect(s).not.toMatch(/checkDeflectionLimit/)
  })

  it('imports reserveAutoDeflect from @/lib/billing/usage', () => {
    const s = src()
    expect(s).toMatch(/import\s*\{[^}]*reserveAutoDeflect[^}]*\}\s*from\s*'@\/lib\/billing\/usage'/)
  })

  it('calls reserveAutoDeflect with the orgId and a callback that threads the transaction into saveAssessment', () => {
    const s = src()
    const callIdx = s.indexOf('await reserveAutoDeflect(orgId,')
    expect(callIdx).toBeGreaterThan(-1)

    // The callback signature is (tx, allowed) => saveAssessment(..., tx) —
    // if saveAssessment were called with a fresh getDb() instead of the
    // supplied tx, the write would land outside the advisory lock and the
    // whole point of the fix is lost even though this call site looks correct
    // at a glance.
    const callBlock = s.slice(callIdx, callIdx + 260)
    expect(callBlock).toMatch(/\(tx,\s*allowed\)\s*=>/)
    expect(callBlock).toMatch(/saveAssessment\(\{[^}]*\},\s*tx\)/)
  })

  it('only calls saveAssessment without a transaction on the non-auto-deflect path, which is not racing anything', () => {
    const s = src()
    // Two call sites total: the reserveAutoDeflect callback (with tx) and the
    // plain non-deflect save (no tx argument, defaults inside saveAssessment).
    const calls = [...s.matchAll(/saveAssessment\(\{[^}]*\}(?:,\s*tx)?\)/g)]
    expect(calls.length).toBe(2)
    const withTx = calls.filter((m) => m[0].endsWith(', tx)'))
    const withoutTx = calls.filter((m) => !m[0].endsWith(', tx)'))
    expect(withTx.length).toBe(1)
    expect(withoutTx.length).toBe(1)
  })
})

describe('lib/db/queries/assessments.ts — saveAssessment accepts an optional transaction', () => {
  const src = () => readSrc('lib/db/queries/assessments.ts')

  it('defines a Writer type as the insert-capable slice of getDb(), and defaults the param to getDb()', () => {
    const s = src()
    expect(s).toMatch(/type\s+Writer\s*=\s*Pick<ReturnType<typeof getDb>,\s*'insert'>/)
    expect(s).toMatch(/export async function saveAssessment\(/)

    const fnIdx = s.indexOf('export async function saveAssessment(')
    const bodyStart = s.indexOf('): Promise<void>', fnIdx)
    const signature = s.slice(fnIdx, bodyStart)
    // Second positional parameter, defaulting to a fresh getDb() so every
    // existing caller (that doesn't pass one) keeps its current behavior.
    expect(signature).toMatch(/db:\s*Writer\s*=\s*getDb\(\)/)
  })

  it('the insert call uses the db parameter, not a hardcoded getDb() inside the body', () => {
    const s = src()
    const fnIdx = s.indexOf('export async function saveAssessment(')
    const nextFnIdx = s.indexOf('export async function getAssessment(')
    const body = s.slice(fnIdx, nextFnIdx)

    // Passing db through means a caller-supplied transaction is actually used
    // for the write; a stray getDb() call inside the body would silently
    // ignore the caller's transaction and put the write back outside any lock
    // it was meant to be held under.
    expect(body).toMatch(/await\s+db\s*\n?\s*\.insert\(aiAssessments\)/)
  })
})

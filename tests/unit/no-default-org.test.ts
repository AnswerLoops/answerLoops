import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

// Ban the `orgId = DEFAULT_ORG_ID` default-parameter pattern in lib/.
//
// This silent fallback to org 1 was the root cause of every cross-tenant leak
// fixed in the tenant-isolation work: a caller forgets to pass orgId, the code
// compiles, and org 1's data quietly serves every tenant. Tenant-data
// functions must take a required orgId so a missing argument is a compile
// error, not a data leak.
//
// schema.ts is exempt (it defines the constant). bot/index.ts intentionally
// uses DEFAULT_ORG_ID explicitly for the self-hosted single-org env-var
// fallback path — explicit use at a call site is visible in review; a default
// parameter is not.

const LIB = path.join(process.cwd(), 'lib')

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(full)
    return entry.name.endsWith('.ts') ? [full] : []
  })
}

describe('no DEFAULT_ORG_ID default parameters in lib/', () => {
  it('no lib file declares `= DEFAULT_ORG_ID` as a parameter default', () => {
    const offenders = walk(LIB)
      .filter((f) => !f.endsWith(`db${path.sep}schema.ts`))
      .filter((f) => fs.readFileSync(f, 'utf-8').includes('= DEFAULT_ORG_ID'))
      .map((f) => path.relative(process.cwd(), f))
    expect(offenders, `Silent org-1 fallback reintroduced in: ${offenders.join(', ')}`).toEqual([])
  })

  it('lib files do not import DEFAULT_ORG_ID at all (schema.ts excepted)', () => {
    const offenders = walk(LIB)
      .filter((f) => !f.endsWith(`db${path.sep}schema.ts`))
      .filter((f) => fs.readFileSync(f, 'utf-8').includes('DEFAULT_ORG_ID'))
      .map((f) => path.relative(process.cwd(), f))
    expect(offenders, `DEFAULT_ORG_ID used in lib (org must come from the caller): ${offenders.join(', ')}`).toEqual([])
  })
})

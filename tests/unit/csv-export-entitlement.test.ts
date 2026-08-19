import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

// Known Issues item 45 (Roadmap): CSV export (`csv_export`, Standard+) had no
// entitlement check at all — neither route checked orgHasFeature, and both
// dashboard buttons rendered unconditionally. Source-shape assertions,
// matching this repo's convention for route/page-wiring tests (see
// tests/unit/agent-api.test.ts).

const ROOT = process.cwd()

function readSrc(relPath: string): string {
  const absPath = path.join(ROOT, relPath)
  expect(fs.existsSync(absPath), `File not found: ${relPath}`).toBe(true)
  return fs.readFileSync(absPath, 'utf-8')
}

describe('app/api/export/tickets/route.ts — csv_export entitlement', () => {
  const src = () => readSrc('app/api/export/tickets/route.ts')

  it('imports orgHasFeature', () => {
    expect(src()).toContain("import { orgHasFeature } from '@/lib/billing/entitlements-server'")
  })

  it('checks csv_export before querying tickets, and denies with 403', () => {
    const s = src()
    const checkIdx = s.indexOf("orgHasFeature(orgId, 'csv_export')")
    const queryIdx = s.indexOf('await getTickets(')
    expect(checkIdx).toBeGreaterThan(-1)
    expect(checkIdx).toBeLessThan(queryIdx)

    const checkBlock = s.slice(checkIdx, checkIdx + 100)
    expect(checkBlock).toContain('403')
  })
})

describe('app/api/export/leads/route.ts — csv_export entitlement', () => {
  const src = () => readSrc('app/api/export/leads/route.ts')

  it('imports orgHasFeature', () => {
    expect(src()).toContain("import { orgHasFeature } from '@/lib/billing/entitlements-server'")
  })

  it('checks csv_export before querying leads, and denies with 403', () => {
    const s = src()
    const checkIdx = s.indexOf("orgHasFeature(orgId, 'csv_export')")
    const queryIdx = s.indexOf('await listWidgetLeads(')
    expect(checkIdx).toBeGreaterThan(-1)
    expect(checkIdx).toBeLessThan(queryIdx)

    const checkBlock = s.slice(checkIdx, checkIdx + 100)
    expect(checkBlock).toContain('403')
  })
})

describe('Tickets/Leads dashboard pages — CSV export button is gated, not unconditional', () => {
  it('tickets page checks csv_export server-side and renders LockedCsvExportButton when false', () => {
    const s = readSrc('app/(dashboard)/tickets/page.tsx')
    expect(s).toContain("import { orgHasFeature } from '@/lib/billing/entitlements-server'")
    expect(s).toContain("import { LockedCsvExportButton } from '@/components/billing/locked-csv-export-button'")
    expect(s).toContain("const canExportCsv = await orgHasFeature(orgId, 'csv_export')")
    expect(s).toContain('{canExportCsv ? (')
    expect(s).toContain('<LockedCsvExportButton')
  })

  it('leads page checks csv_export server-side and renders LockedCsvExportButton when false', () => {
    const s = readSrc('app/(dashboard)/leads/page.tsx')
    expect(s).toContain("import { orgHasFeature } from '@/lib/billing/entitlements-server'")
    expect(s).toContain("import { LockedCsvExportButton } from '@/components/billing/locked-csv-export-button'")
    expect(s).toContain("const canExportCsv = await orgHasFeature(orgId, 'csv_export')")
    expect(s).toContain('{canExportCsv ? (')
    expect(s).toContain('<LockedCsvExportButton')
  })
})

describe('components/billing/locked-csv-export-button.tsx', () => {
  const src = () => readSrc('components/billing/locked-csv-export-button.tsx')

  it('triggers checkout for the standard plan rather than downloading anything', () => {
    const s = src()
    expect(s).toContain("upgrade('standard')")
    expect(s).not.toContain('href=')
  })
})

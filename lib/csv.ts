// Characters that make a spreadsheet treat a cell as a formula rather than
// text. Tab and carriage return are included because Excel strips leading
// whitespace before deciding, so " =1+1" is still a formula to it.
const FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r']

// Quoting alone does not stop a formula from evaluating — a quoted cell is
// still parsed as a formula once the quotes are consumed as CSV syntax. The
// standard mitigation is a leading apostrophe, which spreadsheets consume as
// "treat the rest as literal text" and do not display.
const FORMULA_GUARD = "'"

/**
 * Escapes one value for a CSV cell.
 *
 * Two separate jobs, and the second is easy to miss:
 *
 * 1. CSV syntax — quote the cell and double its quotes when it contains a
 *    delimiter, a quote, or a newline, so the file parses back correctly.
 * 2. Formula neutralisation — a cell starting with `=`, `+`, `-`, `@`, tab or
 *    CR is executed as a formula by Excel, Sheets, and LibreOffice when the
 *    file is opened. Exports here carry data that originated outside the
 *    product (a lead address typed into the public widget, ticket text from
 *    Discord/Slack/email), so cell contents are untrusted input that happens
 *    to be delivered by way of a file the customer opens themselves.
 *
 * Numbers are exempt from the formula guard: `-5` is a legitimate negative
 * value, and prefixing it would corrupt real data. Only strings are guarded,
 * which is where untrusted input actually arrives.
 */
export function escapeCSV(value: string | number | null | undefined): string {
  if (value == null) return ''
  if (typeof value === 'number') return String(value)

  const guarded = FORMULA_PREFIXES.some((p) => value.startsWith(p))
    ? `${FORMULA_GUARD}${value}`
    : value

  if (/[",\n\r\t]/.test(guarded)) {
    return `"${guarded.replace(/"/g, '""')}"`
  }
  return guarded
}

/** Joins one row's already-escaped cells. */
export function toCSVRow(values: (string | number | null | undefined)[]): string {
  return values.map(escapeCSV).join(',')
}

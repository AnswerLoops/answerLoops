type Level = 'debug' | 'info' | 'warn' | 'error'

interface LogFields {
  module?: string
  ticketId?: number
  orgId?: number
  durationMs?: number
  error?: unknown
  [key: string]: unknown
}

const IS_PROD = process.env.NODE_ENV === 'production'

function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return { message: err.message, name: err.name, stack: err.stack }
  }
  return { raw: String(err) }
}

function log(level: Level, message: string, fields: LogFields = {}): void {
  const { error, ...rest } = fields
  const entry: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...rest,
    ...(error !== undefined ? { error: serializeError(error) } : {}),
  }

  if (IS_PROD) {
    // JSON to stdout — structured for log aggregators
    process.stdout.write(JSON.stringify(entry) + '\n')
  } else {
    const prefix = `[${entry.ts}] ${level.toUpperCase().padEnd(5)} ${fields.module ? `[${fields.module}]` : ''}`
    const detail = Object.keys(rest).filter((k) => k !== 'module').length
      ? ' ' + JSON.stringify(rest)
      : ''
    if (level === 'error' || level === 'warn') {
      console.error(`${prefix} ${message}${detail}`, error ?? '') // nosemgrep: javascript.lang.security.audit.unsafe-formatstring.unsafe-formatstring
    } else {
      console.log(`${prefix} ${message}${detail}`) // nosemgrep: javascript.lang.security.audit.unsafe-formatstring.unsafe-formatstring
    }
  }
}

export const logger = {
  debug: (msg: string, fields?: LogFields) => log('debug', msg, fields),
  info:  (msg: string, fields?: LogFields) => log('info',  msg, fields),
  warn:  (msg: string, fields?: LogFields) => log('warn',  msg, fields),
  error: (msg: string, fields?: LogFields) => log('error', msg, fields),
}

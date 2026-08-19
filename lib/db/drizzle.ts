import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const globalForDb = globalThis as unknown as {
  __communityPg?: postgres.Sql
}

function getPool(): postgres.Sql {
  if (!globalForDb.__communityPg) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL is not set')
    globalForDb.__communityPg = postgres(url, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      max_lifetime: 1800,
    })
  }
  return globalForDb.__communityPg
}

export function getDb() {
  return drizzle(getPool(), { schema })
}

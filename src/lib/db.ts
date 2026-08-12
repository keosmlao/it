import { Pool, type QueryResultRow } from 'pg'

const connectionString = process.env.DATABASE_URL
const schema = process.env.DATABASE_SCHEMA ?? 'public'

if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Copy .env.example to .env.local first.')
}

// Next.js hot-reloads modules in dev, so keep one pool on globalThis
// instead of opening a new one on every reload.
const globalForDb = globalThis as unknown as { pgPool?: Pool }

export const pool =
  globalForDb.pgPool ??
  new Pool({
    connectionString,
    // every connection starts with the `it` schema first on the search path
    options: `-c search_path=${schema},public`,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  })

if (process.env.NODE_ENV !== 'production') {
  globalForDb.pgPool = pool
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
) {
  const result = await pool.query<T>(text, params)
  return result.rows
}

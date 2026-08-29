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

/** ຄືກັນກັບ `query` ແຕ່ແລ່ນຢູ່ໃນ transaction ທີ່ `tx` ເປີດໄວ້ */
export type Run = <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
) => Promise<T[]>

/**
 * ຫຼາຍຄຳສັ່ງທີ່ຕ້ອງສຳເລັດ ຫຼື ລົ້ມພ້ອມກັນ
 *
 * ເຊັ່ນ ລົງທະບຽນເຄື່ອງ + ບັນທຶກສະເປັກ: ຖ້າອັນທີສອງລົ້ມ ແລ້ວອັນທຳອິດຄ້າງ
 * ຈະໄດ້ຄອມທີ່ບໍ່ມີສະເປັກ ທັງທີ່ກົດບັງຄັບວ່າຕ້ອງມີ.
 *
 * ຄືນ connection ໃຫ້ pool ສະເໝີ ເຖິງແມ່ນ rollback ເອງກໍ່ລົ້ມ
 */
export async function tx<T>(fn: (run: Run) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('begin')
    const result = await fn(async (text, params) => {
      const r = await client.query(text, params)
      return r.rows
    })
    await client.query('commit')
    return result
  } catch (err) {
    await client.query('rollback').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}

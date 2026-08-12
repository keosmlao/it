// Usage: npm run db:check   (reads .env.local)
import pg from 'pg'

const schema = process.env.DATABASE_SCHEMA ?? 'public'

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  options: `-c search_path=${schema},public`,
  connectionTimeoutMillis: 10000,
})

try {
  await client.connect()
  const { rows } = await client.query(
    'select current_database() as db, current_schema() as schema, version()'
  )
  console.log('Connected:', rows[0].db, '/ schema:', rows[0].schema)

  const tables = await client.query(
    `select table_name from information_schema.tables
      where table_schema = $1 order by table_name`,
    [schema]
  )
  console.log(`Tables in "${schema}" (${tables.rowCount}):`)
  console.log(tables.rows.map((r) => '  - ' + r.table_name).join('\n') || '  (none)')
} catch (e) {
  console.error('FAILED:', e.code || '', e.message)
  process.exitCode = 1
} finally {
  await client.end().catch(() => {})
}

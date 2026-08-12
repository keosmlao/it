// Usage: npm run db:migrate
// Runs every .sql file in db/migrations in filename order, once each, inside a
// transaction. Applied files are recorded in it.schema_migrations.
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import pg from 'pg'

const dir = path.join(process.cwd(), 'db', 'migrations')
const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()

await client.query(`
  create schema if not exists it;
  create table if not exists it.schema_migrations (
    filename   text primary key,
    applied_at timestamptz not null default now()
  )`)

const { rows } = await client.query('select filename from it.schema_migrations')
const applied = new Set(rows.map((r) => r.filename))

const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()
let ran = 0

for (const file of files) {
  if (applied.has(file)) {
    console.log(`  skip    ${file}`)
    continue
  }
  const sql = await readFile(path.join(dir, file), 'utf8')
  try {
    await client.query('begin')
    await client.query(sql)
    await client.query('insert into it.schema_migrations (filename) values ($1)', [file])
    await client.query('commit')
    console.log(`  applied ${file}`)
    ran++
  } catch (e) {
    await client.query('rollback')
    console.error(`  FAILED  ${file}: ${e.message}`)
    process.exitCode = 1
    break
  }
}

console.log(ran ? `\n${ran} migration(s) applied.` : '\nAlready up to date.')
await client.end()

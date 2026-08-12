// Usage: npm run db:check-sql
//
// Extracts every SQL string from src/ and asks PostgreSQL to PREPARE it.
// PREPARE runs the planner's type-inference step without executing anything,
// so it catches exactly the errors that only surface at runtime — unknown
// columns, syntax slips, and "inconsistent types deduced for parameter $n"
// (PG11 cannot infer a parameter used both as a column value and inside a
// comparison, so those need explicit ::casts).
//
// Statements built with template interpolation (dynamic WHERE clauses) are
// skipped — they cannot be reconstructed without running the code.
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import pg from 'pg'

const ROOT = path.join(process.cwd(), 'src')

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(full)
    else if (/\.tsx?$/.test(entry.name)) yield full
  }
}

/** Pull out backtick and quoted strings that look like complete SQL. */
function extractSql(source) {
  const found = []
  const backticks = source.match(/`[^`]*`/g) ?? []
  const singles = source.match(/'[^'\n]*'/g) ?? []

  for (const raw of [...backticks, ...singles]) {
    const sql = raw.slice(1, -1).trim()
    // A real statement names its target and is longer than a bare keyword —
    // this keeps audit-log action names like 'update' out of the results.
    if (!/^(select|insert into|update|delete from|with)\s+\S/i.test(sql)) continue
    if (sql.length < 20) continue
    if (sql.includes('${')) continue // dynamic — cannot check statically
    found.push(sql)
  }
  return found
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()
await client.query('begin')

let checked = 0
const failures = []
let index = 0

for await (const file of walk(ROOT)) {
  const source = await readFile(file, 'utf8')

  for (const sql of extractSql(source)) {
    index++
    try {
      await client.query('savepoint sp')
      await client.query(`prepare check_${index} as ${sql}`)
      await client.query('release savepoint sp')
      checked++
    } catch (e) {
      await client.query('rollback to savepoint sp')
      failures.push({
        file: path.relative(process.cwd(), file),
        message: e.message,
        sql,
      })
    }
  }
}

await client.query('rollback')
await client.end()

console.log(`Checked ${checked} SQL statement(s).`)

if (failures.length) {
  console.error(`\n${failures.length} statement(s) failed:\n`)
  for (const f of failures) {
    console.error(`  ${f.file}`)
    console.error(`    ${f.sql.replace(/\n/g, '\n    ')}`)
    console.error(`    → ${f.message}\n`)
  }
  process.exitCode = 1
} else {
  console.log('All statements prepare cleanly.')
}

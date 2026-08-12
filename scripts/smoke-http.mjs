// Usage: node --env-file=.env.local scripts/smoke-http.mjs [baseUrl] [path...]
// Creates a temporary session, GETs each page, reports status + size,
// then revokes the session. Defaults to the stock/recovery pages.
import pg from 'pg'
import crypto from 'node:crypto'

const base = process.argv[2] ?? 'http://localhost:3100'
const paths =
  process.argv.length > 3
    ? process.argv.slice(3)
    : [
        '/assets/survey',
        '/assets/survey?state=never_lent',
        '/assets/survey?state=all&q=note',
        '/assets/recovery',
        '/assets/recovery?reason=former&status=all',
        '/assets/recovery?reason=long_held&status=all',
        '/assets/recovery?status=all&q=a',
      ]

const c = new pg.Client({ connectionString: process.env.DATABASE_URL })
await c.connect()

const token = crypto.randomBytes(32).toString('hex')
let failed = 0

try {
  const staff = (
    await c.query(`select employee_id from it.v_it_staff where role = 'manager' limit 1`)
  ).rows[0]
  if (!staff) throw new Error('ບໍ່ພົບຜູ້ຈັດການ IT ໃນ v_it_staff')

  await c.query(
    `insert into it.sessions (token, employee_id, expires_at, user_agent)
     values ($1, $2, now() + interval '10 minutes', 'smoke-http')`,
    [token, staff.employee_id]
  )

  for (const p of paths) {
    const started = Date.now()
    const res = await fetch(base + p, {
      headers: { cookie: `it_session=${token}` },
      redirect: 'manual',
    })
    const body = await res.text()
    const ms = Date.now() - started
    const ok = res.status === 200 && !body.includes('Application error')
    if (!ok) failed++
    console.log(
      `${ok ? '✓' : '✗'} ${String(res.status).padEnd(3)} ${String(ms).padStart(5)}ms ` +
        `${String(body.length).padStart(7)}B  ${p}`
    )
    if (!ok) console.log(body.slice(0, 600))
  }
} catch (e) {
  console.error('FAILED:', e.message)
  failed++
} finally {
  await c.query(`delete from it.sessions where token = $1`, [token])
  await c.end()
}

process.exitCode = failed ? 1 : 0

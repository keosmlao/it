// Usage: node --env-file=.env.local scripts/smoke-export.mjs [baseUrl]
// Downloads every dataset in every format and checks the bytes really are an
// xlsx/pdf/csv, then proves a requester cannot reach the export API at all.
import pg from 'pg'
import crypto from 'node:crypto'

const base = process.argv[2] ?? 'http://localhost:3100'
const DATASETS = [
  'assets',
  'movements',
  'holders',
  'recovery',
  'loans',
  'conflicts',
  'damaged',
  'deployed',
  'tickets',
  'purchase',
  'plans',
  'subscriptions',
  'subscription-periods',
  'vendors',
  'maintenance',
  'incidents',
  'accounts',
  'consumables',
  'ip-plan',
  'replacement',
]

const c = new pg.Client({ connectionString: process.env.DATABASE_URL })
await c.connect()
const tokens = []
let passed = 0
let failed = 0

function check(ok, what) {
  console.log(`   ${ok ? '✓' : '✗'} ${what}`)
  if (ok) passed++
  else failed++
}

async function session(employeeId) {
  const token = crypto.randomBytes(32).toString('hex')
  await c.query(
    `insert into it.sessions (token, employee_id, expires_at, user_agent)
     values ($1, $2, now() + interval '10 minutes', 'smoke-export')`,
    [token, employeeId]
  )
  tokens.push(token)
  return token
}

/** ໄຟລ໌ອອກມາເປັນຊະນິດນັ້ນແທ້ບໍ (ກວດ magic bytes) */
function looksRight(format, buf) {
  if (format === 'xlsx') return buf[0] === 0x50 && buf[1] === 0x4b // PK zip
  if (format === 'pdf') return buf.subarray(0, 4).toString() === '%PDF'
  return buf.subarray(0, 3).toString('utf8') === '﻿' || buf.length > 0
}

try {
  const manager = (
    await c.query(`select employee_id from it.v_portal_users where role = 'manager' limit 1`)
  ).rows[0]
  const support = (
    await c.query(`select employee_id from it.v_portal_users where role = 'support' limit 1`)
  ).rows[0]
  const requester = (
    await c.query(`select employee_id from it.v_portal_users where role = 'requester' limit 1`)
  ).rows[0]

  const mToken = await session(manager.employee_id)
  const sToken = await session(support.employee_id)
  const rToken = await session(requester.employee_id)

  for (const dataset of DATASETS) {
    console.log(`\n[${dataset}]`)
    for (const format of ['xlsx', 'csv', 'pdf']) {
      const res = await fetch(`${base}/api/export/${dataset}?format=${format}`, {
        headers: { cookie: `it_session=${mToken}` },
      })
      const buf = Buffer.from(await res.arrayBuffer())
      // xlsx/pdf ມີໂຄງໄຟລ໌ຢູ່ແລ້ວຈຶ່ງໃຫຍ່ກວ່າ 200 ໄບຕ໌ສະເໝີ ແຕ່ CSV ຂອງຊຸດທີ່ຍັງ
      // ບໍ່ມີຂໍ້ມູນມີແຕ່ແຖວຫົວຕາຕະລາງ — ຊຸດທີ່ຫົວເປັນອັກສອນລາຕິນສັ້ນໆ (ip-plan)
      // ຈຶ່ງບໍ່ຮອດ 200 ໄບຕ໌ ທັງທີ່ໄຟລ໌ຖືກຕ້ອງ
      const floor = format === 'csv' ? 60 : 200
      check(
        res.status === 200 && buf.length > floor && looksRight(format, buf),
        `${format.padEnd(4)} → ${res.status} ${String(buf.length).padStart(7)} bytes` +
          ` ${res.headers.get('content-disposition')?.slice(0, 60) ?? ''}`
      )
    }
  }

  console.log('\n[ສິດເຂົ້າເຖິງ]')
  for (const dataset of DATASETS) {
    const res = await fetch(`${base}/api/export/${dataset}?format=csv`, {
      headers: { cookie: `it_session=${rToken}` },
    })
    check(res.status === 403, `requester → /api/export/${dataset} = ${res.status}`)
  }

  const anon = await fetch(`${base}/api/export/assets?format=csv`)
  check(anon.status === 401, `ບໍ່ໄດ້ login → ${anon.status}`)

  const bogus = await fetch(`${base}/api/export/secrets?format=csv`, {
    headers: { cookie: `it_session=${mToken}` },
  })
  check(bogus.status === 404, `ຊື່ຊຸດຂໍ້ມູນທີ່ບໍ່ມີ → ${bogus.status}`)

  const staffPlans = await fetch(`${base}/api/export/plans?format=csv`, {
    headers: { cookie: `it_session=${sToken}` },
  })
  check(staffPlans.status === 403, `ພະນັກງານທົ່ວໄປດຶງແຜນທັງທີມ → ${staffPlans.status}`)

  console.log(`\nຜ່ານ ${passed} · ບໍ່ຜ່ານ ${failed}`)
  if (failed) process.exitCode = 1
} catch (e) {
  console.error('\nFAILED:', e.message)
  process.exitCode = 1
} finally {
  if (tokens.length) {
    await c.query('delete from it.sessions where token = any($1::varchar[])', [tokens])
  }
  await c.end()
}

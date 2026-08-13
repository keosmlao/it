// Usage: node --env-file=.env.local scripts/smoke-requester.mjs [baseUrl]
// Signs in as a non-IT employee and proves the role boundary holds over HTTP:
// the IT staff area redirects away, the portal works, and other people's
// tickets stay invisible. Sessions are revoked at the end.
import pg from 'pg'
import crypto from 'node:crypto'

const base = process.argv[2] ?? 'http://localhost:3100'
const c = new pg.Client({ connectionString: process.env.DATABASE_URL })
await c.connect()

const tokens = []
const cleanupTickets = []
let passed = 0
let failed = 0

function check(condition, what) {
  if (condition) {
    console.log(`   ✓ ${what}`)
    passed++
  } else {
    console.log(`   ✗ ${what}`)
    failed++
  }
}

async function session(employeeId) {
  const token = crypto.randomBytes(32).toString('hex')
  await c.query(
    `insert into it.sessions (token, employee_id, expires_at, user_agent)
     values ($1, $2, now() + interval '10 minutes', 'smoke-requester')`,
    [token, employeeId]
  )
  tokens.push(token)
  return token
}

async function get(path, token) {
  const res = await fetch(base + path, {
    headers: { cookie: `it_session=${token}` },
    redirect: 'manual',
  })
  return { status: res.status, location: res.headers.get('location'), body: await res.text() }
}

try {
  const requester = (
    await c.query(
      `select employee_id, employee_code, fullname_lo, department_name
         from it.v_portal_users where role = 'requester' limit 1`
    )
  ).rows[0]
  const staff = (
    await c.query(`select employee_id from it.v_portal_users where role = 'manager' limit 1`)
  ).rows[0]

  check(!!requester, `ມີຜູ້ໃຊ້ບົດບາດ requester (${requester?.fullname_lo})`)
  console.log(`   → ${requester.department_name ?? 'ບໍ່ລະບຸພະແນກ'}`)

  const total = (await c.query('select count(*) from it.v_portal_users')).rows[0]
  const itCount = (await c.query('select count(*) from it.v_it_staff')).rows[0]
  console.log(
    `   ຜູ້ໃຊ້ທັງໝົດ ${total.count} ຄົນ (ພະແນກ IT ${itCount.count} · ພະແນກອື່ນ ${
      Number(total.count) - Number(itCount.count)
    })`
  )

  const rToken = await session(requester.employee_id)
  const sToken = await session(staff.employee_id)

  console.log('\n[1] ໜ້າພາຍໃນຂອງ IT ຕ້ອງເຂົ້າບໍ່ໄດ້')
  for (const path of [
    '/',
    '/tickets',
    '/assets',
    '/assets/holders',
    '/reports',
    '/admin',
    '/purchase',
    '/plans',
    '/worklogs',
  ]) {
    const r = await get(path, rToken)
    check(
      r.status >= 300 && r.status < 400 && (r.location ?? '').includes('/my'),
      `${path} → ${r.status} ${r.location ?? ''}`
    )
  }

  console.log('\n[2] ໜ້າຂອງພະນັກງານຕ້ອງເຂົ້າໄດ້')
  for (const path of ['/my', '/my/tickets', '/my/tickets?status=all', '/my/tickets/new']) {
    const r = await get(path, rToken)
    check(r.status === 200, `${path} → ${r.status}`)
  }

  console.log('\n[3] ພະນັກງານ IT ຍັງເຂົ້າໜ້າພາຍໃນໄດ້ຕາມເກົ່າ')
  for (const path of ['/', '/tickets', '/assets', '/purchase']) {
    const r = await get(path, sToken)
    check(r.status === 200, `${path} → ${r.status}`)
  }

  console.log('\n[4] ເບິ່ງ ticket ຂອງຄົນອື່ນບໍ່ໄດ້')
  const other = (
    await c.query(
      `select id, ticket_no from it.v_tickets
        where requester_employee_id <> $1 limit 1`,
      [requester.employee_id]
    )
  ).rows[0]

  if (other) {
    const r = await get(`/my/tickets/${other.id}`, rToken)
    const full = (
      await c.query('select ticket_no, title, description from it.tickets where id = $1', [
        other.id,
      ])
    ).rows[0]

    // ໝາຍເຫດ: ໜ້ານີ້ມີ loading.tsx ຈຶ່ງສົ່ງໂຄງໜ້າອອກກ່ອນ (streaming)
    // ລະຫັດຈຶ່ງເປັນ 200 ແທນ 404 — ສິ່ງທີ່ຕ້ອງພິສູດແທ້ຄື "ຂໍ້ມູນບໍ່ຮົ່ວ"
    const leaked =
      r.body.includes(full.ticket_no) ||
      r.body.includes(full.title) ||
      (full.description ? r.body.includes(full.description) : false)

    check(!leaked, `/my/tickets/${other.id} (${other.ticket_no}) — ຂໍ້ມູນບໍ່ຮົ່ວອອກມາ`)
    check(
      /not.?found|ບໍ່ພົບ|404/i.test(r.body),
      `/my/tickets/${other.id} — ສະແດງໜ້າ "ບໍ່ພົບ" ແທນ`
    )
  } else {
    console.log('   – ຂ້າມ: ຍັງບໍ່ມີ ticket ຂອງຄົນອື່ນໃນຖານຂໍ້ມູນ')
  }

  console.log('\n[5] ບັນທຶກພາຍໃນຂອງທີມ IT ບໍ່ຫຼຸດອອກໄປ')
  // ຕ້ອງ commit ຈິງ ເພາະ server ອ່ານຄົນລະ connection — ລຶບຖິ້ມທ້າຍສຸດ
  // ສ້າງ ticket ຂອງຜູ້ແຈ້ງເອງເພື່ອທົດສອບ ແລ້ວລຶບຖິ້ມທ້າຍສຸດ
  // (ພະນັກງານ IT ເຫັນບັນທຶກພາຍໃນຂອງຕົນເອງໄດ້ຢູ່ແລ້ວ ຈຶ່ງບໍ່ແມ່ນກໍລະນີທີ່ຕ້ອງກວດ)
  const made = (
    await c.query(
      `insert into it.tickets
         (title, category_code, priority, requester_employee_id,
          sla_respond_due_at, sla_resolve_due_at, created_by)
       select 'SMOKE ທົດສອບຂອບເຂດການເບິ່ງເຫັນ', c.code, s.priority, $1::int,
              now() + (s.respond_minutes || ' minutes')::interval,
              now() + (s.resolve_minutes || ' minutes')::interval, $1::int
         from it.ticket_categories c
         join it.sla_policies s on true
        order by c.sort_order, s.sort_order limit 1
       returning id`,
      [requester.employee_id]
    )
  ).rows[0]
  cleanupTickets.push(made.id)

  const publicBody = `SMOKE-ສາທາລະນະ-${made.id}`
  const secretBody = `SMOKE-ຄວາມລັບ-${made.id}`
  await c.query(
    `insert into it.ticket_comments (ticket_id, body, is_internal, author_employee_id)
     values ($1::bigint, $2::text, false, $3::int),
            ($1::bigint, $4::text, true,  $3::int)`,
    [made.id, publicBody, staff.employee_id, secretBody]
  )

  const r = await get(`/my/tickets/${made.id}`, rToken)
  check(r.status === 200, `ຜູ້ແຈ້ງເປີດ ticket ຂອງຕົນໄດ້ → ${r.status}`)
  check(r.body.includes(publicBody), 'ເຫັນຂໍ້ຄວາມທຳມະດາຂອງທີມ IT')
  check(!r.body.includes(secretBody), 'ບໍ່ເຫັນບັນທຶກພາຍໃນ')

  const s = await get(`/tickets/${made.id}`, sToken)
  check(
    s.status === 200 && s.body.includes(secretBody),
    'ພະນັກງານ IT ຍັງເຫັນບັນທຶກພາຍໃນຢູ່ໜ້າພາຍໃນ'
  )

  console.log(`\nຜ່ານ ${passed} · ບໍ່ຜ່ານ ${failed}`)
  if (failed) process.exitCode = 1
} catch (e) {
  console.error('\nFAILED:', e.message)
  process.exitCode = 1
} finally {
  if (tokens.length) {
    await c.query('delete from it.sessions where token = any($1::varchar[])', [tokens])
  }
  if (cleanupTickets.length) {
    // ຂໍ້ຄວາມຖືກລຶບຕາມດ້ວຍ on delete cascade
    const r = await c.query('delete from it.tickets where id = any($1::bigint[])', [
      cleanupTickets,
    ])
    console.log(`ລຶບ ticket ທົດສອບ ${r.rowCount} ອັນອອກແລ້ວ`)
  }
  await c.end()
}

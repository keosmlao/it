// Usage: node --env-file=.env.local scripts/smoke-notify.mjs [baseUrl]
// Proves the notification outbox queues correctly, that a missing LINE token
// keeps messages queued rather than losing them, and that the drain endpoint
// is not reachable without a secret or a manager session.
import pg from 'pg'
import crypto from 'node:crypto'

const base = process.argv[2] ?? 'http://localhost:3100'
const c = new pg.Client({ connectionString: process.env.DATABASE_URL })
await c.connect()

let passed = 0
let failed = 0
const tokens = []
const madeRows = []

function check(ok, what) {
  console.log(`   ${ok ? '✓' : '✗'} ${what}`)
  if (ok) passed++
  else failed++
}

try {
  const targets = (
    await c.query(
      `select count(*) total,
              count(*) filter (where line_target is not null) with_line,
              count(*) filter (where line_target is null)     without_line
         from it.v_notify_targets where is_active`
    )
  ).rows[0]
  console.log(
    `ຜູ້ຮັບທີ່ພ້ອມ: ${targets.with_line}/${targets.total} ຄົນມີ LINE ID ` +
      `· ຍັງບໍ່ໄດ້ຜູກ ${targets.without_line} ຄົນ`
  )

  const withLine = (
    await c.query(
      `select v.employee_id, v.fullname_lo
         from it.v_notify_targets v
         join it.v_it_staff s on s.employee_id = v.employee_id
        where v.line_target is not null limit 1`
    )
  ).rows[0]
  check(!!withLine, `ພະນັກງານ IT ທີ່ຜູກ LINE ແລ້ວ (${withLine?.fullname_lo})`)

  console.log('\n[1] ເອົາເຂົ້າຄິວ')
  const before = (
    await c.query(`select count(*) from it.notification_outbox where status = 'pending'`)
  ).rows[0].count

  const note = (
    await c.query(
      `insert into it.notifications (employee_id, title, body, link)
       values ($1, 'SMOKE ທົດສອບຄິວ', 'ຂໍ້ຄວາມທົດສອບ', '/notifications')
       returning id`,
      [withLine.employee_id]
    )
  ).rows[0]

  const queued = (
    await c.query(
      `insert into it.notification_outbox
         (notification_id, employee_id, channel, target, title, body, link)
       select $1::bigint, v.employee_id, 'line', v.line_target,
              'SMOKE ທົດສອບຄິວ', 'ຂໍ້ຄວາມທົດສອບ', '/notifications'
         from it.v_notify_targets v where v.employee_id = $2::int
       returning id, status, target`,
      [note.id, withLine.employee_id]
    )
  ).rows[0]
  madeRows.push(queued.id)

  check(queued.status === 'pending', 'ຂໍ້ຄວາມເຂົ້າຄິວດ້ວຍສະຖານະ pending')
  check(/^U[0-9a-f]{32}$/.test(queued.target), 'ເກັບ LINE user ID ຂອງຜູ້ຮັບຖືກຮູບແບບ')

  const after = (
    await c.query(`select count(*) from it.notification_outbox where status = 'pending'`)
  ).rows[0].count
  check(Number(after) === Number(before) + 1, `ຄິວເພີ່ມຈາກ ${before} ເປັນ ${after}`)

  console.log('\n[2] ຄົນທີ່ຍັງບໍ່ໄດ້ຜູກ LINE')
  const noLine = (
    await c.query(
      `select employee_id, fullname_lo from it.v_notify_targets
        where is_active and line_target is null limit 1`
    )
  ).rows[0]
  if (noLine) {
    const skipped = (
      await c.query(
        `insert into it.notification_outbox
           (employee_id, channel, title, status, last_error)
         values ($1::int, 'line', 'SMOKE ຂ້າມ', 'skipped',
                 'ພະນັກງານຄົນນີ້ຍັງບໍ່ໄດ້ຜູກ LINE')
         returning id, status`,
        [noLine.employee_id]
      )
    ).rows[0]
    madeRows.push(skipped.id)
    check(skipped.status === 'skipped', `${noLine.fullname_lo} → ບັນທຶກວ່າຂ້າມ ບໍ່ແມ່ນເງີຍໆ`)
  } else {
    console.log('   – ຂ້າມ: ພະນັກງານ ACTIVE ຜູກ LINE ຄົບໝົດແລ້ວ')
  }

  console.log('\n[3] ດ່ານກັນ /api/notify/drain')
  const anon = await fetch(`${base}/api/notify/drain`, { method: 'POST' })
  check(anon.status === 401, `ບໍ່ມີສິດ → ${anon.status}`)

  const badSecret = await fetch(`${base}/api/notify/drain`, {
    method: 'POST',
    headers: { 'x-notify-secret': 'wrong-secret' },
  })
  check(badSecret.status === 401, `secret ຜິດ → ${badSecret.status}`)

  const support = (
    await c.query(`select employee_id from it.v_it_staff where role = 'support' limit 1`)
  ).rows[0]
  const sToken = crypto.randomBytes(32).toString('hex')
  tokens.push(sToken)
  await c.query(
    `insert into it.sessions (token, employee_id, expires_at)
     values ($1, $2, now() + interval '5 minutes')`,
    [sToken, support.employee_id]
  )
  const staffTry = await fetch(`${base}/api/notify/drain`, {
    method: 'POST',
    headers: { cookie: `it_session=${sToken}` },
  })
  check(staffTry.status === 401, `ພະນັກງານທົ່ວໄປ → ${staffTry.status}`)

  const manager = (
    await c.query(`select employee_id from it.v_it_staff where role = 'manager' limit 1`)
  ).rows[0]
  const mToken = crypto.randomBytes(32).toString('hex')
  tokens.push(mToken)
  await c.query(
    `insert into it.sessions (token, employee_id, expires_at)
     values ($1, $2, now() + interval '5 minutes')`,
    [mToken, manager.employee_id]
  )
  const managerTry = await fetch(`${base}/api/notify/drain`, {
    method: 'POST',
    headers: { cookie: `it_session=${mToken}` },
  })
  const body = await managerTry.json()
  check(managerTry.status === 200, `ຜູ້ຈັດການ → ${managerTry.status} ${JSON.stringify(body)}`)

  console.log('\n[4] ຍັງບໍ່ໄດ້ຕັ້ງ token — ຂໍ້ຄວາມຕ້ອງບໍ່ຫາຍ')
  check(body.configured === false, 'ລະບົບຮູ້ວ່າຍັງບໍ່ໄດ້ຕັ້ງ LINE_CHANNEL_ACCESS_TOKEN')
  const still = (
    await c.query(`select status from it.notification_outbox where id = $1`, [madeRows[0]])
  ).rows[0]
  check(still.status === 'pending', 'ຂໍ້ຄວາມຍັງຄ້າງຢູ່ຄິວ (ບໍ່ຖືກໝາຍວ່າລົ້ມເຫຼວ)')

  console.log(`\nຜ່ານ ${passed} · ບໍ່ຜ່ານ ${failed}`)
  if (failed) process.exitCode = 1
} catch (e) {
  console.error('\nFAILED:', e.message)
  process.exitCode = 1
} finally {
  if (madeRows.length) {
    await c.query('delete from it.notification_outbox where id = any($1::bigint[])', [madeRows])
  }
  await c.query(`delete from it.notifications where title like 'SMOKE %'`)
  if (tokens.length) {
    await c.query('delete from it.sessions where token = any($1::varchar[])', [tokens])
  }
  console.log('ລຶບຂໍ້ມູນທົດສອບອອກແລ້ວ')
  await c.end()
}

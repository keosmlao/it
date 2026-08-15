// ທົດສອບໂມດູນຄ່າເຊົ່າບໍລິການ — ຂຽນແລ້ວ rollback
//
// ຈຸດທີ່ຕ້ອງແນ່ໃຈ: ອອກລະຫັດ SUB- · ຄິດຄ່າຕໍ່ເດືອນ/ຕໍ່ປີ ແລະ ສະຖານະກຳນົດຖືກ ·
// ງວດຊໍ້າບໍ່ໄດ້ · ຍອດຈ່າຍລວມຖືກ · ບັນທຶກການເຕືອນຊໍ້າບໍ່ໄດ້
import pg from 'pg'

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()

let failed = 0
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failed++
}

const one = async (sql, params = []) => (await client.query(sql, params)).rows[0]

try {
  await client.query('begin')

  const emp = await one('select employee_id from it.v_it_staff limit 1')

  // ---- ລົງທະບຽນສັນຍາລາຍປີ ທີ່ເລີຍກຳນົດແລ້ວ ----
  const sub = await one(
    `insert into it.subscriptions
       (category, service_name, vendor, billing_cycle, amount, currency,
        start_date, next_due_date, owner_employee_id, created_by)
     values ('internet', 'ທົດສອບ Leased Line', 'ETL', 'yearly', 12000000, 'LAK',
             current_date - 400, current_date - 5, $1::int, $1::int)
     returning id, code`,
    [emp.employee_id]
  )
  check('ອອກລະຫັດເປັນ SUB-', sub.code.startsWith('SUB-'), sub.code)

  const view = await one('select * from it.v_subscriptions where id = $1::bigint', [
    sub.id,
  ])
  check('ຄິດຄ່າຕໍ່ເດືອນຈາກຮອບລາຍປີ', Number(view.monthly_amount) === 1000000, view.monthly_amount)
  check('ຄິດຄ່າຕໍ່ປີ', Number(view.yearly_amount) === 12000000, view.yearly_amount)
  check('ຮູ້ວ່າເລີຍກຳນົດແລ້ວ', view.due_status === 'overdue', view.due_status)
  check('ນັບມື້ຄ້າງຖືກ', Number(view.days_to_due) === -5, String(view.days_to_due))
  check('ຍັງບໍ່ມີງວດ', Number(view.period_count) === 0)

  // ---- ບັນທຶກງວດທີ່ຈ່າຍແລ້ວ ----
  await client.query(
    `insert into it.subscription_periods
       (subscription_id, period_start, period_end, due_date, amount, currency,
        status, paid_at, created_by)
     values ($1::bigint, current_date - 5, current_date + 359, current_date - 5,
             12000000, 'LAK', 'paid', current_date, $2::int)`,
    [sub.id, emp.employee_id]
  )

  const paid = await one('select * from it.v_subscriptions where id = $1::bigint', [
    sub.id,
  ])
  check('ຍອດຈ່າຍລວມຖືກ', Number(paid.paid_total) === 12000000, paid.paid_total)
  check('ນັບງວດຖືກ', Number(paid.period_count) === 1)
  check('ບໍ່ມີງວດຄ້າງ', Number(paid.unpaid_count) === 0)

  // ---- ງວດຊໍ້າ ----
  let dup = false
  try {
    await client.query('savepoint s1')
    await client.query(
      `insert into it.subscription_periods
         (subscription_id, period_start, period_end, due_date, amount, currency,
          created_by)
       values ($1::bigint, current_date - 5, current_date + 359, current_date - 5,
               12000000, 'LAK', $2::int)`,
      [sub.id, emp.employee_id]
    )
  } catch {
    dup = true
    await client.query('rollback to savepoint s1')
  }
  check('ບັນທຶກງວດເລີ່ມວັນດຽວກັນຊໍ້າບໍ່ໄດ້', dup)

  // ---- ເລື່ອນກຳນົດແລ້ວສະຖານະປ່ຽນ ----
  await client.query(
    `update it.subscriptions set next_due_date = current_date + 200
      where id = $1::bigint`,
    [sub.id]
  )
  const ok = await one('select due_status from it.v_subscriptions where id = $1::bigint', [
    sub.id,
  ])
  check('ເລື່ອນກຳນົດແລ້ວກັບເປັນປົກກະຕິ', ok.due_status === 'ok', ok.due_status)

  await client.query(
    `update it.subscriptions set next_due_date = current_date + 10
      where id = $1::bigint`,
    [sub.id]
  )
  const soon = await one(
    'select due_status from it.v_subscriptions where id = $1::bigint',
    [sub.id]
  )
  check('ພາຍໃນ 30 ມື້ = ໃກ້ຮອດກຳນົດ', soon.due_status === 'due_soon', soon.due_status)

  // ---- ບັນທຶກການເຕືອນ ----
  const first = await client.query(
    `insert into it.subscription_reminders (subscription_id, due_date, days_before)
     values ($1::bigint, current_date + 10, 30)
     on conflict do nothing returning subscription_id`,
    [sub.id]
  )
  const second = await client.query(
    `insert into it.subscription_reminders (subscription_id, due_date, days_before)
     values ($1::bigint, current_date + 10, 30)
     on conflict do nothing returning subscription_id`,
    [sub.id]
  )
  check('ເຕືອນເທື່ອທຳອິດຈອງໄດ້', first.rowCount === 1)
  check('ເຕືອນຊໍ້າຂັ້ນເກົ່າບໍ່ໄດ້', second.rowCount === 0)

  // ---- ຍົກເລີກແລ້ວອອກຈາກຍອດຄ່າໃຊ້ຈ່າຍ ----
  await client.query(
    `update it.subscriptions
        set status = 'cancelled', next_due_date = null where id = $1::bigint`,
    [sub.id]
  )
  const gone = await one(
    `select count(*) n from it.v_subscriptions
      where id = $1::bigint and status = 'active'`,
    [sub.id]
  )
  check('ຍົກເລີກແລ້ວບໍ່ນັບເປັນຄ່າປະຈຳ', Number(gone.n) === 0)

  const stillThere = await one(
    'select count(*) n from it.v_subscription_periods where subscription_id = $1::bigint',
    [sub.id]
  )
  check('ແຕ່ປະຫວັດການຈ່າຍຍັງຢູ່', Number(stillThere.n) === 1)
} finally {
  await client.query('rollback')
  await client.end()
}

console.log(failed === 0 ? '\nຜ່ານທັງໝົດ' : `\nຕົກ ${failed} ຂໍ້`)
process.exit(failed === 0 ? 0 : 1)

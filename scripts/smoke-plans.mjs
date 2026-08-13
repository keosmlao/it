// Usage: node --env-file=.env.local scripts/smoke-plans.mjs
// Walks a daily plan through plan → progress → close-with-carry, inside one
// rolled-back transaction. (ໃບສະເໜີຊື້ຍ້າຍໄປ scripts/smoke-pr-erp.mjs ແລ້ວ)
import pg from 'pg'

const c = new pg.Client({ connectionString: process.env.DATABASE_URL })
await c.connect()

let passed = 0
function check(condition, what) {
  if (!condition) throw new Error(`assertion failed — ${what}`)
  console.log(`   ✓ ${what}`)
  passed++
}

try {
  await c.query('begin')

  const staff = (await c.query('select employee_id, role, unit_code from it.v_it_staff'))
    .rows
  const manager = staff.find((s) => s.role === 'manager')
  const head = staff.find((s) => s.role === 'head')
  const support = staff.find((s) => s.role === 'support')
  check(!!manager && !!head && !!support, 'ມີຜູ້ຈັດການ, ຫົວໜ້າ ແລະ ພະນັກງານ support')

  // ---------- ແຜນວຽກປະຈຳວັນ ----------
  console.log('\n[2] ແຜນວຽກປະຈຳວັນ')
  const plan = (
    await c.query(
      `insert into it.daily_plans (employee_id, plan_date, focus)
       values ($1, current_date, $2) returning id, status`,
      [support.employee_id, 'ປິດ ticket ຄ້າງໃຫ້ໝົດ']
    )
  ).rows[0]
  check(plan.status === 'draft', 'ແຜນໃໝ່ເລີ່ມທີ່ຮ່າງ')

  let dupBlocked = false
  try {
    await c.query('savepoint sp2')
    await c.query(
      `insert into it.daily_plans (employee_id, plan_date) values ($1, current_date)`,
      [support.employee_id]
    )
  } catch {
    dupBlocked = true
    await c.query('rollback to savepoint sp2')
  }
  check(dupBlocked, '1 ຄົນມີໄດ້ພຽງ 1 ແຜນຕໍ່ວັນ')

  const openTicket = (
    await c.query(
      `select id from it.v_tickets
        where status not in ('resolved','closed','cancelled') limit 1`
    )
  ).rows[0]

  for (const [title, hours, status] of [
    ['ແກ້ printer ຫ້ອງບັນຊີ', 2, 'done'],
    ['ຕິດຕັ້ງເຄື່ອງໃໝ່', 3, 'in_progress'],
    ['ອັບເດດ antivirus', 1, 'todo'],
  ]) {
    await c.query(
      `insert into it.daily_plan_items
         (plan_id, sort_order, title, planned_hours, status, actual_hours, ticket_id)
       select $1::bigint, coalesce(max(sort_order), 0) + 1,
              $2::varchar, $3::numeric, $4::varchar,
              case when $4::varchar = 'done' then $3::numeric end, $5::bigint
         from it.daily_plan_items where plan_id = $1::bigint`,
      [plan.id, title, hours, status, status === 'done' ? (openTicket?.id ?? null) : null]
    )
  }

  let pv = (await c.query('select * from it.v_daily_plans where id = $1', [plan.id]))
    .rows[0]
  check(pv.item_count === '3', 'ນັບຈຳນວນວຽກໃນແຜນຖືກ')
  check(pv.done_count === '1', 'ນັບວຽກທີ່ສຳເລັດຖືກ')
  check(Number(pv.planned_hours) === 6, 'ລວມຊົ່ວໂມງທີ່ວາງແຜນຖືກ (2+3+1)')
  check(Number(pv.actual_hours) === 2, 'ລວມຊົ່ວໂມງທີ່ໃຊ້ຈິງຖືກ')

  if (openTicket) {
    const linked = (
      await c.query(
        `select ticket_no from it.v_daily_plan_items
          where plan_id = $1 and ticket_id is not null`,
        [plan.id]
      )
    ).rows[0]
    check(!!linked?.ticket_no, 'ວຽກທີ່ຜູກ ticket ດຶງເລກ ticket ມາສະແດງໄດ້')
  }

  // ສະຫຼຸບທ້າຍມື້ພ້ອມຍົກວຽກຄ້າງໄປມື້ຕໍ່ໄປ
  const next = (
    await c.query(
      `insert into it.daily_plans (employee_id, plan_date)
       values ($1, current_date + 1) returning id`,
      [support.employee_id]
    )
  ).rows[0]

  await c.query(
    `insert into it.daily_plan_items
       (plan_id, sort_order, title, detail, planned_hours, ticket_id, task_id, project_id)
     select $2::bigint,
            coalesce((select max(sort_order) from it.daily_plan_items
                       where plan_id = $2::bigint), 0)
              + row_number() over (order by sort_order),
            i.title, i.detail, i.planned_hours, i.ticket_id, i.task_id, i.project_id
       from it.daily_plan_items i
      where i.plan_id = $1::bigint
        and i.status in ('todo','in_progress','blocked')`,
    [plan.id, next.id]
  )
  await c.query(
    `update it.daily_plan_items set status = 'carried'
      where plan_id = $1 and status in ('todo','in_progress','blocked')`,
    [plan.id]
  )
  await c.query(
    `update it.daily_plans set status = 'closed', closed_at = now() where id = $1`,
    [plan.id]
  )

  const nextView = (await c.query('select * from it.v_daily_plans where id = $1', [next.id]))
    .rows[0]
  check(nextView.item_count === '2', 'ວຽກທີ່ຍັງບໍ່ແລ້ວ 2 ລາຍການຖືກຍົກໄປມື້ຕໍ່ໄປ')

  pv = (await c.query('select * from it.v_daily_plans where id = $1', [plan.id])).rows[0]
  check(pv.status === 'closed', 'ແຜນມື້ນີ້ຖືກປິດແລ້ວ')
  const carried = (
    await c.query(
      `select count(*) from it.daily_plan_items where plan_id = $1 and status = 'carried'`,
      [plan.id]
    )
  ).rows[0]
  check(Number(carried.count) === 2, 'ວຽກຄ້າງໃນແຜນເກົ່າຖືກໝາຍວ່າຍົກໄປແລ້ວ')

  const teamToday = (
    await c.query(
      `select count(*) from it.v_daily_plans where plan_date = current_date`
    )
  ).rows[0]
  check(Number(teamToday.count) >= 1, 'ໜ້າແຜນທັງທີມດຶງຂໍ້ມູນວັນນີ້ໄດ້')

  await c.query('rollback')
  console.log(`\nທັງໝົດ ${passed} ການກວດຜ່ານ. ຂໍ້ມູນທົດສອບຖືກ rollback ໝົດແລ້ວ.`)
} catch (e) {
  await c.query('rollback')
  console.error('\nFAILED:', e.message)
  process.exitCode = 1
} finally {
  await c.end()
}

// ທົດສອບ SQL ຂອງ "ໃສ່ໄວ ໆ" ແລະ "ກັອບປີ້ແຜນເກົ່າ" — rollback ທ້າຍສຸດ
//
// ຈຸດສຳຄັນທີ່ຕ້ອງຈັບ: ກົດຊໍ້າຕ້ອງບໍ່ໃສ່ວຽກຊໍ້າ ແລະ ກັອບປີ້ຕ້ອງຂ້າມວຽກທີ່ເຮັດແລ້ວ
import pg from 'pg'

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()

let failed = 0
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failed++
}

const ADD_FROM_SOURCE = `
  insert into it.daily_plan_items
    (plan_id, sort_order, title, planned_hours, ticket_id, task_id)
  select $1::bigint,
         coalesce((select max(sort_order) from it.daily_plan_items
                    where plan_id = $1::bigint), 0) + 1,
         $2::varchar, 1, $3::bigint, $4::bigint
   where not exists (
           select 1 from it.daily_plan_items i
            where i.plan_id = $1::bigint
              and (($3::bigint is not null and i.ticket_id = $3::bigint)
                or ($4::bigint is not null and i.task_id = $4::bigint)))
  returning id`

const COPY_PREVIOUS = `
  insert into it.daily_plan_items
    (plan_id, sort_order, title, detail, planned_hours, ticket_id, task_id)
  select $1::bigint,
         coalesce((select max(sort_order) from it.daily_plan_items
                    where plan_id = $1::bigint), 0)
           + row_number() over (order by src.sort_order),
         src.title, src.detail, src.planned_hours, src.ticket_id, src.task_id
    from it.daily_plan_items src
   where src.plan_id = $2::bigint
     and src.status <> 'done'
     and not exists (
           select 1 from it.daily_plan_items i
            where i.plan_id = $1::bigint and i.title = src.title)
  returning id`

const newPlan = async (empId, date) =>
  (
    await client.query(
      `insert into it.daily_plans (employee_id, plan_date) values ($1::int, $2::date)
       returning id`,
      [empId, date]
    )
  ).rows[0].id

try {
  await client.query('begin')

  const emp = (
    await client.query('select employee_id from it.v_it_staff limit 1')
  ).rows[0]

  // ---- ແຜນເກົ່າ: 3 ວຽກ ໜຶ່ງໃນນັ້ນເຮັດແລ້ວ ----
  const oldPlan = await newPlan(emp.employee_id, '2020-01-01')
  await client.query(
    `insert into it.daily_plan_items (plan_id, sort_order, title, planned_hours, status)
     values ($1::bigint, 1, 'ວຽກປະຈຳ A', 2, 'todo'),
            ($1::bigint, 2, 'ວຽກປະຈຳ B', 1, 'todo'),
            ($1::bigint, 3, 'ວຽກແລ້ວ C',  1, 'done')`,
    [oldPlan]
  )

  const todayPlan = await newPlan(emp.employee_id, '2020-01-02')

  // ---- ກັອບປີ້ ----
  let r = await client.query(COPY_PREVIOUS, [todayPlan, oldPlan])
  check('ກັອບປີ້ຂ້າມວຽກທີ່ເຮັດແລ້ວ', r.rowCount === 2, `ໄດ້ ${r.rowCount} ວຽກ`)

  r = await client.query(COPY_PREVIOUS, [todayPlan, oldPlan])
  check('ກັອບປີ້ຊໍ້າ ບໍ່ເພີ່ມຫຍັງ', r.rowCount === 0, `ໄດ້ ${r.rowCount}`)

  const orders = (
    await client.query(
      'select sort_order from it.daily_plan_items where plan_id = $1::bigint order by sort_order',
      [todayPlan]
    )
  ).rows.map((x) => Number(x.sort_order))
  check(
    'ລຳດັບບໍ່ຊໍ້າກັນ',
    new Set(orders).size === orders.length,
    orders.join(',')
  )

  // ---- ໃສ່ຈາກ ticket ----
  const ticket = (
    await client.query('select id from it.v_tickets limit 1')
  ).rows[0]

  if (ticket) {
    r = await client.query(ADD_FROM_SOURCE, [todayPlan, 'ຈາກ ticket', ticket.id, null])
    check('ໃສ່ຈາກ ticket ໄດ້', r.rowCount === 1)

    r = await client.query(ADD_FROM_SOURCE, [todayPlan, 'ຈາກ ticket', ticket.id, null])
    check('ກົດຊໍ້າ ບໍ່ໃສ່ຊໍ້າ', r.rowCount === 0, `ໄດ້ ${r.rowCount}`)
  } else {
    console.log('  skip  ບໍ່ມີ ticket ໃນລະບົບ')
  }

  // ---- ໃສ່ໃນແຜນຫວ່າງ (ບໍ່ມີແຖວເລີຍ) ຕ້ອງໄດ້ sort_order 1 ----
  const empty = await newPlan(emp.employee_id, '2020-01-03')
  r = await client.query(ADD_FROM_SOURCE, [empty, 'ວຽກທຳອິດ', null, null])
  const first = (
    await client.query(
      'select sort_order from it.daily_plan_items where plan_id = $1::bigint',
      [empty]
    )
  ).rows[0]
  check(
    'ແຜນຫວ່າງ ໃສ່ໄດ້ ແລະ ລຳດັບເປັນ 1',
    r.rowCount === 1 && Number(first?.sort_order) === 1
  )

  // ---- ຕາຕະລາງ 7 ມື້ ----
  const week = await client.query(
    `select s.employee_id, d.day::date as plan_date, p.item_count
       from it.v_it_staff s
       cross join generate_series($1::date, $2::date, interval '1 day') as d(day)
       left join it.v_daily_plans p
              on p.employee_id = s.employee_id and p.plan_date = d.day::date
      where ($3::varchar is null or s.unit_code = $3::varchar)`,
    ['2020-01-01', '2020-01-07', null]
  )
  const staffCount = Number(
    (await client.query('select count(*) n from it.v_it_staff')).rows[0].n
  )
  check(
    'ຕາຕະລາງໄດ້ຄົບ ຄົນ × 7 ມື້',
    week.rowCount === staffCount * 7,
    `${week.rowCount} ແຖວ (ຄາດ ${staffCount * 7})`
  )
  check(
    'ຄົນທີ່ບໍ່ວາງແຜນກໍມີແຖວ',
    week.rows.some((x) => x.item_count === null)
  )
} finally {
  await client.query('rollback')
  await client.end()
}

console.log(failed === 0 ? '\nຜ່ານທັງໝົດ' : `\nຕົກ ${failed} ຂໍ້`)
process.exit(failed === 0 ? 0 : 1)

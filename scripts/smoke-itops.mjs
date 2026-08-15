// ທົດສອບ 8 ໂມດູນໂຄງລ່າງ IT — ຂຽນແລ້ວ rollback
//
// ຜູ້ຂາຍ · ບຳລຸງຮັກສາ · ເຫດຂັດຂ້ອງ · ບັນຊີຜູ້ໃຊ້ + ຂັ້ນຕອນເຂົ້າ/ອອກ ·
// ຂອງສິ້ນເປືອງ · ເຄືອຂ່າຍ & IP · ງົບປະມານ · ຄະແນນຄວາມພໍໃຈ
//
// ຈຸດທີ່ຕ້ອງແນ່ໃຈ ແມ່ນຄ່າທີ່ **ລະບົບຄິດເອງ** (view) ແລະ ກົດທີ່ **ຖານຂໍ້ມູນບັງຄັບ**
// (unique index, check) ເພາະສອງອັນນີ້ຖ້າຜິດ ໜ້າຈໍຈະສະແດງເລກມົ້ວແບບງຽບໆ
import pg from 'pg'

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()

let failed = 0
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failed++
}
const one = async (sql, params = []) => (await client.query(sql, params)).rows[0]
const rejects = async (sql, params = []) => {
  try {
    await client.query('savepoint sp')
    await client.query(sql, params)
    return false
  } catch {
    await client.query('rollback to savepoint sp')
    return true
  }
}

try {
  await client.query('begin')

  const emp = await one('select employee_id from it.v_it_staff limit 1')
  const me = emp.employee_id

  // ---------------------------------------------------------- ຜູ້ຂາຍ
  console.log('\n[1] ທະບຽນຜູ້ຂາຍ')
  const vendor = await one(
    `insert into it.vendors (name, short_name, support_phone, created_by)
     values ('ບໍລິສັດທົດສອບ ເນັດເວີກ', 'TESTNET', '021 000 000', $1::int)
     returning id`,
    [me]
  )
  check('ເພີ່ມຜູ້ຂາຍໄດ້', Boolean(vendor.id))
  check(
    'ຊື່ຊໍ້າ (ບໍ່ສົນໂຕພິມ) ຖືກກັນ',
    await rejects(
      `insert into it.vendors (name, created_by)
       values ('ບໍລິສັດທົດສອບ ເນັດເວີກ', $1::int)`,
      [me]
    )
  )

  // ---------------------------------------------------- ຄ່າເຊົ່າ + ຜູ້ຂາຍ
  const sub = await one(
    `insert into it.subscriptions
       (category, service_name, billing_cycle, amount, currency, start_date,
        next_due_date, vendor_id, created_by)
     values ('internet', 'ທົດສອບ Leased Line', 'monthly', 1500000, 'LAK',
             current_date - 30, current_date + 5, $1::bigint, $2::int)
     returning id`,
    [vendor.id, me]
  )
  const spend = await one(
    `select yearly_amount, subscription_count from it.v_vendor_spend
      where vendor_id = $1::bigint and currency = 'LAK'`,
    [vendor.id]
  )
  check(
    'ຄິດຍອດຈ່າຍຕໍ່ປີຕໍ່ຜູ້ຂາຍ',
    Number(spend?.yearly_amount) === 18000000,
    String(spend?.yearly_amount)
  )
  const vrow = await one('select vendor_name from it.v_subscriptions where id = $1::bigint', [
    sub.id,
  ])
  check('ສັນຍາເຊົ່າຊີ້ໄປຫາຜູ້ຂາຍໄດ້', vrow?.vendor_name === 'ບໍລິສັດທົດສອບ ເນັດເວີກ')

  // ------------------------------------------------------ ບຳລຸງຮັກສາ
  console.log('\n[2] ບຳລຸງຮັກສາຕາມແຜນ')
  const plan = await one(
    `insert into it.maintenance_plans
       (title, category, interval_days, next_due_date, owner_employee_id, created_by)
     values ('ທົດສອບກູ້ຄືນ backup', 'backup', 90, current_date - 3, $1::int, $1::int)
     returning id, code`,
    [me]
  )
  check('ອອກລະຫັດເປັນ PM-', plan.code.startsWith('PM-'), plan.code)

  let pv = await one('select * from it.v_maintenance_plans where id = $1::bigint', [plan.id])
  check('ຮູ້ວ່າເລີຍກຳນົດ', pv.due_status === 'overdue', pv.due_status)
  check('ນັບມື້ຄ້າງຖືກ', Number(pv.days_to_due) === -3, String(pv.days_to_due))

  await client.query(
    `insert into it.maintenance_logs (plan_id, performed_at, result, note, created_by)
     values ($1::bigint, current_date, 'issue', 'ພົບໄຟລ໌ບໍ່ຄົບ', $2::int)`,
    [plan.id, me]
  )
  // ເລື່ອນກຳນົດນັບຈາກມື້ທີ່ເຮັດແທ້ (ຄືກັບທີ່ server action ເຮັດ)
  await client.query(
    `update it.maintenance_plans
        set last_done_at = current_date, next_due_date = current_date + interval_days
      where id = $1::bigint`,
    [plan.id]
  )
  pv = await one('select * from it.v_maintenance_plans where id = $1::bigint', [plan.id])
  check('ບັນທຶກແລ້ວກຳນົດເລື່ອນໄປ 90 ວັນ', Number(pv.days_to_due) === 90, String(pv.days_to_due))
  check('ກັບເປັນປົກກະຕິ', pv.due_status === 'ok', pv.due_status)
  check('ນັບຄັ້ງທີ່ພົບບັນຫາ', Number(pv.issue_count) === 1)

  const claimed = await client.query(
    `insert into it.maintenance_reminders (plan_id, due_date, days_before)
     values ($1::bigint, current_date + 90, 7) on conflict do nothing returning plan_id`,
    [plan.id]
  )
  const again = await client.query(
    `insert into it.maintenance_reminders (plan_id, due_date, days_before)
     values ($1::bigint, current_date + 90, 7) on conflict do nothing returning plan_id`,
    [plan.id]
  )
  check('ເຕືອນຊໍ້າຂັ້ນເກົ່າບໍ່ໄດ້', claimed.rowCount === 1 && again.rowCount === 0)

  // ------------------------------------------------------- ເຫດຂັດຂ້ອງ
  console.log('\n[3] ເຫດຂັດຂ້ອງລະບົບ')
  const inc = await one(
    `insert into it.incidents
       (title, service, severity, subscription_id, started_at, resolved_at,
        status, created_by)
     values ('ອິນເຕີເນັດຫຼຸດທົດສອບ', 'internet', 'critical', $1::bigint,
             now() - interval '150 minutes', now() - interval '30 minutes',
             'resolved', $2::int)
     returning id, code`,
    [sub.id, me]
  )
  check('ອອກລະຫັດເປັນ INC-', inc.code.startsWith('INC-'), inc.code)

  const iv = await one('select * from it.v_incidents where id = $1::bigint', [inc.id])
  check('ຄິດເວລາລົ້ມເປັນນາທີ', Number(iv.minutes) === 120, String(iv.minutes))
  check('ຜູກກັບສັນຍາເຊົ່າໄດ້', iv.subscription_name === 'ທົດສອບ Leased Line')

  check(
    'ເວລາແກ້ກ່ອນເວລາລົ້ມຖືກກັນ',
    await rejects(
      `insert into it.incidents
         (title, service, started_at, resolved_at, created_by)
       values ('ຜິດລຳດັບ', 'erp', now(), now() - interval '1 hour', $1::int)`,
      [me]
    )
  )

  const openInc = await one(
    `insert into it.incidents (title, service, started_at, created_by)
     values ('ຍັງລົ້ມຢູ່', 'erp', now() - interval '2 hours', $1::int)
     returning id`,
    [me]
  )
  const ov = await one('select minutes, status from it.v_incidents where id = $1::bigint', [
    openInc.id,
  ])
  check('ເຫດທີ່ຍັງບໍ່ຈົບນັບເວລາຮອດດຽວນີ້', Number(ov.minutes) >= 119, String(ov.minutes))

  // ------------------------------------------------------- ບັນຊີຜູ້ໃຊ້
  console.log('\n[4] ບັນຊີຜູ້ໃຊ້ ແລະ ຂັ້ນຕອນເຂົ້າ/ອອກ')
  await client.query(
    `insert into it.account_systems (code, name, kind, seat_limit, subscription_id)
     values ('TESTSYS', 'ລະບົບທົດສອບ', 'app', 1, $1::bigint)`,
    [sub.id]
  )
  await client.query(
    `insert into it.system_accounts (system_code, employee_id, username, created_by)
     values ('TESTSYS', $1::int, 'active.user', $1::int)`,
    [me]
  )
  // ລະຫັດທີ່ບໍ່ມີໃນ HR = ຄົນທີ່ອອກໄປແລ້ວ ຫຼື ບໍ່ຢູ່ໃນທະບຽນ — ຕ້ອງຂຶ້ນເຕືອນ
  await client.query(
    `insert into it.system_accounts (system_code, employee_id, username, created_by)
     values ('TESTSYS', 999999, 'ghost.user', $1::int)`,
    [me]
  )

  const ghost = await one(
    `select should_close, hr_state from it.v_system_accounts
      where username = 'ghost.user'`
  )
  check('ຈັບບັນຊີຂອງຄົນທີ່ບໍ່ຢູ່ໃນ HR ໄດ້', ghost?.should_close === true, ghost?.hr_state)

  const sys = await one(`select * from it.v_account_systems where code = 'TESTSYS'`)
  check('ນັບບັນຊີທີ່ໃຊ້ຢູ່', Number(sys.active_count) === 2, String(sys.active_count))
  check('ຮູ້ວ່າໃຊ້ເກີນ seat ທີ່ຈ່າຍ', Number(sys.seats_free) === -1, String(sys.seats_free))
  check('ນັບບັນຊີທີ່ຄວນປິດ', Number(sys.closable_count) === 1)

  check(
    'ຄົນດຽວມີບັນຊີເປີດຊໍ້າໃນລະບົບດຽວບໍ່ໄດ້',
    await rejects(
      `insert into it.system_accounts (system_code, employee_id, username, created_by)
       values ('TESTSYS', $1::int, 'dup.user', $1::int)`,
      [me]
    )
  )

  const list = await one(
    `insert into it.employee_checklists (employee_id, kind, created_by)
     values ($1::int, 'offboard', $1::int) returning id`,
    [me]
  )
  await client.query(
    `insert into it.checklist_items (checklist_id, sort_order, title, hint)
     select $1::bigint, sort_order, title, hint
       from it.checklist_templates where kind = 'offboard' and is_active`,
    [list.id]
  )
  let cv = await one('select * from it.v_employee_checklists where id = $1::bigint', [
    list.id,
  ])
  check('ສ້າງລາຍການຈາກແມ່ແບບ', Number(cv.item_count) > 0, `${cv.item_count} ຂໍ້`)
  check('ຄວາມຄືບໜ້າເລີ່ມທີ 0%', Number(cv.percent_done) === 0)

  await client.query(
    `update it.checklist_items set is_done = true, done_by = $2::int, done_at = now()
      where checklist_id = $1::bigint`,
    [list.id, me]
  )
  cv = await one('select * from it.v_employee_checklists where id = $1::bigint', [list.id])
  check('ຕິກຄົບແລ້ວເປັນ 100%', Number(cv.percent_done) === 100, `${cv.percent_done}%`)

  // ----------------------------------------------------- ຂອງສິ້ນເປືອງ
  console.log('\n[5] ອຸປະກອນສິ້ນເປືອງ')
  const item = await one(
    `insert into it.consumables (name, category, unit, min_qty, unit_price, created_by)
     values ('ໝຶກທົດສອບ HP 12A', 'ink', 'ກ່ອງ', 8, 250000, $1::int)
     returning id, code`,
    [me]
  )
  check('ອອກລະຫັດເປັນ CS-', item.code.startsWith('CS-'), item.code)

  for (const [kind, qty] of [
    ['in', 10],
    ['out', 3],
  ]) {
    await client.query(
      `insert into it.consumable_moves (consumable_id, kind, qty, created_by)
       values ($1::bigint, $2::varchar, $3::numeric, $4::int)`,
      [item.id, kind, qty, me]
    )
  }
  let iv2 = await one('select * from it.v_consumables where id = $1::bigint', [item.id])
  check('ຄິດຍອດຄົງເຫຼືອຈາກການເຄື່ອນໄຫວ', Number(iv2.on_hand) === 7, String(iv2.on_hand))
  check('ຕ່ຳກວ່າຈຸດສັ່ງຊື້ = ໃກ້ໝົດ', iv2.stock_state === 'low', iv2.stock_state)
  check('ຄິດມູນຄ່າໃນສາງ', Number(iv2.stock_value) === 1750000, String(iv2.stock_value))

  await client.query(
    `insert into it.consumable_moves (consumable_id, kind, qty, note, created_by)
     values ($1::bigint, 'adjust', -7, 'ນັບຈິງແລ້ວບໍ່ມີ', $2::int)`,
    [item.id, me]
  )
  iv2 = await one('select * from it.v_consumables where id = $1::bigint', [item.id])
  check('ປັບຍອດຕິດລົບໄດ້', Number(iv2.on_hand) === 0, String(iv2.on_hand))
  check('ຍອດ 0 = ໝົດແລ້ວ', iv2.stock_state === 'empty', iv2.stock_state)
  check(
    'ບັນທຶກຈຳນວນ 0 ບໍ່ໄດ້',
    await rejects(
      `insert into it.consumable_moves (consumable_id, kind, qty, created_by)
       values ($1::bigint, 'in', 0, $2::int)`,
      [item.id, me]
    )
  )

  // --------------------------------------------------------- ເຄືອຂ່າຍ
  console.log('\n[6] ເຄືອຂ່າຍ & IP')
  const seg = await one(
    `insert into it.network_segments (name, vlan_id, cidr, gateway, created_by)
     values ('ວົງທົດສອບ', 999, '10.99.99.0/24', '10.99.99.1', $1::int)
     returning id`,
    [me]
  )
  await client.query(
    `insert into it.ip_assignments (segment_id, ip_address, hostname, created_by)
     values ($1::bigint, '10.99.99.25', 'test-pc', $2::int)`,
    [seg.id, me]
  )
  const sv = await one('select * from it.v_network_segments where id = $1::bigint', [seg.id])
  check('ນັບ IP ໃນວົງ', Number(sv.ip_count) === 1 && Number(sv.ip_in_use) === 1)

  check(
    'IP ຊໍ້າຖືກກັນ',
    await rejects(
      `insert into it.ip_assignments (segment_id, ip_address, created_by)
       values ($1::bigint, '10.99.99.25', $2::int)`,
      [seg.id, me]
    )
  )

  const ipRow = await one(
    `select ip from it.v_ip_assignments where hostname = 'test-pc'`
  )
  check('ສະແດງ IP ເປັນຂໍ້ຄວາມໄດ້', ipRow?.ip === '10.99.99.25', ipRow?.ip)

  await client.query(
    `insert into it.switch_ports (switch_asset_code, port_label, room, created_by)
     values ('TEST-SW', 'Gi1/0/1', 'ຫ້ອງທົດສອບ', $1::int)`,
    [me]
  )
  check(
    'ພອດຊໍ້າຂອງສະວິດດຽວກັນຖືກກັນ',
    await rejects(
      `insert into it.switch_ports (switch_asset_code, port_label, created_by)
       values ('TEST-SW', 'gi1/0/1', $1::int)`,
      [me]
    )
  )

  // -------------------------------------------------------- ງົບປະມານ
  console.log('\n[7] ງົບປະມານ ທຽບ ໃຊ້ຈິງ')
  const year = new Date().getFullYear()
  const line = await one(
    `insert into it.budget_lines
       (fiscal_year, name, category, source, source_filter, currency,
        planned_amount, created_by)
     values ($1::int, 'ຄ່າອິນເຕີເນັດທົດສອບ', 'subscription', 'subscriptions',
             'internet', 'LAK', 20000000, $2::int)
     returning id`,
    [year, me]
  )
  const before = await one(
    'select actual_amount from it.v_budget_lines where id = $1::bigint',
    [line.id]
  )

  await client.query(
    `insert into it.subscription_periods
       (subscription_id, period_start, period_end, due_date, amount, currency,
        status, paid_at, created_by)
     values ($1::bigint, current_date, current_date + 29, current_date, 1500000,
             'LAK', 'paid', current_date, $2::int)`,
    [sub.id, me]
  )
  const after = await one('select * from it.v_budget_lines where id = $1::bigint', [
    line.id,
  ])
  check(
    'ອ່ານຍອດໃຊ້ຈິງຈາກງວດຄ່າເຊົ່າທີ່ຈ່າຍແລ້ວ',
    Number(after.actual_amount) - Number(before.actual_amount) === 1500000,
    `${before.actual_amount} → ${after.actual_amount}`
  )
  check('ຄິດຍອດຍັງເຫຼືອ', Number(after.remaining_amount) === 20000000 - Number(after.actual_amount))
  check('ຍັງຢູ່ໃນງົບ', after.budget_state === 'ok', after.budget_state)

  const manual = await one(
    `insert into it.budget_lines
       (fiscal_year, name, source, currency, planned_amount, created_by)
     values ($1::int, 'ເສັ້ນປ້ອນເອງທົດສອບ', 'manual', 'LAK', 1000000, $2::int)
     returning id`,
    [year, me]
  )
  await client.query(
    `insert into it.budget_spends (line_id, amount, description, created_by)
     values ($1::bigint, 1200000, 'ຈ່າຍເກີນງົບ', $2::int)`,
    [manual.id, me]
  )
  const over = await one('select * from it.v_budget_lines where id = $1::bigint', [
    manual.id,
  ])
  check('ຈັບໄດ້ວ່າໃຊ້ເກີນງົບ', over.budget_state === 'over', over.budget_state)
  check('ຄິດເປັນສ່ວນຮ້ອຍ', Number(over.percent_used) === 120, String(over.percent_used))

  // ---------------------------------------------------- ຄະແນນຄວາມພໍໃຈ
  console.log('\n[8] ຄະແນນຄວາມພໍໃຈ (CSAT)')
  const ticket = await one('select id from it.tickets order by id desc limit 1')
  if (ticket) {
    await client.query(
      `insert into it.ticket_ratings (ticket_id, score, comment, rated_by)
       values ($1::bigint, 5, 'ແກ້ໄວດີ', $2::int)
       on conflict (ticket_id) do update set score = 5`,
      [ticket.id, me]
    )
    const rv = await one(
      'select score, ticket_no from it.v_ticket_ratings where ticket_id = $1::bigint',
      [ticket.id]
    )
    check('ບັນທຶກຄະແນນ ແລະ ອ່ານຄືນໄດ້', Number(rv?.score) === 5, rv?.ticket_no)
    check(
      'ຄະແນນນອກຂອບ 1–5 ຖືກກັນ',
      await rejects(
        `insert into it.ticket_ratings (ticket_id, score, rated_by)
         values ($1::bigint, 9, $2::int)
         on conflict (ticket_id) do update set score = 9`,
        [ticket.id, me]
      )
    )
  } else {
    console.log('  ຂ້າມ — ຍັງບໍ່ມີ ticket ໃນລະບົບ')
  }

  // ------------------------------------------------------ ຕົວເລກຂ້າງເມນູ
  console.log('\n[9] ຕົວເລກຂ້າງເມນູອ່ານໄດ້')
  const badges = await one(
    `select (select count(*) from it.v_maintenance_plans
              where due_status in ('overdue','due_soon'))    as maintenance,
            (select count(*) from it.v_incidents where status = 'open') as incidents,
            (select count(*) from it.v_system_accounts where should_close) as accounts,
            (select count(*) from it.v_employee_checklists where status = 'open') as checklists,
            (select count(*) from it.v_consumables
              where stock_state in ('low','empty'))          as consumables`
  )
  check(
    'query ຕົວເລກຂ້າງເມນູແລ່ນໄດ້',
    badges !== undefined,
    JSON.stringify(badges)
  )
  check('ນັບເຫດທີ່ຍັງບໍ່ຈົບ', Number(badges.incidents) >= 1)
  check('ນັບບັນຊີທີ່ຄວນປິດ', Number(badges.accounts) >= 1)
} finally {
  await client.query('rollback')
  await client.end()
}

console.log(failed === 0 ? '\nຜ່ານທັງໝົດ' : `\nຕົກ ${failed} ຂໍ້`)
process.exit(failed === 0 ? 0 : 1)

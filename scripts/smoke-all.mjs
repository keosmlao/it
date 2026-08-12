// Usage: node --env-file=.env.local scripts/smoke-all.mjs
// Exercises every module's SQL against the real database inside one
// transaction, then rolls everything back.
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
  const dev = staff.find((s) => s.role === 'developer')
  const support = staff.find((s) => s.role === 'support')
  const outsider = (
    await c.query(
      `select employee_id from public.odg_employee
        where department_code <> '801' and employment_status = 'ACTIVE' limit 1`
    )
  ).rows[0]

  check(!!manager && !!head && !!dev && !!support, 'ທັງ 4 ບົດບາດມີຢູ່ໃນ v_it_staff')

  // ---------- tickets ----------
  console.log('\n[1] Ticket + SLA')
  const ticket = (
    await c.query(
      `insert into it.tickets
         (title, category_code, priority, requester_employee_id, unit_code,
          sla_respond_due_at, sla_resolve_due_at, created_by)
       select $1::varchar, $2::varchar, $3::varchar, $4::int, c.unit_code,
              now() + (s.respond_minutes || ' minutes')::interval,
              now() + (s.resolve_minutes || ' minutes')::interval, $5::int
         from it.ticket_categories c
         join it.sla_policies s on s.priority = $3::varchar
        where c.code = $2::varchar
       returning id, ticket_no, unit_code`,
      ['ທົດສອບ ticket', 'ERP', 'critical', outsider.employee_id, manager.employee_id]
    )
  ).rows[0]
  check(ticket.unit_code === '8011', 'ປະເພດ ERP ຈັດເຂົ້າໜ່ວຍພັດທະນາອັດຕະໂນມັດ')
  check(/^IT-\d{4}-\d{4}$/.test(ticket.ticket_no), `ເລກ ticket ຮູບແບບຖືກ (${ticket.ticket_no})`)

  // ---------- projects & tasks ----------
  console.log('\n[2] ໂປຣເຈັກ ແລະ Task')
  const project = (
    await c.query(
      `insert into it.projects (name, owner_employee_id, requester_employee_id,
                                due_date, created_by)
       values ($1, $2, $3, current_date - 1, $4)
       returning id, project_no`,
      ['ທົດສອບໂປຣເຈັກ', head.employee_id, outsider.employee_id, manager.employee_id]
    )
  ).rows[0]
  check(/^PRJ-\d{4}-\d{3}$/.test(project.project_no), `ເລກໂປຣເຈັກຖືກ (${project.project_no})`)

  for (const [title, status] of [
    ['ວຽກ 1', 'todo'],
    ['ວຽກ 2', 'in_progress'],
    ['ວຽກ 3', 'done'],
  ]) {
    await c.query(
      `insert into it.tasks (project_id, title, status, assignee_employee_id, created_by)
       values ($1, $2, $3, $4, $5)`,
      [project.id, title, status, dev.employee_id, head.employee_id]
    )
  }

  const pv = (await c.query('select * from it.v_projects where id = $1', [project.id]))
    .rows[0]
  check(pv.task_count === '3', 'ນັບຈຳນວນ task ຂອງໂປຣເຈັກຖືກ')
  check(pv.task_done_count === '1', 'ນັບ task ທີ່ສຳເລັດຖືກ')
  check(pv.is_overdue === true, 'ໂປຣເຈັກເລີຍກຳນົດຖືກຕິດທຸງ')

  const task = (
    await c.query(
      `select * from it.v_tasks where project_id = $1 and status = 'in_progress'`,
      [project.id]
    )
  ).rows[0]
  check(task.assignee_name !== null, 'ຊື່ຜູ້ຮັບຜິດຊອບ task join ໄດ້')

  // ---------- work logs ----------
  console.log('\n[3] ບັນທຶກຊົ່ວໂມງ')
  await c.query(
    `insert into it.work_logs (employee_id, hours, ticket_id) values ($1, 2.5, $2)`,
    [support.employee_id, ticket.id]
  )
  await c.query(
    `insert into it.work_logs (employee_id, hours, task_id) values ($1, 3, $2)`,
    [dev.employee_id, task.id]
  )
  await c.query(
    `insert into it.work_logs (employee_id, hours, work_type) values ($1, 1, 'ປະຊຸມ')`,
    [manager.employee_id]
  )

  let rejected = false
  try {
    await c.query('savepoint sp1')
    await c.query(
      `insert into it.work_logs (employee_id, hours, ticket_id, task_id)
       values ($1, 1, $2, $3)`,
      [dev.employee_id, ticket.id, task.id]
    )
  } catch {
    rejected = true
    await c.query('rollback to savepoint sp1')
  }
  check(rejected, 'ບັນທຶກຊົ່ວໂມງທີ່ຜູກທັງ ticket ແລະ task ພ້ອມກັນຖືກປະຕິເສດ')

  const logged = (
    await c.query('select logged_hours from it.v_tasks where id = $1', [task.id])
  ).rows[0]
  check(Number(logged.logged_hours) === 3, 'ຊົ່ວໂມງລວມເຂົ້າ view ຂອງ task')

  const summary = (
    await c.query(
      `select sum(hours) total from it.work_logs where log_date = current_date`
    )
  ).rows[0]
  check(Number(summary.total) === 6.5, 'ສະຫຼຸບຊົ່ວໂມງລວມຖືກ (2.5 + 3 + 1)')

  // ---------- assets ----------
  console.log('\n[4] ອຸປະກອນ')
  const asset = (
    await c.query(
      `insert into it.assets (asset_code, name, category_code, status,
                              warranty_until, created_by)
       values ($1, $2, (select code from it.asset_categories limit 1), 'in_use',
               current_date - 1, $3)
       returning id`,
      ['SMOKE-NB-001', 'ໂນດບຸກທົດສອບ', manager.employee_id]
    )
  ).rows[0]

  const av = (await c.query('select * from it.v_assets where id = $1', [asset.id]))
    .rows[0]
  check(av.warranty_expired === true, 'ອຸປະກອນໝົດປະກັນຖືກຕິດທຸງ')
  check(av.category_name_lo !== null, 'ປະເພດອຸປະກອນ join ຈາກ odg_it_category ໄດ້')

  await c.query(
    `update it.assets set assigned_employee_id = $2 where id = $1`,
    [asset.id, outsider.employee_id]
  )
  const av2 = (await c.query('select assigned_name from it.v_assets where id = $1', [asset.id]))
    .rows[0]
  check(av2.assigned_name !== null, 'ຊື່ຜູ້ຖືຄອງອຸປະກອນ join ໄດ້')

  // ---------- knowledge base ----------
  console.log('\n[5] ຄັງຄວາມຮູ້')
  const article = (
    await c.query(
      `insert into it.kb_articles (title, body, category_code, author_employee_id)
       values ($1, $2, 'PRINTER', $3) returning id`,
      ['ວິທີແກ້ printer ພິມບໍ່ອອກ', '1. ກວດສາຍ\n2. ຕິດຕັ້ງ driver ໃໝ່', support.employee_id]
    )
  ).rows[0]
  const kv = (await c.query('select * from it.v_kb_articles where id = $1', [article.id]))
    .rows[0]
  check(kv.author_name !== null && kv.category_name_lo !== null, 'ບົດຄວາມ join ຜູ້ຂຽນ ແລະ ປະເພດໄດ້')

  // ---------- requests & approvals ----------
  console.log('\n[6] ຄຳຮ້ອງ ແລະ ການອະນຸມັດ')
  const request = (
    await c.query(
      `insert into it.requests (type_code, title, requester_employee_id, unit_code, created_by)
       values ('DEVELOP', $1, $2, $3, $2) returning id, request_no, status`,
      ['ຂໍພັດທະນາລະບົບທົດສອບ', dev.employee_id, dev.unit_code]
    )
  ).rows[0]
  check(request.status === 'submitted', 'ຄຳຮ້ອງໃໝ່ເລີ່ມທີ່ສະຖານະ "ລໍຫົວໜ້າອະນຸມັດ"')

  await c.query(
    `insert into it.approvals (request_id, level, approver_employee_id, decision)
     values ($1, 1, $2, 'approved')`,
    [request.id, head.employee_id]
  )
  await c.query(`update it.requests set status = 'head_approved' where id = $1`, [request.id])

  await c.query(
    `insert into it.approvals (request_id, level, approver_employee_id, decision)
     values ($1, 2, $2, 'approved')`,
    [request.id, manager.employee_id]
  )
  await c.query(`update it.requests set status = 'approved' where id = $1`, [request.id])

  const rv = (await c.query('select * from it.v_requests where id = $1', [request.id])).rows[0]
  check(rv.approval_count === '2', 'ບັນທຶກການອະນຸມັດຄົບ 2 ຂັ້ນ')
  check(rv.is_finished === true, 'ຄຳຮ້ອງທີ່ອະນຸມັດແລ້ວນັບເປັນຈົບ')

  // ---------- notifications & audit ----------
  console.log('\n[7] ແຈ້ງເຕືອນ ແລະ ບັນທຶກການປ່ຽນແປງ')
  await c.query(
    `insert into it.notifications (employee_id, title, link) values ($1, $2, $3)`,
    [dev.employee_id, 'ທົດສອບການແຈ້ງເຕືອນ', `/tickets/${ticket.id}`]
  )
  const unread = (
    await c.query(
      'select count(*) from it.notifications where employee_id = $1 and is_read = false',
      [dev.employee_id]
    )
  ).rows[0]
  check(Number(unread.count) === 1, 'ນັບການແຈ້ງເຕືອນທີ່ຍັງບໍ່ໄດ້ອ່ານຖືກ')

  await c.query(
    `insert into it.audit_logs (employee_id, entity, entity_id, action, detail)
     values ($1, 'ticket', $2, 'create', 'smoke')`,
    [manager.employee_id, ticket.id]
  )
  const audit = (await c.query('select count(*) from it.audit_logs')).rows[0]
  check(Number(audit.count) >= 1, 'ບັນທຶກການປ່ຽນແປງເຮັດວຽກ')

  // ---------- reports ----------
  console.log('\n[8] ລາຍງານ')
  const report = (
    await c.query(
      `select count(*) created,
              count(*) filter (where resolved_at is not null) resolved
         from it.v_tickets where created_at::date = current_date`
    )
  ).rows[0]
  check(Number(report.created) >= 1, 'ລາຍງານນັບ ticket ໃນມື້ນີ້ໄດ້')

  const byStaff = (
    await c.query(
      `select s.employee_id, count(t.id) assigned
         from it.v_it_staff s
         left join it.v_tickets t on t.assignee_employee_id = s.employee_id
        group by s.employee_id`
    )
  ).rows
  check(byStaff.length === 5, 'ລາຍງານຜົນງານຄອບຄຸມພະນັກງານ IT ທັງ 5 ຄົນ')

  await c.query('rollback')
  console.log(`\nທັງໝົດ ${passed} ການກວດຜ່ານ. ຂໍ້ມູນທົດສອບຖືກ rollback ໝົດແລ້ວ.`)
} catch (e) {
  await c.query('rollback')
  console.error('\nFAILED:', e.message)
  process.exitCode = 1
} finally {
  await c.end()
}

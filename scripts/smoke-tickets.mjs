// Usage: node --env-file=.env.local scripts/smoke-tickets.mjs
// Exercises the ticket SQL end to end against the real database, then removes
// everything it created (including the ticket-number it consumed).
import pg from 'pg'

const c = new pg.Client({ connectionString: process.env.DATABASE_URL })
await c.connect()

const staff = await c.query(
  `select employee_id, role from it.v_it_staff order by role`
)
const manager = staff.rows.find((r) => r.role === 'manager')
const support = staff.rows.find((r) => r.role === 'support')

const requester = await c.query(
  `select employee_id from public.odg_employee
    where department_code <> '801' and employment_status = 'ACTIVE' limit 1`
)

let ticketId
try {
  await c.query('begin')

  // 1. create — same statement the createTicket action runs
  const created = await c.query(
    `insert into it.tickets
       (title, description, category_code, priority, status,
        requester_employee_id, assignee_employee_id, unit_code,
        sla_respond_due_at, sla_resolve_due_at, created_by)
     select $1::varchar, $2::text, $3::varchar, $4::varchar,
            (case when $6::int is null then 'new' else 'assigned' end)::varchar,
            $5::int, $6::int, coalesce($7::varchar, c.unit_code),
            now() + (s.respond_minutes || ' minutes')::interval,
            now() + (s.resolve_minutes || ' minutes')::interval,
            $8::int
       from it.ticket_categories c
       join it.sla_policies s on s.priority = $4::varchar
      where c.code = $3::varchar
     returning id, ticket_no, status, unit_code`,
    [
      '[SMOKE TEST] ປຣິນເຕີພິມບໍ່ອອກ',
      'ທົດສອບລະບົບ — ຈະລຶບອອກອັດຕະໂນມັດ',
      'PRINTER',
      'high',
      requester.rows[0].employee_id,
      null,
      null,
      manager.employee_id,
    ]
  )
  ticketId = created.rows[0].id
  console.log('1. created  ', created.rows[0])

  // 2. the view must compute SLA + names
  const view = await c.query(
    `select ticket_no, status, priority_name_lo, category_name_lo,
            requester_name, requester_department_name, unit_name_lo,
            respond_overdue, resolve_overdue,
            round(extract(epoch from sla_resolve_due_at - created_at)/60) as resolve_minutes
       from it.v_tickets where id = $1`,
    [ticketId]
  )
  console.log('2. view     ', view.rows[0])
  assert(
    Number(view.rows[0].resolve_minutes) === 480,
    'high priority = 480 min to resolve'
  )
  assert(view.rows[0].respond_overdue === false, 'brand new ticket is not overdue')

  // 3. assign to support staff
  await c.query(
    `update it.tickets
        set assignee_employee_id = $2,
            status = case when status = 'new' then 'assigned' else status end
      where id = $1`,
    [ticketId, support.employee_id]
  )
  await c.query(
    `insert into it.ticket_comments (ticket_id, kind, body, author_employee_id)
     values ($1, 'assignment', 'ມອບໝາຍ (ທົດສອບ)', $2)`,
    [ticketId, manager.employee_id]
  )

  // 4. resolve
  await c.query(
    `update it.tickets
        set status = 'resolved', resolution = 'ປ່ຽນສາຍ USB',
            first_responded_at = coalesce(first_responded_at, now()),
            resolved_at = now()
      where id = $1`,
    [ticketId]
  )

  const final = await c.query(
    `select ticket_no, status, assignee_name, resolution,
            is_finished, resolve_overdue,
            (select count(*) from it.ticket_comments where ticket_id = $1) as comments
       from it.v_tickets where id = $1`,
    [ticketId]
  )
  console.log('3. resolved ', final.rows[0])
  assert(final.rows[0].is_finished === true, 'resolved ticket counts as finished')
  assert(final.rows[0].resolve_overdue === false, 'resolved ticket is not overdue')
  assert(final.rows[0].assignee_name !== null, 'assignee name resolves through the view')

  // 5. overdue detection
  await c.query(
    `update it.tickets set status = 'in_progress', resolved_at = null,
            first_responded_at = null,
            sla_respond_due_at = now() - interval '1 hour',
            sla_resolve_due_at = now() - interval '1 hour'
      where id = $1`,
    [ticketId]
  )
  const late = await c.query(
    'select respond_overdue, resolve_overdue from it.v_tickets where id = $1',
    [ticketId]
  )
  console.log('4. overdue  ', late.rows[0])
  assert(late.rows[0].respond_overdue === true, 'past-due response is flagged')
  assert(late.rows[0].resolve_overdue === true, 'past-due resolution is flagged')

  await c.query('rollback') // nothing from this run survives
  console.log('\nAll ticket checks passed. Test data rolled back.')
} catch (e) {
  await c.query('rollback')
  console.error('\nFAILED:', e.message)
  process.exitCode = 1
} finally {
  await c.end()
}

function assert(condition, what) {
  if (!condition) throw new Error(`assertion failed — ${what}`)
  console.log(`   ✓ ${what}`)
}

// ທົດສອບສ່ວນທີ່ໃຊ້ຮ່ວມກັນທົ່ວລະບົບ — ຂຽນແລ້ວ rollback
//
// ເອກະສານແນບທົ່ວລະບົບ · ແຜນປ່ຽນເຄື່ອງ · ອີເມວແຈ້ງເຕືອນ · ຄົ້ນຫາຂ້າມໂມດູນ ·
// ການກວດຄວາມປອດໄພ
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

  // ------------------------------------------------ ເອກະສານແນບທົ່ວລະບົບ
  console.log('\n[1] ເອກະສານແນບທົ່ວລະບົບ')

  const sub = await one(
    `insert into it.subscriptions
       (category, service_name, billing_cycle, amount, currency, start_date, created_by)
     values ('cloud', 'ທົດສອບ cloud', 'yearly', 1000, 'USD', current_date, $1::int)
     returning id`,
    [me]
  )

  await client.query(
    `insert into it.attachments
       (entity_type, entity_id, kind, file_name, stored_name, mime_type,
        size_bytes, uploaded_by)
     values ('subscription', $1::varchar, 'document', 'ສັນຍາ.pdf',
             'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.pdf', 'application/pdf', 12345, $2::int)`,
    [sub.id, me]
  )

  const doc = await one(
    `select entity_type, entity_id, kind, file_name, ticket_id
       from it.v_attachments
      where entity_type = 'subscription' and entity_id = $1::varchar`,
    [sub.id]
  )
  check('ແນບເອກະສານໃສ່ສັນຍາເຊົ່າໄດ້', doc?.file_name === 'ສັນຍາ.pdf')
  check('ແຖວທີ່ບໍ່ແມ່ນ ticket ຕ້ອງບໍ່ມີ ticket_id', doc?.ticket_id === null)

  check(
    'entity_type ນອກລາຍການຖືກກັນ',
    await rejects(
      `insert into it.attachments
         (entity_type, entity_id, kind, file_name, stored_name, mime_type,
          size_bytes, uploaded_by)
       values ('secret', '1', 'document', 'x.pdf', 'b.pdf', 'application/pdf', 1, $1::int)`,
      [me]
    )
  )
  check(
    'ແຖວ ticket ທີ່ບໍ່ມີ ticket_id ຖືກກັນ',
    await rejects(
      `insert into it.attachments
         (entity_type, entity_id, kind, file_name, stored_name, mime_type,
          size_bytes, uploaded_by)
       values ('ticket', '1', 'report', 'x.png', 'c.png', 'image/png', 1, $1::int)`,
      [me]
    )
  )

  // ຮູບແນບຂອງ ticket ຕ້ອງຍັງໃຊ້ໄດ້ຄືເກົ່າ
  const ticket = await one('select id from it.tickets order by id desc limit 1')
  if (ticket) {
    await client.query(
      `insert into it.attachments
         (ticket_id, entity_type, entity_id, kind, file_name, stored_name,
          mime_type, size_bytes, uploaded_by)
       values ($1::bigint, 'ticket', $1::varchar, 'report', 'ຮູບ.png',
               'dddddddddddddddddddddddddddddddd.png', 'image/png', 999, $2::int)`,
      [ticket.id, me]
    )
    const old = await one(
      `select count(*) n from it.v_attachments where ticket_id = $1::bigint`,
      [ticket.id]
    )
    check('ຮູບແນບຂອງ ticket ຍັງອ່ານໄດ້ຄືເກົ່າ', Number(old.n) >= 1, `${old.n} ຮູບ`)
  }

  // ລຶບແບບ soft ແລ້ວຕ້ອງຫາຍຈາກ view
  await client.query(
    `update it.attachments set deleted_at = now()
      where entity_type = 'subscription' and entity_id = $1::varchar`,
    [sub.id]
  )
  const gone = await one(
    `select count(*) n from it.v_attachments
      where entity_type = 'subscription' and entity_id = $1::varchar`,
    [sub.id]
  )
  check('ລຶບແບບ soft ແລ້ວຫາຍຈາກ view', Number(gone.n) === 0)

  // ------------------------------------------------------ ແຜນປ່ຽນເຄື່ອງ
  console.log('\n[2] ແຜນປ່ຽນເຄື່ອງ')
  const plan = await one(
    `select count(*)                                        as total,
            count(*) filter (where reason_count is null)    as null_reason,
            count(*) filter (where priority is null)        as null_priority
       from it.v_replacement_candidates`
  )
  check('view ອ່ານໄດ້', plan !== undefined, `${plan.total} ເຄື່ອງ`)
  check('reason_count ບໍ່ເປັນ null', Number(plan.null_reason) === 0)
  check('priority ບໍ່ເປັນ null', Number(plan.null_priority) === 0)

  const sums = await one(
    `select count(*) filter (where priority = 'high')   as high,
            count(*) filter (where priority = 'medium') as medium,
            coalesce(sum(estimated_cost), 0)            as budget
       from it.v_replacement_candidates`
  )
  check(
    'ຈັດລະດັບຄວາມດ່ວນໄດ້',
    Number(sums.high) >= 0 && Number(sums.medium) >= 0,
    `ດ່ວນ ${sums.high} · ຄວນວາງແຜນ ${sums.medium}`
  )

  // ------------------------------------------------------ ອີເມວແຈ້ງເຕືອນ
  console.log('\n[3] ອີເມວແຈ້ງເຕືອນ')
  await client.query(
    `insert into it.employee_emails (employee_id, email, updated_by)
     values ($1::int, 'Test.Person@odien.net', $1::int)`,
    [me]
  )
  const target = await one(
    'select email_target, email_enabled, line_target from it.v_notify_targets where employee_id = $1::int',
    [me]
  )
  check('v_notify_targets ສະແດງອີເມວ', target?.email_target === 'Test.Person@odien.net')
  check('ຕັ້ງຕົ້ນເປີດການສົ່ງ', target?.email_enabled === true)

  check(
    'ອີເມວຊໍ້າ (ບໍ່ສົນໂຕພິມ) ຖືກກັນ',
    await rejects(
      `insert into it.employee_emails (employee_id, email, updated_by)
       values (999999, 'test.person@odien.net', $1::int)`,
      [me]
    )
  )

  await client.query(
    `insert into it.notify_prefs (employee_id, channel, enabled)
     values ($1::int, 'email', false)
     on conflict (employee_id, channel) do update set enabled = false`,
    [me]
  )
  const off = await one(
    'select email_enabled from it.v_notify_targets where employee_id = $1::int',
    [me]
  )
  check('ປິດການສົ່ງລາຍຄົນໄດ້', off?.email_enabled === false)

  // ຄິວຮັບ channel = email ໄດ້
  await client.query(
    `insert into it.notification_outbox
       (employee_id, channel, target, title, body)
     values ($1::int, 'email', 'test.person@odien.net', 'ທົດສອບ', 'ເນື້ອໃນ')`,
    [me]
  )
  const queued = await one(
    `select count(*) n from it.notification_outbox
      where channel = 'email' and status = 'pending'`
  )
  check('ຄິວຮັບຂໍ້ຄວາມທາງອີເມວໄດ້', Number(queued.n) >= 1)

  // ------------------------------------------------------ ຄົ້ນຫາຂ້າມໂມດູນ
  console.log('\n[4] ຄົ້ນຫາຂ້າມໂມດູນ')
  for (const [name, sql] of [
    ['ticket', `select 1 from it.v_tickets where title ilike '%a%' limit 1`],
    ['ອຸປະກອນ', `select 1 from it.v_it_assets where name ilike '%a%' limit 1`],
    ['ຄັງຄວາມຮູ້', `select 1 from it.v_kb_articles where keywords ilike '%a%' limit 1`],
    ['ຄ່າເຊົ່າ', `select 1 from it.v_subscriptions where service_name ilike '%ທົດສອບ%' limit 1`],
    ['IP', `select 1 from it.v_ip_assignments where host(ip_address) ilike '%10.%' limit 1`],
    ['ບັນຊີ', `select 1 from it.v_system_accounts where username ilike '%a%' limit 1`],
  ]) {
    const ok = await client
      .query(sql)
      .then(() => true)
      .catch((e) => {
        console.log('    ' + e.message)
        return false
      })
    check(`ຄົ້ນຫາໃນ ${name} ແລ່ນໄດ້`, ok)
  }

  // -------------------------------------------------- ກວດຄວາມປອດໄພ
  console.log('\n[5] ການກວດຄວາມປອດໄພ (ອ່ານຢ່າງດຽວ)')
  const formats = await client.query(
    `select case
              when p.password is null or p.password = ''  then 'empty'
              when p.password like 'scrypt:%$%'           then 'werkzeug'
              when p.password like 'scrypt$%'             then 'scrypt'
              when length(p.password) < 8                 then 'plaintext_weak'
              else 'plaintext'
            end as format, count(*) as total
       from public.odg_employee p
      where p.employment_status = 'ACTIVE'
      group by 1`
  )
  check('ນັບຮູບແບບລະຫັດຜ່ານໄດ້', formats.rowCount > 0,
    formats.rows.map((r) => `${r.format}=${r.total}`).join(' · '))

  const risky = await one(
    `select count(*) n
       from it.v_it_staff v
       join public.odg_employee p on p.employee_id = v.employee_id
      where p.password is null or p.password = '' or p.password not like 'scrypt%'`
  )
  check(
    'ຈັບພະນັກງານ IT ທີ່ລະຫັດຜ່ານບໍ່ໄດ້ເຂົ້າລະຫັດ',
    Number(risky.n) >= 0,
    `${risky.n} ຄົນ`
  )

  const sess = await one(
    `select count(*) n from it.sessions where revoked_at is null and expires_at > now()`
  )
  check('ນັບ session ທີ່ຍັງເປີດຢູ່', Number(sess.n) >= 0, `${sess.n} session`)

  const fails = await client.query(
    `select employee_code, count(*) as attempts
       from it.login_attempts
      where not succeeded and attempted_at >= now() - interval '7 days'
      group by employee_code having count(*) >= 3 limit 5`
  )
  check('ສະຫຼຸບ login ລົ້ມເຫຼວໄດ້', fails.rowCount >= 0, `${fails.rowCount} ລະຫັດ`)
} finally {
  await client.query('rollback')
  await client.end()
}

console.log(failed === 0 ? '\nຜ່ານທັງໝົດ' : `\nຕົກ ${failed} ຂໍ້`)
process.exit(failed === 0 ? 0 : 1)

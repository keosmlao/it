// Usage: node --env-file=.env.local scripts/audit-employees.mjs
//
// ກວດພະນັກງານທີ່ອອກຈາກບໍລິສັດແລ້ວ ວ່າຍັງມີຫຍັງຄ້າງຢູ່ໃນລະບົບ IT ບໍ.
//
// ຂໍ້ຄວນຮູ້ທີ່ພົບຈາກຂໍ້ມູນຈິງ: ຝ່າຍບຸກຄົນ **ລຶບແຖວຖິ້ມ** ເມື່ອຄົນອອກ
// ບໍ່ໄດ້ໝາຍເປັນ RESIGNED. ສະນັ້ນການກວດດ້ວຍ employment_status ຢ່າງດຽວ
// ຈະເຫັນພຽງສ່ວນນ້ອຍ — ຕ້ອງກວດ "ລະຫັດທີ່ບໍ່ມີໃນ odg_employee ແລ້ວ" ນຳ.
import pg from 'pg'

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()

const rows = async (sql, params = []) => (await client.query(sql, params)).rows
const head = (title) => console.log(`\n${'─'.repeat(64)}\n${title}\n`)

let problems = 0

try {
  // cache ອາດເກົ່າ — ຂໍ້ມູນພະນັກງານປ່ຽນຢູ່ນອກລະບົບນີ້
  // ຖ້າບໍ່ refresh ກ່ອນ ຄົນທີ່ຫາກລາອອກຈະຍັງຂຶ້ນວ່າ ACTIVE
  await client.query('select it.refresh_asset_movements()')

  // ---------- 1. ຄົນທີ່ HR ໝາຍວ່າອອກແລ້ວ ----------
  head('1. ພະນັກງານທີ່ HR ໝາຍສະຖານະວ່າອອກແລ້ວ')

  const marked = await rows(`
    select e.employee_code, e.fullname_lo, e.employment_status,
           e.department_code,
           (select count(*) from it.v_asset_movements m
             where m.emp_code = e.employee_code and not m.is_returned) as open_loans,
           (select count(*) from it.v_tickets t
             where t.assignee_employee_id = e.employee_id
               and t.status not in ('resolved','closed','cancelled')) as open_tickets,
           (select count(*) from it.sessions s
             where s.employee_id = e.employee_id
               and s.revoked_at is null and s.expires_at > now()) as live_sessions
      from public.odg_employee e
     where e.employment_status <> 'ACTIVE'
     order by e.employee_code`)

  if (marked.length === 0) console.log('  ບໍ່ມີ')
  for (const r of marked) {
    const flags = []
    if (Number(r.open_loans) > 0) flags.push(`ຄ້າງເຄື່ອງ ${r.open_loans}`)
    if (Number(r.open_tickets) > 0) flags.push(`ticket ${r.open_tickets}`)
    if (Number(r.live_sessions) > 0) flags.push(`ບັນຊີຍັງເຂົ້າໄດ້ ${r.live_sessions}`)
    if (flags.length) problems++
    console.log(
      `  ${r.employee_code}  ${r.fullname_lo}  [${r.employment_status}]` +
        (flags.length ? `  ⚠ ${flags.join(' · ')}` : '  ບໍ່ມີຫຍັງຄ້າງ')
    )
  }

  // ---------- 2. ຄົນທີ່ຖືກລຶບອອກຈາກ HR ແຕ່ຍັງຖືເຄື່ອງ ----------
  head('2. ຜູ້ຖືເຄື່ອງທີ່ບໍ່ມີໃນທະບຽນ HR ແລ້ວ (ຖືກລຶບແຖວ)')

  const ghosts = await rows(`
    select m.emp_code, max(m.emp_name) as emp_name,
           count(*) as assets,
           min(m.borrowed_at)::date::text as first_borrow,
           max(m.borrowed_at)::date::text as last_borrow,
           count(*) filter (
             where not exists (select 1 from it.v_recovery_targets r
                                where r.asset_code = m.asset_code)
           ) as not_in_recovery
      from it.v_asset_movements m
      left join public.odg_employee e on e.employee_code = m.emp_code
     where not m.is_returned
       and e.employee_id is null
     group by m.emp_code
     order by count(*) desc, m.emp_code`)

  const ghostAssets = ghosts.reduce((n, g) => n + Number(g.assets), 0)
  console.log(`  ${ghosts.length} ຄົນ · ${ghostAssets} ເຄື່ອງ\n`)
  for (const g of ghosts) {
    problems++
    const gap = Number(g.not_in_recovery)
    console.log(
      `  ${g.emp_code.padEnd(8)} ${(g.emp_name ?? '—').padEnd(28)} ` +
        `${String(g.assets).padStart(2)} ເຄື່ອງ · ຢືມ ${g.first_borrow}` +
        (gap > 0 ? `  ⚠ ບໍ່ຢູ່ໃນລາຍການທວງຄືນ ${gap}` : '')
    )
  }

  // ---------- 3. ຊ່ອງໂຫວ່: ເຄື່ອງທີ່ບໍ່ຖືກທວງ ----------
  head('3. ເຄື່ອງຂອງຄົນທີ່ອອກແລ້ວ ແຕ່ບໍ່ຂຶ້ນໃນລາຍການທວງຄືນ')

  const uncovered = await rows(`
    select m.asset_code, m.emp_code, m.emp_name, m.borrowed_at::date::text as borrowed_at
      from it.v_asset_movements m
      left join public.odg_employee e on e.employee_code = m.emp_code
     where not m.is_returned
       and (e.employee_id is null or e.employment_status <> 'ACTIVE')
       and not exists (select 1 from it.v_recovery_targets r
                        where r.asset_code = m.asset_code)
     order by m.borrowed_at`)

  if (uncovered.length === 0) {
    console.log('  ບໍ່ມີ — ທຸກເຄື່ອງຂອງຄົນທີ່ອອກແລ້ວຢູ່ໃນລາຍການທວງຄືນຄົບ')
  } else {
    problems += uncovered.length
    for (const u of uncovered) {
      console.log(
        `  ${u.asset_code}  ${u.emp_code}  ${u.emp_name ?? '—'}  ຢືມ ${u.borrowed_at}`
      )
    }
  }

  // ---------- 4. ຮ່ອງຮອຍອື່ນທີ່ຄ້າງໄວ້ ----------
  head('4. ຮ່ອງຮອຍອື່ນຂອງຄົນທີ່ບໍ່ມີໃນ HR ແລ້ວ')

  const leftovers = await rows(`
    select 'ticket ທີ່ຍັງບໍ່ປິດ' as kind, count(*) as n
      from it.tickets t
      left join public.odg_employee e on e.employee_id = t.assignee_employee_id
     where t.assignee_employee_id is not null and e.employee_id is null
       and t.status not in ('resolved','closed','cancelled')
    union all
    select 'ວຽກໃນໂປຣເຈັກ', count(*)
      from it.tasks t
      left join public.odg_employee e on e.employee_id = t.assignee_employee_id
     where t.assignee_employee_id is not null and e.employee_id is null
    union all
    select 'ໂປຣເຈັກທີ່ເປັນເຈົ້າຂອງ', count(*)
      from it.projects p
      left join public.odg_employee e on e.employee_id = p.owner_employee_id
     where e.employee_id is null
    union all
    select 'ສິດລາຍຄົນທີ່ຕັ້ງໄວ້', count(*)
      from it.user_permissions up
      left join public.odg_employee e on e.employee_id = up.employee_id
     where e.employee_id is null
    union all
    select 'ບົດບາດທີ່ຕັ້ງທັບໄວ້', count(*)
      from it.user_role_override o
      left join public.odg_employee e on e.employee_id = o.employee_id
     where e.employee_id is null
    union all
    select 'session ທີ່ຍັງເຂົ້າໄດ້', count(*)
      from it.sessions s
      left join public.odg_employee e on e.employee_id = s.employee_id
     where e.employee_id is null and s.revoked_at is null and s.expires_at > now()
    union all
    select 'ຜູ້ຮັບຜິດຊອບອຸປະກອນສ່ວນກາງ', count(*)
      from it.asset_deployments d
      left join public.odg_employee e on e.employee_code = d.responsible_emp_code
     where d.removed_at is null and d.responsible_emp_code is not null
       and e.employee_id is null`)

  for (const l of leftovers) {
    const n = Number(l.n)
    if (n > 0) problems++
    console.log(`  ${n > 0 ? '⚠' : ' '} ${l.kind}: ${n}`)
  }

  // ---------- ສະຫຼຸບ ----------
  head('ສະຫຼຸບ')
  console.log(
    problems === 0
      ? '  ບໍ່ພົບບັນຫາ'
      : `  ພົບ ${problems} ລາຍການທີ່ຕ້ອງຈັດການ — ເບິ່ງລາຍລະອຽດຂ້າງເທິງ`
  )
  console.log(
    '\n  ໝາຍເຫດ: HR ລຶບແຖວເມື່ອຄົນອອກ ບໍ່ໄດ້ໝາຍ RESIGNED —' +
      '\n  ການກວດຈຶ່ງອີງໃສ່ "ບໍ່ມີໃນ odg_employee" ບໍ່ແມ່ນ employment_status'
  )
} finally {
  await client.end()
}

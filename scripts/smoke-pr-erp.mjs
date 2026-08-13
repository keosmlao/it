// Usage: node --env-file=.env.local scripts/smoke-pr-erp.mjs
//
// ໃບສະເໜີຊື້ຮຸ່ນໃໝ່: ເກັບຢູ່ຕາຕະລາງ ERP (public.odg_pm_pr) ແລະ ຂັ້ນຕອນ
// ອະນຸມັດມາຈາກຕາຕະລາງ it.pr_approval_steps ເຊິ່ງຕັ້ງຄ່າໄດ້.
// ທົດສອບທັງສາຍປົກກະຕິ, ສາຍທີ່ມີເງື່ອນໄຂມູນຄ່າ ແລະ ການປະຕິເສດ.
// ທຸກຢ່າງຢູ່ໃນ transaction ດຽວ ແລ້ວ rollback — ERP ບໍ່ເຫຼືອຮ່ອງຮອຍ.
import pg from 'pg'

const c = new pg.Client({ connectionString: process.env.DATABASE_URL })
await c.connect()

let passed = 0
function check(cond, what) {
  if (!cond) throw new Error(`assertion failed — ${what}`)
  console.log(`   ✓ ${what}`)
  passed++
}

async function newPr(requester, title, lines) {
  const pr = (
    await c.query(
      `insert into public.odg_pm_pr
         (pr_no, doc_date, department_code, requester_code, status, created_by,
          created_at, updated_at)
       values (it.next_pr_no(), current_date, '801', $1::varchar, 'draft',
               $1::varchar, now(), now())
       returning id, pr_no, status`,
      [requester.employee_code]
    )
  ).rows[0]

  await c.query(
    `insert into it.pr_extra (pr_id, title, currency) values ($1::bigint, $2::varchar, 'LAK')`,
    [pr.id, title]
  )

  let no = 0
  for (const [name, qty, price] of lines) {
    no++
    await c.query(
      `insert into public.odg_pm_pr_line (pr_id, line_no, item_name, unit, qty, est_price)
       values ($1::bigint, $2::int, $3::varchar, 'ອັນ', $4::numeric, $5::numeric)`,
      [pr.id, no, name, qty, price]
    )
  }
  return pr
}

async function view(id) {
  return (await c.query('select * from it.v_pr where id = $1::bigint', [id])).rows[0]
}

async function approve(prId, stepNo, employeeId, decision = 'approved', note = null) {
  await c.query(
    `insert into it.pr_step_approvals (pr_id, step_no, approver_employee_id, decision, note)
     values ($1::bigint, $2::int, $3::int, $4::varchar, $5::text)`,
    [prId, stepNo, employeeId, decision, note]
  )
}

try {
  await c.query('begin')

  const staff = (await c.query('select employee_id, employee_code, role from it.v_it_staff'))
    .rows
  const manager = staff.find((s) => s.role === 'manager')
  const head = staff.find((s) => s.role === 'head')
  const support = staff.find((s) => s.role === 'support')
  check(!!manager && !!head && !!support, 'ມີຜູ້ຈັດການ, ຫົວໜ້າ ແລະ ພະນັກງານ')

  console.log('\n[1] ຂັ້ນຕອນອະນຸມັດຕັ້ງຄ່າໄດ້')
  const defaults = (
    await c.query('select step_no, name_lo, approver_role from it.pr_approval_steps order by step_no')
  ).rows
  check(defaults.length === 2, `ຄ່າຕັ້ງຕົ້ນມີ 2 ຂັ້ນ (${defaults.map((s) => s.name_lo).join(' → ')})`)

  // ເພີ່ມຂັ້ນທີ 3 ທີ່ໃຊ້ສະເພາະໃບເກີນ 10 ລ້ານ
  await c.query(
    `insert into it.pr_approval_steps (step_no, name_lo, approver_employee_id, min_amount)
     values (3, 'ຜູ້ອຳນວຍການ', $1::int, 10000000)`,
    [manager.employee_id]
  )
  check(true, 'ເພີ່ມຂັ້ນທີ 3 ສຳລັບໃບເກີນ 10,000,000 ໄດ້')

  console.log('\n[2] ໃບນ້ອຍ — ຜ່ານ 2 ຂັ້ນ')
  const small = await newPr(support, 'ຊື້ເມົ້າ ແລະ ແປ້ນພິມ', [
    ['Mouse ໄຮ້ສາຍ', 5, 250_000],
    ['Keyboard', 5, 300_000],
  ])
  check(/^PR-\d{4}-\d{3}$/.test(small.pr_no), `ເລກໃບຖືກຮູບແບບ (${small.pr_no})`)
  check(small.status === 'draft', 'ໃບໃໝ່ເລີ່ມທີ່ຮ່າງ')

  let v = await view(small.id)
  check(Number(v.total_est) === 2_750_000, `ລວມມູນຄ່າຖືກ (${Number(v.total_est).toLocaleString()})`)
  check(v.line_count === '2', 'ນັບລາຍການຖືກ')
  check(v.requester_name !== null, 'ດຶງຊື່ຜູ້ສະເໜີຈາກທະບຽນພະນັກງານໄດ້')

  const smallSteps = (
    await c.query(
      `select step_no from it.pr_approval_steps
        where is_active and min_amount <= $1::numeric order by step_no`,
      [v.total_est]
    )
  ).rows
  check(smallSteps.length === 2, 'ໃບນ້ອຍຜ່ານ 2 ຂັ້ນ (ບໍ່ຕ້ອງຜ່ານຜູ້ອຳນວຍການ)')

  await c.query(`update public.odg_pm_pr set status = 'submitted' where id = $1`, [small.id])
  await approve(small.id, 1, head.employee_id)
  await c.query('update it.pr_extra set current_step = 2 where pr_id = $1', [small.id])
  await approve(small.id, 2, manager.employee_id)
  await c.query(
    `update public.odg_pm_pr set status = 'approved', approved_by = $2, approved_at = now()
      where id = $1`,
    [small.id, manager.employee_code]
  )

  v = await view(small.id)
  check(v.status === 'approved', 'ຜ່ານຂັ້ນສຸດທ້າຍ = ອະນຸມັດສົມບູນ')
  check(v.approval_count === '2', 'ບັນທຶກການອະນຸມັດຄົບ 2 ຂັ້ນ')
  check(v.approved_by_name !== null, 'ດຶງຊື່ຜູ້ອະນຸມັດສຸດທ້າຍໄດ້')
  check(v.is_finished === true, 'ນັບເປັນຈົບແລ້ວ')

  console.log('\n[3] ໃບໃຫຍ່ — ຕ້ອງຜ່ານ 3 ຂັ້ນ')
  const big = await newPr(support, 'ຊື້ Server ໃໝ່', [['Server Dell R750', 1, 95_000_000]])
  v = await view(big.id)
  const bigSteps = (
    await c.query(
      `select step_no from it.pr_approval_steps
        where is_active and min_amount <= $1::numeric order by step_no`,
      [v.total_est]
    )
  ).rows
  check(
    bigSteps.length === 3,
    `ໃບ ${Number(v.total_est).toLocaleString()} ຕ້ອງຜ່ານ 3 ຂັ້ນ (ມີຜູ້ອຳນວຍການ)`
  )

  console.log('\n[4] ປະຕິເສດ')
  const bad = await newPr(support, 'ຊື້ເຄື່ອງທີ່ບໍ່ຈຳເປັນ', [['ຂອງຫຼິ້ນ', 1, 500_000]])
  await c.query(`update public.odg_pm_pr set status = 'submitted' where id = $1`, [bad.id])
  await approve(bad.id, 1, head.employee_id, 'rejected', 'ບໍ່ຢູ່ໃນງົບປະມານ')
  await c.query(
    `update public.odg_pm_pr set status = 'rejected', reject_reason = $2 where id = $1`,
    [bad.id, 'ບໍ່ຢູ່ໃນງົບປະມານ']
  )
  v = await view(bad.id)
  check(v.status === 'rejected', 'ໃບຖືກປະຕິເສດ')
  check(v.reject_reason === 'ບໍ່ຢູ່ໃນງົບປະມານ', 'ເກັບເຫດຜົນທີ່ບໍ່ອະນຸມັດ')

  console.log('\n[5] ຂໍ້ມູນລົງຕາຕະລາງ ERP ຈິງ')
  const erp = (
    await c.query(
      `select p.pr_no, p.requester_code, p.status,
              (select count(*) from public.odg_pm_pr_line l where l.pr_id = p.id) as lines
         from public.odg_pm_pr p where p.id = $1`,
      [small.id]
    )
  ).rows[0]
  check(erp.pr_no === small.pr_no, 'ຫົວໃບຢູ່ public.odg_pm_pr')
  check(erp.lines === '2', 'ລາຍການຢູ່ public.odg_pm_pr_line')
  check(erp.requester_code === support.employee_code, 'ຜູ້ສະເໜີເກັບເປັນລະຫັດພະນັກງານຕາມ ERP')

  const totals = (await c.query('select count(*) from public.odg_pm_pr')).rows[0]
  check(Number(totals.count) === 3, `ສ້າງໃບທົດສອບ 3 ໃບ (ຈະ rollback ຖິ້ມ)`)

  await c.query('rollback')

  const after = (await c.query('select count(*) from public.odg_pm_pr')).rows[0]
  check(Number(after.count) === 0, 'rollback ແລ້ວ ຕາຕະລາງ ERP ກັບເປັນວ່າງຄືເກົ່າ')

  console.log(`\nທັງໝົດ ${passed} ການກວດຜ່ານ.`)
} catch (e) {
  await c.query('rollback').catch(() => {})
  console.error('\nFAILED:', e.message)
  process.exitCode = 1
} finally {
  await c.end()
}

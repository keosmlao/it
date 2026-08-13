// Usage: node --env-file=.env.local scripts/smoke-transfer.mjs
//
// ໂອນເຄື່ອງໃຫ້ຄົນອື່ນໂດຍບໍ່ຄືນເຂົ້າສາງ — ຕ້ອງໄດ້ຜົນວ່າ:
//   • ໃບເກົ່າປິດ, ໃບໃໝ່ເປີດ, ຜູ້ຖືປ່ຽນ
//   • ຍັງມີໃບຢືມຄ້າງ **ໃບດຽວ** (ບໍ່ເກີດການຂັດກັນແບບທີ່ພົບ 12 ເຄື່ອງ)
//   • ໃຊ້ໄດ້ທັງໃບຂອງລະບົບນີ້ ແລະ ໃບຂອງ ERP
// ທຸກຢ່າງຢູ່ໃນ transaction ດຽວ ແລ້ວ rollback
import pg from 'pg'

const c = new pg.Client({ connectionString: process.env.DATABASE_URL })
await c.connect()

let passed = 0
function check(cond, what) {
  if (!cond) throw new Error(`assertion failed — ${what}`)
  console.log(`   ✓ ${what}`)
  passed++
}

/** ຈຳລອງສິ່ງທີ່ transferAsset ເຮັດ — ປິດໃບເກົ່າ + ເປີດໃບໃໝ່ + ບັນທຶກການໂອນ */
async function transfer(assetCode, toEmp, actor) {
  const from = (
    await c.query(
      `select source, borrow_doc_no, emp_code from it.v_asset_movements
        where asset_code = $1 and not is_returned
        order by borrowed_at desc nulls last, borrow_doc_no desc nulls last limit 1`,
      [assetCode]
    )
  ).rows[0]

  let returnDoc = null
  if (from.source === 'it') {
    returnDoc = (
      await c.query(
        `update it.asset_loans
            set returned_at = current_date, return_doc_no = it.next_loan_no('RTIT'),
                return_condition = 'good', return_note = 'ໂອນ', returned_by = $2
          where asset_code = $1 and returned_at is null and deleted_at is null
          returning return_doc_no`,
        [assetCode, actor]
      )
    ).rows[0].return_doc_no
  } else {
    returnDoc = (
      await c.query(
        `insert into it.erp_loan_returns
           (borrow_doc_no, asset_code, emp_code, return_condition, return_note, returned_by)
         values ($1, $2, $3, 'good', 'ໂອນ', $4)
         returning return_doc_no`,
        [from.borrow_doc_no, assetCode, from.emp_code, actor]
      )
    ).rows[0].return_doc_no
  }

  const newDoc = (
    await c.query(
      `insert into it.asset_loans (asset_code, emp_code, borrow_note, created_by)
       values ($1, $2, 'ຮັບໂອນ', $3) returning borrow_doc_no`,
      [assetCode, toEmp, actor]
    )
  ).rows[0].borrow_doc_no

  await c.query(
    `insert into it.asset_transfers
       (asset_code, from_emp_code, to_emp_code, from_borrow_doc_no,
        from_return_doc_no, to_borrow_doc_no, created_by)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [assetCode, from.emp_code, toEmp, from.borrow_doc_no, returnDoc, newDoc, actor]
  )

  await c.query('select it.refresh_asset_movements()')
  return { from, returnDoc, newDoc }
}

try {
  await c.query('begin')

  const actor = (
    await c.query("select employee_id from it.v_it_staff where role = 'manager' limit 1")
  ).rows[0].employee_id
  const people = (
    await c.query(
      `select employee_code, fullname_lo from public.odg_employee
        where employment_status = 'ACTIVE' order by employee_code limit 3`
    )
  ).rows

  // ---------- ກໍລະນີ 1: ໃບຢືມຂອງລະບົບນີ້ ----------
  console.log('\n[1] ໂອນໃບຢືມທີ່ອອກຈາກລະບົບນີ້')
  const spare = (
    await c.query('select asset_code from it.v_it_assets where not is_assigned limit 1')
  ).rows[0]

  await c.query(
    `insert into it.asset_loans (asset_code, emp_code, borrow_note, created_by)
     values ($1, $2, 'ທົດສອບ', $3)`,
    [spare.asset_code, people[0].employee_code, actor]
  )
  await c.query('select it.refresh_asset_movements()')

  let holder = (
    await c.query('select emp_code from it.v_asset_holders where item_code = $1', [
      spare.asset_code,
    ])
  ).rows[0]
  check(holder.emp_code === people[0].employee_code, `ຜູ້ຖືເລີ່ມຕົ້ນ = ${people[0].fullname_lo}`)

  const t1 = await transfer(spare.asset_code, people[1].employee_code, actor)
  check(/^RTIT\d{8}$/.test(t1.returnDoc), `ອອກໃບຄືນໃຫ້ຜູ້ຖືເກົ່າ (${t1.returnDoc})`)
  check(/^BRIT\d{8}$/.test(t1.newDoc), `ອອກໃບຢືມໃໝ່ໃຫ້ຜູ້ຮັບ (${t1.newDoc})`)

  holder = (
    await c.query('select emp_code from it.v_asset_holders where item_code = $1', [
      spare.asset_code,
    ])
  ).rows[0]
  check(holder.emp_code === people[1].employee_code, `ຜູ້ຖືປ່ຽນເປັນ ${people[1].fullname_lo}`)

  let open = (
    await c.query(
      'select count(*) from it.v_asset_movements where asset_code = $1 and not is_returned',
      [spare.asset_code]
    )
  ).rows[0]
  check(Number(open.count) === 1, 'ຍັງມີໃບຢືມຄ້າງໃບດຽວ (ບໍ່ຂັດກັນ)')

  const conflict = (
    await c.query('select count(*) from it.v_loan_conflicts where asset_code = $1', [
      spare.asset_code,
    ])
  ).rows[0]
  check(Number(conflict.count) === 0, 'ບໍ່ປະກົດໃນລາຍການໃບຢືມທີ່ຂັດກັນ')

  // ---------- ກໍລະນີ 2: ໂອນຕໍ່ອີກຄັ້ງ ----------
  console.log('\n[2] ໂອນຕໍ່ອີກຄັ້ງ (ຄົນທີ 2 → ຄົນທີ 3)')
  const t2 = await transfer(spare.asset_code, people[2].employee_code, actor)
  holder = (
    await c.query('select emp_code from it.v_asset_holders where item_code = $1', [
      spare.asset_code,
    ])
  ).rows[0]
  check(holder.emp_code === people[2].employee_code, `ຜູ້ຖືປ່ຽນເປັນ ${people[2].fullname_lo}`)
  check(t2.from.borrow_doc_no === t1.newDoc, 'ໃບທີ່ຖືກປິດຮອບນີ້ຄືໃບທີ່ອອກຮອບກ່ອນ')

  open = (
    await c.query(
      'select count(*) from it.v_asset_movements where asset_code = $1 and not is_returned',
      [spare.asset_code]
    )
  ).rows[0]
  check(Number(open.count) === 1, 'ຍັງມີໃບຢືມຄ້າງໃບດຽວ')

  const chain = (
    await c.query(
      `select count(*) from it.v_asset_transfers where asset_code = $1`,
      [spare.asset_code]
    )
  ).rows[0]
  check(Number(chain.count) === 2, 'ບັນທຶກການໂອນຄົບ 2 ຄັ້ງ ໃນປະຫວັດ')

  const history = (
    await c.query(
      'select count(*) from it.v_asset_movements where asset_code = $1',
      [spare.asset_code]
    )
  ).rows[0]
  check(Number(history.count) === 3, 'ປະຫວັດເຫັນຄົບ 3 ໃບ (ຢືມ → ໂອນ → ໂອນ)')

  // ---------- ກໍລະນີ 3: ໃບຢືມຂອງ ERP ----------
  console.log('\n[3] ໂອນໃບຢືມທີ່ອອກຈາກ ERP')
  const erpHeld = (
    await c.query(
      `select asset_code, emp_code from it.v_asset_movements
        where source = 'erp' and not is_returned and borrow_doc_no is not null
        order by borrowed_at limit 1`
    )
  ).rows[0]

  const receiver = people.find((p) => p.employee_code !== erpHeld.emp_code)
  const t3 = await transfer(erpHeld.asset_code, receiver.employee_code, actor)
  check(t3.from.source === 'erp', 'ໃບຕົ້ນທາງມາຈາກ ERP')

  holder = (
    await c.query(
      `select h.emp_code, h.holder_source
         from it.v_asset_holders h where h.item_code = $1`,
      [erpHeld.asset_code]
    )
  ).rows[0]
  check(holder.emp_code === receiver.employee_code, `ຜູ້ຖືປ່ຽນເປັນ ${receiver.fullname_lo}`)
  check(holder.holder_source === 'it', 'ໃບໃໝ່ນັບເປັນຂອງລະບົບນີ້')

  open = (
    await c.query(
      'select count(*) from it.v_asset_movements where asset_code = $1 and not is_returned',
      [erpHeld.asset_code]
    )
  ).rows[0]
  check(Number(open.count) === 1, 'ໃບຢືມ ERP ຖືກປິດ ເຫຼືອໃບຄ້າງໃບດຽວ')

  const erpUntouched = (
    await c.query(
      `select return_doc_no from public.report_asset_trans_detail
        where borrow_doc_no = $1 and item_code = $2`,
      [t3.from.borrow_doc_no, erpHeld.asset_code]
    )
  ).rows[0]
  check(erpUntouched.return_doc_no === null, 'ຂໍ້ມູນຕົ້ນທາງໃນ ERP ບໍ່ຖືກແກ້')

  await c.query('rollback')
  await c.query('select it.refresh_asset_movements()')
  console.log(`\nທັງໝົດ ${passed} ການກວດຜ່ານ. ຂໍ້ມູນທົດສອບຖືກ rollback ໝົດແລ້ວ.`)
} catch (e) {
  await c.query('rollback').catch(() => {})
  await c.query('select it.refresh_asset_movements()').catch(() => {})
  console.error('\nFAILED:', e.message)
  process.exitCode = 1
} finally {
  await c.end()
}

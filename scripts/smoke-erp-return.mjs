// Usage: node --env-file=.env.local scripts/smoke-erp-return.mjs
// Closes a real open ERP loan through it.erp_loan_returns and asserts the
// overlay reaches every dependent view. Rolled back at the end.
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

  const staff = (
    await c.query(`select employee_id from it.v_it_staff where role = 'manager' limit 1`)
  ).rows[0]

  const before = (
    await c.query(
      `select count(*) filter (where not is_returned and source = 'erp') as open_erp,
              count(*) filter (where is_returned  and source = 'erp') as closed_erp
         from it.v_asset_movements`
    )
  ).rows[0]
  console.log(`\nກ່ອນ: ໃບຢືມ ERP ຄ້າງ ${before.open_erp} · ຄືນແລ້ວ ${before.closed_erp}`)

  const loan = (
    await c.query(
      `select asset_code, emp_code, emp_name, borrow_doc_no, borrowed_at
         from it.v_asset_movements
        where source = 'erp' and not is_returned and borrow_doc_no is not null
        order by borrowed_at asc limit 1`
    )
  ).rows[0]
  check(!!loan, `ມີໃບຢືມ ERP ຄ້າງໃຫ້ທົດສອບ (${loan?.borrow_doc_no})`)
  console.log(`   → ${loan.asset_code} ຢູ່ກັບ ${loan.emp_name ?? loan.emp_code}`)

  const heldBefore = (
    await c.query('select is_assigned, holder_source from it.v_it_assets where asset_code = $1', [
      loan.asset_code,
    ])
  ).rows[0]
  check(heldBefore.is_assigned === true, 'ກ່ອນຄືນ: ທະບຽນສະແດງວ່າມີຜູ້ຖືຄອງ')
  check(heldBefore.holder_source === 'erp', 'ກ່ອນຄືນ: ຜູ້ຖືຄອງມາຈາກ ERP')

  const ret = (
    await c.query(
      `insert into it.erp_loan_returns
         (borrow_doc_no, asset_code, emp_code, return_condition, return_note, returned_by)
       values ($1, $2, $3, 'good', 'ທົດສອບການຄືນ', $4)
       returning return_doc_no, returned_at`,
      [loan.borrow_doc_no, loan.asset_code, loan.emp_code, staff.employee_id]
    )
  ).rows[0]
  check(/^RTIT\d{8}$/.test(ret.return_doc_no), `ອອກເລກໃບຄືນຖືກ (${ret.return_doc_no})`)

  // ປະຫວັດເປັນ cache — action ຂອງແອັບ refresh ໃຫ້ຫຼັງບັນທຶກ ທົດສອບຕ້ອງເຮັດຄືກັນ
  await c.query('select it.refresh_asset_movements()')

  const mv = (
    await c.query(
      `select is_returned, return_doc_no, returned_at, return_condition, note
         from it.v_asset_movements
        where source = 'erp' and borrow_doc_no = $1 and asset_code = $2`,
      [loan.borrow_doc_no, loan.asset_code]
    )
  ).rows[0]
  check(mv.is_returned === true, 'ປະຫວັດ: ໃບຢືມ ERP ນັບເປັນຄືນແລ້ວ')
  check(mv.return_doc_no === ret.return_doc_no, 'ປະຫວັດ: ຕິດເລກໃບຄືນຂອງ IT')
  check(mv.return_condition === 'good', 'ປະຫວັດ: ສະພາບເຄື່ອງຖືກບັນທຶກ')

  const holder = (
    await c.query('select * from it.v_asset_holders where item_code = $1', [loan.asset_code])
  ).rows[0]
  check(!holder, 'ຜູ້ຖືຄອງ: ຫຼຸດອອກຈາກລາຍຊື່ຜູ້ຖືຄອງແລ້ວ')

  const asset = (
    await c.query(
      'select is_assigned, holder_name from it.v_it_assets where asset_code = $1',
      [loan.asset_code]
    )
  ).rows[0]
  check(asset.is_assigned === false, 'ທະບຽນ: ເຄື່ອງກັບເຂົ້າສາງ (ຢືມໄດ້ອີກ)')
  check(asset.holder_name === null, 'ທະບຽນ: ບໍ່ມີຊື່ຜູ້ຖືຄອງແລ້ວ')

  const target = (
    await c.query(
      'select count(*) from it.v_recovery_targets where asset_code = $1',
      [loan.asset_code]
    )
  ).rows[0]
  check(Number(target.count) === 0, 'ທວງຄືນ: ຫຼຸດອອກຈາກລາຍການທີ່ຕ້ອງທວງ')

  const doc = (
    await c.query('select * from it.v_asset_documents where doc_no = $1', [ret.return_doc_no])
  ).rows[0]
  check(!!doc, 'ເອກະສານ: ໃບຄືນປະກົດໃນລາຍການເອກະສານ')
  check(doc.doc_kind === 'return' && doc.source === 'it', 'ເອກະສານ: ຈັດເປັນໃບຄືນຂອງ IT')

  const docItem = (
    await c.query('select * from it.v_asset_document_items where doc_no = $1', [
      ret.return_doc_no,
    ])
  ).rows[0]
  check(docItem?.asset_code === loan.asset_code, 'ເອກະສານ: ມີລາຍການເຄື່ອງຢູ່ໃນໃບຄືນ')
  check(docItem?.ref_doc_no === loan.borrow_doc_no, 'ເອກະສານ: ໃບຄືນອ້າງອີງໃບຢືມຕົ້ນທາງ')

  let dup = false
  try {
    await c.query('savepoint sp1')
    await c.query(
      `insert into it.erp_loan_returns
         (borrow_doc_no, asset_code, emp_code, returned_by)
       values ($1, $2, $3, $4)`,
      [loan.borrow_doc_no, loan.asset_code, loan.emp_code, staff.employee_id]
    )
  } catch {
    dup = true
    await c.query('rollback to savepoint sp1')
  }
  check(dup, 'ຄືນຊ້ຳໃບເກົ່າບໍ່ໄດ້ (ກັນບັນທຶກຊໍ້າ)')

  const after = (
    await c.query(
      `select count(*) filter (where not is_returned and source = 'erp') as open_erp
         from it.v_asset_movements`
    )
  ).rows[0]
  check(
    Number(after.open_erp) === Number(before.open_erp) - 1,
    `ໃບຢືມ ERP ຄ້າງຫຼຸດຈາກ ${before.open_erp} ເປັນ ${after.open_erp}`
  )

  // ຢືນຢັນວ່າຂໍ້ມູນ ERP ບໍ່ຖືກແຕະ
  const erpRow = (
    await c.query(
      `select return_doc_no, to_date from public.report_asset_trans_detail
        where borrow_doc_no = $1 and item_code = $2`,
      [loan.borrow_doc_no, loan.asset_code]
    )
  ).rows[0]
  check(
    erpRow.return_doc_no === null && erpRow.to_date === null,
    'ຂໍ້ມູນຕົ້ນທາງໃນ ERP ຍັງບໍ່ຖືກແກ້ໄຂ (ອ່ານຢ່າງດຽວຕາມກົດ)'
  )

  await c.query('rollback')
  console.log(`\nທັງໝົດ ${passed} ການກວດຜ່ານ. ຂໍ້ມູນທົດສອບຖືກ rollback ໝົດແລ້ວ.`)
} catch (e) {
  await c.query('rollback')
  console.error('\nFAILED:', e.message)
  process.exitCode = 1
} finally {
  await c.end()
}

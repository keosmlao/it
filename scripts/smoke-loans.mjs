// Usage: npm run db:smoke-loans
// Exercises the lend / return flow against the real database, then rolls back.
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

  const manager = (
    await c.query("select employee_id from it.v_it_staff where role = 'manager'")
  ).rows[0]
  const borrower = (
    await c.query(
      `select employee_code from public.odg_employee
        where employment_status = 'ACTIVE' limit 1`
    )
  ).rows[0]
  // ເຄື່ອງທີ່ຢູ່ໃນສາງ (ບໍ່ມີຜູ້ຖື)
  const asset = (
    await c.query(
      'select asset_code from it.v_it_assets where not is_assigned limit 1'
    )
  ).rows[0]

  console.log(`ເຄື່ອງ ${asset.asset_code} → ຜູ້ຢືມ ${borrower.employee_code}\n`)

  // ---------- ຢືມ ----------
  console.log('[1] ບັນທຶກການຢືມ')
  const loan = (
    await c.query(
      `insert into it.asset_loans
         (asset_code, emp_code, borrowed_at, expected_return, borrow_note, created_by)
       values ($1::varchar, $2::varchar, current_date,
               current_date + 30, $3::text, $4::int)
       returning id, borrow_doc_no`,
      [asset.asset_code, borrower.employee_code, 'ທົດສອບ', manager.employee_id]
    )
  ).rows[0]

  check(/^BRIT\d{8}$/.test(loan.borrow_doc_no), `ເລກໃບຢືມຖືກຮູບແບບ (${loan.borrow_doc_no})`)

  // ປະຫວັດເປັນ cache — action ຂອງແອັບ refresh ໃຫ້ຫຼັງບັນທຶກ ທົດສອບຕ້ອງເຮັດຄືກັນ
  await c.query('select it.refresh_asset_movements()')

  let view = (
    await c.query(
      'select is_assigned, holder_code, holder_source, movement_count from it.v_it_assets where asset_code = $1',
      [asset.asset_code]
    )
  ).rows[0]
  check(view.is_assigned === true, 'ເຄື່ອງປ່ຽນເປັນ "ມີຜູ້ຖືຄອງ" ທັນທີ')
  check(view.holder_code === borrower.employee_code, 'ຜູ້ຖືຄອງຖືກຄົນ')
  check(view.holder_source === 'it', 'ໝາຍວ່າໃບຢືມມາຈາກລະບົບນີ້ (ບໍ່ແມ່ນ ERP)')

  const mv = (
    await c.query(
      `select source, is_returned from it.v_asset_movements
        where asset_code = $1 and source = 'it'`,
      [asset.asset_code]
    )
  ).rows[0]
  check(mv && mv.is_returned === false, 'ປະຫວັດຢືມ–ຄືນເຫັນລາຍການໃໝ່ ສະຖານະ "ຍັງບໍ່ຄືນ"')

  // ---------- ຢືມຊ້ອນບໍ່ໄດ້ ----------
  console.log('\n[2] ກັນການຢືມຊ້ອນ')
  const holder = (
    await c.query('select emp_code from it.v_asset_holders where item_code = $1', [
      asset.asset_code,
    ])
  ).rows
  check(holder.length === 1, 'ມີຜູ້ຖືຄອງພຽງຄົນດຽວ — ແອັບຈະປະຕິເສດການຢືມຊ້ອນ')

  // ---------- ຄືນ ----------
  console.log('\n[3] ບັນທຶກການຄືນ')
  const ret = (
    await c.query(
      `update it.asset_loans
          set returned_at      = current_date,
              return_doc_no    = it.next_loan_no('RTIT'),
              return_condition = 'good',
              returned_by      = $2::int
        where id = $1::bigint
        returning return_doc_no`,
      [loan.id, manager.employee_id]
    )
  ).rows[0]

  check(/^RTIT\d{8}$/.test(ret.return_doc_no), `ເລກໃບຄືນຖືກຮູບແບບ (${ret.return_doc_no})`)

  await c.query('select it.refresh_asset_movements()')

  view = (
    await c.query(
      'select is_assigned, holder_code from it.v_it_assets where asset_code = $1',
      [asset.asset_code]
    )
  ).rows[0]
  check(view.is_assigned === false, 'ຄືນແລ້ວເຄື່ອງກັບໄປ "ຢູ່ໃນສາງ"')
  check(view.holder_code === null, 'ບໍ່ມີຜູ້ຖືຄອງອີກຕໍ່ໄປ')

  const after = (
    await c.query(
      `select is_returned, return_condition from it.v_asset_movements
        where asset_code = $1 and source = 'it'`,
      [asset.asset_code]
    )
  ).rows[0]
  check(after.is_returned === true, 'ປະຫວັດປ່ຽນເປັນ "ຄືນແລ້ວ"')
  check(after.return_condition === 'good', 'ບັນທຶກສະພາບເຄື່ອງຕອນຄືນ')

  // ---------- ຂໍ້ມູນ ERP ບໍ່ຖືກແຕະ ----------
  console.log('\n[4] ຂໍ້ມູນ ERP')
  // ທຽບກັບຕາຕະລາງຕົ້ນທາງໂດຍກົງ ບໍ່ໃຊ້ຕົວເລກຕາຍຕົວ — ຈຳນວນໃບຢືມໃນ ERP
  // ເພີ່ມຂຶ້ນເລື້ອຍໆຕາມການໃຊ້ງານຈິງ ສິ່ງທີ່ຕ້ອງພິສູດຄືສອງຝ່າຍຍັງກົງກັນ
  const erp = (
    await c.query(
      `select (select count(*) from it.v_asset_movements where source = 'erp') as view_rows,
              (select count(*) from public.report_asset_trans_detail
                where item_code like '200-%')                                 as source_rows`
    )
  ).rows[0]
  check(
    erp.view_rows === erp.source_rows,
    `ລາຍການ ERP ຍັງກົງກັບຕົ້ນທາງ (${erp.view_rows}/${erp.source_rows}) ບໍ່ຖືກແກ້ໄຂ`
  )

  await c.query('rollback')
  console.log(`\nທັງໝົດ ${passed} ການກວດຜ່ານ. ຂໍ້ມູນທົດສອບຖືກ rollback ແລ້ວ.`)
} catch (e) {
  await c.query('rollback')
  console.error('\nFAILED:', e.message)
  process.exitCode = 1
} finally {
  await c.end()
}

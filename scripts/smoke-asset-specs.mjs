// Usage: npm run db:smoke-assets
// Exercises the spec/warranty/repair SQL against the real database, then rolls back.
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
  const asset = (
    await c.query('select asset_code from it.v_it_assets order by asset_code limit 1')
  ).rows[0]
  console.log(`ອຸປະກອນທົດສອບ: ${asset.asset_code}\n`)

  // ---------- spec + ວັນທີຊື້ + ປະກັນ ----------
  console.log('[1] Spec, ວັນທີຊື້ ແລະ ປະກັນ')
  const upsert = `
    insert into it.asset_specs
      (asset_code, cpu, ram, storage, os, purchase_date, purchase_price,
       warranty_until, warranty_note, updated_by)
    values ($1::varchar, $2::varchar, $3::varchar, $4::varchar, $5::varchar,
            $6::date, $7::numeric, $8::date, $9::varchar, $10::int)
    on conflict (asset_code) do update
      set cpu = excluded.cpu, ram = excluded.ram,
          warranty_until = excluded.warranty_until, updated_at = now()`

  await c.query(upsert, [
    asset.asset_code,
    'Intel Core i5-1235U',
    '16GB',
    'SSD 512GB',
    'Windows 11 Pro',
    '2025-01-15',
    '8500000',
    '2027-01-15',
    'ຮ້ານ TRIVICO',
    manager.employee_id,
  ])

  let row = (
    await c.query(
      `select cpu, ram, purchase_date, purchase_price, warranty_until,
              warranty_status, has_spec
         from it.v_it_assets where asset_code = $1`,
      [asset.asset_code]
    )
  ).rows[0]

  check(row.has_spec === true, 'spec ຖືກບັນທຶກ ແລະ ເຫັນຜ່ານ view')
  check(row.cpu === 'Intel Core i5-1235U', 'CPU ອອກມາຖືກ')
  check(Number(row.purchase_price) === 8500000, 'ລາຄາຊື້ຖືກ')
  check(row.warranty_status === 'valid', 'ປະກັນເຖິງ 2027 → ສະຖານະ "ຢູ່ໃນປະກັນ"')

  // upsert ຄັ້ງທີ 2 ຕ້ອງທັບຄ່າເກົ່າ ບໍ່ແມ່ນສ້າງແຖວໃໝ່
  await c.query(upsert, [
    asset.asset_code,
    'Intel Core i7',
    '32GB',
    'SSD 1TB',
    'Windows 11 Pro',
    '2025-01-15',
    '8500000',
    '2020-01-15',
    null,
    manager.employee_id,
  ])

  const count = (
    await c.query('select count(*) from it.asset_specs where asset_code = $1', [
      asset.asset_code,
    ])
  ).rows[0]
  check(Number(count.count) === 1, 'ບັນທຶກຊ້ຳແລ້ວທັບແຖວເກົ່າ ບໍ່ໄດ້ສ້າງໃໝ່')

  row = (
    await c.query(
      'select cpu, warranty_status from it.v_it_assets where asset_code = $1',
      [asset.asset_code]
    )
  ).rows[0]
  check(row.cpu === 'Intel Core i7', 'ແກ້ໄຂ spec ແລ້ວຄ່າໃໝ່ຖືກນຳໃຊ້')
  check(row.warranty_status === 'expired', 'ປະກັນ 2020 → ສະຖານະ "ໝົດປະກັນແລ້ວ"')

  // ---------- ປະຫວັດການສ້ອມ ----------
  console.log('\n[2] ປະຫວັດການສ້ອມ')
  const before = (
    await c.query('select count(*) from it.v_asset_repairs where asset_code = $1', [
      asset.asset_code,
    ])
  ).rows[0]

  await c.query(
    `insert into it.asset_repairs
       (asset_code, repair_date, issue, action, cost, vendor, status, created_by)
     values ($1::varchar, current_date, $2::text, $3::text, $4::numeric,
             $5::varchar, 'done', $6::int)`,
    [
      asset.asset_code,
      'ຈໍບໍ່ຕິດ',
      'ປ່ຽນສາຍແພ',
      '350000',
      'ຮ້ານ ABC',
      manager.employee_id,
    ]
  )

  const repairs = (
    await c.query(
      `select source, ref_no, issue, cost, created_by_name
         from it.v_asset_repairs where asset_code = $1
        order by repair_date desc`,
      [asset.asset_code]
    )
  ).rows

  check(
    repairs.length === Number(before.count) + 1,
    'ບັນທຶກການສ້ອມເພີ່ມເຂົ້າປະຫວັດແລ້ວ'
  )
  check(repairs[0].source === 'it', 'ລາຍການໃໝ່ມາຈາກ IT (ບໍ່ແມ່ນ ERP)')
  check(repairs[0].created_by_name !== null, 'ຊື່ຜູ້ບັນທຶກ join ຈາກ odg_employee ໄດ້')

  const withCount = (
    await c.query('select repair_count from it.v_it_assets where asset_code = $1', [
      asset.asset_code,
    ])
  ).rows[0]
  check(
    Number(withCount.repair_count) === repairs.length,
    'ຈຳນວນຄັ້ງທີ່ສ້ອມໃນ view ຫຼັກກົງກັນ'
  )

  // ---------- ປະຫວັດ ERP ຍັງອ່ານໄດ້ ----------
  console.log('\n[3] ປະຫວັດການສ້ອມຂອງ ERP')
  const erp = (
    await c.query("select count(*) from it.v_asset_repairs where source = 'erp'")
  ).rows[0]
  check(Number(erp.count) > 0, `ອ່ານປະຫວັດການສ້ອມຈາກ ERP ໄດ້ (${erp.count} ລາຍການ)`)

  await c.query('rollback')
  console.log(`\nທັງໝົດ ${passed} ການກວດຜ່ານ. ຂໍ້ມູນທົດສອບຖືກ rollback ແລ້ວ.`)
} catch (e) {
  await c.query('rollback')
  console.error('\nFAILED:', e.message)
  process.exitCode = 1
} finally {
  await c.end()
}

// Usage: node --env-file=.env.local scripts/smoke-condition.mjs
//
// 1. ໝາຍເຄື່ອງເພ → ສົ່ງສ້ອມ → ຕັດຈຳໜ່າຍ → ຍົກເລີກການຕັດຈຳໜ່າຍ
// 2. ຕິດຕັ້ງອຸປະກອນສ່ວນກາງ → ຖອດອອກ
// 3. ຢືນຢັນວ່າເຄື່ອງເພ/ຕິດຕັ້ງຢູ່ **ບໍ່ປະກົດ** ໃນລາຍການທີ່ໃຫ້ຢືມໄດ້
// ທັງໝົດຢູ່ໃນ transaction ດຽວ ແລ້ວ rollback
import pg from 'pg'

const c = new pg.Client({ connectionString: process.env.DATABASE_URL })
await c.connect()

let passed = 0
function check(cond, what) {
  if (!cond) throw new Error(`assertion failed — ${what}`)
  console.log(`   ✓ ${what}`)
  passed++
}

const lendable = (code) =>
  c
    .query(
      `select count(*) from it.v_it_assets a
         left join it.asset_stock_status s on s.asset_code = a.asset_code
         left join it.asset_deployments d
                on d.asset_code = a.asset_code and d.removed_at is null
        where a.asset_code = $1 and not a.is_assigned and a.is_active
          and coalesce(s.stock_state, 'in_stock') not in
              ('repair','damaged','missing','scrapped','retired')
          and d.id is null`,
      [code]
    )
    .then((r) => Number(r.rows[0].count))

try {
  await c.query('begin')

  const staff = (await c.query('select employee_id, role from it.v_it_staff')).rows
  const manager = staff.find((s) => s.role === 'manager')
  const spare = (
    await c.query('select asset_code, name from it.v_it_assets where not is_assigned limit 2')
  ).rows

  const a = spare[0]
  const b = spare[1]
  console.log(`ເຄື່ອງທົດສອບ: ${a.asset_code} · ${b.asset_code}\n`)

  // ---------- ເພ → ສ້ອມ → ຕັດຈຳໜ່າຍ ----------
  console.log('[1] ວົງຈອນເຄື່ອງເພ')
  check((await lendable(a.asset_code)) === 1, 'ກ່ອນເລີ່ມ: ຢູ່ໃນລາຍການທີ່ໃຫ້ຢືມໄດ້')

  await c.query(
    `insert into it.asset_stock_status
       (asset_code, stock_state, damaged_at, damage_detail, checked_by)
     values ($1, 'damaged', current_date, 'ຈໍແຕກ ເປີດຕິດແຕ່ພາບບໍ່ຂຶ້ນ', $2)`,
    [a.asset_code, manager.employee_id]
  )
  let row = (
    await c.query('select * from it.v_damaged_assets where asset_code = $1', [a.asset_code])
  ).rows[0]
  check(row.stock_state === 'damaged', 'ໝາຍວ່າເພແລ້ວ ປະກົດໃນລາຍການອຸປະກອນເພ')
  check(row.damage_detail.includes('ຈໍແຕກ'), 'ບັນທຶກອາການໄວ້')
  check((await lendable(a.asset_code)) === 0, 'ເຄື່ອງເພ ບໍ່ປະກົດໃນລາຍການທີ່ໃຫ້ຢືມ')

  await c.query(
    `update it.asset_stock_status set stock_state = 'repair' where asset_code = $1`,
    [a.asset_code]
  )
  check((await lendable(a.asset_code)) === 0, 'ສົ່ງສ້ອມຢູ່ ກໍຍັງໃຫ້ຢືມບໍ່ໄດ້')

  await c.query(
    `insert into it.asset_writeoffs
       (asset_code, reason, detail, decided_by, book_value)
     values ($1, 'beyond_repair', 'ສ້ອມ 3 ຄັ້ງແລ້ວຍັງເສຍ ອາໄຫຼ່ບໍ່ມີ', $2, 0)`,
    [a.asset_code, manager.employee_id]
  )
  await c.query(
    `update it.asset_stock_status set stock_state = 'scrapped' where asset_code = $1`,
    [a.asset_code]
  )
  row = (
    await c.query('select * from it.v_damaged_assets where asset_code = $1', [a.asset_code])
  ).rows[0]
  check(row.stock_state === 'scrapped', 'ຕັດຈຳໜ່າຍແລ້ວ')
  check(row.writeoff_reason === 'beyond_repair', 'ບັນທຶກເຫດຜົນການຕັດຈຳໜ່າຍ')
  check(row.decided_by_name !== null, 'ບັນທຶກຜູ້ຕັດສິນ')

  let dup = false
  try {
    await c.query('savepoint sp1')
    await c.query(
      `insert into it.asset_writeoffs (asset_code, reason, detail, decided_by)
       values ($1, 'other', 'ຊ້ຳ', $2)`,
      [a.asset_code, manager.employee_id]
    )
  } catch {
    dup = true
    await c.query('rollback to savepoint sp1')
  }
  check(dup, 'ຕັດຈຳໜ່າຍຊ້ຳເຄື່ອງດຽວກັນບໍ່ໄດ້')

  await c.query(
    `update it.asset_writeoffs set cancelled_at = now(), cancel_note = 'ພົບເຄື່ອງຄືນ'
      where asset_code = $1 and cancelled_at is null`,
    [a.asset_code]
  )
  await c.query(
    `update it.asset_stock_status set stock_state = 'in_stock' where asset_code = $1`,
    [a.asset_code]
  )
  check((await lendable(a.asset_code)) === 1, 'ຍົກເລີກການຕັດຈຳໜ່າຍ → ກັບມາໃຫ້ຢືມໄດ້')

  // ---------- ອຸປະກອນສ່ວນກາງ ----------
  console.log('\n[2] ອຸປະກອນສ່ວນກາງ')
  check((await lendable(b.asset_code)) === 1, 'ກ່ອນຕິດຕັ້ງ: ຢູ່ໃນລາຍການທີ່ໃຫ້ຢືມໄດ້')

  await c.query(
    `insert into it.asset_deployments
       (asset_code, place, purpose, installed_at, created_by)
     values ($1, 'ຫ້ອງປະຊຸມໃຫຍ່ ຊັ້ນ 3', 'ກະຈາຍສັນຍານເນັດ', current_date, $2)`,
    [b.asset_code, manager.employee_id]
  )
  const dep = (
    await c.query(
      'select * from it.v_asset_deployments where asset_code = $1 and removed_at is null',
      [b.asset_code]
    )
  ).rows[0]
  check(dep.place === 'ຫ້ອງປະຊຸມໃຫຍ່ ຊັ້ນ 3', `ບັນທຶກບ່ອນຕິດຕັ້ງ (${dep.place})`)
  check(dep.purpose === 'ກະຈາຍສັນຍານເນັດ', 'ບັນທຶກຈຸດປະສົງການໃຊ້')
  check(dep.asset_name !== null, 'ດຶງຊື່ອຸປະກອນຈາກທະບຽນໄດ້')
  check((await lendable(b.asset_code)) === 0, 'ເຄື່ອງທີ່ຕິດຕັ້ງຢູ່ ບໍ່ປະກົດໃນລາຍການທີ່ໃຫ້ຢືມ')

  let dupPlace = false
  try {
    await c.query('savepoint sp2')
    await c.query(
      `insert into it.asset_deployments (asset_code, place, created_by)
       values ($1, 'ບ່ອນອື່ນ', $2)`,
      [b.asset_code, manager.employee_id]
    )
  } catch {
    dupPlace = true
    await c.query('rollback to savepoint sp2')
  }
  check(dupPlace, 'ຕິດຕັ້ງເຄື່ອງດຽວກັນ 2 ບ່ອນພ້ອມກັນບໍ່ໄດ້')

  const stats = (await c.query('select * from it.v_asset_deployments limit 1')).rows[0]
  check(Number(stats.days_installed) === 0, 'ນັບມື້ທີ່ຕິດຕັ້ງມາໄດ້')

  await c.query(
    `update it.asset_deployments
        set removed_at = current_date, remove_note = 'ຍ້າຍໄປຊັ້ນ 4'
      where asset_code = $1 and removed_at is null`,
    [b.asset_code]
  )
  await c.query(
    `insert into it.asset_stock_status (asset_code, stock_state, checked_by)
     values ($1, 'in_stock', $2)
     on conflict (asset_code) do update set stock_state = 'in_stock'`,
    [b.asset_code, manager.employee_id]
  )
  check((await lendable(b.asset_code)) === 1, 'ຖອດອອກແລ້ວ → ກັບມາໃຫ້ຢືມໄດ້')

  const history = (
    await c.query(
      'select count(*) from it.v_asset_deployments where asset_code = $1',
      [b.asset_code]
    )
  ).rows[0]
  check(Number(history.count) === 1, 'ປະຫວັດການຕິດຕັ້ງຍັງເກັບໄວ້')

  await c.query('rollback')
  console.log(`\nທັງໝົດ ${passed} ການກວດຜ່ານ. ຂໍ້ມູນທົດສອບຖືກ rollback ໝົດແລ້ວ.`)
} catch (e) {
  await c.query('rollback').catch(() => {})
  console.error('\nFAILED:', e.message)
  process.exitCode = 1
} finally {
  await c.end()
}

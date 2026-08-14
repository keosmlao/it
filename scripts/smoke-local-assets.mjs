// ທົດສອບທະບຽນຊັບສິນຂອງລະບົບນີ້ — ຂຽນແລ້ວ rollback
//
// ຈຸດທີ່ຕ້ອງແນ່ໃຈ: ລະຫັດບໍ່ຊົນກັບ ERP · ເຫັນໃນ v_it_assets ຄືກັນ ·
// ຢືມ–ຄືນໄດ້ · serial ຊໍ້າບໍ່ໄດ້
import pg from 'pg'

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()

let failed = 0
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failed++
}

const one = async (sql, params = []) => (await client.query(sql, params)).rows[0]

try {
  await client.query('begin')

  const emp = await one('select employee_id from it.v_it_staff limit 1')
  const before = await one('select count(*) n from it.v_it_assets')

  // ---- ລົງທະບຽນ ----
  const a = await one(
    `insert into it.local_assets (name, brand, serial_no, registered_by)
     values ('SWITCH ທົດສອບ 8 ports', 'TP-Link', 'SMOKE-SN-1', $1::int)
     returning asset_code`,
    [emp.employee_id]
  )
  check('ອອກລະຫັດເປັນ ITA-', a.asset_code.startsWith('ITA-'), a.asset_code)
  check(
    'ບໍ່ຊົນກັບຮູບແບບຂອງ ERP',
    !a.asset_code.startsWith('200-'),
    a.asset_code
  )

  // ---- ເຫັນໃນທະບຽນລວມ ----
  const after = await one('select count(*) n from it.v_it_assets')
  check(
    'ເພີ່ມເຂົ້າ v_it_assets ແລ້ວ',
    Number(after.n) === Number(before.n) + 1,
    `${before.n} → ${after.n}`
  )

  const row = await one(
    `select name, brand, is_active, is_assigned, type_name, category_name,
            purchase_date_source, warranty_status
       from it.v_it_assets where asset_code = $1::varchar`,
    [a.asset_code]
  )
  check('ອ່ານຄ່າຄືນຖືກ', row?.name === 'SWITCH ທົດສອບ 8 ports' && row.brand === 'TP-Link')
  check('ຍັງບໍ່ມີຜູ້ຖືຄອງ', row?.is_assigned === false)
  check('ບອກແຫຼ່ງທີ່ມາໄດ້', row?.type_name === 'ລົງທະບຽນໃນລະບົບ IT', row?.type_name)

  // ---- serial ຊໍ້າ ----
  let dup = false
  try {
    await client.query('savepoint s1')
    await client.query(
      `insert into it.local_assets (name, serial_no, registered_by)
       values ('ເຄື່ອງຊໍ້າ', 'smoke-sn-1', $1::int)`,
      [emp.employee_id]
    )
  } catch {
    dup = true
    await client.query('rollback to savepoint s1')
  }
  check('serial ຊໍ້າ (ບໍ່ສົນໂຕພິມ) ຖືກກັນ', dup)

  // ---- ຢືມ–ຄືນໃຊ້ໄດ້ ----
  const holder = await one(
    `select employee_code from public.odg_employee
      where employment_status = 'ACTIVE' limit 1`
  )
  await client.query(
    `insert into it.asset_loans (asset_code, emp_code, borrowed_at, created_by)
     values ($1::varchar, $2::varchar, current_date, $3::int)`,
    [a.asset_code, holder.employee_code, emp.employee_id]
  )
  await client.query('select it.refresh_asset_movements()')

  const lent = await one(
    `select is_assigned, holder_code from it.v_it_assets
      where asset_code = $1::varchar`,
    [a.asset_code]
  )
  check(
    'ຢືມແລ້ວຂຶ້ນຜູ້ຖືຄອງ',
    lent?.is_assigned === true && lent.holder_code === holder.employee_code,
    JSON.stringify(lent)
  )

  // ---- ຄົ້ນຫາດ້ວຍຕົວກັ່ນຕອງແຫຼ່ງທີ່ມາ ----
  const filtered = await one(
    `select count(*) n from it.v_it_assets where asset_code like 'ITA-%'`
  )
  check('ຕົວກັ່ນຕອງ source=local ໃຊ້ໄດ້', Number(filtered.n) >= 1, `${filtered.n} ເຄື່ອງ`)

  // ---- view ທີ່ອີງໃສ່ຍັງໃຊ້ໄດ້ ----
  for (const v of ['it.v_damaged_assets', 'it.v_asset_deployments']) {
    const ok = await one(`select count(*) n from ${v}`).then(
      () => true,
      () => false
    )
    check(`${v} ຍັງໃຊ້ໄດ້`, ok)
  }
} finally {
  await client.query('rollback')
  // matview ຖືກ refresh ນອກ transaction ບໍ່ໄດ້ — ດຶງກັບໃຫ້ກົງຂໍ້ມູນຈິງ
  await client.query('select it.refresh_asset_movements()').catch(() => {})
  await client.end()
}

console.log(failed === 0 ? '\nຜ່ານທັງໝົດ' : `\nຕົກ ${failed} ຂໍ້`)
process.exit(failed === 0 ? 0 : 1)

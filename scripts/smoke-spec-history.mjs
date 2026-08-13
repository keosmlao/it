// ທົດສອບ trigger ປະຫວັດ spec — insert ຄັ້ງທຳອິດ, ແກ້, ລຶບຄ່າ
// ໃຊ້ຂໍ້ມູນຂອງແທ້ບໍ່ໄດ້ ຈຶ່ງສ້າງລະຫັດປອມແລ້ວລົບຖິ້ມໃນ transaction ດຽວ
import pg from 'pg'

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()

const CODE = '__SMOKE_SPEC__'
let failed = 0

const check = (name, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failed++
}

const hist = () =>
  client
    .query(
      `select field, old_value, new_value from it.v_asset_spec_history
        where asset_code = $1::varchar order by id`,
      [CODE]
    )
    .then((r) => r.rows)

try {
  await client.query('begin')

  const emp = await client.query(
    'select employee_id from public.odg_employee limit 1'
  )
  const by = emp.rows[0].employee_id

  // 1. ບັນທຶກຄັ້ງທຳອິດ — ຄວນມີແຖວສະເພາະຊ່ອງທີ່ມີຄ່າ
  await client.query(
    `insert into it.asset_specs (asset_code, cpu, ram, updated_by)
     values ($1::varchar, $2::varchar, $3::varchar, $4::int)`,
    [CODE, 'i5-1235U', '8GB', by]
  )
  let rows = await hist()
  check('ບັນທຶກຄັ້ງທຳອິດ ຂຽນ 2 ແຖວ', rows.length === 2, `ໄດ້ ${rows.length}`)
  check(
    'ຄ່າເກົ່າເປັນ null ຕອນ insert',
    rows.every((r) => r.old_value === null)
  )

  // 2. ແກ້ RAM — ຄວນມີແຖວດຽວເພີ່ມ, ຊ່ອງທີ່ບໍ່ປ່ຽນຕ້ອງບໍ່ຖືກບັນທຶກ
  await client.query(
    `update it.asset_specs set ram = $2::varchar, updated_by = $3::int
      where asset_code = $1::varchar`,
    [CODE, '16GB', by]
  )
  rows = await hist()
  check('ແກ້ 1 ຊ່ອງ ເພີ່ມ 1 ແຖວ', rows.length === 3, `ໄດ້ ${rows.length}`)
  const ramEdit = rows[2]
  check(
    'ບັນທຶກ 8GB → 16GB',
    ramEdit.field === 'ram' &&
      ramEdit.old_value === '8GB' &&
      ramEdit.new_value === '16GB',
    `${ramEdit.field}: ${ramEdit.old_value} → ${ramEdit.new_value}`
  )

  // 3. ບັນທຶກຊໍ້າໂດຍບໍ່ປ່ຽນຫຍັງ — ຕ້ອງບໍ່ເພີ່ມແຖວ
  await client.query(
    `update it.asset_specs set ram = $2::varchar, updated_by = $3::int
      where asset_code = $1::varchar`,
    [CODE, '16GB', by]
  )
  rows = await hist()
  check('ບັນທຶກຊໍ້າ ບໍ່ເພີ່ມແຖວ', rows.length === 3, `ໄດ້ ${rows.length}`)

  // 4. ລຶບຄ່າອອກ — ຕ້ອງນັບເປັນການປ່ຽນ (is distinct from)
  await client.query(
    `update it.asset_specs set cpu = null, updated_by = $2::int
      where asset_code = $1::varchar`,
    [CODE, by]
  )
  rows = await hist()
  const cleared = rows[3]
  check(
    'ລຶບຄ່າອອກ ຖືກບັນທຶກ',
    rows.length === 4 && cleared?.field === 'cpu' && cleared.new_value === null,
    `ໄດ້ ${rows.length} ແຖວ`
  )

  // 5. ຊື່ຜູ້ແກ້ຕ້ອງອອກມາຈາກ view
  const named = await client.query(
    `select changed_by_name from it.v_asset_spec_history
      where asset_code = $1::varchar limit 1`,
    [CODE]
  )
  check('view ດຶງຊື່ຜູ້ແກ້ໄດ້', Boolean(named.rows[0]?.changed_by_name))
} finally {
  await client.query('rollback')
  await client.end()
}

console.log(failed === 0 ? '\nຜ່ານທັງໝົດ' : `\nຕົກ ${failed} ຂໍ້`)
process.exit(failed === 0 ? 0 : 1)

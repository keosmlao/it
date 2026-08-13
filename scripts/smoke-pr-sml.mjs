// Usage: node --env-file=.env.local scripts/smoke-pr-sml.mjs [baseUrl]
//
// ໃບສະເໜີຊື້ແບບ SML: ຫຼາຍລາຍການ, ດຶງສິນຄ້າຈາກ ic_inventory,
// ສ່ວນຫຼຸດແຖວ + ສ່ວນຫຼຸດທ້າຍບິນ + ພາສີ ຕ້ອງຄິດຖືກຕາມລຳດັບ
import pg from 'pg'
import crypto from 'node:crypto'

const base = process.argv[2] ?? 'http://localhost:3100'
const c = new pg.Client({ connectionString: process.env.DATABASE_URL })
await c.connect()

let passed = 0
const tokens = []
function check(cond, what) {
  if (!cond) throw new Error(`assertion failed — ${what}`)
  console.log(`   ✓ ${what}`)
  passed++
}

try {
  // ---------- ຄົ້ນຫາສິນຄ້າ ----------
  console.log('[1] ຄົ້ນຫາສິນຄ້າຈາກ ic_inventory')
  const items = (await c.query('select count(*) from it.v_inventory_items')).rows[0]
  check(Number(items.count) > 1000, `ທະບຽນສິນຄ້າມີ ${items.count} ລາຍການ`)

  const manager = (
    await c.query(`select employee_id from it.v_it_staff where role='manager' limit 1`)
  ).rows[0]
  const token = crypto.randomBytes(32).toString('hex')
  tokens.push(token)
  await c.query(
    `insert into it.sessions (token, employee_id, expires_at)
     values ($1, $2, now() + interval '10 minutes')`,
    [token, manager.employee_id]
  )

  const res = await fetch(`${base}/api/inventory/search?q=notebook`, {
    headers: { cookie: `it_session=${token}` },
  })
  const found = await res.json()
  check(res.status === 200, `API ຄົ້ນຫາຕອບ ${res.status}`)
  check(Array.isArray(found), 'ຄືນຜົນເປັນລາຍການ')
  if (found.length > 0) {
    const first = found[0]
    check(
      typeof first.code === 'string' && typeof first.name === 'string',
      `ພົບ ${found.length} ລາຍການ ເຊັ່ນ ${first.code} ${String(first.name).slice(0, 30)}`
    )
    check('unit_name' in first && 'avg_cost' in first, 'ມີຫົວໜ່ວຍ ແລະ ຕົ້ນທຶນມາໃຫ້ນຳ')
  }

  const short = await fetch(`${base}/api/inventory/search?q=a`, {
    headers: { cookie: `it_session=${token}` },
  })
  check((await short.json()).length === 0, 'ພິມໜ້ອຍກວ່າ 2 ຕົວ ບໍ່ຄົ້ນຫາ (ກັນ query ໜັກ)')

  const anon = await fetch(`${base}/api/inventory/search?q=notebook`)
  check(anon.status === 401, `ບໍ່ໄດ້ login → ${anon.status}`)

  // ---------- ຄິດຍອດແບບ SML ----------
  console.log('\n[2] ຄິດຍອດຕາມລຳດັບຂອງ SML')
  await c.query('begin')

  const support = (
    await c.query(`select employee_code from it.v_it_staff where role='support' limit 1`)
  ).rows[0]

  const pr = (
    await c.query(
      `insert into public.odg_pm_pr
         (pr_no, doc_date, department_code, requester_code, status, created_by,
          created_at, updated_at)
       values (it.next_pr_no(), current_date, '801', $1, 'draft', $1, now(), now())
       returning id, pr_no`,
      [support.employee_code]
    )
  ).rows[0]

  // ສ່ວນຫຼຸດທ້າຍບິນ 50,000 · ພາສີ 10%
  await c.query(
    `insert into it.pr_extra (pr_id, title, currency, discount_amount, vat_rate)
     values ($1, 'ທົດສອບຍອດແບບ SML', 'LAK', 50000, 10)`,
    [pr.id]
  )

  // ແຖວ 1: 2 × 1,000,000 ຫຼຸດ 100,000 = 1,900,000
  // ແຖວ 2: 3 ×   200,000 ຫຼຸດ       0 =   600,000
  //                        ລວມກ່ອນຫຼຸດທ້າຍບິນ = 2,500,000
  const rows = [
    ['Notebook', 2, 1_000_000, 100_000],
    ['Mouse', 3, 200_000, 0],
  ]
  let no = 0
  for (const [name, qty, price, discount] of rows) {
    no++
    const line = (
      await c.query(
        `insert into public.odg_pm_pr_line (pr_id, line_no, item_name, unit, qty, est_price)
         values ($1::bigint, $2::int, $3::varchar, 'ອັນ', $4::numeric, $5::numeric)
         returning id`,
        [pr.id, no, name, qty, price]
      )
    ).rows[0]
    await c.query(
      `insert into it.pr_line_extra (line_id, discount) values ($1::bigint, $2::numeric)`,
      [line.id, discount]
    )
  }

  const v = (await c.query('select * from it.v_pr where id = $1', [pr.id])).rows[0]
  check(Number(v.total_gross) === 2_600_000, `ລວມກ່ອນຫຼຸດແຖວ = ${Number(v.total_gross).toLocaleString()}`)
  check(Number(v.line_discount) === 100_000, 'ລວມສ່ວນຫຼຸດແຖວ = 100,000')
  check(
    Number(v.total_before_discount) === 2_500_000,
    `ລວມເປັນເງິນ = ${Number(v.total_before_discount).toLocaleString()}`
  )
  check(
    Number(v.total_after_discount) === 2_450_000,
    `ຫຼັງຫັກສ່ວນຫຼຸດທ້າຍບິນ 50,000 = ${Number(v.total_after_discount).toLocaleString()}`
  )
  check(Number(v.vat_amount) === 245_000, `ພາສີ 10% = ${Number(v.vat_amount).toLocaleString()}`)
  check(
    Number(v.total_est) === 2_695_000,
    `ລວມທັງສິ້ນ = ${Number(v.total_est).toLocaleString()}`
  )

  const lines = (
    await c.query('select * from it.v_pr_lines where pr_id = $1 order by line_no', [pr.id])
  ).rows
  check(lines.length === 2, 'ບັນທຶກຄົບ 2 ແຖວ')
  check(Number(lines[0].line_gross) === 2_000_000, 'ແຖວ 1 ກ່ອນຫຼຸດ = 2,000,000')
  check(Number(lines[0].line_total) === 1_900_000, 'ແຖວ 1 ຫຼັງຫຼຸດ = 1,900,000')

  // ---------- ຜູກກັບທະບຽນສິນຄ້າ ----------
  console.log('\n[3] ຜູກລາຍການກັບທະບຽນສິນຄ້າ')
  const invItem = (await c.query('select code, name from it.v_inventory_items limit 1'))
    .rows[0]
  const linked = (
    await c.query(
      `insert into public.odg_pm_pr_line (pr_id, line_no, item_code, item_name, qty, est_price)
       values ($1::bigint, 3, $2::varchar, $3::varchar, 1, 1000)
       returning id`,
      [pr.id, invItem.code, invItem.name]
    )
  ).rows[0]
  const joined = (
    await c.query('select * from it.v_pr_lines where id = $1', [linked.id])
  ).rows[0]
  check(
    joined.inventory_name === invItem.name,
    `ດຶງຊື່ຈາກທະບຽນສິນຄ້າໄດ້ (${String(invItem.name).slice(0, 30)})`
  )
  check(joined.stock_qty !== null, 'ດຶງຈຳນວນຄົງເຫຼືອມາໃຫ້ນຳ')

  await c.query('rollback')

  const left = (await c.query('select count(*) from public.odg_pm_pr')).rows[0]
  check(Number(left.count) === 0, 'rollback ແລ້ວ ຕາຕະລາງ ERP ວ່າງຄືເກົ່າ')

  console.log(`\nທັງໝົດ ${passed} ການກວດຜ່ານ.`)
} catch (e) {
  await c.query('rollback').catch(() => {})
  console.error('\nFAILED:', e.message)
  process.exitCode = 1
} finally {
  if (tokens.length) {
    await c.query('delete from it.sessions where token = any($1::varchar[])', [tokens])
  }
  await c.end()
}

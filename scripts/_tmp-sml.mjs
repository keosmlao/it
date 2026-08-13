import pg from 'pg'
const c = new pg.Client({ connectionString: process.env.DATABASE_URL })
await c.connect()

// ຕາຕະລາງເອກະສານແບບ SML ມັກລົງທ້າຍ _hd / _detail
const docs = (
  await c.query(
    `select t.table_name,
            (select count(*) from information_schema.columns k
              where k.table_schema='public' and k.table_name=t.table_name) as cols
       from information_schema.tables t
      where t.table_schema='public'
        and (t.table_name like 'pr\\_%' or t.table_name like 'po\\_%'
             or t.table_name like '%\\_hd' or t.table_name like 'ic\\_trans%'
             or t.table_name in ('ic_unit','ic_group','ic_category','ap_supplier'))
      order by t.table_name`
  )
).rows

console.log('ຕາຕະລາງເອກະສານ / ອ້າງອີງ:')
for (const r of docs) {
  let n = '?'
  try {
    n = (await c.query(`select count(*) from public."${r.table_name}"`)).rows[0].count
  } catch {}
  console.log(`  ${r.table_name.padEnd(30)} cols=${String(r.cols).padStart(3)} rows=${n}`)
}

// ຄໍລຳຫຼັກຂອງ ic_inventory ທີ່ຈະໃຊ້ໃນຕົວເລືອກສິນຄ້າ
const sample = await c.query(
  `select code, name_1, unit_standard, unit_standard_name, item_status, status,
          balance_qty, average_cost, item_brand, item_model
     from public.ic_inventory
    where coalesce(status, 0) = 0
    order by code limit 5`
)
console.log('\nic_inventory ຕົວຢ່າງ (status=0):')
for (const r of sample.rows) {
  console.log(
    `  ${String(r.code).padEnd(16)} ${String(r.name_1).slice(0, 42).padEnd(44)} ` +
      `unit=${r.unit_standard ?? '-'}/${r.unit_standard_name ?? '-'} ` +
      `bal=${r.balance_qty ?? 0} cost=${r.average_cost ?? 0}`
  )
}

const counts = await c.query(
  `select count(*) total,
          count(*) filter (where coalesce(status,0) = 0) active,
          count(*) filter (where coalesce(item_status,0) = 1) it_status
     from public.ic_inventory`
)
console.log('\nຈຳນວນ:', JSON.stringify(counts.rows[0]))

for (const t of ['ic_unit', 'ap_supplier']) {
  try {
    const cols = (
      await c.query(
        `select column_name from information_schema.columns
          where table_schema='public' and table_name=$1 order by ordinal_position limit 14`,
        [t]
      )
    ).rows.map((x) => x.column_name)
    console.log(`\n${t}: ${cols.join(', ')}`)
    const s = await c.query(`select * from public."${t}" limit 2`)
    console.log('  ຕົວຢ່າງ:', JSON.stringify(s.rows.map((r) => ({ code: r.code, name_1: r.name_1 }))))
  } catch (e) {
    console.log(`\n${t}: ${e.message}`)
  }
}
await c.end()

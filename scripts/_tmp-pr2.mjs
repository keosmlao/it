import pg from 'pg'
const c = new pg.Client({ connectionString: process.env.DATABASE_URL })
await c.connect()

const names = (
  await c.query(
    `select table_name,
            (select count(*) from information_schema.columns k
              where k.table_schema='public' and k.table_name=t.table_name) cols
       from information_schema.tables t
      where table_schema='public'
        and (table_name like '%pm\\_%' or table_name like '%approve%'
             or table_name like '%approval%' or table_name like '%\\_po%'
             or table_name like 'purchase%' or table_name like '%supplier%')
      order by table_name`
  )
).rows
console.log('candidate tables:')
for (const r of names) {
  let n = '?'
  try {
    n = (await c.query(`select count(*) from public."${r.table_name}"`)).rows[0].count
  } catch {}
  console.log(`  ${r.table_name.padEnd(38)} cols=${String(r.cols).padStart(3)} rows=${n}`)
}

for (const t of [
  'odg_pm_po_approval',
  'erp_doc_approve',
  'erp_user_group_approve',
]) {
  const cols = (
    await c.query(
      `select column_name, data_type, character_maximum_length
         from information_schema.columns
        where table_schema='public' and table_name=$1 order by ordinal_position`,
      [t]
    )
  ).rows
  if (!cols.length) continue
  console.log(`\n=== ${t} ===`)
  console.log(
    cols
      .map(
        (x) =>
          ` ${x.column_name.padEnd(24)} ${x.data_type}${x.character_maximum_length ? '(' + x.character_maximum_length + ')' : ''}`
      )
      .join('\n')
  )
  const sample = await c.query(`select * from public."${t}" limit 5`)
  console.log(` sample (${sample.rowCount}):`, JSON.stringify(sample.rows, null, 1).slice(0, 1500))
}
await c.end()

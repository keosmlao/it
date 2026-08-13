import pg from 'pg'
const c = new pg.Client({ connectionString: process.env.DATABASE_URL })
await c.connect()

const cols = (
  await c.query(
    `select column_name, data_type, character_maximum_length
       from information_schema.columns
      where table_schema='public' and table_name='ic_inventory'
      order by ordinal_position`
  )
).rows
console.log(`ic_inventory — ${cols.length} ຄໍລຳ:`)
console.log(
  cols
    .map((x) => ` ${x.column_name}: ${x.data_type}${x.character_maximum_length ? '(' + x.character_maximum_length + ')' : ''}`)
    .join('\n')
)

const n = await c.query('select count(*) from public.ic_inventory')
console.log('\nຈຳນວນແຖວ:', n.rows[0].count)

const s = await c.query('select * from public.ic_inventory limit 2')
console.log('\nຕົວຢ່າງ:', JSON.stringify(s.rows, null, 1).slice(0, 1800))

// ຫາຕາຕະລາງໜ່ວຍນັບ / ກຸ່ມສິນຄ້າ
const rel = (
  await c.query(
    `select table_name from information_schema.tables
      where table_schema='public'
        and table_name in ('ic_unit','ic_group','ic_category','ic_inventory_price',
                           'ic_inventory_barcode')
      order by table_name`
  )
).rows
console.log('\nຕາຕະລາງທີ່ກ່ຽວຂ້ອງ:', rel.map((r) => r.table_name).join(', '))
await c.end()

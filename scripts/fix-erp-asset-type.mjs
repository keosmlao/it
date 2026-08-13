// Usage:
//   node --env-file=.env.local scripts/fix-erp-asset-type.mjs            (ເບິ່ງກ່ອນ)
//   node --env-file=.env.local scripts/fix-erp-asset-type.mjs --apply    (ແກ້ຈິງ)
//   node --env-file=.env.local scripts/fix-erp-asset-type.mjs --revert   (ຍ້ອນຄືນ)
//
// public.as_asset.as_type ຜິດຢູ່ຈຳນວນໜຶ່ງ: ລະຫັດ 200-… ຄືອຸປະກອນໄອທີ
// ແຕ່ບາງແຖວຖືກຈັດເປັນ 400 (ເຄື່ອງເຮືອນ) ແລະ ກົງກັນຂ້າມ.
//
// ນີ້ຂຽນລົງຕາຕະລາງ ERP ທີ່ໃຊ້ຮ່ວມກັບລະບົບບັນຊີ ຈຶ່ງ:
//   • ຄ່າເກົ່າຖືກບັນທຶກໄວ້ it.erp_data_fixes ທຸກແຖວກ່ອນແກ້
//   • ບໍ່ແກ້ຫຍັງເລີຍຖ້າບໍ່ໃສ່ --apply
//   • ຍ້ອນຄືນໄດ້ດ້ວຍ --revert
import pg from 'pg'

const APPLY = process.argv.includes('--apply')
const REVERT = process.argv.includes('--revert')

const c = new pg.Client({ connectionString: process.env.DATABASE_URL })
await c.connect()

try {
  const actor = (
    await c.query(
      `select employee_id from it.v_it_staff where role = 'manager'
        order by employee_code limit 1`
    )
  ).rows[0]

  if (REVERT) {
    const fixes = (
      await c.query(
        `select id, key_value, old_value from it.erp_data_fixes
          where table_name = 'as_asset' and column_name = 'as_type'
            and reverted_at is null
          order by id`
      )
    ).rows

    if (!fixes.length) {
      console.log('ບໍ່ມີການແກ້ທີ່ຍັງບໍ່ໄດ້ຍ້ອນຄືນ')
    } else {
      await c.query('begin')
      for (const f of fixes) {
        await c.query('update public.as_asset set as_type = $2 where code = $1', [
          f.key_value,
          f.old_value,
        ])
        await c.query(
          'update it.erp_data_fixes set reverted_at = now() where id = $1',
          [f.id]
        )
        console.log(`  ↩ ${f.key_value} → ${f.old_value}`)
      }
      await c.query('commit')
      console.log(`\nຍ້ອນຄືນ ${fixes.length} ແຖວແລ້ວ`)
    }
    await c.end()
    process.exit(0)
  }

  // ---- ຫາແຖວທີ່ຜິດ ----
  const wrong = (
    await c.query(
      `select a.code, a.name_1, a.as_type,
              t.name_1 as current_type_name,
              case when a.code like '200-%' then '200' else '400' end as should_be
         from public.as_asset a
         left join public.as_asset_type t on t.code = a.as_type
        where (a.code like '200-%' and coalesce(a.as_type, '') <> '200')
           or (a.code like '400-%' and coalesce(a.as_type, '') = '200')
        order by a.code`
    )
  ).rows

  if (!wrong.length) {
    console.log('ບໍ່ພົບແຖວທີ່ຜິດ — ຂໍ້ມູນຖືກຕ້ອງແລ້ວ')
    await c.end()
    process.exit(0)
  }

  console.log(`ພົບ ${wrong.length} ແຖວທີ່ປະເພດບໍ່ກົງກັບລະຫັດ:\n`)
  for (const r of wrong) {
    console.log(
      `  ${r.code.padEnd(16)} ${String(r.name_1).slice(0, 38).padEnd(40)}` +
        ` ${r.as_type ?? 'ວ່າງ'} (${r.current_type_name ?? '—'}) → ${r.should_be}`
    )
  }

  if (!APPLY) {
    console.log(
      '\nນີ້ແມ່ນການເບິ່ງກ່ອນເທົ່ານັ້ນ — ຍັງບໍ່ໄດ້ແກ້ຫຍັງ.' +
        '\nຖ້າຖືກຕ້ອງແລ້ວ ໃຫ້ແລ່ນຄືນດ້ວຍ --apply'
    )
    await c.end()
    process.exit(0)
  }

  // ---- ແກ້ຈິງ (ຢູ່ໃນ transaction ດຽວ) ----
  await c.query('begin')
  for (const r of wrong) {
    await c.query(
      `insert into it.erp_data_fixes
         (table_name, key_column, key_value, column_name, old_value, new_value,
          reason, applied_by)
       values ('as_asset', 'code', $1::varchar, 'as_type', $2::text, $3::text,
               $4::text, $5::int)`,
      [
        r.code,
        r.as_type,
        r.should_be,
        `ລະຫັດ ${r.code.slice(0, 4)}… ບົ່ງບອກປະເພດ ${r.should_be} ແຕ່ບັນທຶກເປັນ ${r.as_type ?? 'ວ່າງ'}`,
        actor?.employee_id ?? null,
      ]
    )
    await c.query('update public.as_asset set as_type = $2::varchar where code = $1::varchar', [
      r.code,
      r.should_be,
    ])
  }
  await c.query('commit')

  const left = (
    await c.query(
      `select count(*) from public.as_asset a
        where (a.code like '200-%' and coalesce(a.as_type, '') <> '200')
           or (a.code like '400-%' and coalesce(a.as_type, '') = '200')`
    )
  ).rows[0].count

  console.log(`\nແກ້ແລ້ວ ${wrong.length} ແຖວ · ຍັງເຫຼືອທີ່ຜິດ ${left} ແຖວ`)
  console.log('ຄ່າເກົ່າເກັບໄວ້ it.erp_data_fixes — ຍ້ອນຄືນດ້ວຍ --revert')
} catch (e) {
  await c.query('rollback').catch(() => {})
  console.error('FAILED:', e.message)
  process.exitCode = 1
} finally {
  await c.end()
}

// Usage: node --env-file=.env.local scripts/audit-loans.mjs
//
// ກວດຄວາມຖືກຕ້ອງຂອງຂະບວນການຢືມ–ຄືນ. ຫາຄວາມຜິດປົກກະຕິ 4 ແບບ:
//   1. ເຄື່ອງດຽວມີໃບຢືມຄ້າງພ້ອມກັນຫຼາຍໃບ (ຢືມຕໍ່ໂດຍບໍ່ຄືນ)
//   2. ໃບຢືມໃໝ່ອອກກ່ອນໃບເກົ່າຈະຄືນ (ຊ່ວງເວລາຊ້ອນກັນ)
//   3. ໃບຄືນທີ່ບໍ່ມີໃບຢືມຄູ່
//   4. ວັນຄືນມາກ່ອນວັນຢືມ
//
// ອ່ານຢ່າງດຽວ — ບໍ່ແກ້ຂໍ້ມູນຫຍັງ
import pg from 'pg'

const c = new pg.Client({ connectionString: process.env.DATABASE_URL })
await c.connect()

function head(title) {
  console.log(`\n${'─'.repeat(72)}\n${title}\n${'─'.repeat(72)}`)
}

try {
  // ---------- ພາບລວມ ----------
  const total = (
    await c.query(
      `select count(*)                                as rows,
              count(*) filter (where not is_returned) as open,
              count(distinct asset_code)              as assets
         from it.v_asset_movements`
    )
  ).rows[0]
  console.log(
    `ລາຍການຢືມ–ຄືນທັງໝົດ ${total.rows} ລາຍການ · ຍັງບໍ່ຄືນ ${total.open} · ` +
      `ກ່ຽວຂ້ອງ ${total.assets} ເຄື່ອງ`
  )

  // ---------- 1. ໃບຢືມຄ້າງຫຼາຍໃບໃນເຄື່ອງດຽວ ----------
  head('1. ເຄື່ອງທີ່ມີໃບຢືມຄ້າງພ້ອມກັນຫຼາຍໃບ (ຢືມຕໍ່ໂດຍບໍ່ຄືນ)')
  const multi = (
    await c.query(
      `select asset_code,
              max(asset_name)                              as asset_name,
              count(*)                                     as open_loans,
              string_agg(distinct coalesce(emp_name, emp_code), ' | ')  as holders,
              string_agg(borrow_doc_no || ' (' ||
                         to_char(borrowed_at, 'DD-MM-YYYY') || ')',
                         ' → ' order by borrowed_at)       as docs
         from it.v_asset_movements
        where not is_returned
        group by asset_code
       having count(*) > 1
        order by count(*) desc, asset_code`
    )
  ).rows

  if (multi.length === 0) {
    console.log('  ✓ ບໍ່ພົບ — ທຸກເຄື່ອງມີໃບຢືມຄ້າງບໍ່ເກີນ 1 ໃບ')
  } else {
    console.log(`  ✗ ພົບ ${multi.length} ເຄື່ອງ\n`)
    for (const r of multi) {
      console.log(`  ${r.asset_code}  ${String(r.asset_name).slice(0, 40)}`)
      console.log(`     ໃບຄ້າງ ${r.open_loans} ໃບ · ຜູ້ຖື: ${r.holders}`)
      console.log(`     ${r.docs}`)
    }
  }

  // ---------- 2. ຊ່ວງເວລາຊ້ອນກັນ ----------
  head('2. ໃບຢືມໃໝ່ອອກກ່ອນໃບເກົ່າຈະຄືນ (ຊ່ວງເວລາຊ້ອນກັນ)')
  const overlap = (
    await c.query(
      `select a.asset_code,
              a.asset_name,
              a.borrow_doc_no                      as doc_ກ່ອນ,
              coalesce(a.emp_name, a.emp_code)     as ຜູ້ຢືມ_ກ່ອນ,
              a.borrowed_at                        as ຢືມ_ກ່ອນ,
              a.returned_at                        as ຄືນ_ກ່ອນ,
              b.borrow_doc_no                      as doc_ຫຼັງ,
              coalesce(b.emp_name, b.emp_code)     as ຜູ້ຢືມ_ຫຼັງ,
              b.borrowed_at                        as ຢືມ_ຫຼັງ
         from it.v_asset_movements a
         join it.v_asset_movements b
           on b.asset_code = a.asset_code
          and b.borrow_doc_no is distinct from a.borrow_doc_no
          and b.borrowed_at > a.borrowed_at
        where a.returned_at is null or a.returned_at > b.borrowed_at
        order by a.asset_code, a.borrowed_at
        limit 100`
    )
  ).rows

  if (overlap.length === 0) {
    console.log('  ✓ ບໍ່ພົບ — ທຸກໃບຢືມອອກຫຼັງໃບກ່ອນໜ້າຄືນແລ້ວ')
  } else {
    console.log(`  ✗ ພົບ ${overlap.length} ຄູ່\n`)
    for (const r of overlap.slice(0, 30)) {
      const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-GB') : 'ຍັງບໍ່ຄືນ')
      console.log(`  ${r.asset_code}  ${String(r.asset_name).slice(0, 38)}`)
      console.log(
        `     ${r.doc_ກ່ອນ} ${r['ຜູ້ຢືມ_ກ່ອນ']} ຢືມ ${fmt(r['ຢືມ_ກ່ອນ'])} → ຄືນ ${fmt(r['ຄືນ_ກ່ອນ'])}`
      )
      console.log(
        `     ${r.doc_ຫຼັງ} ${r['ຜູ້ຢືມ_ຫຼັງ']} ຢືມ ${fmt(r['ຢືມ_ຫຼັງ'])}  ← ອອກກ່ອນໃບເທິງຈະຄືນ`
      )
    }
    if (overlap.length > 30) console.log(`  … ແລະ ອີກ ${overlap.length - 30} ຄູ່`)
  }

  // ---------- 3. ໃບຄືນທີ່ບໍ່ມີໃບຢືມຄູ່ ----------
  head('3. ໃບຄືນທີ່ອ້າງອີງໃບຢືມທີ່ຫາບໍ່ພົບ')
  const orphan = (
    await c.query(
      `select d.doc_no, d.doc_ref, d.item_code, d.to_date
         from public.asset_trans_detail d
        where d.item_code like '200-%'
          and coalesce(d.doc_ref, '') <> ''
          and not exists (
                select 1 from public.asset_trans t where t.doc_no = d.doc_ref)
        order by d.doc_no
        limit 50`
    )
  ).rows
  console.log(
    orphan.length === 0
      ? '  ✓ ບໍ່ພົບ'
      : `  ✗ ພົບ ${orphan.length} ໃບ: ${orphan.map((r) => `${r.doc_no}→${r.doc_ref}`).join(', ')}`
  )

  // ---------- 4. ວັນຄືນມາກ່ອນວັນຢືມ ----------
  head('4. ວັນຄືນມາກ່ອນວັນຢືມ')
  const backwards = (
    await c.query(
      `select asset_code, borrow_doc_no, borrowed_at, returned_at,
              coalesce(emp_name, emp_code) as emp
         from it.v_asset_movements
        where returned_at is not null and returned_at < borrowed_at
        order by asset_code
        limit 50`
    )
  ).rows
  if (backwards.length === 0) {
    console.log('  ✓ ບໍ່ພົບ')
  } else {
    console.log(`  ✗ ພົບ ${backwards.length} ລາຍການ`)
    for (const r of backwards) {
      console.log(
        `  ${r.asset_code} ${r.borrow_doc_no} ${r.emp} · ຢືມ ${new Date(r.borrowed_at).toLocaleDateString('en-GB')} ຄືນ ${new Date(r.returned_at).toLocaleDateString('en-GB')}`
      )
    }
  }

  // ---------- ສະຫຼຸບຜົນກະທົບ ----------
  head('ຜົນກະທົບຕໍ່ໜ້າຈໍ')
  const hidden = (
    await c.query(
      `with open_loans as (
         select asset_code, count(*) as n
           from it.v_asset_movements
          where not is_returned
          group by asset_code
       )
       select coalesce(sum(n) - count(*), 0) as hidden
         from open_loans where n > 1`
    )
  ).rows[0]
  console.log(
    `  ໜ້າ "ຜູ້ຖືຄອງ" ສະແດງພຽງຄົນລ່າສຸດຕໍ່ເຄື່ອງ ຈຶ່ງເຊື່ອງຜູ້ຖືອື່ນໄວ້ ${hidden.hidden} ຄົນ`
  )
} catch (e) {
  console.error('FAILED:', e.message)
  process.exitCode = 1
} finally {
  await c.end()
}

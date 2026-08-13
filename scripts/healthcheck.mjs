// Usage: node --env-file=.env.local scripts/healthcheck.mjs [baseUrl]
//
// ກວດຄວາມພ້ອມກ່ອນ ແລະ ຫຼັງນຳໄປໃຊ້ຈິງ — ຖານຂໍ້ມູນ, migration, ຄ່າຕັ້ງ, ແລະ
// ໜ້າເວັບຕອບກັບຫຼືບໍ່. ຄືນ exit code ບໍ່ເປັນ 0 ຖ້າມີຂໍ້ໃດບໍ່ຜ່ານ
import pg from 'pg'
import { readdir } from 'node:fs/promises'
import path from 'node:path'

const base = process.argv[2] ?? process.env.APP_BASE_URL ?? 'http://localhost:3000'
let passed = 0
let failed = 0
let warned = 0

function check(ok, what, detail = '') {
  console.log(`  ${ok ? '✓' : '✗'} ${what}${detail ? ` — ${detail}` : ''}`)
  if (ok) passed++
  else failed++
}

function warn(what) {
  console.log(`  ! ${what}`)
  warned++
}

console.log('[1] ຄ່າຕັ້ງ (.env.local)')
check(Boolean(process.env.DATABASE_URL), 'DATABASE_URL')
if (process.env.APP_BASE_URL) check(true, 'APP_BASE_URL', process.env.APP_BASE_URL)
else warn('ຍັງບໍ່ໄດ້ຕັ້ງ APP_BASE_URL — ລິ້ງໃນຂໍ້ຄວາມ LINE ຈະບໍ່ມີ')
if (process.env.LINE_CHANNEL_ACCESS_TOKEN) check(true, 'LINE_CHANNEL_ACCESS_TOKEN')
else warn('ຍັງບໍ່ໄດ້ຕັ້ງ LINE_CHANNEL_ACCESS_TOKEN — ຂໍ້ຄວາມຈະຄ້າງຢູ່ຄິວ')
if (process.env.NOTIFY_DRAIN_SECRET) check(true, 'NOTIFY_DRAIN_SECRET')
else warn('ຍັງບໍ່ໄດ້ຕັ້ງ NOTIFY_DRAIN_SECRET — ຕົວຈັດຕາຕະລາງເອີ້ນສົ່ງບໍ່ໄດ້')

const c = new pg.Client({ connectionString: process.env.DATABASE_URL })

try {
  console.log('\n[2] ຖານຂໍ້ມູນ')
  const started = Date.now()
  await c.connect()
  check(true, 'ເຊື່ອມຕໍ່ໄດ້', `${Date.now() - started}ms`)

  const ver = (await c.query('show server_version')).rows[0].server_version
  check(true, 'ລຸ້ນ PostgreSQL', ver)

  const applied = (
    await c.query('select filename from it.schema_migrations order by filename')
  ).rows.map((r) => r.filename)
  const files = (await readdir(path.join(process.cwd(), 'db', 'migrations')))
    .filter((f) => f.endsWith('.sql'))
    .sort()
  const missing = files.filter((f) => !applied.includes(f))
  check(
    missing.length === 0,
    `migration ຄົບ (${applied.length}/${files.length})`,
    missing.length ? `ຍັງບໍ່ໄດ້ແລ່ນ: ${missing.join(', ')}` : ''
  )

  console.log('\n[3] ຂໍ້ມູນຫຼັກ')
  const counts = (
    await c.query(
      `select (select count(*) from it.v_it_staff)                     as staff,
              (select count(*) from it.v_portal_users)                 as users,
              (select count(*) from it.v_it_assets)                    as assets,
              (select count(*) from it.ticket_categories where is_active) as categories,
              (select count(*) from it.kb_articles where deleted_at is null) as kb,
              (select count(*) from it.v_recovery_targets)             as recovery`
    )
  ).rows[0]
  check(Number(counts.staff) > 0, 'ພະນັກງານ IT', `${counts.staff} ຄົນ`)
  check(Number(counts.users) > 0, 'ຜູ້ໃຊ້ທັງໝົດ', `${counts.users} ຄົນ`)
  check(Number(counts.assets) > 0, 'ອຸປະກອນໄອທີ', `${counts.assets} ເຄື່ອງ`)
  check(Number(counts.categories) > 0, 'ປະເພດ ticket', `${counts.categories} ປະເພດ`)
  check(Number(counts.kb) > 0, 'ບົດຄວາມຄັງຄວາມຮູ້', `${counts.kb} ບົດ`)
  if (Number(counts.recovery) > 0) warn(`ມີ ${counts.recovery} ລາຍການທີ່ຕ້ອງທວງຄືນ`)

  // cache ປະຫວັດຢືມ–ຄືນຕ້ອງກົງກັບຂໍ້ມູນຈິງ ບໍ່ດັ່ງນັ້ນໜ້າຈໍຈະສະແດງຂໍ້ມູນເກົ່າ
  const cache = (
    await c.query(
      `select (select count(*) from it.asset_movements_mv)                  as cached,
              (select count(*) from public.report_asset_trans_detail
                where item_code like '200-%')
              + (select count(*) from it.asset_loans where deleted_at is null)
                                                                            as expected`
    )
  ).rows[0]
  check(
    cache.cached === cache.expected,
    'cache ປະຫວັດຢືມ–ຄືນທັນສະໄໝ',
    `${cache.cached}/${cache.expected} ແຖວ`
  )

  const outbox = (
    await c.query(
      `select count(*) filter (where status = 'pending') as pending,
              count(*) filter (where status = 'failed')  as failed
         from it.notification_outbox`
    )
  ).rows[0]
  if (Number(outbox.pending) > 0) warn(`ຂໍ້ຄວາມຄ້າງຢູ່ຄິວ ${outbox.pending} ອັນ`)
  if (Number(outbox.failed) > 0) warn(`ຂໍ້ຄວາມສົ່ງລົ້ມເຫຼວ ${outbox.failed} ອັນ`)

  console.log('\n[4] ເວັບ')
  for (const p of ['/login', '/api/health/db']) {
    try {
      const t = Date.now()
      const res = await fetch(base + p, { redirect: 'manual' })
      check(res.status < 500, `${p}`, `${res.status} · ${Date.now() - t}ms`)
    } catch (e) {
      check(false, `${p}`, e.message)
    }
  }

  const guard = await fetch(`${base}/assets`, { redirect: 'manual' }).catch(() => null)
  check(
    guard !== null && guard.status >= 300 && guard.status < 400,
    'ໜ້າພາຍໃນຕ້ອງ login ກ່ອນ',
    guard ? String(guard.status) : 'ຕິດຕໍ່ບໍ່ໄດ້'
  )
} catch (e) {
  check(false, 'ກວດບໍ່ສຳເລັດ', e.message)
} finally {
  await c.end().catch(() => {})
}

console.log(`\nຜ່ານ ${passed} · ບໍ່ຜ່ານ ${failed} · ຄຳເຕືອນ ${warned}`)
process.exitCode = failed ? 1 : 0

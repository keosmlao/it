// Usage: node --env-file=.env.local scripts/smoke-nav.mjs [baseUrl]
//
// ກວດ sidebar: ແຕ່ລະໜ້າຕ້ອງມີແຖວທີ່ຖືກເນັ້ນ (data-active) ພຽງ 1 ແຖວ
// ແລະ ຕ້ອງບໍ່ມີລິ້ງຊ້ຳກັນໃນເມນູ
import pg from 'pg'
import crypto from 'node:crypto'

const base = process.argv[2] ?? 'http://localhost:3100'
const c = new pg.Client({ connectionString: process.env.DATABASE_URL })
await c.connect()

let passed = 0
let failed = 0
function check(ok, what) {
  console.log(`  ${ok ? '✓' : '✗'} ${what}`)
  if (ok) passed++
  else failed++
}

const token = crypto.randomBytes(32).toString('hex')

try {
  const manager = (
    await c.query(`select employee_id from it.v_it_staff where role = 'manager' limit 1`)
  ).rows[0]
  await c.query(
    `insert into it.sessions (token, employee_id, expires_at)
     values ($1, $2, now() + interval '10 minutes')`,
    [token, manager.employee_id]
  )

  const PAGES = [
    '/',
    '/assets',
    '/assets?holding=spare',
    '/assets/holders',
    '/assets/movements',
    '/assets/recovery',
    '/assets/conflicts',
    '/assets/damaged',
    '/assets/deployed',
    '/assets/survey',
    '/assets/lend',
    '/assets/documents',
    '/tickets',
    '/plans',
    '/plans/team',
    '/purchase',
    '/subscriptions',
    '/subscriptions/cost',
    '/maintenance',
    '/incidents',
    '/network',
    '/network/ports',
    '/vendors',
    '/consumables',
    '/accounts',
    '/accounts/systems',
    '/onboarding',
    '/budget',
    '/assets/replacement',
    // ບໍ່ໃສ່ '/search' — ໜ້ານັ້ນເຂົ້າຈາກຊ່ອງຄົ້ນຫາເທິງຫົວ ບໍ່ແມ່ນເມນູຂ້າງ
    // ຈຶ່ງບໍ່ມີແຖວໃດຄວນຖືກເນັ້ນ
    '/kb',
  ]

  console.log('[1] ແຖວທີ່ຖືກເນັ້ນຕ້ອງມີພຽງອັນດຽວ')
  for (const p of PAGES) {
    const res = await fetch(base + p, { headers: { cookie: `it_session=${token}` } })
    const html = await res.text()

    // ນັບສະເພາະໃນ <aside> (sidebar) ບໍ່ນັບປຸ່ມໃນເນື້ອໜ້າ
    const aside = html.slice(html.indexOf('<aside'), html.indexOf('</aside>'))
    const actives = [...aside.matchAll(/data-active="true"[^>]*href="([^"]+)"/g)].map(
      (m) => m[1]
    )
    const actives2 = [...aside.matchAll(/href="([^"]+)"[^>]*data-active="true"/g)].map(
      (m) => m[1]
    )
    const all = [...new Set([...actives, ...actives2])]

    check(
      all.length === 1,
      `${p.padEnd(24)} → ${all.length} ແຖວ ${all.join(', ') || '(ບໍ່ມີ)'}`
    )
  }

  console.log('\n[2] ບໍ່ມີລິ້ງຊ້ຳໃນເມນູ')
  const res = await fetch(base + '/assets', {
    headers: { cookie: `it_session=${token}` },
  })
  const html = await res.text()
  // ສະເພາະໃນ <nav> — ໂລໂກ້ຢູ່ນອກນັ້ນ ແລະ ລິ້ງໄປໜ້າຫຼັກເປັນເລື່ອງປົກກະຕິ
  const nav = html.slice(html.indexOf('<nav'), html.indexOf('</nav>'))
  const hrefs = [...nav.matchAll(/href="([^"]+)"/g)].map((m) => m[1])
  const dupes = hrefs.filter((h, i) => hrefs.indexOf(h) !== i)
  check(dupes.length === 0, `ລິ້ງຊ້ຳ ${dupes.length} ອັນ ${[...new Set(dupes)].join(', ')}`)

  console.log(`\nຜ່ານ ${passed} · ບໍ່ຜ່ານ ${failed}`)
  if (failed) process.exitCode = 1
} catch (e) {
  console.error('FAILED:', e.message)
  process.exitCode = 1
} finally {
  await c.query('delete from it.sessions where token = $1', [token])
  await c.end()
}

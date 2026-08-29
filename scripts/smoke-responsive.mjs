// Usage: node --env-file=.env.local scripts/smoke-responsive.mjs [baseUrl] [width]
//
// ກວດວ່າທຸກໜ້າໃຊ້ໄດ້ຢູ່ມືຖື — ເປີດດ້ວຍ browser ຈິງກວ້າງ 390px ແລ້ວຫາ
// element ທີ່ລົ້ນອອກນອກຈໍ. ບໍ່ນັບອັນທີ່ຢູ່ໃນກອບເລື່ອນຂວາງໄດ້ (ຕາຕະລາງ
// ກວ້າງໆ ຕັ້ງໃຈໃຫ້ເລື່ອນ) ແລະ ບໍ່ນັບ element ທີ່ຖືກ clip ໄວ້ແລ້ວ.
//
// ຕ້ອງມີ server ແລ່ນຢູ່ກ່ອນ (ຄ່າຕັ້ງຕົ້ນ http://127.0.0.1:3100)
import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import pg from 'pg'

const base = process.argv[2] ?? 'http://127.0.0.1:3100'
const WIDTH = Number(process.argv[3] ?? 390)
const HEIGHT = 844

const PAGES = [
  '/',
  '/tickets',
  '/tickets/new',
  '/tasks',
  '/plans',
  '/plans/team',
  '/assets',
  '/assets/new',
  '/assets/holders',
  '/assets/movements',
  '/assets/recovery',
  '/assets/conflicts',
  '/assets/damaged',
  '/assets/deployed',
  '/assets/survey',
  '/assets/lend',
  '/assets/documents',
  '/assets/replacement',
  '/purchase',
  '/purchase/new',
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
  '/projects',
  '/reports',
  '/worklogs',
  '/requests',
  '/kb',
  '/search?q=a',
  '/admin',
  '/admin/security',
  '/my',
  '/my/tickets',
  '/my/tickets/new',
  '/my/kb',
]

/** ໜ້າລາຍການທີ່ໃຫ້ໄປຕໍ່ໜ້າລາຍລະອຽດ — ເອົາ id ຈິງຈາກລິ້ງໃນໜ້າ */
const DETAIL_OF = [
  '/tickets',
  '/tasks',
  '/assets',
  '/assets/holders',
  '/assets/documents',
  '/purchase',
  '/subscriptions',
  '/maintenance',
  '/incidents',
  '/network',
  '/vendors',
  '/consumables',
  '/projects',
  '/budget',
  '/requests',
  '/kb',
  '/my/tickets',
  '/my/kb',
]

const BROWSERS = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
]

let passed = 0
let failed = 0
/** ກອບທີ່ຕ້ອງເລື່ອນຂວາງຢູ່ມືຖື — ລາຍງານເປັນຄຳເຕືອນ ບໍ່ນັບເປັນຜິດ */
const sideways = []
function check(ok, what, detail = '') {
  console.log(`  ${ok ? '✓' : '✗'} ${what}${detail ? ` — ${detail}` : ''}`)
  if (ok) passed++
  else failed++
}

/** ຕົວເຊື່ອມ CDP ບາງໆ — ບໍ່ໃຊ້ library ເພື່ອບໍ່ຕ້ອງເພີ່ມ dependency */
function connect(url) {
  const ws = new WebSocket(url)
  const waiting = new Map()
  const listeners = new Map()
  let next = 1

  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data)
    if (msg.id && waiting.has(msg.id)) {
      const { resolve, reject } = waiting.get(msg.id)
      waiting.delete(msg.id)
      if (msg.error) reject(new Error(msg.error.message))
      else resolve(msg.result)
    } else if (msg.method && listeners.has(msg.method)) {
      listeners.get(msg.method).forEach((fn) => fn(msg.params))
      listeners.delete(msg.method)
    }
  })

  const ready = new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true })
    ws.addEventListener('error', reject, { once: true })
  })

  return {
    ready,
    send(method, params = {}) {
      const id = next++
      return new Promise((resolve, reject) => {
        waiting.set(id, { resolve, reject })
        ws.send(JSON.stringify({ id, method, params }))
      })
    },
    once(method) {
      return new Promise((resolve) => {
        if (!listeners.has(method)) listeners.set(method, [])
        listeners.get(method).push(resolve)
      })
    },
    close: () => ws.close(),
  }
}

/** ແລ່ນຢູ່ໃນໜ້າ — ຄືນ element ທີ່ລົ້ນອອກນອກຈໍ */
const FIND_OVERFLOW = `(() => {
  const W = document.documentElement.clientWidth
  const inScroller = (el) => {
    for (let n = el.parentElement; n; n = n.parentElement) {
      const s = getComputedStyle(n)
      if (/(auto|scroll|hidden)/.test(s.overflowX)) return true
    }
    return false
  }
  const wide = []
  for (const el of document.body.querySelectorAll('*')) {
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) continue
    if (r.right <= W + 1) continue
    if (getComputedStyle(el).position === 'fixed') continue
    if (inScroller(el)) continue
    wide.push(el)
  }
  // ເອົາສະເພາະຕົ້ນເຫດ — ຖ້າລູກກໍລົ້ນຄືກັນ ໃຫ້ນັບແຕ່ລູກ
  const leaves = wide.filter((el) => !wide.some((o) => o !== el && el.contains(o)))
  // ກອບທີ່ຕ້ອງເລື່ອນຂວາງ — ບໍ່ແມ່ນຂໍ້ຜິດພາດ ແຕ່ຢູ່ມືຖືເຫັນບໍ່ຄົບ
  const scrollers = [...document.querySelectorAll('*')]
    .filter((el) => {
      const s = getComputedStyle(el)
      if (!/(auto|scroll)/.test(s.overflowX)) return false
      return el.scrollWidth - el.clientWidth > 8
    })
    .map((el) => ({
      cls: (el.getAttribute('class') || '').slice(0, 60),
      extra: el.scrollWidth - el.clientWidth,
    }))
    .sort((a, b) => b.extra - a.extra)

  return JSON.stringify({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: W,
    title: document.title,
    scrollers: scrollers.slice(0, 3),
    offenders: leaves.slice(0, 6).map((el) => ({
      tag: el.tagName.toLowerCase(),
      cls: (el.getAttribute('class') || '').slice(0, 90),
      text: (el.textContent || '').trim().slice(0, 40),
      right: Math.round(el.getBoundingClientRect().right),
    })),
  })
})()`

const browser = BROWSERS.find((b) => existsSync(b))
if (!browser) {
  console.error('ບໍ່ພົບ Edge ຫຼື Chrome — ຂ້າມການກວດ')
  process.exit(0)
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()
const token = crypto.randomBytes(32).toString('hex')
const profile = await mkdtemp(path.join(tmpdir(), 'odg-resp-'))
let child

try {
  const manager = (
    await client.query(
      `select employee_id from it.v_it_staff where role = 'manager' limit 1`
    )
  ).rows[0]
  await client.query(
    `insert into it.sessions (token, employee_id, expires_at)
     values ($1, $2, now() + interval '10 minutes')`,
    [token, manager.employee_id]
  )

  child = spawn(browser, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-debugging-port=9222',
    `--user-data-dir=${profile}`,
    'about:blank',
  ])

  let version
  for (let i = 0; i < 40 && !version; i++) {
    try {
      version = await (await fetch('http://127.0.0.1:9222/json/version')).json()
    } catch {
      await new Promise((r) => setTimeout(r, 250))
    }
  }
  if (!version) throw new Error('ເປີດ browser ບໍ່ໄດ້')

  const browserConn = connect(version.webSocketDebuggerUrl)
  await browserConn.ready
  const { targetId } = await browserConn.send('Target.createTarget', {
    url: 'about:blank',
  })

  const page = connect(`ws://127.0.0.1:9222/devtools/page/${targetId}`)
  await page.ready
  await page.send('Page.enable')
  await page.send('Network.enable')
  await page.send('Emulation.setDeviceMetricsOverride', {
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: 2,
    mobile: true,
  })

  const { hostname } = new URL(base)
  await page.send('Network.setCookie', {
    name: 'it_session',
    value: token,
    domain: hostname,
    path: '/',
  })

  /** ເປີດໜ້າ ແລ້ວກວດ — ຄືນລິ້ງລູກທຳອິດຂອງໜ້ານັ້ນໄວ້ກວດຕໍ່ */
  async function audit(url) {
    const loaded = page.once('Page.loadEventFired')
    await page.send('Page.navigate', { url: base + url })
    await Promise.race([loaded, new Promise((r) => setTimeout(r, 15000))])
    await new Promise((r) => setTimeout(r, 350))

    const { result } = await page.send('Runtime.evaluate', {
      expression: FIND_OVERFLOW,
      returnByValue: true,
    })
    const report = JSON.parse(result.value)
    const over = report.scrollWidth - report.clientWidth
    if (report.scrollers.length > 0) {
      sideways.push(
        `${url.padEnd(28)} ${report.scrollers
          .map((s) => `+${s.extra}px <${s.cls}>`)
          .join(' · ')}`
      )
    }

    check(
      report.offenders.length === 0 && over <= 1,
      url.padEnd(28),
      report.offenders.length === 0
        ? over > 1
          ? `ກວ້າງເກີນ ${over}px`
          : ''
        : report.offenders
            .map((o) => `<${o.tag} class="${o.cls}"> → ${o.right}px "${o.text}"`)
            .join(' · ')
    )
  }

  /** ລິ້ງລູກທຳອິດຈາກໜ້າລາຍການ — ໃຊ້ຫາໜ້າລາຍລະອຽດໂດຍບໍ່ຕ້ອງເດົາ id */
  async function firstChildLink(listPath) {
    const expression = `(() => {
      const base = ${JSON.stringify(listPath)}
      // ໜ້າອື່ນທີ່ຢູ່ໃຕ້ເສັ້ນທາງດຽວກັນ (ແຖບເມນູ) ບໍ່ແມ່ນໜ້າລາຍລະອຽດ
      const known = new Set(${JSON.stringify(PAGES.map((p) => p.split('?')[0]))})
      const skip = ['/new', '/edit', '/print']
      for (const a of document.querySelectorAll('a[href]')) {
        const href = (a.getAttribute('href') || '').split('?')[0]
        if (!href.startsWith(base + '/')) continue
        if (known.has(href)) continue
        if (href.slice(base.length).split('/').length !== 2) continue
        if (skip.some((s) => href.endsWith(s))) continue
        return href
      }
      return ''
    })()`
    const { result } = await page.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
    })
    return result.value || null
  }

  console.log(`[1] ໜ້າລາຍການ — ບໍ່ມີເນື້ອຫາລົ້ນອອກນອກຈໍ ${WIDTH}px`)
  const details = []
  for (const url of PAGES) {
    await audit(url)
    const list = url.split('?')[0]
    if (DETAIL_OF.includes(list)) {
      const child = await firstChildLink(list)
      if (child) details.push(child)
    }
  }

  console.log(`\n[2] ໜ້າລາຍລະອຽດ — ບໍ່ມີເນື້ອຫາລົ້ນອອກນອກຈໍ ${WIDTH}px`)
  if (details.length === 0) console.log('  (ບໍ່ພົບລິ້ງລູກ — ຂໍ້ມູນຫວ່າງ?)')
  for (const url of details) await audit(url)

  page.close()
  browserConn.close()

  console.log('\n[3] ຕ້ອງເລື່ອນຂວາງເບິ່ງ (ຕາຕະລາງກວ້າງກວ່າຈໍ)')
  if (sideways.length === 0) console.log('  ✓ ບໍ່ມີ')
  for (const line of sideways) console.log(`  ! ${line}`)

  console.log(
    `\nຜ່ານ ${passed} · ບໍ່ຜ່ານ ${failed} · ເລື່ອນຂວາງ ${sideways.length}`
  )
  if (failed) process.exitCode = 1
} catch (e) {
  console.error('FAILED:', e.message)
  process.exitCode = 1
} finally {
  child?.kill()
  await client.query('delete from it.sessions where token = $1', [token])
  await client.end()
  await rm(profile, { recursive: true, force: true }).catch(() => {})
}

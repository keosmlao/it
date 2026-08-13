// Usage: node --env-file=.env.local scripts/smoke-pdf-text.mjs [baseUrl]
//
// The @fontsource Lao subset has no digits or Latin letters and the Latin
// subset has no Lao, so a PDF built with one font silently drops half the
// text. This walks the generated PDF's content streams and asserts that both
// scripts really made it onto the page.
import pg from 'pg'
import crypto from 'node:crypto'
import zlib from 'node:zlib'

const base = process.argv[2] ?? 'http://localhost:3100'
const c = new pg.Client({ connectionString: process.env.DATABASE_URL })
await c.connect()

let passed = 0
let failed = 0
const tokens = []

function check(ok, what) {
  console.log(`   ${ok ? '✓' : '✗'} ${what}`)
  if (ok) passed++
  else failed++
}

/**
 * ນັບຕົວອັກສອນທີ່ຖືກແຕ້ມຈິງ ໂດຍນັບຄຳສັ່ງ Tj/TJ ໃນ content stream
 * (ບໍ່ຕ້ອງຖອດລະຫັດເປັນຂໍ້ຄວາມ — ພຽງແຕ່ຢືນຢັນວ່າມີການແຕ້ມດ້ວຍທັງສອງຟອນຕ໌)
 */
function analyse(buffer) {
  const raw = buffer.toString('latin1')

  // ຄາຍ content stream ອອກ (pdf-lib ບີບອັດດ້ວຍ FlateDecode)
  const streams = []
  const re = /stream\r?\n/g
  let m
  while ((m = re.exec(raw))) {
    const start = m.index + m[0].length
    const end = raw.indexOf('endstream', start)
    if (end < 0) continue
    try {
      const text = zlib.inflateSync(buffer.subarray(start, end)).toString('latin1')
      if (text.includes(' Tf')) streams.push(text)
    } catch {
      /* stream ຂອງໄຟລ໌ຟອນຕ໌ — ບໍ່ໄດ້ໃຊ້ໃນການກວດນີ້ */
    }
  }

  const body = streams.join('\n')

  // ຊື່ຟອນຕ໌ທີ່ຖືກເອີ້ນໃຊ້ຈິງໃນຄຳສັ່ງ Tf
  const fonts = new Set(
    body.match(/\/[A-Za-z][\w-]*\s+[\d.]+\s+Tf/g)?.map((s) => s.trim().split(/\s+/)[0]) ?? []
  )

  // ຂໍ້ຄວາມທີ່ແຕ້ມແມ່ນເລກ glyph ຮູບແບບ <0021004D…> — glyph 0000 = .notdef
  // ຄື "ຕົວອັກສອນທີ່ຟອນຕ໌ນີ້ບໍ່ມີ" ເຊິ່ງເປັນອາການຂອງບັກທີ່ກຳລັງກວດ
  let glyphs = 0
  let notdef = 0
  for (const hex of body.match(/<[0-9A-Fa-f]+>\s*Tj/g) ?? []) {
    const codes = hex.slice(1, hex.indexOf('>')).match(/.{4}/g) ?? []
    glyphs += codes.length
    notdef += codes.filter((code) => code === '0000').length
  }

  return { fontCount: fonts.size, glyphs, notdef, fonts: [...fonts].slice(0, 3) }
}

async function session(employeeId) {
  const token = crypto.randomBytes(32).toString('hex')
  await c.query(
    `insert into it.sessions (token, employee_id, expires_at, user_agent)
     values ($1, $2, now() + interval '10 minutes', 'smoke-pdf')`,
    [token, employeeId]
  )
  tokens.push(token)
  return token
}

try {
  const manager = (
    await c.query(`select employee_id from it.v_portal_users where role = 'manager' limit 1`)
  ).rows[0]
  const token = await session(manager.employee_id)

  for (const target of [
    '/api/export/assets?format=pdf',
    '/api/export/holders?format=pdf',
    '/api/export/recovery?format=pdf',
    '/api/reports/export?format=pdf',
  ]) {
    const res = await fetch(base + target, { headers: { cookie: `it_session=${token}` } })
    const buf = Buffer.from(await res.arrayBuffer())
    const { fontCount, glyphs, notdef } = analyse(buf)

    console.log(`\n[${target}]`)
    check(
      res.status === 200 && buf.subarray(0, 4).toString() === '%PDF',
      `ເປັນ PDF ຈິງ (${buf.length} bytes)`
    )
    check(glyphs > 200, `ແຕ້ມຕົວອັກສອນ ${glyphs} ໂຕ`)
    check(fontCount >= 2, `ໃຊ້ຟອນຕ໌ ${fontCount} ຊຸດ (ຕ້ອງມີທັງລາວ ແລະ ລາຕິນ)`)
    check(notdef === 0, `ບໍ່ມີຕົວອັກສອນທີ່ຫາຍໄປ (.notdef = ${notdef})`)
  }

  console.log(`\nຜ່ານ ${passed} · ບໍ່ຜ່ານ ${failed}`)
  if (failed) process.exitCode = 1
} catch (e) {
  console.error('\nFAILED:', e.message)
  process.exitCode = 1
} finally {
  if (tokens.length) {
    await c.query('delete from it.sessions where token = any($1::varchar[])', [tokens])
  }
  await c.end()
}

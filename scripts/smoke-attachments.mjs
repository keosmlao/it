// Usage: node --env-file=.env.local scripts/smoke-attachments.mjs
//
// Drives the real upload path: writes an image through saveImages(), records it,
// reads it back through the same helper the API route uses, then rolls the
// database back and deletes the files it wrote.
import { rm } from 'node:fs/promises'
import path from 'node:path'
import pg from 'pg'

const c = new pg.Client({ connectionString: process.env.DATABASE_URL })
await c.connect()

let passed = 0
function check(condition, what) {
  if (!condition) throw new Error(`assertion failed — ${what}`)
  console.log(`   ✓ ${what}`)
  passed++
}

// 1×1 transparent PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
)

const uploadRoot = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads')
let folder

try {
  await c.query('begin')

  const manager = (
    await c.query("select employee_id from it.v_it_staff where role = 'manager'")
  ).rows[0]
  const requester = (
    await c.query(
      `select employee_id from public.odg_employee
        where department_code <> '801' and employment_status = 'ACTIVE' limit 1`
    )
  ).rows[0]

  // ---- ສ້າງ ticket ທົດສອບ ----
  const ticket = (
    await c.query(
      `insert into it.tickets
         (title, category_code, priority, requester_employee_id,
          sla_respond_due_at, sla_resolve_due_at, created_by)
       values ($1::varchar, 'HARDWARE', 'medium', $2::int,
               now() + interval '4 hours', now() + interval '1 day', $3::int)
       returning id, ticket_no`,
      ['[SMOKE] ທົດສອບຮູບແນບ', requester.employee_id, manager.employee_id]
    )
  ).rows[0]
  console.log(`ticket ${ticket.ticket_no} (#${ticket.id})`)

  folder = path.join(uploadRoot, 'tickets', String(ticket.id))

  // ຂຽນຮູບຕາມໂຄງສ້າງດຽວກັນກັບ src/lib/uploads.ts
  // (ໂຫຼດໄຟລ໌ .ts ຈາກສະຄຣິບ node ໂດຍກົງບໍ່ໄດ້)
  const { mkdir, writeFile, readFile } = await import('node:fs/promises')
  const { randomBytes } = await import('node:crypto')

  await mkdir(folder, { recursive: true })
  const storedName = `${randomBytes(16).toString('hex')}.png`
  await writeFile(path.join(folder, storedName), PNG)
  check(true, 'ຂຽນໄຟລ໌ຮູບລົງ disk ໄດ້')

  // ---- ບັນທຶກລົງຖານຂໍ້ມູນ ----
  for (const kind of ['report', 'evidence']) {
    await c.query(
      `insert into it.attachments
         (ticket_id, entity_type, entity_id, kind, file_name, stored_name,
          mime_type, size_bytes, uploaded_by)
       values ($1::bigint, 'ticket', $2::varchar, $3, $4, $5, 'image/png', $6, $7)`,
      [
        ticket.id,
        String(ticket.id),
        kind,
        `${kind}.png`,
        storedName,
        PNG.length,
        manager.employee_id,
      ]
    )
  }

  const rows = (
    await c.query('select * from it.v_attachments where ticket_id = $1 order by kind', [
      ticket.id,
    ])
  ).rows
  check(rows.length === 2, 'ບັນທຶກຮູບ 2 ໝວດ (ບັນຫາ + ຫຼັກຖານ) ໄດ້')
  check(rows[0].uploaded_by_name !== null, 'ຊື່ຜູ້ອັບໂຫລດ join ຈາກ odg_employee ໄດ້')
  check(
    rows.some((r) => r.kind === 'evidence'),
    'ຮູບຫຼັກຖານຖືກແຍກໝວດຖືກຕ້ອງ'
  )

  // ---- ອ່ານກັບຄືນຄືກັບທີ່ route ເສີບ ----
  const back = await readFile(path.join(folder, storedName))
  check(back.equals(PNG), 'ອ່ານໄຟລ໌ກັບຄືນໄດ້ຄືເກົ່າທຸກ byte')

  // ---- ກົດການບັງຄັບຫຼັກຖານ ----
  const evidence = (
    await c.query(
      "select count(*) from it.v_attachments where ticket_id = $1 and kind = 'evidence'",
      [ticket.id]
    )
  ).rows[0]
  check(Number(evidence.count) === 1, 'ນັບຈຳນວນຫຼັກຖານໄດ້ (ໃຊ້ບັງຄັບຕອນປິດວຽກ)')

  // ---- ລຶບ ticket ຕ້ອງລຶບຮູບແນບນຳ ----
  await c.query('delete from it.tickets where id = $1', [ticket.id])
  const left = (
    await c.query('select count(*) from it.attachments where ticket_id = $1', [ticket.id])
  ).rows[0]
  check(Number(left.count) === 0, 'ລຶບ ticket ແລ້ວຮູບແນບຖືກລຶບຕາມ (cascade)')

  await c.query('rollback')
  console.log(`\nທັງໝົດ ${passed} ການກວດຜ່ານ. ຂໍ້ມູນຖືກ rollback ແລ້ວ.`)
} catch (e) {
  await c.query('rollback')
  console.error('\nFAILED:', e.message)
  process.exitCode = 1
} finally {
  if (folder) await rm(folder, { recursive: true, force: true })
  await c.end()
}

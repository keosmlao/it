// Usage: node --env-file=.env.local scripts/smoke-loading.mjs
//
// ກວດວ່າທຸກໜ້າມີໂຄງລໍໂຫຼດ (loading.tsx) ຄຸມຢູ່ — ບໍ່ວ່າຈະເປັນຂອງຕົນເອງ
// ຫຼື ຂອງລະດັບເທິງ. ໜ້າທີ່ບໍ່ມີຈະຄ້າງເປົ່າໆຕອນກົດເຂົ້າໄປ
import { readdir } from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.join(process.cwd(), 'src', 'app')

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(full)
    else yield full
  }
}

const pages = []
const loadings = new Set()

for await (const file of walk(ROOT)) {
  const rel = path.relative(ROOT, file).split(path.sep)
  const name = rel[rel.length - 1]
  const dir = rel.slice(0, -1).join('/')
  if (name === 'page.tsx') pages.push(dir)
  if (name === 'loading.tsx') loadings.add(dir)
}

/** ໂຄງລໍໂຫຼດຂອງລະດັບເທິງກໍຄຸມໜ້າລູກໄດ້ */
function covered(pageDir) {
  const parts = pageDir === '' ? [] : pageDir.split('/')
  for (let i = parts.length; i >= 0; i--) {
    if (loadings.has(parts.slice(0, i).join('/'))) return parts.slice(0, i).join('/') || '(root)'
  }
  return null
}

/** ໜ້າທີ່ບໍ່ໄດ້ດຶງຂໍ້ມູນຈາກຖານຂໍ້ມູນ — ບໍ່ຕ້ອງມີໂຄງລໍໂຫຼດ */
const EXEMPT = new Set(['login'])

let missing = 0
console.log(`ພົບ ${pages.length} ໜ້າ · ໂຄງລໍໂຫຼດ ${loadings.size} ອັນ\n`)

for (const p of pages.sort()) {
  const by = covered(p)
  const own = loadings.has(p)
  const label = p || '(ຮາກ)'
  if (EXEMPT.has(p)) {
    console.log(`  – ${label} — ຍົກເວັ້ນ (ບໍ່ດຶງຂໍ້ມູນ)`)
  } else if (!by) {
    console.log(`  ✗ ${label} — ບໍ່ມີໂຄງລໍໂຫຼດ`)
    missing++
  } else if (own) {
    console.log(`  ✓ ${label} — ມີຂອງຕົນເອງ`)
  } else {
    console.log(`  · ${label} — ໃຊ້ຂອງ ${by}`)
  }
}

console.log(missing === 0 ? '\nທຸກໜ້າມີໂຄງລໍໂຫຼດຄຸມແລ້ວ' : `\nຂາດ ${missing} ໜ້າ`)
process.exitCode = missing ? 1 : 0

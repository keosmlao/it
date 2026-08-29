import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  REQUIRED_SPEC_FIELDS,
  SPEC_FIELDS,
  WARRANTY_NOTE_MAX,
  isComputerCategory,
} from './model'

// ຊື່ໝວດຈິງທີ່ມີໃນ `public.odg_it_category` ຂອງ ERP —
// ລະຫັດຂອງມັນບໍ່ເປັນລະບຽບ ('2', 'PC', 'MINI PC') ຈຶ່ງຕັດສິນຈາກຊື່
const COMPUTERS = [
  'NOTEBOOK',
  'DESKTOP',
  'ALL IN ONE',
  'MACBOOK',
  'PC',
  'MINI PC',
  'SURFACE ',
]

const NOT_COMPUTERS = [
  'PRINTER',
  'MONITOR',
  'LED',
  'TABLET',
  'IPAD',
  'SMARTPHONE',
  'PROJECTOR',
  'KEYBOARD',
  'SCANNER BARCODE',
  'HANDHELD',
  'DESK PHONE',
  'EXTERNAL',
  'HDMI SWITCH',
  'HDMI Splitter',
  'SWITCH',
  'CASE',
  'RALLY MIC POD ',
]

describe('ໝວດທີ່ຖືວ່າເປັນຄອມ', () => {
  it.each(COMPUTERS)('%s ຕ້ອງມີສະເປັກ', (name) => {
    expect(isComputerCategory(name)).toBe(true)
  })

  it.each(NOT_COMPUTERS)('%s ບໍ່ບັງຄັບສະເປັກ', (name) => {
    expect(isComputerCategory(name)).toBe(false)
  })

  it('ບໍ່ລະບຸໝວດ ກໍ່ບໍ່ບັງຄັບ', () => {
    expect(isComputerCategory(null)).toBe(false)
    expect(isComputerCategory('')).toBe(false)
  })

  it('ບໍ່ສົນໂຕພິມ ແລະ ຮັບຄຳວ່າຄອມພິວເຕີ', () => {
    expect(isComputerCategory('notebook ຝ່າຍບັນຊີ')).toBe(true)
    expect(isComputerCategory('ຄອມພິວເຕີຕັ້ງໂຕະ')).toBe(true)
  })
})

describe('ຊ່ອງສະເປັກ', () => {
  it('ຊ່ອງທີ່ບັງຄັບຢູ່ໃນລາຍການຊ່ອງທັງໝົດ', () => {
    const names = SPEC_FIELDS.map((f) => f.name)
    for (const required of REQUIRED_SPEC_FIELDS) {
      expect(names).toContain(required)
    }
  })
})

// ຟອມຈຳກັດຄວາມຍາວຕາມ `SPEC_FIELDS.max` — ຖ້າມັນກວ້າງກວ່າຄໍລຳຈິງ
// Postgres ຖິ້ມ 22001 ຕອນບັນທຶກ ແລະ ໜ້າພັງ. ອ່ານ migration ມາທຽບເລີຍ
// ຈຶ່ງບໍ່ຕ້ອງຈື່ອັບເດດສອງບ່ອນ
describe('ຄວາມຍາວຊ່ອງກົງກັບຄໍລຳໃນຖານຂໍ້ມູນ', () => {
  const sql = readFileSync(
    new URL('../../../db/migrations/012_asset_specs_repairs.sql', import.meta.url),
    'utf8'
  )
  const table = sql.slice(sql.indexOf('create table it.asset_specs'))
  const width = (column: string) =>
    Number(
      table
        .split('\n')
        .find((line) => line.trim().startsWith(`${column} `))
        ?.match(/varchar\((\d+)\)/)?.[1]
    )

  it.each(SPEC_FIELDS.map((f) => [f.name, f.max] as const))(
    '%s ບໍ່ຍາວກວ່າຄໍລຳ',
    (name, max) => {
      expect(max).toBeLessThanOrEqual(width(name))
    }
  )

  it('ໝາຍເຫດປະກັນບໍ່ຍາວກວ່າຄໍລຳ', () => {
    expect(WARRANTY_NOTE_MAX).toBeLessThanOrEqual(width('warranty_note'))
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import { isoDate, shiftDate, todayISO } from './format'

afterEach(() => {
  vi.useRealTimers()
})

/**
 * ບັນຫາຈິງທີ່ພົບ (31/08/2026): ຫຼາຍບ່ອນຄິດ "ມື້ນີ້" ດ້ວຍ
 * `new Date().toISOString().slice(0, 10)` ຊຶ່ງເປັນ **UTC ສະເໝີ**
 * ບໍ່ວ່າຈະຕັ້ງ TZ ຂອງເຄື່ອງເປັນຫຍັງ — ຕອນເຊົ້າມືດຢູ່ລາວ (00:00–07:00)
 * ຈຶ່ງໄດ້ວັນທີຂອງມື້ວານ ເຮັດໃຫ້ຟອມຕັ້ງວັນຜິດ ແລະ ຊ່ວງລາຍງານຂາດມື້ນີ້
 */
describe('todayISO — ວັນທີຕາມເວລາລາວ', () => {
  it('ເຊົ້າມືດຢູ່ລາວ ຍັງນັບເປັນມື້ໃໝ່ ເຖິງແມ່ນ UTC ຍັງເປັນມື້ວານ', () => {
    // 18:30 UTC = 01:30 ຂອງມື້ຖັດໄປຢູ່ລາວ (UTC+7)
    vi.setSystemTime(new Date('2026-08-30T18:30:00Z'))

    expect(todayISO()).toBe('2026-08-31')
    // ວິທີເກົ່າໃຫ້ຄຳຕອບຜິດ — ເປັນເຫດຜົນທີ່ຕ້ອງມີ helper ນີ້
    expect(new Date().toISOString().slice(0, 10)).toBe('2026-08-30')
  })

  it('ກາງເວັນ ໄດ້ວັນດຽວກັນກັບ UTC', () => {
    vi.setSystemTime(new Date('2026-08-31T04:00:00Z'))
    expect(todayISO()).toBe('2026-08-31')
  })

  it('ທ້າຍປີ ຂ້າມປີຖືກຕ້ອງ', () => {
    // 31/12/2026 18:00 UTC = 01:00 ຂອງ 01/01/2027 ຢູ່ລາວ
    vi.setSystemTime(new Date('2026-12-31T18:00:00Z'))
    expect(todayISO()).toBe('2027-01-01')
  })
})

describe('shiftDate', () => {
  it('ຖອຍຫຼັງຂ້າມເດືອນໄດ້', () => {
    expect(shiftDate('2026-03-02', -29)).toBe('2026-02-01')
  })

  it('ເດີນໜ້າຂ້າມປີໄດ້', () => {
    expect(shiftDate('2026-12-31', 1)).toBe('2027-01-01')
  })
})

describe('isoDate', () => {
  it('ຮັບໄດ້ທັງ string ແລະ Date (pg ຄືນ date ມາເປັນ Date)', () => {
    expect(isoDate('2026-08-31T10:00:00Z')).toBe('2026-08-31')
    expect(isoDate(new Date(2026, 7, 31))).toBe('2026-08-31')
    expect(isoDate(null)).toBe('')
  })
})

import { describe, expect, it } from 'vitest'
import {
  BILLING_CYCLES,
  BILLING_CYCLE_LABEL_LO,
  SUB_CATEGORIES,
  SUB_CATEGORY_LABEL_LO,
  addMonths,
  formatAmount,
  monthlyCost,
  nextDueAfter,
  periodEndFor,
  rollForwardDue,
} from './model'

describe('ຄ່າໃຊ້ຈ່າຍຕໍ່ເດືອນ', () => {
  it('ປັບທຸກຮອບຈ່າຍໃຫ້ທຽບກັນໄດ້', () => {
    expect(monthlyCost(300_000, 'monthly')).toBe(300_000)
    expect(monthlyCost(900_000, 'quarterly')).toBe(300_000)
    expect(monthlyCost(3_600_000, 'yearly')).toBe(300_000)
  })

  it('ຈ່າຍເທື່ອດຽວບໍ່ນັບເປັນຄ່າປະຈຳ', () => {
    expect(monthlyCost(5_000_000, 'one_time')).toBe(0)
  })
})

describe('ວັນທີຂອງງວດ', () => {
  it('ບວກເດືອນແບບທຳມະດາ', () => {
    expect(addMonths('2026-01-15', 1)).toBe('2026-02-15')
    expect(addMonths('2026-01-15', 12)).toBe('2027-01-15')
  })

  it('ຕັດວັນທ້າຍເດືອນລົງໃຫ້ພໍດີເດືອນສັ້ນ', () => {
    // ບໍ່ດັ່ງນັ້ນ 31 ມັງກອນ + 1 ເດືອນ ຈະກາຍເປັນ 3 ມີນາ
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29')
    expect(addMonths('2026-03-31', 1)).toBe('2026-04-30')
  })

  it('ງວດຖັດໄປຂອງແຕ່ລະຮອບຈ່າຍ', () => {
    expect(nextDueAfter('2026-08-14', 'monthly')).toBe('2026-09-14')
    expect(nextDueAfter('2026-08-14', 'quarterly')).toBe('2026-11-14')
    expect(nextDueAfter('2026-08-14', 'yearly')).toBe('2027-08-14')
    expect(nextDueAfter('2026-08-14', 'one_time')).toBeNull()
  })

  it('ງວດສິ້ນສຸດກ່ອນງວດໃໝ່ 1 ມື້ — ບໍ່ໃຫ້ຊ້ອນກັນ', () => {
    expect(periodEndFor('2026-08-14', 'monthly')).toBe('2026-09-13')
    expect(periodEndFor('2026-01-01', 'yearly')).toBe('2026-12-31')
  })
})

describe('ກຳນົດຈ່າຍຄັ້ງຕໍ່ໄປ', () => {
  it('ເລື່ອນຂອງເກົ່າມາຫາຮອບປັດຈຸບັນ', () => {
    expect(rollForwardDue('2023-03-10', 'yearly', '2026-08-14')).toBe('2027-03-10')
    expect(rollForwardDue('2026-01-05', 'monthly', '2026-08-14')).toBe('2026-09-05')
  })

  it('ວັນເລີ່ມທີ່ຍັງມາບໍ່ຮອດ ໃຫ້ໃຊ້ວັນນັ້ນເລີຍ', () => {
    expect(rollForwardDue('2026-12-01', 'monthly', '2026-08-14')).toBe('2026-12-01')
  })

  it('ຈ່າຍເທື່ອດຽວບໍ່ມີງວດຕໍ່', () => {
    expect(rollForwardDue('2020-01-01', 'one_time', '2026-08-14')).toBe('2020-01-01')
  })
})

describe('ການສະແດງຜົນ', () => {
  it('ຂຽນສະກຸນເງິນຕິດກັບຕົວເລກສະເໝີ', () => {
    expect(formatAmount('250000', 'LAK')).toContain('LAK')
    expect(formatAmount('20', 'USD')).toContain('USD')
    expect(formatAmount(null, 'LAK')).toBe('—')
  })

  it('ທຸກປະເພດ ແລະ ຮອບຈ່າຍມີປ້າຍພາສາລາວ', () => {
    for (const c of SUB_CATEGORIES) expect(SUB_CATEGORY_LABEL_LO[c]).toBeTruthy()
    for (const c of BILLING_CYCLES) expect(BILLING_CYCLE_LABEL_LO[c]).toBeTruthy()
  })
})

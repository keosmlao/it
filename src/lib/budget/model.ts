/**
 * ງົບປະມານ ທຽບ ໃຊ້ຈິງ — ຄ່າຄົງທີ່ໃຊ້ໄດ້ທັງ server ແລະ client
 * ຕ້ອງກົງກັບ check constraint ຂອງ db/migrations/047_budget.sql
 */

export const BUDGET_CATEGORIES = [
  'asset',
  'subscription',
  'repair',
  'consumable',
  'project',
  'training',
  'other',
] as const

export type BudgetCategory = (typeof BUDGET_CATEGORIES)[number]

export const BUDGET_CATEGORY_LABEL_LO: Record<BudgetCategory, string> = {
  asset: 'ຊື້ອຸປະກອນ',
  subscription: 'ຄ່າເຊົ່າບໍລິການ',
  repair: 'ຄ່າສ້ອມແປງ',
  consumable: 'ຂອງສິ້ນເປືອງ',
  project: 'ໂປຣເຈັກ',
  training: 'ຝຶກອົບຮົມ',
  other: 'ອື່ນໆ',
}

/** ໃຊ້ຈິງມາຈາກໃສ — ບອກລະບົບໃຫ້ໄປອ່ານເອງ ຈຶ່ງບໍ່ຕ້ອງປ້ອນຊໍ້າ */
export const BUDGET_SOURCES = [
  'manual',
  'subscriptions',
  'purchase',
  'repairs',
  'consumables',
] as const

export type BudgetSource = (typeof BUDGET_SOURCES)[number]

export const BUDGET_SOURCE_LABEL_LO: Record<BudgetSource, string> = {
  manual: 'ປ້ອນເອງ',
  subscriptions: 'ງວດຄ່າເຊົ່າທີ່ຈ່າຍແລ້ວ',
  purchase: 'ໃບສະເໜີຊື້ທີ່ອະນຸມັດ',
  repairs: 'ຄ່າສ້ອມແປງ',
  consumables: 'ຂອງສິ້ນເປືອງທີ່ຮັບເຂົ້າ',
}

export const BUDGET_SOURCE_HINT_LO: Record<BudgetSource, string> = {
  manual: 'ບັນທຶກລາຍຈ່າຍເອງໃນໜ້າລາຍລະອຽດ',
  subscriptions: 'ອ່ານຈາກງວດທີ່ໝາຍວ່າຈ່າຍແລ້ວ ໃນປີງົບປະມານນັ້ນ',
  purchase: 'ອ່ານຈາກໃບ PR ທີ່ອະນຸມັດ / ສັ່ງຊື້ / ຮັບເຄື່ອງແລ້ວ',
  repairs: 'ອ່ານຈາກໃບສ້ອມ (ລວມທັງທີ່ບັນທຶກໃນ ERP)',
  consumables: 'ອ່ານຈາກຈຳນວນທີ່ຮັບເຂົ້າ × ລາຄາຕໍ່ຫົວໜ່ວຍ',
}

export const BUDGET_STATES = ['ok', 'near', 'over', 'unset'] as const
export type BudgetState = (typeof BUDGET_STATES)[number]

export const BUDGET_STATE_LABEL_LO: Record<BudgetState, string> = {
  ok: 'ຢູ່ໃນງົບ',
  near: 'ໃກ້ເຕັມງົບ',
  over: 'ເກີນງົບແລ້ວ',
  unset: 'ຍັງບໍ່ໄດ້ຕັ້ງງົບ',
}

export const BUDGET_STATE_STYLE: Record<BudgetState, string> = {
  ok: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  near: 'bg-brand-orange/20 text-brand-orange',
  over: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  unset: 'bg-slate-100 text-muted dark:bg-white/5',
}

export type BudgetLine = {
  id: string
  fiscal_year: number
  name: string
  category: BudgetCategory
  source: BudgetSource
  source_filter: string | null
  currency: string
  planned_amount: string
  note: string | null
  created_by: number
  created_by_name: string | null
  created_at: string
  updated_at: string
  actual_amount: string
  remaining_amount: string
  percent_used: number | null
  budget_state: BudgetState
}

export type BudgetSpend = {
  id: string
  line_id: string
  line_name: string
  fiscal_year: number
  currency: string
  spend_date: string | Date
  amount: string
  description: string
  ref_no: string | null
  created_by: number
  created_by_name: string | null
  created_at: string
}

export function isBudgetCategory(value: string): value is BudgetCategory {
  return (BUDGET_CATEGORIES as readonly string[]).includes(value)
}

export function isBudgetSource(value: string): value is BudgetSource {
  return (BUDGET_SOURCES as readonly string[]).includes(value)
}

/** ປີງົບປະມານທີ່ໃຫ້ເລືອກ — ປີກ່ອນ, ປີນີ້, ປີໜ້າ */
export function fiscalYearOptions(current: number): number[] {
  return [current - 1, current, current + 1]
}

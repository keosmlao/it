/**
 * ອຸປະກອນສິ້ນເປືອງ — ຄ່າຄົງທີ່ໃຊ້ໄດ້ທັງ server ແລະ client
 * ຕ້ອງກົງກັບ check constraint ຂອງ db/migrations/045_consumables.sql
 */

export const CONSUMABLE_CATEGORIES = [
  'ink',
  'cable',
  'part',
  'battery',
  'peripheral',
  'media',
  'other',
] as const

export type ConsumableCategory = (typeof CONSUMABLE_CATEGORIES)[number]

export const CONSUMABLE_CATEGORY_LABEL_LO: Record<ConsumableCategory, string> = {
  ink: 'ໝຶກພິມ',
  cable: 'ສາຍ / ຫົວຕໍ່',
  part: 'ອາໄຫຼ່',
  battery: 'ຖ່ານ / ແບັດ',
  peripheral: 'ອຸປະກອນຕໍ່ພ່ວງ',
  media: 'ສື່ບັນທຶກ',
  other: 'ອື່ນໆ',
}

export const STOCK_STATES = ['ok', 'low', 'empty', 'inactive'] as const
export type StockState = (typeof STOCK_STATES)[number]

export const STOCK_STATE_LABEL_LO: Record<StockState, string> = {
  ok: 'ພຽງພໍ',
  low: 'ໃກ້ໝົດ',
  empty: 'ໝົດແລ້ວ',
  inactive: 'ບໍ່ໃຊ້ແລ້ວ',
}

export const STOCK_STATE_STYLE: Record<StockState, string> = {
  ok: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  low: 'bg-brand-orange/20 text-brand-orange',
  empty: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  inactive: 'bg-slate-100 text-muted dark:bg-white/5',
}

export const MOVE_KINDS = ['in', 'out', 'adjust'] as const
export type MoveKind = (typeof MOVE_KINDS)[number]

export const MOVE_KIND_LABEL_LO: Record<MoveKind, string> = {
  in: 'ຮັບເຂົ້າ',
  out: 'ເບີກອອກ',
  adjust: 'ປັບຍອດ',
}

export const MOVE_KIND_STYLE: Record<MoveKind, string> = {
  in: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  out: 'bg-brand-sky/20 text-brand-navy dark:text-brand-sky',
  adjust: 'bg-slate-100 text-muted dark:bg-white/5',
}

export type Consumable = {
  id: string
  code: string
  name: string
  category: ConsumableCategory
  unit: string
  min_qty: string
  location: string | null
  vendor_id: string | null
  vendor_name: string | null
  unit_price: string | null
  note: string | null
  is_active: boolean
  created_by: number
  created_at: string
  updated_at: string
  on_hand: string
  in_qty: string
  out_qty: string
  last_move_at: string | Date | null
  stock_value: string
  stock_state: StockState
}

export type ConsumableMove = {
  id: string
  consumable_id: string
  consumable_code: string
  consumable_name: string
  unit: string
  kind: MoveKind
  qty: string
  moved_at: string | Date
  employee_id: number | null
  employee_name: string | null
  department_code: string | null
  department_name: string | null
  asset_code: string | null
  ref_no: string | null
  note: string | null
  created_by: number
  created_by_name: string | null
  created_at: string
}

export function isConsumableCategory(value: string): value is ConsumableCategory {
  return (CONSUMABLE_CATEGORIES as readonly string[]).includes(value)
}

export function isMoveKind(value: string): value is MoveKind {
  return (MOVE_KINDS as readonly string[]).includes(value)
}

/** ຈຳນວນແບບອ່ານງ່າຍ — ຕັດ .00 ອອກ ເພາະສ່ວນຫຼາຍນັບເປັນຈຳນວນເຕັມ */
export function formatQty(value: string | number | null): string {
  if (value === null || value === '') return '0'
  const n = Number(value)
  if (!Number.isFinite(n)) return '0'
  return n.toLocaleString('lo-LA', { maximumFractionDigits: 2 })
}

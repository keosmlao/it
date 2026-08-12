/**
 * ຄ່າຄົງທີ່ ແລະ ຊະນິດຂໍ້ມູນຂອງສະຖານະເຄື່ອງ/ການທວງຄືນ
 * ແຍກອອກຈາກ stock.ts ເພື່ອໃຫ້ client component ນຳໃຊ້ໄດ້ (stock.ts ເປັນ server-only)
 */

// ---------- ສະຖານະຈິງຂອງອຸປະກອນ (IT ໝາຍເອງ) ----------

export const STOCK_STATES = [
  'in_stock',
  'with_user',
  'repair',
  'missing',
  'retired',
] as const
export type StockState = (typeof STOCK_STATES)[number]

export const STOCK_LABEL_LO: Record<StockState, string> = {
  in_stock: 'ຢູ່ໃນສາງ',
  with_user: 'ຢູ່ກັບຜູ້ໃຊ້',
  repair: 'ສົ່ງສ້ອມ',
  missing: 'ຫາບໍ່ພົບ',
  retired: 'ປົດລະວາງ',
}

export const STOCK_STYLE: Record<StockState, string> = {
  in_stock: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  with_user: 'bg-brand-sky/20 text-brand-navy dark:text-brand-sky',
  repair: 'bg-brand-orange/20 text-brand-orange',
  missing: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  retired: 'bg-brand-navy/10 text-muted dark:bg-white/5',
}

export type SurveyRow = {
  asset_code: string
  name: string
  category_name: string
  serial_no: string | null
  location_name: string | null
  holder_name: string | null
  movement_count: number
  stock_state: StockState | null
  location_note: string | null
  checked_at: string | null
  checked_by_name: string | null
  note: string | null
}

// ---------- ການທວງຄືນ ----------

export const RECOVERY_STATES = [
  'open',
  'contacted',
  'promised',
  'recovered',
  'written_off',
] as const
export type RecoveryState = (typeof RECOVERY_STATES)[number]

export const RECOVERY_LABEL_LO: Record<RecoveryState, string> = {
  open: 'ຍັງບໍ່ໄດ້ຕິດຕໍ່',
  contacted: 'ຕິດຕໍ່ແລ້ວ',
  promised: 'ຮັບປາກຈະຄືນ',
  recovered: 'ໄດ້ຄືນແລ້ວ',
  written_off: 'ຕັດຈຳໜ່າຍ',
}

export const RECOVERY_STYLE: Record<RecoveryState, string> = {
  open: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  contacted: 'bg-brand-orange/20 text-brand-orange',
  promised: 'bg-brand-sky/20 text-brand-navy dark:text-brand-sky',
  recovered: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  written_off: 'bg-brand-navy/10 text-muted dark:bg-white/5',
}

export type RecoveryTarget = {
  asset_code: string
  asset_name: string
  emp_code: string
  emp_name: string | null
  org_department: string | null
  division_name: string | null
  borrow_doc_no: string | null
  borrowed_at: string | null
  is_former_employee: boolean
  source: 'erp' | 'it'
  days_held: number
  recovery_id: string | null
  recovery_status: RecoveryState | null
  contacted_at: string | null
  promised_date: string | null
  recovery_note: string | null
  reason: 'former' | 'long_held' | 'normal'
}

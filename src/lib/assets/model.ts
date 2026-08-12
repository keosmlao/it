// Client-safe constants and types for the asset module.
//
// ຂໍ້ມູນມາຈາກທະບຽນຊັບສິນຂອງ ERP (`public.as_asset` ຜ່ານ view `it.v_it_assets`)
// ຈຶ່ງເປັນການ **ອ່ານຢ່າງດຽວ** — ການເພີ່ມ/ແກ້ຊັບສິນ ແລະ ໃບຢືມ–ຄືນ
// ເຮັດຢູ່ລະບົບ ERP ຕົ້ນທາງ.

/** ສະຖານະການຖືຄອງ (ຄິດຈາກໃບຢືມ–ຄືນ ບໍ່ແມ່ນຄໍລຳໃນຖານຂໍ້ມູນ) */
export const ASSET_FILTERS = ['all', 'assigned', 'spare'] as const
export type AssetFilter = (typeof ASSET_FILTERS)[number]

export const ASSET_FILTER_LABEL_LO: Record<AssetFilter, string> = {
  all: 'ທັງໝົດ',
  assigned: 'ມີຜູ້ຖືຄອງ',
  spare: 'ຢູ່ໃນສາງ',
}

export type AssetRow = {
  asset_code: string
  name: string
  type_code: string | null
  type_name: string | null
  category_code: string | null
  category_name: string | null
  brand: string | null
  model: string | null
  serial_no: string | null
  mac_address: string | null
  location_code: string | null
  location_name: string | null
  department_code: string | null
  department_name: string | null
  owned_by_it: boolean
  category_guessed: boolean
  registered_at: string | null

  // spec ທີ່ພະແນກ IT ປ້ອນເອງ
  cpu: string | null
  ram: string | null
  storage: string | null
  gpu: string | null
  os: string | null
  screen: string | null
  spec_note: string | null
  has_spec: boolean

  purchase_date: string | null
  purchase_date_source: DateSource
  purchase_price: string | null
  warranty_note: string | null
  warranty_status: WarrantyStatus
  warranty_source: DateSource
  type_mismatch: boolean
  repair_count: number
  buy_year: number | null
  warranty_until: string | null
  holder_code: string | null
  holder_name: string | null
  holder_department: string | null
  borrow_doc_no: string | null
  borrowed_at: string | null
  is_assigned: boolean
  holder_source: 'erp' | 'it' | null
  movement_count: number
}

/**
 * ແຫຼ່ງທີ່ມາຂອງວັນທີ — ບອກໃຫ້ຜູ້ໃຊ້ຮູ້ວ່າຄ່າໃດເປັນຂອງແທ້ ຄ່າໃດລະບົບຄິດໃຫ້
 * it = ພະແນກ IT ປ້ອນເອງ · erp = ມາຈາກທະບຽນ ERP
 * registered = ໃຊ້ວັນລົງທະບຽນແທນ · auto = ຄິດເອງ (ປະກັນ 12 ເດືອນ)
 */
export type DateSource = 'it' | 'erp' | 'registered' | 'auto' | 'unknown'

export const DATE_SOURCE_NOTE: Record<DateSource, string> = {
  it: '',
  erp: '',
  registered: 'ໃຊ້ວັນລົງທະບຽນແທນ',
  auto: 'ຄິດ 12 ເດືອນຈາກວັນທີຊື້',
  unknown: '',
}

export const WARRANTY_STATUSES = [
  'valid',
  'expiring',
  'expired',
  'unknown',
] as const
export type WarrantyStatus = (typeof WARRANTY_STATUSES)[number]

export const WARRANTY_LABEL_LO: Record<WarrantyStatus, string> = {
  valid: 'ຢູ່ໃນປະກັນ',
  expiring: 'ປະກັນໃກ້ໝົດ',
  expired: 'ໝົດປະກັນແລ້ວ',
  unknown: 'ບໍ່ໄດ້ລະບຸປະກັນ',
}

export const WARRANTY_STYLE: Record<WarrantyStatus, string> = {
  valid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  expiring: 'bg-brand-orange/20 text-brand-orange',
  expired: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  unknown: 'bg-brand-navy/10 text-muted dark:bg-white/5',
}

export const REPAIR_STATUSES = ['sent', 'done', 'cancelled'] as const
export type RepairStatus = (typeof REPAIR_STATUSES)[number]

export const REPAIR_STATUS_LABEL_LO: Record<RepairStatus, string> = {
  sent: 'ສົ່ງສ້ອມຢູ່',
  done: 'ສ້ອມແລ້ວ',
  cancelled: 'ຍົກເລີກ',
}

export type AssetRepair = {
  source: 'erp' | 'it'
  ref_no: string
  asset_code: string
  repair_date: string
  issue: string
  action: string | null
  cost: string | null
  vendor: string | null
  status: RepairStatus
  ticket_id: string | null
  created_by_name: string | null
  created_at: string | null
}

/** ຈຳນວນເງິນແບບອ່ານງ່າຍ */
export function formatMoney(value: string | null): string {
  if (!value || Number(value) === 0) return '—'
  return Number(value).toLocaleString('lo-LA')
}

export type AssetMovement = {
  source: 'erp' | 'it'
  expected_return: string | null
  return_condition: string | null
  note: string | null
  asset_code: string
  asset_name: string
  emp_code: string | null
  emp_name: string | null
  department_code: string | null
  department_name: string | null
  division_name: string | null
  hr_department_name: string | null
  unit_name: string | null
  /** ພະແນກທີ່ໃຊ້ສະແດງ — ຂອງ HR ກ່ອນ ຖ້າບໍ່ມີຈຶ່ງໃຊ້ຂອງໃບຢືມ */
  org_department: string | null
  borrow_doc_no: string | null
  borrowed_at: string | null
  return_doc_no: string | null
  returned_at: string | null
  category_name: string | null
  brand: string | null
  model: string | null
  serial_no: string | null
  is_returned: boolean
}

/**
 * ວັນທີແບບ dd-MM-yyyy.
 * ວັນທີບາງແຖວໃນຂໍ້ມູນເກົ່າເສຍຮູບແບບ (ເຊັ່ນ ປີ 020236) — ກັນບໍ່ໃຫ້ສະແດງມົ້ວ
 */
export function safeDate(value: string | null): string {
  if (!value) return '—'

  const date = new Date(value)
  const year = date.getFullYear()
  if (Number.isNaN(year) || year < 1990 || year > 2100) return '—'

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${day}-${month}-${year}`
}

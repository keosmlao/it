/**
 * ບຳລຸງຮັກສາຕາມແຜນ — ຄ່າຄົງທີ່ທີ່ໃຊ້ໄດ້ທັງ server ແລະ client
 *
 * ຄ່າຕ້ອງກົງກັບ check constraint ຂອງ db/migrations/042_maintenance.sql
 */

export const PM_CATEGORIES = [
  'backup',
  'ups',
  'server_room',
  'network',
  'cctv',
  'printer',
  'security',
  'other',
] as const

export type PmCategory = (typeof PM_CATEGORIES)[number]

export const PM_CATEGORY_LABEL_LO: Record<PmCategory, string> = {
  backup: 'ສຳຮອງຂໍ້ມູນ',
  ups: 'UPS / ໄຟສຳຮອງ',
  server_room: 'ຫ້ອງ server',
  network: 'ເຄືອຂ່າຍ',
  cctv: 'ກ້ອງວົງຈອນປິດ',
  printer: 'ເຄື່ອງພິມ',
  security: 'ຄວາມປອດໄພ',
  other: 'ອື່ນໆ',
}

export const PM_DUE_STATUSES = ['overdue', 'due_soon', 'ok', 'inactive'] as const
export type PmDueStatus = (typeof PM_DUE_STATUSES)[number]

export const PM_DUE_LABEL_LO: Record<PmDueStatus, string> = {
  overdue: 'ເລີຍກຳນົດແລ້ວ',
  due_soon: 'ຮອດກຳນົດໄວໆນີ້',
  ok: 'ຍັງບໍ່ຮອດກຳນົດ',
  inactive: 'ປິດໄວ້',
}

export const PM_DUE_STYLE: Record<PmDueStatus, string> = {
  overdue: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  due_soon: 'bg-brand-orange/20 text-brand-orange',
  ok: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  inactive: 'bg-slate-100 text-muted dark:bg-white/5',
}

export const PM_RESULTS = ['ok', 'issue', 'skipped'] as const
export type PmResult = (typeof PM_RESULTS)[number]

export const PM_RESULT_LABEL_LO: Record<PmResult, string> = {
  ok: 'ປົກກະຕິ',
  issue: 'ພົບບັນຫາ',
  skipped: 'ຂ້າມຮອບນີ້',
}

export const PM_RESULT_STYLE: Record<PmResult, string> = {
  ok: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  issue: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  skipped: 'bg-slate-100 text-muted dark:bg-white/5',
}

/** ຮອບທີ່ໃຊ້ເລື້ອຍ — ປ້ອນເລກເອງກໍໄດ້ */
export const PM_INTERVALS = [
  { days: 7, label: 'ທຸກອາທິດ (7 ວັນ)' },
  { days: 30, label: 'ທຸກເດືອນ (30 ວັນ)' },
  { days: 90, label: 'ທຸກໄຕມາດ (90 ວັນ)' },
  { days: 180, label: 'ທຸກເຄິ່ງປີ (180 ວັນ)' },
  { days: 365, label: 'ທຸກປີ (365 ວັນ)' },
] as const

/** ເຕືອນລ່ວງໜ້າກີ່ມື້ — ວຽກບຳລຸງຮັກສາເຕືອນສັ້ນກວ່າຄ່າເຊົ່າ */
export const PM_REMINDER_DAYS = [7, 1, 0] as const
export const PM_OVERDUE_KEY = -1

export type MaintenancePlan = {
  id: string
  code: string
  title: string
  category: PmCategory
  asset_code: string | null
  asset_name: string | null
  location_code: string | null
  location_name: string | null
  interval_days: number
  next_due_date: string | Date
  last_done_at: string | Date | null
  owner_employee_id: number | null
  owner_name: string | null
  owner_nickname: string | null
  checklist: string | null
  is_active: boolean
  created_by: number
  created_by_name: string | null
  created_at: string
  updated_at: string
  days_to_due: number
  due_status: PmDueStatus
  log_count: string
  issue_count: string
}

export type MaintenanceLog = {
  id: string
  plan_id: string
  plan_code: string
  plan_title: string
  category: PmCategory
  performed_at: string | Date
  result: PmResult
  note: string | null
  minutes: number | null
  ticket_id: string | null
  ticket_no: string | null
  created_by: number
  performed_by_name: string | null
  created_at: string
}

export function isPmCategory(value: string): value is PmCategory {
  return (PM_CATEGORIES as readonly string[]).includes(value)
}

export function isPmResult(value: string): value is PmResult {
  return (PM_RESULTS as readonly string[]).includes(value)
}

/** ບວກວັນໃສ່ວັນທີແບບ yyyy-MM-dd (ຄິດດ້ວຍ UTC ບໍ່ໃຫ້ເຂດເວລາເລື່ອນວັນ) */
export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return iso
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * ກຳນົດຄັ້ງຕໍ່ໄປຫຼັງເຮັດວຽກແລ້ວ
 *
 * ນັບຈາກ "ມື້ທີ່ເຮັດແທ້" ບໍ່ແມ່ນມື້ທີ່ຄວນເຮັດ — ຖ້ານັບຈາກກຳນົດເກົ່າ
 * ວຽກທີ່ຊັກຊ້າຈະຮອດກຳນົດຄືນທັນທີ ຫຼື ຍັງເລີຍກຳນົດຢູ່ຄືເກົ່າ
 */
export function nextDueAfterDone(doneIso: string, intervalDays: number): string {
  return addDays(doneIso, intervalDays)
}

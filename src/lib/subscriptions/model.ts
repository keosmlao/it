/**
 * ຄ່າຄົງທີ່ ແລະ ຊະນິດຂອງໂມດູນຄ່າເຊົ່າບໍລິການ — ໃຊ້ໄດ້ທັງ server ແລະ client
 *
 * ຄ່າໃນ *_STATUSES / *_CATEGORIES ຕ້ອງກົງກັບ check constraint ຂອງ
 * db/migrations/040_subscriptions.sql — ຖ້າເພີ່ມຢູ່ນີ້ຢ່າງດຽວ insert ຈະຖືກປະຕິເສດ
 */

export const SUB_CATEGORIES = [
  'internet',
  'cloud',
  'mail',
  'ai',
  'domain',
  'ssl',
  'license',
  'hosting',
  'other',
] as const

export type SubCategory = (typeof SUB_CATEGORIES)[number]

export const SUB_CATEGORY_LABEL_LO: Record<SubCategory, string> = {
  internet: 'ອິນເຕີເນັດ',
  cloud: 'Cloud / Server ເຊົ່າ',
  mail: 'Mail server',
  ai: 'AI',
  domain: 'ຊື່ໂດເມນ',
  ssl: 'ໃບຮັບຮອງ SSL',
  license: 'ໃບອະນຸຍາດຊອບແວ',
  hosting: 'Hosting / ເວັບໄຊ',
  other: 'ອື່ນໆ',
}

export const BILLING_CYCLES = ['monthly', 'quarterly', 'yearly', 'one_time'] as const
export type BillingCycle = (typeof BILLING_CYCLES)[number]

export const BILLING_CYCLE_LABEL_LO: Record<BillingCycle, string> = {
  monthly: 'ລາຍເດືອນ',
  quarterly: 'ລາຍໄຕມາດ (3 ເດືອນ)',
  yearly: 'ລາຍປີ',
  one_time: 'ຈ່າຍເທື່ອດຽວ',
}

/** ຈຳນວນເດືອນຕໍ່ 1 ງວດ — 0 ໝາຍເຖິງບໍ່ມີງວດຕໍ່ໄປ */
export const CYCLE_MONTHS: Record<BillingCycle, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
  one_time: 0,
}

export const SUB_STATUSES = ['active', 'cancelled', 'expired'] as const
export type SubStatus = (typeof SUB_STATUSES)[number]

export const SUB_STATUS_LABEL_LO: Record<SubStatus, string> = {
  active: 'ໃຊ້ງານຢູ່',
  cancelled: 'ຍົກເລີກແລ້ວ',
  expired: 'ໝົດອາຍຸແລ້ວ',
}

export const SUB_STATUS_STYLE: Record<SubStatus, string> = {
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  cancelled: 'bg-slate-100 text-muted dark:bg-white/5',
  expired: 'bg-slate-200 text-body dark:bg-slate-800',
}

/** ສະຖານະກຳນົດຈ່າຍ — ຄິດຢູ່ view `it.v_subscriptions` ບໍ່ແມ່ນຄໍລຳໃນຕາຕະລາງ */
export const DUE_STATUSES = ['overdue', 'due_soon', 'ok', 'unknown', 'inactive'] as const
export type DueStatus = (typeof DUE_STATUSES)[number]

export const DUE_STATUS_LABEL_LO: Record<DueStatus, string> = {
  overdue: 'ເລີຍກຳນົດແລ້ວ',
  due_soon: 'ໃກ້ຮອດກຳນົດ',
  ok: 'ຍັງບໍ່ຮອດກຳນົດ',
  unknown: 'ບໍ່ໄດ້ລະບຸກຳນົດ',
  inactive: 'ບໍ່ໄດ້ໃຊ້ງານ',
}

export const DUE_STATUS_STYLE: Record<DueStatus, string> = {
  overdue: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  due_soon: 'bg-brand-orange/20 text-brand-orange',
  ok: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  unknown: 'bg-brand-navy/10 text-muted dark:bg-white/5',
  inactive: 'bg-slate-100 text-muted dark:bg-white/5',
}

export const PERIOD_STATUSES = ['unpaid', 'paid', 'waived'] as const
export type PeriodStatus = (typeof PERIOD_STATUSES)[number]

export const PERIOD_STATUS_LABEL_LO: Record<PeriodStatus, string> = {
  unpaid: 'ຍັງບໍ່ຈ່າຍ',
  paid: 'ຈ່າຍແລ້ວ',
  waived: 'ບໍ່ຕ້ອງຈ່າຍ',
}

export const PERIOD_STATUS_STYLE: Record<PeriodStatus, string> = {
  unpaid: 'bg-brand-orange/20 text-brand-orange',
  paid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  waived: 'bg-slate-100 text-muted dark:bg-white/5',
}

/** ສະກຸນເງິນທີ່ຮັບໄດ້ — ຊຸດດຽວກັບໃບສະເໜີຊື້ */
export const SUB_CURRENCIES = ['LAK', 'THB', 'USD', 'CNY'] as const
export type SubCurrency = (typeof SUB_CURRENCIES)[number]

/** ເຕືອນລ່ວງໜ້າກີ່ມື້ — 0 ໝາຍເຖິງມື້ຮອດກຳນົດພໍດີ */
export const REMINDER_DAYS = [30, 7, 1, 0] as const

/** ຄີຂອງການເຕືອນຫຼັງເລີຍກຳນົດ — ເຕືອນເທື່ອດຽວຕໍ່ 1 ກຳນົດຈ່າຍ */
export const OVERDUE_REMINDER_KEY = -1

export type SubscriptionRow = {
  id: string
  code: string
  category: SubCategory
  service_name: string
  vendor: string | null
  plan_name: string | null
  account_ref: string | null
  admin_url: string | null
  billing_cycle: BillingCycle
  amount: string
  currency: SubCurrency
  start_date: string | Date
  end_date: string | Date | null
  next_due_date: string | Date | null
  auto_renew: boolean
  owner_employee_id: number | null
  owner_name: string | null
  owner_nickname: string | null
  department_code: string | null
  department_name: string | null
  status: SubStatus
  cancelled_at: string | Date | null
  cancel_reason: string | null
  note: string | null
  created_by: number
  created_by_name: string | null
  created_at: string
  updated_at: string
  monthly_amount: string
  yearly_amount: string
  days_to_due: number | null
  due_status: DueStatus
  period_count: string
  unpaid_count: string
  paid_total: string
  last_paid_at: string | Date | null
  vendor_id: string | null
  vendor_name: string | null
}

export type SubscriptionPeriodRow = {
  id: string
  subscription_id: string
  subscription_code: string
  service_name: string
  category: SubCategory
  vendor: string | null
  department_code: string | null
  period_start: string | Date
  period_end: string | Date
  due_date: string | Date
  amount: string
  currency: SubCurrency
  status: PeriodStatus
  paid_at: string | Date | null
  invoice_no: string | null
  note: string | null
  created_by: number
  created_by_name: string | null
  created_at: string
  is_overdue: boolean
}

/** ຄ່າໃຊ້ຈ່າຍຕໍ່ເດືອນຂອງຮອບຈ່າຍໃດກໍໄດ້ — ຈ່າຍເທື່ອດຽວບໍ່ນັບເປັນຄ່າປະຈຳ */
export function monthlyCost(amount: number, cycle: BillingCycle): number {
  const months = CYCLE_MONTHS[cycle]
  if (!months) return 0
  return amount / months
}

/**
 * ບວກເດືອນໃສ່ວັນທີແບບ yyyy-MM-dd
 *
 * ຄິດດ້ວຍ UTC ເພື່ອບໍ່ໃຫ້ເຂດເວລາຂອງເຄື່ອງເລື່ອນວັນ ແລະ ຕັດວັນທ້າຍເດືອນລົງ
 * ໃຫ້ພໍດີເດືອນສັ້ນ — 31 ມັງກອນ + 1 ເດືອນ = 28/29 ກຸມພາ ບໍ່ແມ່ນ 3 ມີນາ
 */
export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return iso

  const target = new Date(Date.UTC(y, m - 1 + months, 1))
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)
  ).getUTCDate()
  target.setUTCDate(Math.min(d, lastDay))

  return target.toISOString().slice(0, 10)
}

/** ວັນຮອດກຳນົດຂອງງວດຖັດໄປ — null ຖ້າຈ່າຍເທື່ອດຽວ (ບໍ່ມີງວດຕໍ່) */
export function nextDueAfter(iso: string, cycle: BillingCycle): string | null {
  const months = CYCLE_MONTHS[cycle]
  if (!months) return null
  return addMonths(iso, months)
}

/** ວັນສຸດທ້າຍທີ່ງວດນີ້ຄຸ້ມເຖິງ = ມື້ກ່ອນງວດຖັດໄປ */
export function periodEndFor(iso: string, cycle: BillingCycle): string {
  const next = nextDueAfter(iso, cycle)
  if (!next) return iso

  const d = new Date(`${next}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

/**
 * ກຳນົດຈ່າຍຄັ້ງຕໍ່ໄປ ນັບຈາກວັນເລີ່ມສັນຍາ
 *
 * ຈຳເປັນຕອນລົງທະບຽນບໍລິການທີ່ໃຊ້ຢູ່ກ່ອນແລ້ວ — ເຊັ່ນ ອິນເຕີເນັດທີ່ເລີ່ມ
 * ມາ 3 ປີແລ້ວ ຕ້ອງໄດ້ກຳນົດຂອງປີນີ້ ບໍ່ແມ່ນວັນທີ 3 ປີກ່ອນ
 */
export function rollForwardDue(
  startIso: string,
  cycle: BillingCycle,
  todayIso: string
): string {
  const months = CYCLE_MONTHS[cycle]
  if (!months) return startIso.slice(0, 10)

  let due = startIso.slice(0, 10)
  // 40 ຮອບພຽງພໍສຳລັບ 40 ປີແບບລາຍປີ — ໃສ່ຂອບໄວ້ກັນວົນບໍ່ຮູ້ຈົບ
  for (let i = 0; i < 480 && due < todayIso; i++) {
    due = addMonths(due, months)
  }
  return due
}

/** ຈຳນວນເງິນພ້ອມສະກຸນ — ຫຼາຍສະກຸນປົນກັນ ຈຶ່ງຕ້ອງຂຽນສະກຸນທຸກບ່ອນ */
export function formatAmount(value: string | number | null, currency: string): string {
  if (value === null || value === '') return '—'
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return `${n.toLocaleString('lo-LA', { maximumFractionDigits: 2 })} ${currency}`
}

export function isSubCategory(value: string): value is SubCategory {
  return (SUB_CATEGORIES as readonly string[]).includes(value)
}

export function isBillingCycle(value: string): value is BillingCycle {
  return (BILLING_CYCLES as readonly string[]).includes(value)
}

export function isSubCurrency(value: string): value is SubCurrency {
  return (SUB_CURRENCIES as readonly string[]).includes(value)
}

export function isPeriodStatus(value: string): value is PeriodStatus {
  return (PERIOD_STATUSES as readonly string[]).includes(value)
}

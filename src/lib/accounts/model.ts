/**
 * ທະບຽນບັນຊີຜູ້ໃຊ້ + ຂັ້ນຕອນຮັບພະນັກງານເຂົ້າ/ອອກ
 * ຄ່າຄົງທີ່ໃຊ້ໄດ້ທັງ server ແລະ client — ຕ້ອງກົງກັບ 044_accounts_onboarding.sql
 */

export const SYSTEM_KINDS = [
  'email',
  'erp',
  'vpn',
  'wifi',
  'app',
  'server',
  'other',
] as const

export type SystemKind = (typeof SYSTEM_KINDS)[number]

export const SYSTEM_KIND_LABEL_LO: Record<SystemKind, string> = {
  email: 'ອີເມວ',
  erp: 'ລະບົບ ERP',
  vpn: 'VPN',
  wifi: 'Wi-Fi',
  app: 'ແອັບ / ບໍລິການ',
  server: 'ເຄື່ອງແມ່ຂ່າຍ',
  other: 'ອື່ນໆ',
}

export const ACCOUNT_STATUSES = ['active', 'suspended', 'closed'] as const
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number]

export const ACCOUNT_STATUS_LABEL_LO: Record<AccountStatus, string> = {
  active: 'ໃຊ້ງານຢູ່',
  suspended: 'ພັກໄວ້',
  closed: 'ປິດແລ້ວ',
}

export const ACCOUNT_STATUS_STYLE: Record<AccountStatus, string> = {
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  suspended: 'bg-brand-orange/20 text-brand-orange',
  closed: 'bg-slate-100 text-muted dark:bg-white/5',
}

/** ສະຖານະຄົນຜູ້ນີ້ໃນທະບຽນ HR — ຄິດຢູ່ view ດຽວກັບຂອງອຸປະກອນ */
export const HR_STATE_LABEL_LO: Record<string, string> = {
  active: 'ຍັງເຮັດວຽກຢູ່',
  resigned: 'ລາອອກແລ້ວ',
  not_in_hr: 'ບໍ່ພົບໃນທະບຽນ HR',
}

export const CHECKLIST_KINDS = ['onboard', 'offboard'] as const
export type ChecklistKind = (typeof CHECKLIST_KINDS)[number]

export const CHECKLIST_KIND_LABEL_LO: Record<ChecklistKind, string> = {
  onboard: 'ຮັບພະນັກງານເຂົ້າ',
  offboard: 'ພະນັກງານອອກ',
}

export const CHECKLIST_KIND_STYLE: Record<ChecklistKind, string> = {
  onboard: 'bg-brand-sky/20 text-brand-navy dark:text-brand-sky',
  offboard: 'bg-brand-orange/20 text-brand-orange',
}

export const CHECKLIST_STATUSES = ['open', 'done', 'cancelled'] as const
export type ChecklistStatus = (typeof CHECKLIST_STATUSES)[number]

export const CHECKLIST_STATUS_LABEL_LO: Record<ChecklistStatus, string> = {
  open: 'ກຳລັງເຮັດ',
  done: 'ຄົບແລ້ວ',
  cancelled: 'ຍົກເລີກ',
}

export type AccountSystem = {
  code: string
  name: string
  kind: SystemKind
  subscription_id: string | null
  subscription_name: string | null
  subscription_amount: string | null
  subscription_currency: string | null
  billing_cycle: string | null
  seat_limit: number | null
  owner_employee_id: number | null
  owner_name: string | null
  note: string | null
  is_active: boolean
  created_at: string
  active_count: string
  closable_count: string
  seats_free: number | null
}

export type SystemAccount = {
  id: string
  system_code: string
  system_name: string
  kind: SystemKind
  employee_id: number
  employee_code: string | null
  employee_name: string | null
  department_code: string | null
  department_name: string | null
  employment_status: string | null
  username: string
  status: AccountStatus
  granted_at: string | Date
  closed_at: string | Date | null
  note: string | null
  created_by: number
  created_at: string
  should_close: boolean
  hr_state: 'active' | 'resigned' | 'not_in_hr'
}

export type EmployeeChecklist = {
  id: string
  employee_id: number
  employee_code: string | null
  employee_name: string | null
  department_code: string | null
  department_name: string | null
  employment_status: string | null
  kind: ChecklistKind
  status: ChecklistStatus
  started_at: string | Date
  target_date: string | Date | null
  completed_at: string | Date | null
  note: string | null
  created_by: number
  created_by_name: string | null
  created_at: string
  updated_at: string
  item_count: string
  done_count: string
  percent_done: number
  is_late: boolean
}

export type ChecklistItem = {
  id: string
  checklist_id: string
  sort_order: number
  title: string
  hint: string | null
  is_done: boolean
  done_by: number | null
  done_at: string | null
  note: string | null
}

export function isSystemKind(value: string): value is SystemKind {
  return (SYSTEM_KINDS as readonly string[]).includes(value)
}

export function isAccountStatus(value: string): value is AccountStatus {
  return (ACCOUNT_STATUSES as readonly string[]).includes(value)
}

export function isChecklistKind(value: string): value is ChecklistKind {
  return (CHECKLIST_KINDS as readonly string[]).includes(value)
}

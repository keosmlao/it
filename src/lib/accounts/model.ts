/**
 * ທະບຽນບັນຊີຜູ້ໃຊ້
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

export function isSystemKind(value: string): value is SystemKind {
  return (SYSTEM_KINDS as readonly string[]).includes(value)
}

export function isAccountStatus(value: string): value is AccountStatus {
  return (ACCOUNT_STATUSES as readonly string[]).includes(value)
}

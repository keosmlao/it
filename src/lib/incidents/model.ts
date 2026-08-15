/**
 * ບັນທຶກເຫດຂັດຂ້ອງຂອງລະບົບ — ຄ່າຄົງທີ່ໃຊ້ໄດ້ທັງ server ແລະ client
 *
 * ຄ່າຕ້ອງກົງກັບ check constraint ຂອງ db/migrations/043_incidents.sql
 */

export const INCIDENT_SERVICES = [
  'internet',
  'power',
  'erp',
  'mail',
  'network',
  'server',
  'cloud',
  'phone',
  'cctv',
  'other',
] as const

export type IncidentService = (typeof INCIDENT_SERVICES)[number]

export const INCIDENT_SERVICE_LABEL_LO: Record<IncidentService, string> = {
  internet: 'ອິນເຕີເນັດ',
  power: 'ໄຟຟ້າ',
  erp: 'ລະບົບ ERP',
  mail: 'ອີເມວ',
  network: 'ເຄືອຂ່າຍພາຍໃນ',
  server: 'ເຄື່ອງແມ່ຂ່າຍ',
  cloud: 'ບໍລິການ cloud',
  phone: 'ໂທລະສັບ',
  cctv: 'ກ້ອງວົງຈອນປິດ',
  other: 'ອື່ນໆ',
}

export const INCIDENT_SEVERITIES = ['critical', 'major', 'minor'] as const
export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number]

export const SEVERITY_LABEL_LO: Record<IncidentSeverity, string> = {
  critical: 'ຮ້າຍແຮງ — ໃຊ້ບໍ່ໄດ້ທັງໝົດ',
  major: 'ໜັກ — ກະທົບຫຼາຍຄົນ',
  minor: 'ເບົາ — ກະທົບບາງສ່ວນ',
}

export const SEVERITY_SHORT_LO: Record<IncidentSeverity, string> = {
  critical: 'ຮ້າຍແຮງ',
  major: 'ໜັກ',
  minor: 'ເບົາ',
}

export const SEVERITY_STYLE: Record<IncidentSeverity, string> = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  major: 'bg-brand-orange/20 text-brand-orange',
  minor: 'bg-brand-navy/10 text-muted dark:bg-white/5',
}

export const INCIDENT_STATUSES = ['open', 'resolved'] as const
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number]

export const INCIDENT_STATUS_LABEL_LO: Record<IncidentStatus, string> = {
  open: 'ຍັງບໍ່ຈົບ',
  resolved: 'ແກ້ໄຂແລ້ວ',
}

export const INCIDENT_STATUS_STYLE: Record<IncidentStatus, string> = {
  open: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  resolved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
}

export type IncidentRow = {
  id: string
  code: string
  title: string
  service: IncidentService
  subscription_id: string | null
  subscription_name: string | null
  asset_code: string | null
  asset_name: string | null
  severity: IncidentSeverity
  impact: string | null
  started_at: string
  resolved_at: string | null
  cause: string | null
  action: string | null
  prevention: string | null
  status: IncidentStatus
  ticket_id: string | null
  ticket_no: string | null
  reported_by: string | null
  created_by: number
  created_by_name: string | null
  created_at: string
  updated_at: string
  minutes: number
  month: string
}

export function isIncidentService(value: string): value is IncidentService {
  return (INCIDENT_SERVICES as readonly string[]).includes(value)
}

export function isIncidentSeverity(value: string): value is IncidentSeverity {
  return (INCIDENT_SEVERITIES as readonly string[]).includes(value)
}

/** ໄລຍະເວລາລົ້ມແບບອ່ານງ່າຍ: "2 ຊມ 15 ນທ" */
export function formatDowntime(minutes: number | null): string {
  if (minutes === null || !Number.isFinite(minutes)) return '—'
  const abs = Math.max(0, Math.round(minutes))
  if (abs < 60) return `${abs} ນທ`

  const hours = Math.floor(abs / 60)
  const rest = abs % 60
  if (hours < 24) return rest ? `${hours} ຊມ ${rest} ນທ` : `${hours} ຊມ`

  const days = Math.floor(hours / 24)
  const restHours = hours % 24
  return restHours ? `${days} ມື້ ${restHours} ຊມ` : `${days} ມື້`
}

/**
 * ຄ່າຕັ້ງຕົ້ນຂອງຊ່ອງ datetime-local — ດຽວນີ້ຕາມເວລາລາວ
 *
 * `toISOString()` ໃຫ້ເວລາ UTC ຈຶ່ງໃຊ້ບໍ່ໄດ້ — ຈະຜິດໄປ 7 ຊົ່ວໂມງ
 */
export function nowLocalInput(): string {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Vientiane',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date())
  return parts.replace(' ', 'T')
}

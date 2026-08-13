/**
 * 5 ບົດບາດທຳອິດ = ພະນັກງານພະແນກ IT (801).
 * `requester` = ພະນັກງານພະແນກອື່ນທີ່ເຂົ້າມາແຈ້ງບັນຫາເອງ — ເຫັນສະເພາະ
 * ticket ຂອງຕົນ ແລະ ເຂົ້າໜ້າພາຍໃນຂອງພະແນກ IT ບໍ່ໄດ້
 */
export const ROLES = [
  'manager',
  'head',
  'developer',
  'support',
  'staff',
  'requester',
] as const

export type Role = (typeof ROLES)[number]

export const UNIT_DEVELOPMENT = '8011'
export const UNIT_SUPPORT = '8010'
export const DEPARTMENT_IT = '801'

export const ROLE_LABEL_LO: Record<Role, string> = {
  manager: 'ຜູ້ຈັດການ',
  head: 'ຫົວໜ້າໜ່ວຍງານ',
  developer: 'ພະນັກງານພັດທະນາ',
  support: 'ພະນັກງານ IT Support',
  staff: 'ພະນັກງານ',
  requester: 'ຜູ້ແຈ້ງບັນຫາ',
}

export type ItStaff = {
  employee_id: number
  employee_code: string
  fullname_lo: string
  nickname: string | null
  unit_code: string | null
  unit_name_lo: string | null
  position_code: string | null
  position_name_lo: string | null
  role: Role
  is_it_staff: boolean
  department_code: string | null
  department_name: string | null
  unread_count?: number
}

/** Every permission decision in the app routes through this one object. */
export const can = {
  /** ເຂົ້າໜ້າພາຍໃນຂອງພະແນກ IT ໄດ້ບໍ (ບັງຄັບຢູ່ (app)/layout.tsx) */
  useStaffArea: (u: ItStaff) => u.role !== 'requester',

  /** ເບິ່ງຂໍ້ມູນທັງພະແນກ (ບໍ່ຈຳກັດໜ່ວຍງານ) */
  viewAllUnits: (u: ItStaff) => u.role === 'manager',

  /** ເບິ່ງໜ່ວຍງານໃດແດ່ — null ໝາຍເຖິງທັງໝົດ, [] ໝາຍເຖິງບໍ່ເຫັນຜ່ານໜ່ວຍງານ */
  visibleUnits: (u: ItStaff): string[] | null =>
    u.role === 'manager' ? null : u.role === 'requester' ? [] : u.unit_code ? [u.unit_code] : [],

  /** ມອບໝາຍວຽກໃຫ້ຄົນອື່ນ */
  assignWork: (u: ItStaff) => u.role === 'manager' || u.role === 'head',

  /** ອະນຸມັດຄຳຮ້ອງ */
  approve: (u: ItStaff) => u.role === 'manager' || u.role === 'head',

  /** ຈັດການສິດຜູ້ໃຊ້ ແລະ ຕັ້ງຄ່າລະບົບ */
  administer: (u: ItStaff) => u.role === 'manager',

  /** ເບິ່ງລາຍງານ KPI ຂອງທັງພະແນກ */
  viewReports: (u: ItStaff) => u.role === 'manager' || u.role === 'head',
}

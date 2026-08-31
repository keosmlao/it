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

/**
 * ລາຍການສິດທີ່ຕັ້ງລາຍຄົນໄດ້.
 *
 * ທຸກຂໍ້ໃນນີ້ຖືກບັງຄັບໃຊ້ຈິງໃນ server action ຫຼື ໜ້າເວັບ —
 * ບໍ່ມີຂໍ້ໃດເປັນພຽງປ້າຍປະດັບ. ຖ້າຈະເພີ່ມຂໍ້ໃໝ່ ຕ້ອງມີບ່ອນກວດຈິງກ່ອນ.
 */
export const PERMISSIONS = [
  'useStaffArea',
  'viewAllUnits',
  'assignWork',
  'approve',
  'viewReports',
  'manageAssets',
  'manageSubscriptions',
  'manageAccounts',
  'administer',
] as const

export type Permission = (typeof PERMISSIONS)[number]

export const PERMISSION_LABEL_LO: Record<Permission, string> = {
  useStaffArea: 'ເຂົ້າໜ້າພາຍໃນພະແນກ IT',
  viewAllUnits: 'ເບິ່ງຂໍ້ມູນທຸກໜ່ວຍງານ',
  assignWork: 'ມອບໝາຍວຽກໃຫ້ຄົນອື່ນ',
  approve: 'ອະນຸມັດຄຳຮ້ອງ / ຕັດຈຳໜ່າຍ',
  viewReports: 'ເບິ່ງລາຍງານ KPI',
  manageAssets: 'ບັນທຶກຢືມ–ຄືນ ແລະ ແກ້ທະບຽນອຸປະກອນ',
  manageSubscriptions: 'ຈັດການສັນຍາເຊົ່າບໍລິການ ແລະ ບັນທຶກການຈ່າຍ',
  manageAccounts: 'ຈັດການບັນຊີຜູ້ໃຊ້ ແລະ ຂັ້ນຕອນຮັບເຂົ້າ–ອອກ',
  administer: 'ຕັ້ງຄ່າລະບົບ ແລະ ຈັດການສິດ',
}

/** ຊື່ສັ້ນສຳລັບຫົວຕາຕະລາງ */
export const PERMISSION_SHORT_LO: Record<Permission, string> = {
  useStaffArea: 'ເຂົ້າລະບົບ IT',
  viewAllUnits: 'ທຸກໜ່ວຍງານ',
  assignWork: 'ມອບວຽກ',
  approve: 'ອະນຸມັດ',
  viewReports: 'ລາຍງານ',
  manageAssets: 'ອຸປະກອນ',
  manageSubscriptions: 'ຄ່າເຊົ່າ',
  manageAccounts: 'ບັນຊີຜູ້ໃຊ້',
  administer: 'ຕັ້ງຄ່າລະບົບ',
}

export const PERMISSION_HINT_LO: Record<Permission, string> = {
  useStaffArea: 'ປິດແລ້ວຈະເຫັນສະເພາະໜ້າ /my ຄືພະນັກງານພະແນກອື່ນ',
  viewAllUnits: 'ປົກກະຕິເຫັນສະເພາະໜ່ວຍງານຕົນເອງ',
  assignWork: 'ມອບ ticket ຫຼື ວຽກໃຫ້ຄົນອື່ນ ນອກຈາກຕົນເອງ',
  approve: 'ອະນຸມັດ/ປະຕິເສດຄຳຮ້ອງ ແລະ ຕັດຈຳໜ່າຍອຸປະກອນ',
  viewReports: 'ໜ້າລາຍງານ ແລະ ແຜນວຽກທັງທີມ',
  manageAssets: 'ຢືມ, ຄືນ, ໂອນ, ແກ້ spec, ບັນທຶກການສ້ອມ',
  manageSubscriptions: 'ລົງທະບຽນ, ແກ້, ຕໍ່ອາຍຸ ແລະ ບັນທຶກການຈ່າຍຄ່າເຊົ່າ',
  manageAccounts: 'ເປີດ–ປິດບັນຊີ ແລະ ຈັດການລະບົບທີ່ມີບັນຊີ',
  administer: 'ໃຫ້ດ້ວຍຄວາມລະມັດລະວັງ — ຕັ້ງສິດຄົນອື່ນໄດ້',
}

/** ສິດຕາມບົດບາດ ເມື່ອຍັງບໍ່ໄດ້ຕັ້ງລາຍຄົນ */
const ROLE_DEFAULT: Record<Permission, (role: Role) => boolean> = {
  useStaffArea: (r) => r !== 'requester',
  viewAllUnits: (r) => r === 'manager',
  assignWork: (r) => r === 'manager' || r === 'head',
  approve: (r) => r === 'manager' || r === 'head',
  viewReports: (r) => r === 'manager' || r === 'head',
  manageAssets: (r) => r !== 'requester',
  // ສັນຍາເຊົ່າຜູກກັບເງິນ ແລະ ບໍລິການທີ່ລົ້ມແລ້ວກະທົບທັງບໍລິສັດ —
  // ຕັ້ງຕົ້ນໃຫ້ສະເພາະລະດັບບໍລິຫານ ຄົນອື່ນເປີດໃຫ້ລາຍຄົນໄດ້ຢູ່ໜ້າຕັ້ງຄ່າ
  manageSubscriptions: (r) => r === 'manager' || r === 'head',
  // ບັນຊີຜູ້ໃຊ້ຄືກະແຈເຂົ້າທຸກລະບົບ — ໃຫ້ຄົນທີ່ຮັບຜິດຊອບແທ້ ບໍ່ແມ່ນທຸກຄົນ
  manageAccounts: (r) => r === 'manager' || r === 'head',
  administer: (r) => r === 'manager',
}

/** ການກະທຳຕໍ່ຂໍ້ມູນ ທີ່ຕັ້ງໄດ້ເປັນລາຍຄົນ */
export const MODULE_ACTIONS = ['view', 'create', 'edit', 'delete'] as const
export type ModuleAction = (typeof MODULE_ACTIONS)[number]

export const MODULE_ACTION_LABEL_LO: Record<ModuleAction, string> = {
  view: 'ເບິ່ງ',
  create: 'ເພີ່ມ',
  edit: 'ແກ້ໄຂ',
  delete: 'ລົບ',
}

export const MODULE_ACTION_HINT_LO: Record<ModuleAction, string> = {
  view: 'ປິດແລ້ວເມນູຫາຍ ແລະ ເຂົ້າ URL ກົງກໍ່ຖືກດີດອອກ',
  create: 'ສ້າງລາຍການໃໝ່ໃນໂມດູນນີ້',
  edit: 'ແກ້ຂໍ້ມູນ ຫຼື ປ່ຽນສະຖານະລາຍການທີ່ມີຢູ່',
  delete: 'ລຶບ ຫຼື ຍົກເລີກລາຍການ',
}

/**
 * ໂມດູນທີ່ມີຂໍ້ມູນໃຫ້ຈັດການ — ຜູ້ຈັດການຕັ້ງໄດ້ວ່າໃຜ ເບິ່ງ/ເພີ່ມ/ແກ້/ລົບ ໄດ້
 *
 * `base` ຄືສິດເດີມທີ່ໂມດູນນັ້ນເຄີຍໃຊ້ — ເອົາມາເປັນ **ຄ່າຕັ້ງຕົ້ນ** ຈຶ່ງ
 * ບໍ່ມີໃຜເສຍ ຫຼື ໄດ້ສິດເພີ່ມໃນມື້ທີ່ເປີດໃຊ້ລະບົບໃໝ່ນີ້. ຢາກໃຫ້ໃຜເຮັດ
 * ຫຍັງໄດ້ຕ່າງຈາກບົດບາດ ຜູ້ຈັດການຕັ້ງເອງຢູ່ໜ້າ **ຕັ້ງຄ່າລະບົບ → ຈັດການສິດ**
 *
 * `staff` = ພະນັກງານ IT ທຸກຄົນ (ບໍ່ລວມຜູ້ແຈ້ງບັນຫາ)
 * `del`   = ສິດຕັ້ງຕົ້ນສະເພາະການລຶບ ເມື່ອຄວນເຄັ່ງກວ່າການແກ້
 */
export const MODULES = [
  { code: 'tickets', label: 'Ticket ແຈ້ງບັນຫາ', path: '/tickets', base: 'staff', del: 'administer' },
  { code: 'requests', label: 'ຄຳຮ້ອງ & ອະນຸມັດ', path: '/requests', base: 'staff' },
  { code: 'purchase', label: 'ໃບສະເໜີຊື້ (PR)', path: '/purchase', base: 'staff' },
  { code: 'assets', label: 'ທະບຽນອຸປະກອນ', path: '/assets', base: 'manageAssets' },
  { code: 'consumables', label: 'ອຸປະກອນສິ້ນເປືອງ', path: '/consumables', base: 'manageAssets' },
  { code: 'maintenance', label: 'ບຳລຸງຮັກສາຕາມແຜນ', path: '/maintenance', base: 'manageAssets' },
  { code: 'incidents', label: 'ເຫດຂັດຂ້ອງລະບົບ', path: '/incidents', base: 'manageAssets' },
  { code: 'network', label: 'ເຄືອຂ່າຍ & IP', path: '/network', base: 'manageAssets' },
  { code: 'subscriptions', label: 'ຄ່າເຊົ່າບໍລິການ', path: '/subscriptions', base: 'manageSubscriptions' },
  { code: 'vendors', label: 'ທະບຽນຜູ້ຂາຍ', path: '/vendors', base: 'manageSubscriptions' },
  { code: 'budget', label: 'ງົບປະມານ', path: '/budget', base: 'manageSubscriptions' },
  { code: 'accounts', label: 'ບັນຊີຜູ້ໃຊ້', path: '/accounts', base: 'manageAccounts' },
  { code: 'projects', label: 'ໂປຣເຈັກ', path: '/projects', base: 'staff' },
  { code: 'kb', label: 'ຄັງຄວາມຮູ້', path: '/kb', base: 'staff' },
] as const

export type ModuleCode = (typeof MODULES)[number]['code']
export type ModulePermission = `${ModuleCode}.${ModuleAction}`

const MODULE_BY_CODE = new Map(MODULES.map((m) => [m.code as ModuleCode, m]))

export function moduleLabel(code: ModuleCode): string {
  return MODULE_BY_CODE.get(code)?.label ?? code
}

/** ສິດຕັ້ງຕົ້ນຂອງໂມດູນຕາມບົດບາດ — ບໍ່ນັບການຕັ້ງລາຍຄົນ */
export function roleAllowsModule(
  role: Role,
  code: ModuleCode,
  action: ModuleAction
): boolean {
  if (role === 'requester') return false
  // ເບິ່ງໄດ້ໝົດຄືເກົ່າ — ຜູ້ຈັດການປິດເປັນລາຍຄົນເອົາເອງ
  if (action === 'view') return true

  const m = MODULE_BY_CODE.get(code)
  if (!m) return false

  const base = action === 'delete' && 'del' in m ? m.del : m.base
  return base === 'staff' ? true : roleAllows(role, base as Permission)
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
  /** ສິດທີ່ຕັ້ງລາຍຄົນ — ຂໍ້ທີ່ບໍ່ມີໃນນີ້ຈະຄິດຕາມບົດບາດ */
  permissions?: Partial<Record<Permission | ModulePermission, boolean>> | null
}

/** ສິດຕາມບົດບາດຢ່າງດຽວ — ໃຊ້ໃນໜ້າຈັດການສິດເພື່ອສະແດງຄ່າຕັ້ງຕົ້ນ */
export function roleAllows(role: Role, permission: Permission): boolean {
  return ROLE_DEFAULT[permission](role)
}

/**
 * ຄ່າທີ່ໃຊ້ຈິງ: ຖ້າມີການຕັ້ງລາຍຄົນໃຫ້ຖືເອົາອັນນັ້ນ (ທັງເປີດ ແລະ ຫ້າມ)
 * ບໍ່ດັ່ງນັ້ນຈຶ່ງຄິດຕາມບົດບາດ
 */
export function allows(u: ItStaff, permission: Permission): boolean {
  const override = u.permissions?.[permission]
  return typeof override === 'boolean' ? override : roleAllows(u.role, permission)
}

/** Every permission decision in the app routes through this one object. */
export const can = {
  /** ເຂົ້າໜ້າພາຍໃນຂອງພະແນກ IT ໄດ້ບໍ (ບັງຄັບຢູ່ (app)/layout.tsx) */
  useStaffArea: (u: ItStaff) => allows(u, 'useStaffArea'),

  /** ເບິ່ງຂໍ້ມູນທັງພະແນກ (ບໍ່ຈຳກັດໜ່ວຍງານ) */
  viewAllUnits: (u: ItStaff) => allows(u, 'viewAllUnits'),

  /** ເບິ່ງໜ່ວຍງານໃດແດ່ — null ໝາຍເຖິງທັງໝົດ, [] ໝາຍເຖິງບໍ່ເຫັນຜ່ານໜ່ວຍງານ */
  visibleUnits: (u: ItStaff): string[] | null =>
    can.viewAllUnits(u)
      ? null
      : !can.useStaffArea(u)
        ? []
        : u.unit_code
          ? [u.unit_code]
          : [],

  /** ມອບໝາຍວຽກໃຫ້ຄົນອື່ນ */
  assignWork: (u: ItStaff) => allows(u, 'assignWork'),

  /** ອະນຸມັດຄຳຮ້ອງ */
  approve: (u: ItStaff) => allows(u, 'approve'),

  /** ຈັດການສິດຜູ້ໃຊ້ ແລະ ຕັ້ງຄ່າລະບົບ */
  administer: (u: ItStaff) => allows(u, 'administer'),

  /** ເບິ່ງລາຍງານ KPI ຂອງທັງພະແນກ */
  viewReports: (u: ItStaff) => allows(u, 'viewReports'),

  /** ບັນທຶກຢືມ–ຄືນ, ໂອນຜູ້ຖືຄອງ, ແກ້ spec ແລະ ການສ້ອມ */
  manageAssets: (u: ItStaff) => allows(u, 'manageAssets'),

  /** ລົງທະບຽນ/ແກ້ສັນຍາເຊົ່າບໍລິການ ແລະ ບັນທຶກການຈ່າຍແຕ່ລະງວດ */
  manageSubscriptions: (u: ItStaff) => allows(u, 'manageSubscriptions'),

  /** ເປີດ–ປິດບັນຊີຜູ້ໃຊ້ ແລະ ຈັດການລະບົບທີ່ມີບັນຊີ */
  manageAccounts: (u: ItStaff) => allows(u, 'manageAccounts'),

  /**
   * ເຮັດຫຍັງໄດ້ແດ່ໃນໂມດູນໜຶ່ງ — ເບິ່ງ / ເພີ່ມ / ແກ້ໄຂ / ລົບ
   *
   * ເບິ່ງບໍ່ໄດ້ = ເຮັດຫຍັງໃນໂມດູນນັ້ນບໍ່ໄດ້ເລີຍ ເພາະການ ເພີ່ມ/ແກ້/ລົບ
   * ຕ້ອງເປີດໜ້ານັ້ນກ່ອນສະເໝີ — ກັນການຕັ້ງທີ່ຂັດກັນເອງ
   */
  module: (u: ItStaff, code: ModuleCode, action: ModuleAction): boolean => {
    if (!can.useStaffArea(u)) return false

    const decide = (a: ModuleAction) => {
      const override = u.permissions?.[`${code}.${a}` as ModulePermission]
      return typeof override === 'boolean'
        ? override
        : roleAllowsModule(u.role, code, a)
    }

    if (action !== 'view' && !decide('view')) return false
    return decide(action)
  },

  /** ເປີດໜ້າຂອງໂມດູນນີ້ໄດ້ບໍ (ໃຊ້ໃນເມນູ ແລະ ດ່ານກວດຂອງແຕ່ລະໜ້າ) */
  viewModule: (u: ItStaff, code: ModuleCode) => can.module(u, code, 'view'),
}

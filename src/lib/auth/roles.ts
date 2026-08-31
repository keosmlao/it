import {
  MENU_BY_KEY,
  roleAllowsMenu,
  type MenuAction,
} from './menu-perms'

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
  permissions?: Partial<Record<string, boolean>> | null
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
   * ເມນູນີ້ ຄົນນີ້ເຮັດຫຍັງໄດ້ແດ່ — ເບິ່ງ / ເພີ່ມ / ແກ້ໄຂ / ລົບ
   *
   * ເບິ່ງບໍ່ໄດ້ = ເຮັດຫຍັງຈາກເມນູນັ້ນບໍ່ໄດ້ເລີຍ ແລະ ເມນູແມ່ປິດ ລູກປິດນຳ
   * — ກັນການຕັ້ງທີ່ຂັດກັນເອງ (ເປີດ "ເພີ່ມ" ໄວ້ ແຕ່ເຂົ້າໜ້າບໍ່ໄດ້)
   */
  menu: (u: ItStaff, key: string, action: MenuAction): boolean => {
    if (!can.useStaffArea(u)) return false

    const decide = (k: string, a: MenuAction) => {
      const override = u.permissions?.[`${k}.${a}`]
      return typeof override === 'boolean'
        ? override
        : roleAllowsMenu(u.role, k, a, roleAllows)
    }

    // ເບິ່ງໄດ້ບໍ — ຕ້ອງຜ່ານທັງເມນູນີ້ ແລະ ເມນູແມ່ຂອງມັນ
    //
    // ຖ້າຜູ້ຈັດການເປີດການກະທຳໃດໜຶ່ງໃຫ້ (ເຊັ່ນ "ເພີ່ມ") ໃຫ້ຖືວ່າເບິ່ງໄດ້ນຳ
    // ບໍ່ດັ່ງນັ້ນຕ້ອງໄປຕິກ "ເບິ່ງ" ອີກຊ່ອງ ຄົນຈຶ່ງລືມ ແລ້ວນຶກວ່າລະບົບເພ —
    // ແຕ່ຖ້າ "ເບິ່ງ" ຖືກຕັ້ງເປັນ ຫ້າມ ໄວ້ຊັດເຈນ ອັນນັ້ນຊະນະສະເໝີ
    const canView = (k: string): boolean => {
      const viewOverride = u.permissions?.[`${k}.view`]
      const openedSomething =
        viewOverride === undefined &&
        (MENU_BY_KEY.get(k)?.actions ?? []).some(
          (a) => a !== 'view' && u.permissions?.[`${k}.${a}`] === true
        )

      if (!(openedSomething || decide(k, 'view'))) return false
      const parent = MENU_BY_KEY.get(k)?.parent
      return parent ? canView(parent) : true
    }

    if (!canView(key)) return false
    return action === 'view' ? true : decide(key, action)
  },

  /** ເປີດເມນູນີ້ໄດ້ບໍ (ໃຊ້ໃນ sidebar ແລະ ດ່ານກວດຂອງແຕ່ລະໜ້າ) */
  viewMenu: (u: ItStaff, key: string) => can.menu(u, key, 'view'),
}

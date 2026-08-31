import type { Permission, Role } from './roles'

/** ການກະທຳທີ່ຕັ້ງໄດ້ໃນແຕ່ລະເມນູ */
export const MENU_ACTIONS = ['view', 'create', 'edit', 'delete'] as const
export type MenuAction = (typeof MENU_ACTIONS)[number]

export const MENU_ACTION_LABEL_LO: Record<MenuAction, string> = {
  view: 'ເບິ່ງ',
  create: 'ເພີ່ມ',
  edit: 'ແກ້ໄຂ',
  delete: 'ລົບ',
}

export const MENU_ACTION_HINT_LO: Record<MenuAction, string> = {
  view: 'ປິດແລ້ວເມນູຫາຍ ແລະ ພິມ URL ເຂົ້າມາກໍ່ຖືກດີດອອກ',
  create: 'ສ້າງລາຍການໃໝ່ຈາກເມນູນີ້',
  edit: 'ແກ້ຂໍ້ມູນ ຫຼື ປ່ຽນສະຖານະຈາກເມນູນີ້',
  delete: 'ລຶບ, ຍົກເລີກ ຫຼື ປິດການໃຊ້ງານ',
}

/** ໃຜເຮັດໄດ້ຕາມບົດບາດ — `staff` = ພະນັກງານ IT ທຸກຄົນ */
type Base = Permission | 'staff'

export type MenuPerm = {
  /** ກະແຈ = href ຂອງເມນູ — ບໍ່ຊ້ຳກັນ ແລະ ເປັນສິ່ງທີ່ຄົນເຫັນຢູ່ໜ້າຈໍ */
  key: string
  label: string
  /** ເມນູແມ່ — ໃຊ້ຈັດຍໍ້ໜ້າ ແລະ ສືບສິດ "ເບິ່ງ" (ແມ່ປິດ ລູກປິດນຳ) */
  parent?: string
  /** ເສັ້ນທາງໜ້າຈິງທີ່ດ່ານກວດໃຊ້ — ບໍ່ໃສ່ = ເປັນພຽງຕົວກັ່ນຕອງຂອງເມນູແມ່ */
  path?: string
  /** ການກະທຳທີ່ເມນູນີ້ມີແທ້ — ຊ່ອງອື່ນຈະສະແດງເປັນ "–" */
  actions: MenuAction[]
  /** ສິດຕັ້ງຕົ້ນຂອງ ເພີ່ມ/ແກ້ໄຂ */
  base: Base
  /** ສິດຕັ້ງຕົ້ນຂອງ ລົບ ເມື່ອຄວນເຄັ່ງກວ່າການແກ້ */
  del?: Base
  /** ສິດຕັ້ງຕົ້ນຂອງ ເບິ່ງ — ບໍ່ໃສ່ = ພະນັກງານ IT ເຫັນໝົດຄືເກົ່າ */
  viewBase?: Base
}

const V: MenuAction[] = ['view']
const VCED: MenuAction[] = ['view', 'create', 'edit', 'delete']
const VCE: MenuAction[] = ['view', 'create', 'edit']
const VE: MenuAction[] = ['view', 'edit']
// ທຸກເມນູຕັ້ງ "ເບິ່ງ" ໄດ້ສະເໝີ — ເປັນຕົວຄຸມວ່າລິ້ງນັ້ນປາກົດຢູ່ບໍ
const C: MenuAction[] = ['view', 'create']

/**
 * ສິດຕໍ່ **ເມນູ** — ຮຽງຕາມລຳດັບທີ່ເຫັນຢູ່ sidebar
 *
 * ຄ່າຕັ້ງຕົ້ນທຸກແຖວຄັດມາຈາກສິດທີ່ໃຊ້ຢູ່ກ່ອນໜ້ານີ້ ຈຶ່ງບໍ່ມີໃຜເສຍ ຫຼື
 * ໄດ້ສິດເພີ່ມໃນມື້ເປີດໃຊ້ — ຜູ້ຈັດການຄ່ອຍປັບເປັນລາຍຄົນເອົາເອງ
 *
 * ມີ test ທຽບລາຍການນີ້ກັບ NAV_GROUPS ຈິງ — ເພີ່ມ/ລຶບເມນູແລ້ວລືມແກ້ທີ່ນີ້
 * ຈະຕົກທັນທີ ບໍ່ແມ່ນຮູ້ຕອນຜູ້ໃຊ້ຈົ່ມ
 */
export const MENU_PERMS: MenuPerm[] = [
  // ---- ສູນຄວບຄຸມ ----
  { key: '/', label: 'ພາບລວມ', path: '/', actions: V, base: 'staff' },
  { key: '/tasks', label: 'ວຽກຂອງຂ້ອຍ', path: '/tasks', actions: VE, base: 'staff' },
  { key: '/plans', label: 'ແຜນວຽກປະຈຳວັນ', path: '/plans', actions: VCED, base: 'staff' },
  { key: '/plans/team', label: 'ແຜນທັງທີມ', parent: '/plans', path: '/plans/team', actions: V, base: 'staff', viewBase: 'viewReports' },
  { key: '/notifications', label: 'ການແຈ້ງເຕືອນ', path: '/notifications', actions: VE, base: 'staff' },

  // ---- ບໍລິການ & ຄຳຮ້ອງ ----
  { key: '/tickets', label: 'Ticket ແຈ້ງບັນຫາ', path: '/tickets', actions: VCED, base: 'staff', del: 'administer' },
  { key: '/tickets?status=open&mine=1', label: 'ຂອງຂ້ອຍ', parent: '/tickets', actions: V, base: 'staff' },
  { key: '/tickets?status=all&overdue=1', label: 'ເກີນ SLA', parent: '/tickets', actions: V, base: 'staff' },
  { key: '/tickets/new', label: 'ແຈ້ງບັນຫາໃໝ່', parent: '/tickets', path: '/tickets/new', actions: C, base: 'staff' },

  { key: '/requests', label: 'ຄຳຮ້ອງ & ອະນຸມັດ', path: '/requests', actions: VCE, base: 'staff' },
  { key: '/requests/new', label: 'ສ້າງຄຳຮ້ອງ', parent: '/requests', path: '/requests/new', actions: C, base: 'staff' },

  { key: '/purchase', label: 'ໃບສະເໜີຊື້ (PR)', path: '/purchase', actions: VCED, base: 'staff' },
  { key: '/purchase?status=all&mine=1', label: 'ຂອງຂ້ອຍ', parent: '/purchase', actions: V, base: 'staff' },
  { key: '/purchase/new', label: 'ສ້າງໃບສະເໜີຊື້', parent: '/purchase', path: '/purchase/new', actions: C, base: 'staff' },

  // ---- ໂຄງລ່າງ & ບໍລິການ ----
  { key: '/subscriptions', label: 'ຄ່າເຊົ່າບໍລິການ', path: '/subscriptions', actions: VCED, base: 'manageSubscriptions' },
  { key: '/subscriptions?due=soon', label: 'ໃກ້ຮອດກຳນົດ', parent: '/subscriptions', actions: V, base: 'staff' },
  { key: '/subscriptions/cost', label: 'ຄ່າໃຊ້ຈ່າຍ', parent: '/subscriptions', path: '/subscriptions/cost', actions: V, base: 'staff' },
  { key: '/subscriptions/new', label: 'ລົງທະບຽນການເຊົ່າ', parent: '/subscriptions', path: '/subscriptions/new', actions: C, base: 'manageSubscriptions', viewBase: 'manageSubscriptions' },

  { key: '/maintenance', label: 'ບຳລຸງຮັກສາຕາມແຜນ', path: '/maintenance', actions: VCED, base: 'manageAssets' },
  { key: '/maintenance?due=soon', label: 'ຮອດກຳນົດ', parent: '/maintenance', actions: V, base: 'staff' },
  { key: '/maintenance/new', label: 'ຕັ້ງແຜນ', parent: '/maintenance', path: '/maintenance/new', actions: C, base: 'manageAssets', viewBase: 'manageAssets' },

  { key: '/incidents', label: 'ເຫດຂັດຂ້ອງລະບົບ', path: '/incidents', actions: VCE, base: 'manageAssets' },
  { key: '/incidents/new', label: 'ບັນທຶກເຫດຂັດຂ້ອງ', parent: '/incidents', path: '/incidents/new', actions: C, base: 'manageAssets', viewBase: 'manageAssets' },

  { key: '/network', label: 'ເຄືອຂ່າຍ & IP', path: '/network', actions: VCED, base: 'manageAssets' },
  { key: '/network/ports', label: 'ຜັງພອດສະວິດ', parent: '/network', path: '/network/ports', actions: VCED, base: 'manageAssets' },

  { key: '/vendors', label: 'ທະບຽນຜູ້ຂາຍ', path: '/vendors', actions: VCE, base: 'manageSubscriptions' },

  // ---- ອຸປະກອນ ----
  { key: '/assets', label: 'ທະບຽນອຸປະກອນ', path: '/assets', actions: VCED, base: 'manageAssets' },
  { key: '/assets?holding=assigned', label: 'ມີຜູ້ຖືຄອງ', parent: '/assets', actions: V, base: 'staff' },
  { key: '/assets?holding=spare', label: 'ຢູ່ໃນສາງ', parent: '/assets', actions: V, base: 'staff' },
  { key: '/assets?holding=it', label: 'ຂອງພະແນກ IT', parent: '/assets', actions: V, base: 'staff' },
  { key: '/assets/new', label: 'ລົງທະບຽນຊັບສິນ', parent: '/assets', path: '/assets/new', actions: C, base: 'manageAssets' },

  { key: '/assets/lend', label: 'ຢືມ–ຄືນ', path: '/assets/lend', actions: VCE, base: 'manageAssets' },
  { key: '/assets/holders', label: 'ຜູ້ຖືຄອງອຸປະກອນ', parent: '/assets/lend', path: '/assets/holders', actions: V, base: 'staff' },
  { key: '/assets/documents', label: 'ເອກະສານຢືມ–ຄືນ', parent: '/assets/lend', path: '/assets/documents', actions: V, base: 'staff' },
  { key: '/assets/movements', label: 'ປະຫວັດຢືມ–ຄືນ', parent: '/assets/lend', path: '/assets/movements', actions: V, base: 'staff' },

  { key: '/assets/damaged', label: 'ສະພາບ & ຕິດຕາມ', path: '/assets/damaged', actions: VE, base: 'manageAssets', del: 'approve' },
  { key: '/assets/recovery', label: 'ທວງຄືນອຸປະກອນ', parent: '/assets/damaged', path: '/assets/recovery', actions: VE, base: 'manageAssets' },
  { key: '/assets/conflicts', label: 'ໃບຢືມທີ່ຂັດກັນ', parent: '/assets/damaged', path: '/assets/conflicts', actions: V, base: 'staff' },
  { key: '/assets/deployed', label: 'ອຸປະກອນສ່ວນກາງ', parent: '/assets/damaged', path: '/assets/deployed', actions: VE, base: 'manageAssets' },
  { key: '/assets/survey', label: 'ສຳຫຼວດອຸປະກອນ', parent: '/assets/damaged', path: '/assets/survey', actions: VE, base: 'manageAssets' },
  { key: '/assets/replacement', label: 'ແຜນປ່ຽນເຄື່ອງ', parent: '/assets/damaged', path: '/assets/replacement', actions: V, base: 'staff' },

  { key: '/consumables', label: 'ອຸປະກອນສິ້ນເປືອງ', path: '/consumables', actions: VCED, base: 'manageAssets' },
  { key: '/consumables?state=low', label: 'ໃກ້ໝົດ / ໝົດ', parent: '/consumables', actions: V, base: 'staff' },
  { key: '/consumables/new', label: 'ເພີ່ມລາຍການ', parent: '/consumables', path: '/consumables/new', actions: C, base: 'manageAssets', viewBase: 'manageAssets' },

  // ---- ໂປຣເຈັກ & ເວລາ ----
  { key: '/projects', label: 'ໂປຣເຈັກ', path: '/projects', actions: VCE, base: 'staff' },
  { key: '/projects/new', label: 'ສ້າງໂປຣເຈັກ', parent: '/projects', path: '/projects/new', actions: C, base: 'assignWork', viewBase: 'assignWork' },
  { key: '/worklogs', label: 'ບັນທຶກຊົ່ວໂມງ', path: '/worklogs', actions: VCED, base: 'staff' },

  // ---- ຄວາມຮູ້ & ບໍລິຫານ ----
  { key: '/kb', label: 'ຄັງຄວາມຮູ້', path: '/kb', actions: VCED, base: 'staff' },
  { key: '/accounts', label: 'ບັນຊີຜູ້ໃຊ້', path: '/accounts', actions: VCE, base: 'manageAccounts' },
  { key: '/accounts?state=closable&status=all', label: 'ບັນຊີທີ່ຄວນປິດ', parent: '/accounts', actions: V, base: 'staff' },
  { key: '/accounts/systems', label: 'ລະບົບທີ່ມີບັນຊີ', parent: '/accounts', path: '/accounts/systems', actions: VCE, base: 'manageAccounts', viewBase: 'manageAccounts' },
  { key: '/budget', label: 'ງົບປະມານ', path: '/budget', actions: VCED, base: 'manageSubscriptions', viewBase: 'viewReports' },
  { key: '/reports', label: 'ລາຍງານ', path: '/reports', actions: V, base: 'staff', viewBase: 'viewReports' },
  { key: '/admin', label: 'ຕັ້ງຄ່າລະບົບ', path: '/admin', actions: VE, base: 'administer', viewBase: 'administer' },
  { key: '/admin/security', label: 'ກວດຄວາມປອດໄພ', parent: '/admin', path: '/admin/security', actions: V, base: 'administer', viewBase: 'administer' },
  { key: '/admin/emails', label: 'ອີເມວແຈ້ງເຕືອນ', parent: '/admin', path: '/admin/emails', actions: VCED, base: 'administer', viewBase: 'administer' },
]

export const MENU_BY_KEY = new Map(MENU_PERMS.map((m) => [m.key, m]))

/**
 * ເມນູທີ່ຄຸມເສັ້ນທາງນີ້ — ເອົາອັນທີ່ຍາວທີ່ສຸດທີ່ຂຶ້ນຕົ້ນຄືກັນ
 * ເຊັ່ນ `/assets/holders/18019` → ເມນູ `/assets/holders`
 */
export function menuForPath(pathname: string): MenuPerm | undefined {
  let best: MenuPerm | undefined
  for (const m of MENU_PERMS) {
    if (!m.path) continue
    if (m.path === '/' ? pathname === '/' : pathname.startsWith(m.path)) {
      if (!best || (m.path?.length ?? 0) > (best.path?.length ?? 0)) best = m
    }
  }
  return best
}

/** ສິດຕັ້ງຕົ້ນຂອງເມນູຕາມບົດບາດ — ບໍ່ນັບການຕັ້ງລາຍຄົນ */
export function roleAllowsMenu(
  role: Role,
  key: string,
  action: MenuAction,
  roleAllows: (role: Role, p: Permission) => boolean
): boolean {
  if (role === 'requester') return false

  const m = MENU_BY_KEY.get(key)
  if (!m) return false
  if (!m.actions.includes(action)) return false

  const base: Base =
    action === 'view'
      ? (m.viewBase ?? 'staff')
      : action === 'delete'
        ? (m.del ?? m.base)
        : m.base

  return base === 'staff' ? true : roleAllows(role, base)
}

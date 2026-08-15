import { NAV_GROUPS, type NavItem } from '../nav-config'
import { PERMISSIONS, type ItStaff, type Permission } from '@/lib/auth/roles'

/**
 * ຫາວ່າສິດແຕ່ລະຂໍ້ຄຸມເມນູໃດແດ່
 *
 * ຄິດຈາກ NAV_GROUPS ຈິງ ດ້ວຍການລອງສ້າງຜູ້ໃຊ້ 2 ຄົນ (ເປີດສິດ / ປິດສິດ)
 * ແລ້ວທຽບວ່າເມນູໃດຫາຍໄປ — ບໍ່ພິມລາຍຊື່ໄວ້ຕາຍຕົວ ເພາະຖ້າພິມໄວ້
 * ມັນຈະບໍ່ກົງກັບຄວາມຈິງທັນທີທີ່ມີຄົນແກ້ເມນູ
 */
function probeUser(overrides: Partial<Record<Permission, boolean>>): ItStaff {
  return {
    employee_id: 0,
    employee_code: '',
    fullname_lo: '',
    nickname: null,
    unit_code: '8010',
    unit_name_lo: null,
    position_code: null,
    position_name_lo: null,
    role: 'staff',
    is_it_staff: true,
    department_code: '801',
    department_name: null,
    permissions: overrides,
  }
}

const ALL_ALLOWED = Object.fromEntries(
  PERMISSIONS.map((p) => [p, true])
) as Record<Permission, boolean>

function visibleLabels(user: ItStaff): Set<string> {
  const found = new Set<string>()

  const walk = (items: NavItem[], parent?: string) => {
    for (const item of items) {
      if (item.visible && !item.visible(user)) continue
      found.add(parent ? `${parent} › ${item.label}` : item.label)
      if (item.children) walk(item.children, item.label)
    }
  }

  for (const group of NAV_GROUPS) walk(group.items)
  return found
}

/** ຜົນທີ່ບໍ່ໄດ້ຢູ່ໃນເມນູ — ເປັນປຸ່ມ ຫຼື ການກັ່ນຂໍ້ມູນໃນໜ້າ */
const OFF_MENU: Record<Permission, string[]> = {
  useStaffArea: ['ທຸກໜ້າໃນພະແນກ IT (ປິດແລ້ວເຫັນສະເພາະ /my)'],
  viewAllUnits: ['ບໍ່ເຊື່ອງເມນູ — ແຕ່ກັ່ນຂໍ້ມູນໃຫ້ເຫັນສະເພາະໜ່ວຍງານຕົນ'],
  assignWork: ['ປຸ່ມມອບໝາຍໃນ ticket ແລະ ວຽກ'],
  approve: ['ປຸ່ມອະນຸມັດ/ປະຕິເສດ', 'ປຸ່ມຕັດຈຳໜ່າຍອຸປະກອນ'],
  viewReports: [],
  manageAssets: ['ປຸ່ມຢືມ · ຄືນ · ໂອນ · ແກ້ spec · ບັນທຶກສ້ອມ · ໝາຍວ່າເພ'],
  manageSubscriptions: [
    'ປຸ່ມລົງທະບຽນ · ແກ້ໄຂ · ບັນທຶກການຈ່າຍ · ຕໍ່ອາຍຸ · ຍົກເລີກສັນຍາເຊົ່າ',
  ],
  manageAccounts: [
    'ປຸ່ມເປີດ–ປິດບັນຊີ · ສ້າງ ແລະ ຕິດຂັ້ນຕອນຮັບພະນັກງານເຂົ້າ/ອອກ',
  ],
  administer: [],
}

export type PermissionScope = { menus: string[]; extra: string[] }

/** ເມນູ + ຜົນນອກເມນູ ຂອງແຕ່ລະສິດ */
export function permissionScopes(): Record<Permission, PermissionScope> {
  const base = visibleLabels(probeUser(ALL_ALLOWED))

  const out = {} as Record<Permission, PermissionScope>
  for (const p of PERMISSIONS) {
    const denied = visibleLabels(probeUser({ ...ALL_ALLOWED, [p]: false }))
    out[p] = {
      menus: [...base].filter((label) => !denied.has(label)),
      extra: OFF_MENU[p],
    }
  }
  return out
}

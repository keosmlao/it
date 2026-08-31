import { describe, expect, it } from 'vitest'
import {
  allows,
  can,
  PERMISSIONS,
  PERMISSION_LABEL_LO,
  roleAllows,
  type ItStaff,
  type Role,
} from './roles'
import {
  MENU_ACTIONS,
  MENU_PERMS,
  menuForPath,
  roleAllowsMenu,
} from './menu-perms'
import { NAV_GROUPS, type NavItem } from '@/app/(app)/nav-config'

function user(
  role: Role,
  unit_code: string | null = '8010',
  permissions: ItStaff['permissions'] = null
): ItStaff {
  return { employee_id: 1, employee_code: 'E1', fullname_lo: 'Test', nickname: null,
    unit_code, unit_name_lo: null, position_code: null, position_name_lo: null, role,
    is_it_staff: role !== 'requester', department_code: '801', department_name: null,
    permissions }
}

describe('RBAC', () => {
  it('limits administration to managers', () => {
    expect(can.administer(user('manager'))).toBe(true)
    for (const role of ['head', 'developer', 'support', 'staff'] as Role[]) expect(can.administer(user(role))).toBe(false)
  })
  it('allows reports only for management roles', () => {
    expect(can.viewReports(user('manager'))).toBe(true); expect(can.viewReports(user('head'))).toBe(true)
    expect(can.viewReports(user('developer'))).toBe(false); expect(can.viewReports(user('support'))).toBe(false)
  })
  it('scopes non-managers to their unit', () => {
    expect(can.visibleUnits(user('manager'))).toBeNull()
    expect(can.visibleUnits(user('support', '8010'))).toEqual(['8010'])
    expect(can.visibleUnits(user('staff', ''))).toEqual([])
  })
  it('keeps requesters out of the IT staff area', () => {
    expect(can.useStaffArea(user('requester', ''))).toBe(false)
    for (const role of ['manager', 'head', 'developer', 'support', 'staff'] as Role[])
      expect(can.useStaffArea(user(role))).toBe(true)
  })
  it('grants a requester no permission at all', () => {
    const r = user('requester', '8010')
    expect(can.administer(r)).toBe(false)
    expect(can.viewReports(r)).toBe(false)
    expect(can.approve(r)).toBe(false)
    expect(can.assignWork(r)).toBe(false)
    expect(can.viewAllUnits(r)).toBe(false)
    // ສຳຄັນ: ບໍ່ໃຫ້ຕົກເປັນ [unit_code] ບໍ່ດັ່ງນັ້ນຈະເຫັນວຽກຂອງໜ່ວຍງານນັ້ນ
    expect(can.visibleUnits(r)).toEqual([])
  })
})

describe('ສິດລາຍຄົນ (per-user overrides)', () => {
  it('ເປີດສິດໃຫ້ຄົນທີ່ບົດບາດບໍ່ໃຫ້', () => {
    const u = user('support', '8010', { approve: true })
    expect(can.approve(u)).toBe(true)
    // ຂໍ້ອື່ນຕ້ອງບໍ່ຖືກແຕະ
    expect(can.administer(u)).toBe(false)
    expect(can.assignWork(u)).toBe(false)
  })

  it('ຫ້າມສິດຄົນທີ່ບົດບາດເປີດໃຫ້', () => {
    const u = user('manager', '8010', { administer: false })
    expect(can.administer(u)).toBe(false)
    expect(can.viewReports(u)).toBe(true)
  })

  it('ຫ້າມ viewAllUnits ແລ້ວຜູ້ຈັດການຕ້ອງເຫັນສະເພາະໜ່ວຍງານຕົນ', () => {
    expect(can.visibleUnits(user('manager', '8011', { viewAllUnits: false })))
      .toEqual(['8011'])
  })

  it('ຫ້າມ useStaffArea ແລ້ວຕ້ອງບໍ່ຮົ່ວຂໍ້ມູນຜ່ານ visibleUnits', () => {
    const u = user('support', '8010', { useStaffArea: false })
    expect(can.useStaffArea(u)).toBe(false)
    expect(can.visibleUnits(u)).toEqual([])
  })

  it('ເປີດ useStaffArea ໃຫ້ requester ໄດ້ ແຕ່ບໍ່ພ່ວງສິດອື່ນ', () => {
    const u = user('requester', '8010', { useStaffArea: true })
    expect(can.useStaffArea(u)).toBe(true)
    expect(can.approve(u)).toBe(false)
    expect(can.manageAssets(u)).toBe(false)
  })

  it('ບໍ່ມີການຕັ້ງ = ຄິດຕາມບົດບາດ', () => {
    for (const role of ['manager', 'head', 'support', 'requester'] as Role[])
      for (const p of PERMISSIONS)
        expect(allows(user(role, '8010', null), p)).toBe(roleAllows(role, p))
    expect(allows(user('head', '8010', {}), 'approve')).toBe(true)
  })

  it('ທຸກສິດມີປ້າຍພາສາລາວ', () => {
    for (const p of PERMISSIONS) expect(PERMISSION_LABEL_LO[p]).toBeTruthy()
  })
})

/**
 * ສິດລາຍເມນູ — ຄ່າຕັ້ງຕົ້ນຕ້ອງເທົ່າກັບສິດເກົ່າ ຈຶ່ງບໍ່ມີໃຜເສຍ ຫຼື
 * ໄດ້ສິດເພີ່ມໃນມື້ທີ່ເປີດໃຊ້ — ຢືນຢັນດ້ວຍ test ບໍ່ແມ່ນດ້ວຍຄວາມຫວັງ
 */
describe('ສິດລາຍເມນູ', () => {
  it('ຄ່າຕັ້ງຕົ້ນຄືສິດເກົ່າ: support ຢືມ–ຄືນໄດ້ ແຕ່ລົງທະບຽນການເຊົ່າບໍ່ໄດ້', () => {
    const support = user('support')
    expect(can.menu(support, '/assets/lend', 'create')).toBe(true)
    expect(can.menu(support, '/assets', 'edit')).toBe(true)
    expect(can.menu(support, '/subscriptions/new', 'create')).toBe(false)
    expect(can.menu(support, '/subscriptions', 'edit')).toBe(false)
  })

  it('ຜູ້ຈັດການ ແລະ ຫົວໜ້າ ລົງທະບຽນການເຊົ່າໄດ້', () => {
    for (const role of ['manager', 'head'] as Role[]) {
      expect(can.menu(user(role), '/subscriptions/new', 'create')).toBe(true)
    }
  })

  it('ເປີດເມນູດຽວໃຫ້ລາຍຄົນໄດ້ ໂດຍບໍ່ຮົ່ວໄປເມນູອື່ນ', () => {
    const support = user('support', '8010', { '/subscriptions/new.create': true })
    expect(can.menu(support, '/subscriptions/new', 'create')).toBe(true)
    expect(can.menu(support, '/subscriptions', 'edit')).toBe(false)
    expect(can.menu(support, '/subscriptions', 'delete')).toBe(false)
    expect(can.manageSubscriptions(support)).toBe(false)
  })

  it('ຫ້າມລາຍຄົນໄດ້ ເຖິງແມ່ນບົດບາດຈະເປີດໃຫ້', () => {
    const head = user('head', '8010', { '/subscriptions.delete': false })
    expect(can.menu(head, '/subscriptions', 'edit')).toBe(true)
    expect(can.menu(head, '/subscriptions', 'delete')).toBe(false)
  })

  it('ປິດ "ເບິ່ງ" ແລ້ວເຮັດຫຍັງຈາກເມນູນັ້ນບໍ່ໄດ້ເລີຍ', () => {
    const support = user('support', '8010', {
      '/assets.view': false,
      '/assets.edit': true,
    })
    expect(can.viewMenu(support, '/assets')).toBe(false)
    expect(can.menu(support, '/assets', 'edit')).toBe(false)
  })

  it('ປິດເມນູແມ່ ລູກປິດນຳ', () => {
    const support = user('support', '8010', { '/assets/lend.view': false })
    expect(can.viewMenu(support, '/assets/holders')).toBe(false)
    expect(can.viewMenu(support, '/assets/documents')).toBe(false)
    // ເມນູຄົນລະສາຍຍັງເປີດຢູ່
    expect(can.viewMenu(support, '/assets')).toBe(true)
  })

  it('ຜູ້ແຈ້ງບັນຫາບໍ່ໄດ້ຫຍັງເລີຍ ເຖິງແມ່ນຈະຕັ້ງເປີດໃຫ້', () => {
    const outsider = user('requester', null, { '/assets.view': true })
    for (const m of MENU_PERMS) {
      for (const a of MENU_ACTIONS) {
        expect(can.menu(outsider, m.key, a)).toBe(false)
      }
    }
  })

  it('ລຶບ ticket ໄດ້ສະເພາະຜູ້ຈັດການ ຄືກົດເກົ່າ', () => {
    expect(roleAllowsMenu('manager', '/tickets', 'delete', roleAllows)).toBe(true)
    for (const role of ['head', 'support', 'staff'] as Role[]) {
      expect(roleAllowsMenu(role, '/tickets', 'delete', roleAllows)).toBe(false)
      expect(roleAllowsMenu(role, '/tickets', 'edit', roleAllows)).toBe(true)
    }
  })

  it('ຊ່ອງທີ່ເມນູນັ້ນບໍ່ມີ ຈະບໍ່ເປີດໃຫ້ໃຜ', () => {
    // "ຜູ້ຖືຄອງອຸປະກອນ" ເປັນໜ້າເບິ່ງຢ່າງດຽວ
    expect(roleAllowsMenu('manager', '/assets/holders', 'delete', roleAllows)).toBe(false)
    expect(roleAllowsMenu('manager', '/assets/holders', 'view', roleAllows)).toBe(true)
  })

  it('ຫາເມນູທີ່ຄຸມແຕ່ລະໜ້າໄດ້ຖືກ', () => {
    expect(menuForPath('/assets/holders/18019')?.key).toBe('/assets/holders')
    expect(menuForPath('/assets/200-00000436')?.key).toBe('/assets')
    expect(menuForPath('/subscriptions/12/edit')?.key).toBe('/subscriptions')
    expect(menuForPath('/')?.key).toBe('/')
  })

  it('ລາຍການສິດກົງກັບເມນູຈິງໃນ sidebar', () => {
    const hrefs: string[] = []
    const walk = (items: NavItem[]) => {
      for (const item of items) {
        hrefs.push(item.href)
        if (item.children) walk(item.children)
      }
    }
    for (const group of NAV_GROUPS) walk(group.items)

    const keys = new Set(MENU_PERMS.map((m) => m.key))
    for (const href of hrefs) expect(keys.has(href)).toBe(true)
    for (const key of keys) expect(hrefs).toContain(key)
  })
})

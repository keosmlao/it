import { describe, expect, it } from 'vitest'
import {
  allows,
  can,
  MODULE_ACTIONS,
  MODULES,
  PERMISSIONS,
  PERMISSION_LABEL_LO,
  roleAllows,
  roleAllowsModule,
  type ItStaff,
  type ModuleAction,
  type ModuleCode,
  type Role,
} from './roles'

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
 * ສິດລາຍໂມດູນ — ຄ່າຕັ້ງຕົ້ນຕ້ອງເທົ່າກັບສິດເກົ່າ ຈຶ່ງບໍ່ມີໃຜເສຍ ຫຼື
 * ໄດ້ສິດເພີ່ມໃນມື້ທີ່ເປີດໃຊ້ — ຢືນຢັນດ້ວຍ test ບໍ່ແມ່ນດ້ວຍຄວາມຫວັງ
 */
describe('ສິດລາຍໂມດູນ', () => {
  it('ຄ່າຕັ້ງຕົ້ນຄືສິດເກົ່າ: support ຈັດການອຸປະກອນໄດ້ ແຕ່ຄ່າເຊົ່າບໍ່ໄດ້', () => {
    const support = user('support')
    expect(can.module(support, 'assets', 'create')).toBe(true)
    expect(can.module(support, 'assets', 'edit')).toBe(true)
    expect(can.module(support, 'subscriptions', 'create')).toBe(false)
    expect(can.module(support, 'subscriptions', 'edit')).toBe(false)
  })

  it('ຜູ້ຈັດການ ແລະ ຫົວໜ້າ ຈັດການຄ່າເຊົ່າໄດ້', () => {
    for (const role of ['manager', 'head'] as Role[]) {
      expect(can.module(user(role), 'subscriptions', 'create')).toBe(true)
    }
  })

  it('ເປີດໃຫ້ເປັນລາຍຄົນໄດ້ ໂດຍບໍ່ຕ້ອງເລື່ອນບົດບາດ', () => {
    const support = user('support', '8010', { 'subscriptions.create': true })
    expect(can.module(support, 'subscriptions', 'create')).toBe(true)
    // ບໍ່ຮົ່ວໄປຂໍ້ອື່ນ
    expect(can.module(support, 'subscriptions', 'delete')).toBe(false)
    expect(can.manageSubscriptions(support)).toBe(false)
  })

  it('ຫ້າມລາຍຄົນໄດ້ ເຖິງແມ່ນບົດບາດຈະເປີດໃຫ້', () => {
    const head = user('head', '8010', { 'subscriptions.delete': false })
    expect(can.module(head, 'subscriptions', 'edit')).toBe(true)
    expect(can.module(head, 'subscriptions', 'delete')).toBe(false)
  })

  it('ປິດ "ເບິ່ງ" ແລ້ວເຮັດຫຍັງໃນໂມດູນນັ້ນບໍ່ໄດ້ເລີຍ', () => {
    const support = user('support', '8010', {
      'assets.view': false,
      'assets.create': true,
    })
    expect(can.viewModule(support, 'assets')).toBe(false)
    expect(can.module(support, 'assets', 'create')).toBe(false)
  })

  it('ຜູ້ແຈ້ງບັນຫາບໍ່ໄດ້ຫຍັງເລີຍ ເຖິງແມ່ນຈະຕັ້ງເປີດໃຫ້', () => {
    const outsider = user('requester', null, { 'assets.view': true })
    for (const m of MODULES) {
      for (const a of MODULE_ACTIONS) {
        expect(can.module(outsider, m.code as ModuleCode, a as ModuleAction)).toBe(false)
      }
    }
  })

  it('ລຶບ ticket ໄດ້ສະເພາະຜູ້ຈັດການ ຄືກົດເກົ່າ', () => {
    expect(roleAllowsModule('manager', 'tickets', 'delete')).toBe(true)
    for (const role of ['head', 'support', 'staff'] as Role[]) {
      expect(roleAllowsModule(role, 'tickets', 'delete')).toBe(false)
      expect(roleAllowsModule(role, 'tickets', 'edit')).toBe(true)
    }
  })

  it('ທຸກໂມດູນມີຊື່ ແລະ ເສັ້ນທາງບໍ່ຊ້ຳກັນ', () => {
    const codes = MODULES.map((m) => m.code)
    expect(new Set(codes).size).toBe(codes.length)
    for (const m of MODULES) {
      expect(m.label.length).toBeGreaterThan(0)
      expect(m.path.startsWith('/')).toBe(true)
    }
  })
})

import { describe, expect, it } from 'vitest'
import {
  allows,
  can,
  PERMISSIONS,
  PERMISSION_LABEL_LO,
  roleAllows,
  type ItStaff,
  type Permission,
  type Role,
} from './roles'

function user(
  role: Role,
  unit_code = '8010',
  permissions: Partial<Record<Permission, boolean>> | null = null
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

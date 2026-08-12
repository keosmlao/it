import { describe, expect, it } from 'vitest'
import { can, type ItStaff, type Role } from './roles'

function user(role: Role, unit_code = '8010'): ItStaff {
  return { employee_id: 1, employee_code: 'E1', fullname_lo: 'Test', nickname: null,
    unit_code, unit_name_lo: null, position_code: null, position_name_lo: null, role }
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
})

import { describe, expect, it } from 'vitest'
import { canAssignTarget, validateSla, validApprovalDecision } from './action-policy'
import type { ItStaff, Role } from './auth/roles'

function user(role: Role): ItStaff { return { employee_id: 7, employee_code: 'E7', fullname_lo: 'Test', nickname: null, unit_code: '8010', unit_name_lo: null, position_code: null, position_name_lo: null, role, is_it_staff: role !== 'requester', department_code: '801', department_name: null } }

describe('Server Action policies', () => {
  it('prevents staff assigning work to another person', () => {
    expect(canAssignTarget(user('support'), 8)).toBe(false)
    expect(canAssignTarget(user('support'), 7)).toBe(true)
    expect(canAssignTarget(user('manager'), 8)).toBe(true)
  })
  it('rejects invalid SLA values before database writes', () => {
    expect(validateSla(0, 60)).toBeTruthy(); expect(validateSla(90, 60)).toBeTruthy(); expect(validateSla(30, 60)).toBeNull()
  })
  it('accepts only supported approval decisions', () => {
    expect(validApprovalDecision('approved')).toBe(true); expect(validApprovalDecision('rejected')).toBe(true); expect(validApprovalDecision('cancelled')).toBe(false)
  })
})

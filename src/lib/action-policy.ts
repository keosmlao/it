import { can, type ItStaff } from './auth/roles'

export function canAssignTarget(user: ItStaff, assigneeId: number | null) {
  return assigneeId === null || assigneeId === user.employee_id || can.assignWork(user)
}

export function validateSla(respond: number, resolve: number): string | null {
  if (!Number.isFinite(respond) || !Number.isFinite(resolve) || respond <= 0 || resolve <= 0) {
    return 'ເວລາຕ້ອງເປັນຈຳນວນນາທີທີ່ຫຼາຍກວ່າ 0'
  }
  if (respond > resolve) return 'ເວລາຕອບຕ້ອງນ້ອຍກວ່າ ຫຼື ເທົ່າກັບເວລາແກ້ໄຂ'
  return null
}

export function validApprovalDecision(value: string) {
  return value === 'approved' || value === 'rejected'
}

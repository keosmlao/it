import 'server-only'
import { query } from '@/lib/db'
import type { ItStaff } from '@/lib/auth/roles'

export const REQUEST_STATUSES = [
  'submitted',
  'head_approved',
  'approved',
  'rejected',
  'cancelled',
  'done',
] as const

export type RequestStatus = (typeof REQUEST_STATUSES)[number]

export const REQUEST_STATUS_LABEL_LO: Record<RequestStatus, string> = {
  submitted: 'ລໍຫົວໜ້າອະນຸມັດ',
  head_approved: 'ລໍຜູ້ຈັດການອະນຸມັດ',
  approved: 'ອະນຸມັດແລ້ວ',
  rejected: 'ບໍ່ອະນຸມັດ',
  cancelled: 'ຍົກເລີກ',
  done: 'ດຳເນີນການແລ້ວ',
}

export const REQUEST_STATUS_STYLE: Record<RequestStatus, string> = {
  submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  head_approved: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  cancelled: 'bg-slate-100 text-muted',
  done: 'bg-slate-200 text-body dark:bg-slate-800',
}

export type RequestRow = {
  id: string
  request_no: string
  type_code: string
  type_name_lo: string
  title: string
  detail: string | null
  requester_employee_id: number
  requester_name: string
  requester_department_name: string | null
  unit_code: string | null
  unit_name_lo: string | null
  status: RequestStatus
  current_level: number
  linked_project_id: string | null
  is_finished: boolean
  approval_count: string
  created_at: string
}

export async function listRequests(filters: { status?: string; mine?: boolean } = {},
  user?: ItStaff
) {
  const params: unknown[] = []
  const where: string[] = ['true']

  // 'pending' = ລໍອະນຸມັດ, 'all' = ບໍ່ກັ່ນຕອງ
  if (filters.status === 'pending') {
    where.push(`status in ('submitted','head_approved')`)
  } else if (filters.status && filters.status !== 'all') {
    params.push(filters.status)
    where.push(`status = $${params.length}`)
  }

  if (filters.mine && user) {
    params.push(user.employee_id)
    where.push(`requester_employee_id = $${params.length}`)
  }

  return query<RequestRow>(
    `select * from it.v_requests
      where ${where.join(' and ')}
      order by is_finished, created_at desc
      limit 200`,
    params
  )
}

export async function getRequest(id: string) {
  const rows = await query<RequestRow>('select * from it.v_requests where id = $1', [id])
  return rows[0] ?? null
}

export async function getApprovals(requestId: string) {
  return query<{
    id: string
    level: number
    decision: string
    note: string | null
    approver_name: string
    decided_at: string
  }>(
    `select a.id, a.level, a.decision, a.note,
            e.fullname_lo as approver_name, a.decided_at
       from it.approvals a
       join public.odg_employee e on e.employee_id = a.approver_employee_id
      where a.request_id = $1
      order by a.level, a.decided_at`,
    [requestId]
  )
}

export async function getRequestTypes() {
  return query<{ code: string; name_lo: string }>(
    `select code, name_lo from it.request_types where is_active order by sort_order`
  )
}

/**
 * ຜູ້ໃຊ້ຄົນນີ້ຕັດສິນຄຳຮ້ອງນີ້ໄດ້ບໍ:
 * ຂັ້ນ 1 = ຫົວໜ້າ (ຫຼື ຜູ້ຈັດການແທນໄດ້), ຂັ້ນ 2 = ຜູ້ຈັດການເທົ່ານັ້ນ
 */
export function canDecide(user: ItStaff, request: RequestRow): boolean {
  if (request.is_finished) return false
  if (request.requester_employee_id === user.employee_id) return false

  if (request.status === 'submitted') {
    return user.role === 'head' || user.role === 'manager'
  }
  if (request.status === 'head_approved') {
    return user.role === 'manager'
  }
  return false
}

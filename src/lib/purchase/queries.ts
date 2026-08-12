import 'server-only'
import { query } from '@/lib/db'
import type { ItStaff } from '@/lib/auth/roles'
import type { PrLine, PrRow } from './model'

export async function listPurchaseRequests(
  filters: { status?: string; mine?: boolean; q?: string } = {},
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

  if (filters.q) {
    params.push(`%${filters.q}%`)
    const i = params.length
    where.push(`(pr_no ilike $${i} or title ilike $${i} or requester_name ilike $${i})`)
  }

  return query<PrRow>(
    `select * from it.v_purchase_requests
      where ${where.join(' and ')}
      order by is_finished, doc_date desc, id desc
      limit 200`,
    params
  )
}

export async function getPurchaseRequest(id: string) {
  const rows = await query<PrRow>(
    'select * from it.v_purchase_requests where id = $1::bigint',
    [id]
  )
  return rows[0] ?? null
}

export async function getPurchaseLines(prId: string) {
  return query<PrLine>(
    `select * from it.purchase_request_lines
      where pr_id = $1::bigint
      order by line_no`,
    [prId]
  )
}

export async function getPurchaseApprovals(prId: string) {
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
       from it.pr_approvals a
       join public.odg_employee e on e.employee_id = a.approver_employee_id
      where a.pr_id = $1::bigint
      order by a.level, a.decided_at`,
    [prId]
  )
}

export async function getPurchaseStats() {
  const rows = await query<{
    total: string
    pending: string
    approved: string
    draft: string
    pending_value: string
  }>(
    `select count(*)                                                 as total,
            count(*) filter (where status in ('submitted','head_approved'))
                                                                     as pending,
            count(*) filter (where status = 'approved')              as approved,
            count(*) filter (where status = 'draft')                 as draft,
            coalesce(sum(total_est) filter
                     (where status in ('submitted','head_approved')), 0)
                                                                     as pending_value
       from it.v_purchase_requests
      where doc_date >= date_trunc('year', current_date)`
  )
  return rows[0]
}

/**
 * ຜູ້ໃຊ້ຄົນນີ້ຕັດສິນໃບສະເໜີຊື້ນີ້ໄດ້ບໍ:
 * ຂັ້ນ 1 = ຫົວໜ້າ (ຜູ້ຈັດການແທນໄດ້ ແລະ ຖືວ່າຜ່ານທັງສອງຂັ້ນ), ຂັ້ນ 2 = ຜູ້ຈັດການ
 */
export function canDecidePr(user: ItStaff, pr: PrRow): boolean {
  if (pr.is_finished) return false
  if (pr.requester_employee_id === user.employee_id) return false

  if (pr.status === 'submitted') return user.role === 'head' || user.role === 'manager'
  if (pr.status === 'head_approved') return user.role === 'manager'
  return false
}

/** ເຈົ້າຂອງໃບ (ຫຼື ຜູ້ຈັດການ) ແກ້ຮ່າງໄດ້ */
export function canEditPr(user: ItStaff, pr: PrRow): boolean {
  if (pr.status !== 'draft') return false
  return pr.requester_employee_id === user.employee_id || user.role === 'manager'
}

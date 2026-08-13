import 'server-only'
import { query } from '@/lib/db'
import type { ItStaff } from '@/lib/auth/roles'
import type { PrApproval, PrLine, PrRow, PrStep } from './model'

export async function listPurchaseRequests(
  filters: { status?: string; mine?: boolean; q?: string } = {},
  user?: ItStaff
) {
  const params: unknown[] = []
  const where: string[] = ['true']

  if (filters.status === 'pending') where.push(`status = 'submitted'`)
  else if (filters.status && filters.status !== 'all') {
    params.push(filters.status)
    where.push(`status = $${params.length}`)
  }

  if (filters.mine && user) {
    params.push(user.employee_code)
    where.push(`requester_code = $${params.length}`)
  }

  if (filters.q) {
    params.push(`%${filters.q}%`)
    const i = params.length
    where.push(`(pr_no ilike $${i} or title ilike $${i} or requester_name ilike $${i})`)
  }

  return query<PrRow>(
    `select * from it.v_pr
      where ${where.join(' and ')}
      order by is_finished, doc_date desc, id desc
      limit 200`,
    params
  )
}

export async function getPurchaseRequest(id: string) {
  const rows = await query<PrRow>('select * from it.v_pr where id = $1::bigint', [id])
  return rows[0] ?? null
}

export async function getPurchaseLines(prId: string) {
  return query<PrLine>(
    'select * from it.v_pr_lines where pr_id = $1::bigint order by line_no',
    [prId]
  )
}

export async function getPurchaseApprovals(prId: string) {
  return query<PrApproval>(
    `select a.id, a.step_no, a.decision, a.note,
            e.fullname_lo as approver_name, a.decided_at
       from it.pr_step_approvals a
       join public.odg_employee e on e.employee_id = a.approver_employee_id
      where a.pr_id = $1::bigint
      order by a.step_no, a.decided_at`,
    [prId]
  )
}

/** ຂັ້ນຕອນອະນຸມັດທັງໝົດທີ່ຕັ້ງໄວ້ (ລວມທີ່ປິດຢູ່ — ສຳລັບໜ້າຕັ້ງຄ່າ) */
export async function getApprovalSteps() {
  return query<PrStep>(
    `select s.step_no, s.name_lo, s.approver_role, s.approver_employee_id,
            e.fullname_lo as approver_name, s.min_amount, s.is_active, s.note
       from it.pr_approval_steps s
       left join public.odg_employee e on e.employee_id = s.approver_employee_id
      order by s.step_no`
  )
}

/** ຂັ້ນຕອນທີ່ໃບມູນຄ່າເທົ່ານີ້ຕ້ອງຜ່ານຈິງ */
export async function getStepsForAmount(amount: number) {
  return query<PrStep>(
    `select s.step_no, s.name_lo, s.approver_role, s.approver_employee_id,
            e.fullname_lo as approver_name, s.min_amount, s.is_active, s.note
       from it.pr_approval_steps s
       left join public.odg_employee e on e.employee_id = s.approver_employee_id
      where s.is_active and s.min_amount <= $1::numeric
      order by s.step_no`,
    [amount]
  )
}

/** ຜູ້ຈຳໜ່າຍຈາກທະບຽນ ERP — ໃຊ້ເປັນຕົວເລືອກໃນຫົວບິນ */
export async function getSuppliers() {
  return query<{ code: string; name: string }>(
    `select code, name_1 as name
       from public.ap_supplier
      where coalesce(status, 0) = 0 and coalesce(name_1, '') <> ''
      order by name_1
      limit 500`
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
    `select count(*)                                             as total,
            count(*) filter (where status = 'submitted')         as pending,
            count(*) filter (where status = 'approved')          as approved,
            count(*) filter (where status = 'draft')             as draft,
            coalesce(sum(total_est) filter (where status = 'submitted'), 0)
                                                                 as pending_value
       from it.v_pr
      where doc_date >= date_trunc('year', current_date)`
  )
  return rows[0]
}

/**
 * ຜູ້ໃຊ້ຄົນນີ້ຕັດສິນຂັ້ນປັດຈຸບັນຂອງໃບນີ້ໄດ້ບໍ.
 *
 * ຂັ້ນຕອນມາຈາກຕາຕະລາງ it.pr_approval_steps ຈຶ່ງປ່ຽນໄດ້ໂດຍບໍ່ຕ້ອງແກ້ໂຄ້ດ —
 * ຜູ້ຈັດການອະນຸມັດແທນຂັ້ນລຸ່ມໄດ້ (ກັນວຽກຄ້າງເມື່ອຫົວໜ້າບໍ່ຢູ່)
 */
export function canDecideStep(user: ItStaff, pr: PrRow, step: PrStep | undefined) {
  if (!step) return false
  if (pr.status !== 'submitted') return false
  if (pr.requester_employee_id === user.employee_id) return false

  if (step.approver_employee_id) {
    return step.approver_employee_id === user.employee_id || user.role === 'manager'
  }
  if (step.approver_role === 'manager') return user.role === 'manager'
  if (step.approver_role === 'head') return user.role === 'head' || user.role === 'manager'
  return false
}

export function canEditPr(user: ItStaff, pr: PrRow): boolean {
  if (pr.status !== 'draft') return false
  return pr.requester_employee_id === user.employee_id || user.role === 'manager'
}

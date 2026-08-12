'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { query } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { logAudit, notify } from '@/lib/activity'
import { canDecide, getRequest } from '@/lib/requests/queries'

import type { FormState } from '@/lib/action-state'
import { validApprovalDecision } from '@/lib/action-policy'

export type ActionState = FormState

export async function createRequest(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser()

  const title = String(formData.get('title') ?? '').trim()
  const typeCode = String(formData.get('type_code') ?? '')
  if (!title || !typeCode) return { error: 'ກະລຸນາປ້ອນຫົວຂໍ້ ແລະ ປະເພດຄຳຮ້ອງ' }

  const rows = await query<{ id: string; request_no: string }>(
    `insert into it.requests
       (type_code, title, detail, requester_employee_id, unit_code, created_by)
     values ($1, $2, $3, $4, $5, $6)
     returning id, request_no`,
    [
      typeCode,
      title,
      String(formData.get('detail') ?? '').trim() || null,
      user.employee_id,
      user.unit_code,
      user.employee_id,
    ]
  )

  const { id, request_no } = rows[0]
  await logAudit(user.employee_id, 'request', id, 'create', title)

  // ແຈ້ງຫົວໜ້າໜ່ວຍງານທຸກຄົນທີ່ຕ້ອງອະນຸມັດຂັ້ນ 1
  const approvers = await query<{ employee_id: number }>(
    `select employee_id from it.v_it_staff
      where role = 'head' and (unit_code = $1 or $1 is null)`,
    [user.unit_code]
  )
  for (const a of approvers) {
    await notify(
      a.employee_id,
      user.employee_id,
      'ມີຄຳຮ້ອງລໍອະນຸມັດ',
      `${request_no} · ${title}`,
      `/requests/${id}`
    )
  }

  revalidatePath('/requests')
  redirect(`/requests/${id}`)
}

export async function decideRequest(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  const id = String(formData.get('request_id'))
  const decision = String(formData.get('decision'))
  const note = String(formData.get('note') ?? '').trim()

  if (!validApprovalDecision(decision)) {
    return { error: 'ການຕັດສິນບໍ່ຖືກຕ້ອງ' }
  }

  const request = await getRequest(id)
  if (!request) return { error: 'ບໍ່ພົບຄຳຮ້ອງ' }
  if (!canDecide(user, request)) return { error: 'ບໍ່ມີສິດອະນຸມັດຄຳຮ້ອງນີ້' }

  const level = request.status === 'submitted' ? 1 : 2

  await query(
    `insert into it.approvals (request_id, level, approver_employee_id, decision, note)
     values ($1, $2, $3, $4, $5)`,
    [id, level, user.employee_id, decision, note || null]
  )

  // ຂັ້ນ 1 ຜ່ານ → ສົ່ງຕໍ່ຜູ້ຈັດການ; ຂັ້ນ 2 ຜ່ານ → ອະນຸມັດສົມບູນ
  // ຜູ້ຈັດການອະນຸມັດຢູ່ຂັ້ນ 1 ໄດ້ເລີຍ ຖືວ່າຜ່ານທັງສອງຂັ້ນ
  const nextStatus =
    decision === 'rejected'
      ? 'rejected'
      : level === 2 || user.role === 'manager'
        ? 'approved'
        : 'head_approved'

  await query(
    `update it.requests
        set status = $2::varchar,
            current_level = case when $2::varchar = 'head_approved'
                                 then 2 else current_level end,
            updated_at = now()
      where id = $1::bigint`,
    [id, nextStatus]
  )

  await notify(
    request.requester_employee_id,
    user.employee_id,
    decision === 'approved' ? 'ຄຳຮ້ອງຖືກອະນຸມັດ' : 'ຄຳຮ້ອງບໍ່ໄດ້ຮັບອະນຸມັດ',
    `${request.request_no} · ${request.title}`,
    `/requests/${id}`
  )
  await logAudit(user.employee_id, 'request', id, decision, note)

  revalidatePath(`/requests/${id}`)
  revalidatePath('/requests')

  return { ok: true }
}

/** ອະນຸມັດແລ້ວ → ເປີດເປັນໂປຣເຈັກພັດທະນາ */
export async function convertToProject(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (user.role !== 'manager' && user.role !== 'head') {
    return { error: 'ບໍ່ມີສິດເປີດໂປຣເຈັກ' }
  }

  const id = String(formData.get('request_id'))
  const request = await getRequest(id)
  if (!request) return { error: 'ບໍ່ພົບຄຳຮ້ອງ' }
  if (request.status !== 'approved') return { error: 'ຕ້ອງອະນຸມັດກ່ອນຈຶ່ງເປີດໂປຣເຈັກໄດ້' }
  if (request.linked_project_id) return { error: 'ຄຳຮ້ອງນີ້ເປີດໂປຣເຈັກແລ້ວ' }

  const rows = await query<{ id: string }>(
    `insert into it.projects
       (name, description, status, owner_employee_id, requester_employee_id, created_by)
     values ($1, $2, 'planning', $3, $4, $5)
     returning id`,
    [
      request.title,
      request.detail,
      user.employee_id,
      request.requester_employee_id,
      user.employee_id,
    ]
  )

  const projectId = rows[0].id
  await query(
    `update it.requests set linked_project_id = $2, status = 'done', updated_at = now()
      where id = $1`,
    [id, projectId]
  )

  await logAudit(user.employee_id, 'request', id, 'convert', `→ project ${projectId}`)

  revalidatePath('/requests')
  redirect(`/projects/${projectId}`)
}

export async function cancelRequest(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  const id = String(formData.get('request_id'))

  await query(
    `update it.requests set status = 'cancelled', updated_at = now()
      where id = $1 and requester_employee_id = $2
        and status in ('submitted','head_approved')`,
    [id, user.employee_id]
  )

  await logAudit(user.employee_id, 'request', id, 'cancel')
  revalidatePath(`/requests/${id}`)
  revalidatePath('/requests')

  return { ok: true }
}

'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { query } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { logAudit, notify } from '@/lib/activity'
import { validApprovalDecision } from '@/lib/action-policy'
import {
  canDecidePr,
  canEditPr,
  getPurchaseRequest,
} from '@/lib/purchase/queries'
import type { FormState } from '@/lib/action-state'

/** ສ້າງໃບສະເໜີຊື້ເປັນຮ່າງ ພ້ອມລາຍການທຳອິດ */
export async function createPurchaseRequest(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()

  const title = String(formData.get('title') ?? '').trim()
  if (!title) return { error: 'ກະລຸນາປ້ອນຫົວຂໍ້ໃບສະເໜີຊື້' }

  const itemName = String(formData.get('item_name') ?? '').trim()
  if (!itemName) return { error: 'ກະລຸນາປ້ອນລາຍການທຳອິດຢ່າງໜ້ອຍ 1 ລາຍການ' }

  const qty = Number(formData.get('qty') ?? 1)
  if (!Number.isFinite(qty) || qty <= 0) return { error: 'ຈຳນວນຕ້ອງຫຼາຍກວ່າ 0' }

  const estPrice = parseMoney(formData.get('est_price'))
  if (estPrice === 'invalid') return { error: 'ລາຄາປະມານບໍ່ຖືກຮູບແບບ' }

  const rows = await query<{ id: string; pr_no: string }>(
    `insert into it.purchase_requests
       (title, purpose, requester_employee_id, unit_code, need_date, created_by)
     values ($1::varchar, $2::text, $3::int, $4::varchar, $5::date, $3::int)
     returning id, pr_no`,
    [
      title,
      String(formData.get('purpose') ?? '').trim() || null,
      user.employee_id,
      user.unit_code,
      String(formData.get('need_date') ?? '') || null,
    ]
  )

  const { id } = rows[0]

  await query(
    `insert into it.purchase_request_lines
       (pr_id, line_no, item_code, item_name, spec, unit, qty, est_price, note)
     values ($1::bigint, 1, $2::varchar, $3::varchar, $4::text, $5::varchar,
             $6::numeric, $7::numeric, $8::varchar)`,
    [
      id,
      String(formData.get('item_code') ?? '').trim() || null,
      itemName,
      String(formData.get('spec') ?? '').trim() || null,
      String(formData.get('unit') ?? '').trim() || null,
      qty,
      estPrice,
      String(formData.get('line_note') ?? '').trim() || null,
    ]
  )

  await logAudit(user.employee_id, 'purchase_request', id, 'create', title)
  revalidatePath('/purchase')
  redirect(`/purchase/${id}`)
}

/** ເພີ່ມລາຍການເຂົ້າໃບຮ່າງ */
export async function addPurchaseLine(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  const prId = String(formData.get('pr_id') ?? '')
  const pr = await getPurchaseRequest(prId)
  if (!pr) return { error: 'ບໍ່ພົບໃບສະເໜີຊື້' }
  if (!canEditPr(user, pr)) return { error: 'ແກ້ໄດ້ສະເພາະຕອນຍັງເປັນຮ່າງ' }

  const itemName = String(formData.get('item_name') ?? '').trim()
  if (!itemName) return { error: 'ກະລຸນາປ້ອນຊື່ລາຍການ' }

  const qty = Number(formData.get('qty') ?? 1)
  if (!Number.isFinite(qty) || qty <= 0) return { error: 'ຈຳນວນຕ້ອງຫຼາຍກວ່າ 0' }

  const estPrice = parseMoney(formData.get('est_price'))
  if (estPrice === 'invalid') return { error: 'ລາຄາປະມານບໍ່ຖືກຮູບແບບ' }

  await query(
    `insert into it.purchase_request_lines
       (pr_id, line_no, item_code, item_name, spec, unit, qty, est_price, note)
     select $1::bigint,
            coalesce(max(line_no), 0) + 1,
            $2::varchar, $3::varchar, $4::text, $5::varchar,
            $6::numeric, $7::numeric, $8::varchar
       from it.purchase_request_lines where pr_id = $1::bigint`,
    [
      prId,
      String(formData.get('item_code') ?? '').trim() || null,
      itemName,
      String(formData.get('spec') ?? '').trim() || null,
      String(formData.get('unit') ?? '').trim() || null,
      qty,
      estPrice,
      String(formData.get('line_note') ?? '').trim() || null,
    ]
  )

  revalidatePath(`/purchase/${prId}`)
  return { ok: true }
}

export async function deletePurchaseLine(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  const prId = String(formData.get('pr_id') ?? '')
  const lineId = String(formData.get('line_id') ?? '')

  const pr = await getPurchaseRequest(prId)
  if (!pr) return { error: 'ບໍ່ພົບໃບສະເໜີຊື້' }
  if (!canEditPr(user, pr)) return { error: 'ແກ້ໄດ້ສະເພາະຕອນຍັງເປັນຮ່າງ' }

  await query(
    `delete from it.purchase_request_lines
      where id = $1::bigint and pr_id = $2::bigint`,
    [lineId, prId]
  )

  revalidatePath(`/purchase/${prId}`)
  return { ok: true }
}

/** ສົ່ງໃບຮ່າງເຂົ້າສາຍອະນຸມັດ */
export async function submitPurchaseRequest(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  const prId = String(formData.get('pr_id') ?? '')

  const pr = await getPurchaseRequest(prId)
  if (!pr) return { error: 'ບໍ່ພົບໃບສະເໜີຊື້' }
  if (pr.status !== 'draft') return { error: 'ໃບນີ້ສົ່ງໄປແລ້ວ' }
  if (pr.requester_employee_id !== user.employee_id && user.role !== 'manager') {
    return { error: 'ສົ່ງໄດ້ສະເພາະເຈົ້າຂອງໃບ' }
  }
  if (Number(pr.line_count) === 0) return { error: 'ຕ້ອງມີລາຍການຢ່າງໜ້ອຍ 1 ລາຍການ' }

  await query(
    `update it.purchase_requests
        set status = 'submitted', current_level = 1, updated_at = now()
      where id = $1::bigint`,
    [prId]
  )

  const approvers = await query<{ employee_id: number }>(
    `select employee_id from it.v_it_staff
      where role in ('head','manager')
        and ($1::varchar is null or unit_code = $1::varchar or role = 'manager')`,
    [user.unit_code]
  )
  for (const a of approvers) {
    await notify(
      a.employee_id,
      user.employee_id,
      'ມີໃບສະເໜີຊື້ລໍອະນຸມັດ',
      `${pr.pr_no} · ${pr.title}`,
      `/purchase/${prId}`
    )
  }

  await logAudit(user.employee_id, 'purchase_request', prId, 'submit', pr.title)
  revalidatePath('/purchase')
  revalidatePath(`/purchase/${prId}`)
  return { ok: true }
}

export async function decidePurchaseRequest(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  const prId = String(formData.get('pr_id') ?? '')
  const decision = String(formData.get('decision') ?? '')
  const note = String(formData.get('note') ?? '').trim()

  if (!validApprovalDecision(decision)) return { error: 'ການຕັດສິນບໍ່ຖືກຕ້ອງ' }

  const pr = await getPurchaseRequest(prId)
  if (!pr) return { error: 'ບໍ່ພົບໃບສະເໜີຊື້' }
  if (!canDecidePr(user, pr)) return { error: 'ບໍ່ມີສິດອະນຸມັດໃບນີ້' }
  if (decision === 'rejected' && !note) {
    return { error: 'ກະລຸນາລະບຸເຫດຜົນທີ່ບໍ່ອະນຸມັດ' }
  }

  const level = pr.status === 'submitted' ? 1 : 2

  await query(
    `insert into it.pr_approvals (pr_id, level, approver_employee_id, decision, note)
     values ($1::bigint, $2::int, $3::int, $4::varchar, $5::text)`,
    [prId, level, user.employee_id, decision, note || null]
  )

  // ຜູ້ຈັດການອະນຸມັດຢູ່ຂັ້ນ 1 ໄດ້ເລີຍ ຖືວ່າຜ່ານທັງສອງຂັ້ນ
  const nextStatus =
    decision === 'rejected'
      ? 'rejected'
      : level === 2 || user.role === 'manager'
        ? 'approved'
        : 'head_approved'

  await query(
    `update it.purchase_requests
        set status        = $2::varchar,
            current_level = case when $2::varchar = 'head_approved'
                                 then 2 else current_level end,
            reject_reason = case when $2::varchar = 'rejected'
                                 then $3::text else reject_reason end,
            approved_by   = case when $2::varchar = 'approved'
                                 then $4::int else approved_by end,
            approved_at   = case when $2::varchar = 'approved'
                                 then now() else approved_at end,
            updated_at    = now()
      where id = $1::bigint`,
    [prId, nextStatus, note || null, user.employee_id]
  )

  await notify(
    pr.requester_employee_id,
    user.employee_id,
    decision === 'approved' ? 'ໃບສະເໜີຊື້ຖືກອະນຸມັດ' : 'ໃບສະເໜີຊື້ບໍ່ໄດ້ຮັບອະນຸມັດ',
    `${pr.pr_no} · ${pr.title}`,
    `/purchase/${prId}`
  )
  await logAudit(user.employee_id, 'purchase_request', prId, decision, note)

  revalidatePath('/purchase')
  revalidatePath(`/purchase/${prId}`)
  return { ok: true }
}

/** ບັນທຶກເລກ PO ຫຼັງຈັດຊື້ອອກໃບສັ່ງຊື້ແລ້ວ */
export async function markPurchaseOrdered(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (user.role !== 'manager' && user.role !== 'head') {
    return { error: 'ບໍ່ມີສິດບັນທຶກເລກ PO' }
  }

  const prId = String(formData.get('pr_id') ?? '')
  const poNo = String(formData.get('po_no') ?? '').trim()
  if (!poNo) return { error: 'ກະລຸນາປ້ອນເລກ PO' }

  const pr = await getPurchaseRequest(prId)
  if (!pr) return { error: 'ບໍ່ພົບໃບສະເໜີຊື້' }
  if (pr.status !== 'approved') return { error: 'ຕ້ອງອະນຸມັດກ່ອນຈຶ່ງບັນທຶກ PO ໄດ້' }

  await query(
    `update it.purchase_requests
        set po_no = $2::varchar, status = 'ordered', updated_at = now()
      where id = $1::bigint`,
    [prId, poNo]
  )

  await logAudit(user.employee_id, 'purchase_request', prId, 'ordered', poNo)
  revalidatePath('/purchase')
  revalidatePath(`/purchase/${prId}`)
  return { ok: true }
}

/** ຮັບເຄື່ອງແລ້ວ — ປິດໃບ */
export async function markPurchaseReceived(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  const prId = String(formData.get('pr_id') ?? '')

  const pr = await getPurchaseRequest(prId)
  if (!pr) return { error: 'ບໍ່ພົບໃບສະເໜີຊື້' }
  if (pr.status !== 'ordered' && pr.status !== 'approved') {
    return { error: 'ຕ້ອງອະນຸມັດ ຫຼື ສັ່ງຊື້ກ່ອນ' }
  }

  await query(
    `update it.purchase_requests
        set status = 'received', received_at = current_date, updated_at = now()
      where id = $1::bigint`,
    [prId]
  )

  await logAudit(user.employee_id, 'purchase_request', prId, 'received')
  revalidatePath('/purchase')
  revalidatePath(`/purchase/${prId}`)
  return { ok: true }
}

export async function cancelPurchaseRequest(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  const prId = String(formData.get('pr_id') ?? '')

  const pr = await getPurchaseRequest(prId)
  if (!pr) return { error: 'ບໍ່ພົບໃບສະເໜີຊື້' }
  if (pr.requester_employee_id !== user.employee_id && user.role !== 'manager') {
    return { error: 'ຍົກເລີກໄດ້ສະເພາະເຈົ້າຂອງໃບ ຫຼື ຜູ້ຈັດການ' }
  }
  if (pr.is_finished) return { error: 'ໃບນີ້ຈົບແລ້ວ ຍົກເລີກບໍ່ໄດ້' }

  await query(
    `update it.purchase_requests
        set status = 'cancelled', updated_at = now()
      where id = $1::bigint`,
    [prId]
  )

  await logAudit(user.employee_id, 'purchase_request', prId, 'cancel')
  revalidatePath('/purchase')
  revalidatePath(`/purchase/${prId}`)
  return { ok: true }
}

/** ຮັບຄ່າເງິນຈາກຟອມ: ວ່າງ = null, ບໍ່ແມ່ນຕົວເລກ = 'invalid' */
function parseMoney(value: FormDataEntryValue | null): number | null | 'invalid' {
  const raw = String(value ?? '')
    .replace(/,/g, '')
    .trim()
  if (!raw) return null
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) return 'invalid'
  return n
}

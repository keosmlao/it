'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { pool, query } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { logAudit, notify } from '@/lib/activity'
import { validApprovalDecision } from '@/lib/action-policy'
import {
  canDecideStep,
  canEditPr,
  getPurchaseRequest,
  getStepsForAmount,
} from '@/lib/purchase/queries'
import type { FormState } from '@/lib/action-state'

/**
 * ໃບສະເໜີຊື້ເກັບຢູ່ຕາຕະລາງ PR ຂອງ ERP (public.odg_pm_pr / odg_pm_pr_line)
 * ສ່ວນຊ່ອງທີ່ ERP ບໍ່ມີຢູ່ it.pr_extra — ຂຽນສອງບ່ອນຕ້ອງຢູ່ transaction ດຽວ
 */
type LineInput = {
  item_code: string | null
  item_name: string
  spec: string | null
  unit: string | null
  qty: number
  est_price: number | null
  discount: number
  note: string | null
}

export async function createPurchaseRequest(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()

  const title = String(formData.get('title') ?? '').trim()
  if (!title) return { error: 'ກະລຸນາປ້ອນຫົວຂໍ້ໃບສະເໜີຊື້' }

  // ຟອມສົ່ງລາຍການທັງໝົດມາເປັນ JSON ກ້ອນດຽວ (ໃສ່ໄດ້ຫຼາຍແຖວພ້ອມກັນ)
  let lines: LineInput[]
  try {
    lines = JSON.parse(String(formData.get('lines') ?? '[]'))
  } catch {
    return { error: 'ຂໍ້ມູນລາຍການບໍ່ຖືກຮູບແບບ' }
  }

  if (!Array.isArray(lines) || lines.length === 0) {
    return { error: 'ຕ້ອງມີລາຍການສິນຄ້າຢ່າງໜ້ອຍ 1 ລາຍການ' }
  }

  for (const [i, line] of lines.entries()) {
    if (!line.item_name?.trim()) return { error: `ແຖວທີ ${i + 1}: ຕ້ອງມີຊື່ສິນຄ້າ` }
    if (!Number.isFinite(line.qty) || line.qty <= 0) {
      return { error: `ແຖວທີ ${i + 1}: ຈຳນວນຕ້ອງຫຼາຍກວ່າ 0` }
    }
    if (line.est_price !== null && (!Number.isFinite(line.est_price) || line.est_price < 0)) {
      return { error: `ແຖວທີ ${i + 1}: ລາຄາບໍ່ຖືກຕ້ອງ` }
    }
    if (!Number.isFinite(line.discount) || line.discount < 0) {
      return { error: `ແຖວທີ ${i + 1}: ສ່ວນຫຼຸດບໍ່ຖືກຕ້ອງ` }
    }
    if (line.discount > line.qty * (line.est_price ?? 0)) {
      return { error: `ແຖວທີ ${i + 1}: ສ່ວນຫຼຸດຫຼາຍກວ່າມູນຄ່າແຖວ` }
    }
  }

  const discount = parseMoney(formData.get('discount_amount'))
  if (discount === 'invalid') return { error: 'ສ່ວນຫຼຸດທ້າຍບິນບໍ່ຖືກຮູບແບບ' }

  const vatRate = Number(String(formData.get('vat_rate') ?? '0').replace(/,/g, '')) || 0
  if (vatRate < 0 || vatRate > 100) return { error: 'ອັດຕາພາສີຕ້ອງຢູ່ລະຫວ່າງ 0–100' }

  const subtotal = lines.reduce(
    (sum, l) => sum + l.qty * (l.est_price ?? 0) - l.discount,
    0
  )
  if ((discount ?? 0) > subtotal) {
    return { error: 'ສ່ວນຫຼຸດທ້າຍບິນຫຼາຍກວ່າມູນຄ່າລວມ' }
  }

  const client = await pool.connect()
  let prId: string
  try {
    await client.query('begin')

    const { rows } = await client.query<{ id: string }>(
      `insert into public.odg_pm_pr
         (pr_no, doc_date, department_code, requester_code, need_date, note,
          status, created_by, created_at, updated_at)
       values (it.next_pr_no(), current_date, $1::varchar, $2::varchar,
               $3::date, $4::text, 'draft', $2::varchar, now(), now())
       returning id`,
      [
        user.department_code,
        user.employee_code,
        String(formData.get('need_date') ?? '') || null,
        String(formData.get('erp_note') ?? '').trim() || null,
      ]
    )
    prId = rows[0].id

    await client.query(
      `insert into it.pr_extra
         (pr_id, title, purpose, supplier_suggestion, supplier_code, currency,
          delivery_place, budget_note, unit_code, discount_amount, vat_rate,
          doc_ref)
       values ($1::bigint, $2::varchar, $3::text, $4::varchar, $5::varchar,
               $6::varchar, $7::varchar, $8::varchar, $9::varchar, $10::numeric,
               $11::numeric, $12::varchar)`,
      [
        prId,
        title,
        String(formData.get('purpose') ?? '').trim() || null,
        String(formData.get('supplier_suggestion') ?? '').trim() || null,
        String(formData.get('supplier_code') ?? '').trim() || null,
        String(formData.get('currency') ?? 'LAK'),
        String(formData.get('delivery_place') ?? '').trim() || null,
        String(formData.get('budget_note') ?? '').trim() || null,
        user.unit_code,
        discount ?? 0,
        vatRate,
        String(formData.get('doc_ref') ?? '').trim() || null,
      ]
    )

    let lineNo = 0
    for (const line of lines) {
      lineNo++
      const inserted = await client.query<{ id: string }>(
        `insert into public.odg_pm_pr_line
           (pr_id, line_no, item_code, item_name, unit, qty, est_price, note)
         values ($1::bigint, $2::int, $3::varchar, $4::varchar, $5::varchar,
                 $6::numeric, $7::numeric, $8::varchar)
         returning id`,
        [
          prId,
          lineNo,
          line.item_code,
          line.item_name.trim(),
          line.unit,
          line.qty,
          line.est_price,
          line.note,
        ]
      )

      if (line.spec || line.discount > 0) {
        await client.query(
          `insert into it.pr_line_extra (line_id, spec, discount)
           values ($1::bigint, $2::text, $3::numeric)`,
          [inserted.rows[0].id, line.spec, line.discount]
        )
      }
    }

    await client.query('commit')
  } catch (e) {
    await client.query('rollback')
    return { error: `ບັນທຶກບໍ່ສຳເລັດ: ${(e as Error).message}` }
  } finally {
    client.release()
  }

  await logAudit(user.employee_id, 'purchase_request', prId, 'create', title)
  revalidatePath('/purchase')
  redirect(`/purchase/${prId}`)
}

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

  const rows = await query<{ id: string }>(
    `insert into public.odg_pm_pr_line
       (pr_id, line_no, item_code, item_name, unit, qty, est_price, note)
     select $1::bigint, coalesce(max(line_no), 0) + 1,
            $2::varchar, $3::varchar, $4::varchar, $5::numeric, $6::numeric,
            $7::varchar
       from public.odg_pm_pr_line where pr_id = $1::bigint
     returning id`,
    [
      prId,
      String(formData.get('item_code') ?? '').trim() || null,
      itemName,
      String(formData.get('unit') ?? '').trim() || null,
      qty,
      estPrice,
      String(formData.get('line_note') ?? '').trim() || null,
    ]
  )

  const spec = String(formData.get('spec') ?? '').trim()
  if (spec) {
    await query(
      'insert into it.pr_line_extra (line_id, spec) values ($1::bigint, $2::text)',
      [rows[0].id, spec]
    )
  }

  await touch(prId)
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

  await query('delete from it.pr_line_extra where line_id = $1::bigint', [lineId])
  await query(
    'delete from public.odg_pm_pr_line where id = $1::bigint and pr_id = $2::bigint',
    [lineId, prId]
  )

  await touch(prId)
  revalidatePath(`/purchase/${prId}`)
  return { ok: true }
}

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

  const steps = await getStepsForAmount(Number(pr.total_est))
  if (steps.length === 0) {
    return { error: 'ຍັງບໍ່ໄດ້ຕັ້ງຂັ້ນຕອນອະນຸມັດ — ໃຫ້ຜູ້ຈັດການຕັ້ງຢູ່ໜ້າຕັ້ງຄ່າກ່ອນ' }
  }

  await query(
    `update public.odg_pm_pr set status = 'submitted', updated_at = now()
      where id = $1::bigint`,
    [prId]
  )
  await query(
    `update it.pr_extra set current_step = $2::int, updated_at = now()
      where pr_id = $1::bigint`,
    [prId, steps[0].step_no]
  )

  await notifyStepApprovers(steps[0], pr.pr_no, pr.title, prId, user.employee_id)
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

  const steps = await getStepsForAmount(Number(pr.total_est))
  const current = steps.find((s) => s.step_no === pr.current_step)
  if (!canDecideStep(user, pr, current)) return { error: 'ບໍ່ມີສິດອະນຸມັດຂັ້ນນີ້' }
  if (decision === 'rejected' && !note) {
    return { error: 'ກະລຸນາລະບຸເຫດຜົນທີ່ບໍ່ອະນຸມັດ' }
  }

  await query(
    `insert into it.pr_step_approvals
       (pr_id, step_no, approver_employee_id, decision, note)
     values ($1::bigint, $2::int, $3::int, $4::varchar, $5::text)`,
    [prId, pr.current_step, user.employee_id, decision, note || null]
  )

  if (decision === 'rejected') {
    await query(
      `update public.odg_pm_pr
          set status = 'rejected', reject_reason = $2::text, updated_at = now()
        where id = $1::bigint`,
      [prId, note]
    )
  } else {
    const next = steps.find((s) => s.step_no > pr.current_step)
    if (next) {
      await query(
        `update it.pr_extra set current_step = $2::int, updated_at = now()
          where pr_id = $1::bigint`,
        [prId, next.step_no]
      )
      await query(
        `update public.odg_pm_pr set updated_at = now() where id = $1::bigint`,
        [prId]
      )
      await notifyStepApprovers(next, pr.pr_no, pr.title, prId, user.employee_id)
    } else {
      // ຂັ້ນສຸດທ້າຍຜ່ານ = ອະນຸມັດສົມບູນ
      await query(
        `update public.odg_pm_pr
            set status = 'approved', approved_by = $2::varchar,
                approved_at = now(), updated_at = now()
          where id = $1::bigint`,
        [prId, user.employee_code]
      )
    }
  }

  await notify(
    pr.requester_employee_id,
    user.employee_id,
    decision === 'approved' ? 'ໃບສະເໜີຊື້ຜ່ານການອະນຸມັດ' : 'ໃບສະເໜີຊື້ບໍ່ໄດ້ຮັບອະນຸມັດ',
    `${pr.pr_no} · ${pr.title}`,
    `/purchase/${prId}`
  )
  await logAudit(user.employee_id, 'purchase_request', prId, decision, note)

  revalidatePath('/purchase')
  revalidatePath(`/purchase/${prId}`)
  return { ok: true }
}

export async function markPurchaseOrdered(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.approve(user)) return { error: 'ບໍ່ມີສິດບັນທຶກເລກ PO' }

  const prId = String(formData.get('pr_id') ?? '')
  const poNo = String(formData.get('po_no') ?? '').trim()
  if (!poNo) return { error: 'ກະລຸນາປ້ອນເລກ PO' }

  const pr = await getPurchaseRequest(prId)
  if (!pr) return { error: 'ບໍ່ພົບໃບສະເໜີຊື້' }
  if (pr.status !== 'approved') return { error: 'ຕ້ອງອະນຸມັດກ່ອນຈຶ່ງບັນທຶກ PO ໄດ້' }

  await query(
    `update public.odg_pm_pr
        set po_no = $2::varchar, status = 'ordered', updated_at = now()
      where id = $1::bigint`,
    [prId, poNo]
  )

  await logAudit(user.employee_id, 'purchase_request', prId, 'ordered', poNo)
  revalidatePath('/purchase')
  revalidatePath(`/purchase/${prId}`)
  return { ok: true }
}

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
    `update public.odg_pm_pr set status = 'received', updated_at = now()
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
    `update public.odg_pm_pr set status = 'cancelled', updated_at = now()
      where id = $1::bigint`,
    [prId]
  )

  await logAudit(user.employee_id, 'purchase_request', prId, 'cancel')
  revalidatePath('/purchase')
  revalidatePath(`/purchase/${prId}`)
  return { ok: true }
}

/** ແຈ້ງຜູ້ທີ່ຕ້ອງອະນຸມັດຂັ້ນນີ້ */
async function notifyStepApprovers(
  step: { step_no: number; name_lo: string; approver_role: string | null; approver_employee_id: number | null },
  prNo: string,
  title: string,
  prId: string,
  actorId: number
) {
  const approvers = step.approver_employee_id
    ? [{ employee_id: step.approver_employee_id }]
    : await query<{ employee_id: number }>(
        `select employee_id from it.v_it_staff where role = $1::varchar`,
        [step.approver_role]
      )

  for (const a of approvers) {
    await notify(
      a.employee_id,
      actorId,
      `ໃບສະເໜີຊື້ລໍອະນຸມັດ (${step.name_lo})`,
      `${prNo} · ${title}`,
      `/purchase/${prId}`
    )
  }
}

async function touch(prId: string) {
  await query('update public.odg_pm_pr set updated_at = now() where id = $1::bigint', [
    prId,
  ])
}

function parseMoney(value: FormDataEntryValue | null): number | null | 'invalid' {
  const raw = String(value ?? '')
    .replace(/,/g, '')
    .trim()
  if (!raw) return null
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) return 'invalid'
  return n
}

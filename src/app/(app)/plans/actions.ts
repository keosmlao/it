'use server'

import { revalidatePath } from 'next/cache'
import { query } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { logAudit } from '@/lib/activity'
import { shiftDate } from '@/lib/format'
import { getPlanById, getOrCreatePlan } from '@/lib/plans/queries'
import { PLAN_ITEM_STATUSES, type PlanItemStatus } from '@/lib/plans/model'
import type { FormState } from '@/lib/action-state'

/** ແກ້ແຜນຂອງຕົນເອງໄດ້; ຫົວໜ້າ/ຜູ້ຈັດການເບິ່ງໄດ້ແຕ່ບໍ່ແກ້ແທນ */
async function ownedPlan(planId: string) {
  const user = await requireUser()
  const plan = await getPlanById(planId)
  if (!plan) return { error: 'ບໍ່ພົບແຜນວຽກ' as const }
  if (plan.employee_id !== user.employee_id) {
    return { error: 'ແກ້ໄດ້ສະເພາະແຜນຂອງຕົນເອງ' as const }
  }
  if (plan.status === 'closed') return { error: 'ແຜນນີ້ສະຫຼຸບແລ້ວ' as const }
  return { user, plan }
}

/** ບັນທຶກຫົວແຜນ (ເປົ້າໝາຍ / ຕິດຂັດ) */
export async function savePlanHeader(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  const planDate = String(formData.get('plan_date') ?? '')
  if (!planDate) return { error: 'ບໍ່ມີວັນທີ' }

  const plan = await getOrCreatePlan(user.employee_id, planDate)

  await query(
    `update it.daily_plans
        set focus = $2::varchar, blocker = $3::text, updated_at = now()
      where id = $1::bigint`,
    [
      plan.id,
      String(formData.get('focus') ?? '').trim() || null,
      String(formData.get('blocker') ?? '').trim() || null,
    ]
  )

  revalidatePath('/plans')
  return { ok: true }
}

/** ເພີ່ມລາຍການວຽກເຂົ້າແຜນ */
export async function addPlanItem(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  const planDate = String(formData.get('plan_date') ?? '')
  const title = String(formData.get('title') ?? '').trim()
  if (!planDate) return { error: 'ບໍ່ມີວັນທີ' }
  if (!title) return { error: 'ກະລຸນາປ້ອນຊື່ວຽກ' }

  const hours = Number(formData.get('planned_hours') ?? 1)
  if (!Number.isFinite(hours) || hours < 0 || hours > 24) {
    return { error: 'ຊົ່ວໂມງທີ່ວາງແຜນຕ້ອງຢູ່ລະຫວ່າງ 0–24' }
  }

  const plan = await getOrCreatePlan(user.employee_id, planDate)

  // ຜູກກັບ ticket ຫຼື task ໄດ້ຢ່າງໃດຢ່າງໜຶ່ງ — ຄ່າມາໃນຮູບແບບ "ticket:12" / "task:8"
  const link = String(formData.get('link') ?? '')
  const ticketId = link.startsWith('ticket:') ? link.slice(7) : null
  const taskId = link.startsWith('task:') ? link.slice(5) : null

  await query(
    `insert into it.daily_plan_items
       (plan_id, sort_order, title, detail, planned_hours, ticket_id, task_id)
     select $1::bigint,
            coalesce(max(sort_order), 0) + 1,
            $2::varchar, $3::text, $4::numeric, $5::bigint, $6::bigint
       from it.daily_plan_items where plan_id = $1::bigint`,
    [
      plan.id,
      title,
      String(formData.get('detail') ?? '').trim() || null,
      hours,
      ticketId,
      taskId,
    ]
  )

  await logAudit(user.employee_id, 'daily_plan', plan.id, 'add_item', title)
  revalidatePath('/plans')
  return { ok: true }
}

/** ອັບເດດຄວາມຄືບໜ້າຂອງລາຍການ */
export async function updatePlanItem(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const planId = String(formData.get('plan_id') ?? '')
  const guard = await ownedPlan(planId)
  if ('error' in guard) return { error: guard.error }

  const itemId = String(formData.get('item_id') ?? '')
  const status = String(formData.get('status') ?? '')
  if (!PLAN_ITEM_STATUSES.includes(status as PlanItemStatus)) {
    return { error: 'ສະຖານະບໍ່ຖືກຕ້ອງ' }
  }

  const rawActual = String(formData.get('actual_hours') ?? '').trim()
  const actual = rawActual === '' ? null : Number(rawActual)
  if (actual !== null && (!Number.isFinite(actual) || actual < 0 || actual > 24)) {
    return { error: 'ຊົ່ວໂມງທີ່ໃຊ້ຈິງຕ້ອງຢູ່ລະຫວ່າງ 0–24' }
  }

  await query(
    `update it.daily_plan_items
        set status       = $2::varchar,
            actual_hours = $3::numeric,
            result_note  = $4::text,
            updated_at   = now()
      where id = $1::bigint and plan_id = $5::bigint`,
    [
      itemId,
      status,
      actual,
      String(formData.get('result_note') ?? '').trim() || null,
      planId,
    ]
  )

  revalidatePath('/plans')
  return { ok: true }
}

export async function deletePlanItem(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const planId = String(formData.get('plan_id') ?? '')
  const guard = await ownedPlan(planId)
  if ('error' in guard) return { error: guard.error }

  await query(
    `delete from it.daily_plan_items
      where id = $1::bigint and plan_id = $2::bigint`,
    [String(formData.get('item_id') ?? ''), planId]
  )

  revalidatePath('/plans')
  return { ok: true }
}

/** ສົ່ງແຜນໃຫ້ຫົວໜ້າເຫັນ */
export async function submitPlan(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const planId = String(formData.get('plan_id') ?? '')
  const guard = await ownedPlan(planId)
  if ('error' in guard) return { error: guard.error }
  if (Number(guard.plan.item_count) === 0) {
    return { error: 'ຕ້ອງມີວຽກຢ່າງໜ້ອຍ 1 ລາຍການກ່ອນສົ່ງແຜນ' }
  }

  await query(
    `update it.daily_plans
        set status = 'submitted', submitted_at = now(), updated_at = now()
      where id = $1::bigint`,
    [planId]
  )

  await logAudit(guard.user.employee_id, 'daily_plan', planId, 'submit')
  revalidatePath('/plans')
  return { ok: true }
}

/**
 * ສະຫຼຸບທ້າຍມື້: ປິດແຜນ ແລະ ຍົກວຽກທີ່ຍັງບໍ່ແລ້ວໄປແຜນມື້ຖັດໄປ
 * (ວຽກທີ່ຍັງບໍ່ແລ້ວຈະຖືກໝາຍເປັນ carried ແລ້ວກັອບປີ້ໄປວັນຖັດໄປ)
 */
export async function closePlan(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const planId = String(formData.get('plan_id') ?? '')
  const guard = await ownedPlan(planId)
  if ('error' in guard) return { error: guard.error }

  const carry = String(formData.get('carry') ?? '') === '1'
  const { plan, user } = guard

  if (carry) {
    const nextPlan = await getOrCreatePlan(
      user.employee_id,
      shiftDate(plan.plan_date, 1)
    )

    await query(
      `insert into it.daily_plan_items
         (plan_id, sort_order, title, detail, planned_hours, ticket_id, task_id,
          project_id)
       select $2::bigint,
              coalesce((select max(sort_order) from it.daily_plan_items
                         where plan_id = $2::bigint), 0)
                + row_number() over (order by sort_order),
              i.title, i.detail, i.planned_hours, i.ticket_id, i.task_id,
              i.project_id
         from it.daily_plan_items i
        where i.plan_id = $1::bigint
          and i.status in ('todo','in_progress','blocked')`,
      [planId, nextPlan.id]
    )

    await query(
      `update it.daily_plan_items
          set status = 'carried', updated_at = now()
        where plan_id = $1::bigint and status in ('todo','in_progress','blocked')`,
      [planId]
    )
  }

  await query(
    `update it.daily_plans
        set status = 'closed', closed_at = now(), updated_at = now()
      where id = $1::bigint`,
    [planId]
  )

  await logAudit(user.employee_id, 'daily_plan', planId, 'close', carry ? 'carry' : '')
  revalidatePath('/plans')
  return { ok: true }
}

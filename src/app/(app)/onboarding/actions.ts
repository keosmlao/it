'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { pool, query } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { logAudit } from '@/lib/activity'
import { isChecklistKind } from '@/lib/accounts/model'
import type { FormState } from '@/lib/action-state'

/**
 * ສ້າງຂັ້ນຕອນຈາກແມ່ແບບ
 *
 * ຄັດລອກຫົວຂໍ້ຈາກ it.checklist_templates ມາເປັນແຖວຂອງຕົນເອງ ບໍ່ໄດ້ອ້າງອີງ —
 * ແກ້ແມ່ແບບພາຍຫຼັງແລ້ວ ຂັ້ນຕອນທີ່ເຮັດໄປແລ້ວຈະບໍ່ປ່ຽນຕາມ (ປະຫວັດຕ້ອງຄົງທີ່)
 */
export async function createChecklist(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.manageAccounts(user)) return { error: 'ບໍ່ມີສິດສ້າງຂັ້ນຕອນ' }

  const employeeId = String(formData.get('employee_id') ?? '').trim()
  const kind = String(formData.get('kind') ?? '').trim()
  if (!/^\d+$/.test(employeeId)) return { error: 'ກະລຸນາເລືອກພະນັກງານ' }
  if (!isChecklistKind(kind)) return { error: 'ກະລຸນາເລືອກປະເພດຂັ້ນຕອນ' }

  const targetDate = String(formData.get('target_date') ?? '').trim() || null
  const note = String(formData.get('note') ?? '').trim() || null

  const client = await pool.connect()
  let id: string
  try {
    await client.query('begin')

    const { rows } = await client.query<{ id: string }>(
      `insert into it.employee_checklists
         (employee_id, kind, target_date, note, created_by)
       values ($1::int, $2::varchar, $3::date, $4::text, $5::int)
       returning id`,
      [Number(employeeId), kind, targetDate, note, user.employee_id]
    )
    id = rows[0].id

    await client.query(
      `insert into it.checklist_items (checklist_id, sort_order, title, hint)
       select $1::bigint, t.sort_order, t.title, t.hint
         from it.checklist_templates t
        where t.kind = $2::varchar and t.is_active
        order by t.sort_order`,
      [id, kind]
    )

    await client.query('commit')
  } catch (e) {
    await client.query('rollback')
    return { error: `ສ້າງບໍ່ສຳເລັດ: ${(e as Error).message}` }
  } finally {
    client.release()
  }

  await logAudit(user.employee_id, 'employee_checklist', id, 'create', kind)
  revalidatePath('/onboarding')
  redirect(`/onboarding/${id}`)
}

export async function toggleChecklistItem(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.manageAccounts(user)) return { error: 'ບໍ່ມີສິດຕິດຂັ້ນຕອນ' }

  const itemId = String(formData.get('item_id') ?? '').trim()
  const done = String(formData.get('is_done') ?? '') === '1'

  const rows = await query<{ checklist_id: string }>(
    `update it.checklist_items
        set is_done = $2::boolean,
            done_by = case when $2::boolean then $3::int else null end,
            done_at = case when $2::boolean then now() else null end
      where id = $1::bigint
      returning checklist_id`,
    [itemId, done, user.employee_id]
  )
  const item = rows[0]
  if (!item) return { error: 'ບໍ່ພົບຂັ້ນຕອນນີ້' }

  revalidatePath(`/onboarding/${item.checklist_id}`)
  revalidatePath('/onboarding')
  return { ok: true }
}

export async function addChecklistItem(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.manageAccounts(user)) return { error: 'ບໍ່ມີສິດເພີ່ມຂັ້ນຕອນ' }

  const checklistId = String(formData.get('checklist_id') ?? '').trim()
  const title = String(formData.get('title') ?? '')
    .trim()
    .slice(0, 200)
  if (!title) return { error: 'ກະລຸນາປ້ອນຫົວຂໍ້ຂັ້ນຕອນ' }

  await query(
    `insert into it.checklist_items (checklist_id, sort_order, title)
     select $1::bigint, coalesce(max(sort_order), 0) + 10, $2::varchar
       from it.checklist_items where checklist_id = $1::bigint`,
    [checklistId, title]
  )

  revalidatePath(`/onboarding/${checklistId}`)
  return { ok: true }
}

/**
 * ປິດຂັ້ນຕອນ — ບໍ່ໃຫ້ປິດຖ້າຍັງມີຂໍ້ຄ້າງ
 *
 * ຈຸດປະສົງທັງໝົດຂອງໜ້ານີ້ຄືກັນບໍ່ໃຫ້ລືມ ຈຶ່ງບໍ່ຄວນປິດໄດ້ທັງທີ່ຍັງບໍ່ຄົບ —
 * ຖ້າຂໍ້ໃດບໍ່ຕ້ອງເຮັດແທ້ ໃຫ້ຕິກມັນວ່າເຮັດແລ້ວພ້ອມໝາຍເຫດ
 */
export async function closeChecklist(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.manageAccounts(user)) return { error: 'ບໍ່ມີສິດປິດຂັ້ນຕອນ' }

  const id = String(formData.get('id') ?? '').trim()
  const cancel = String(formData.get('cancel') ?? '') === '1'

  if (!cancel) {
    const rows = await query<{ pending: string }>(
      `select count(*) as pending from it.checklist_items
        where checklist_id = $1::bigint and not is_done`,
      [id]
    )
    if (Number(rows[0]?.pending ?? 0) > 0) {
      return { error: `ຍັງເຫຼືອ ${rows[0].pending} ຂໍ້ທີ່ຍັງບໍ່ໄດ້ຕິກ` }
    }
  }

  const updated = await query<{ id: string }>(
    `update it.employee_checklists
        set status = $2::varchar,
            completed_at = case when $2::varchar = 'done' then current_date end,
            updated_at = now()
      where id = $1::bigint and status = 'open'
      returning id`,
    [id, cancel ? 'cancelled' : 'done']
  )
  if (updated.length === 0) return { error: 'ຂັ້ນຕອນນີ້ປິດໄປແລ້ວ' }

  await logAudit(
    user.employee_id,
    'employee_checklist',
    id,
    cancel ? 'cancel' : 'complete'
  )
  revalidatePath('/onboarding')
  revalidatePath(`/onboarding/${id}`)
  return { ok: true }
}

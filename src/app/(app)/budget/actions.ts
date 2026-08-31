'use server'

import { revalidatePath } from 'next/cache'
import { query } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { logAudit } from '@/lib/activity'
import { todayISO } from '@/lib/format'
import { isBudgetCategory, isBudgetSource } from '@/lib/budget/model'
import { isSubCurrency } from '@/lib/subscriptions/model'
import type { FormState } from '@/lib/action-state'

export async function saveBudgetLine(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.module(user, 'budget', 'edit')) return { error: 'ບໍ່ມີສິດຕັ້ງງົບປະມານ' }

  const id = String(formData.get('id') ?? '').trim()
  const name = String(formData.get('name') ?? '')
    .trim()
    .slice(0, 150)
  const category = String(formData.get('category') ?? 'other').trim()
  const source = String(formData.get('source') ?? 'manual').trim()
  const currency = String(formData.get('currency') ?? 'LAK').trim()

  const year = Number(String(formData.get('fiscal_year') ?? '').trim())
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return { error: 'ປີງົບປະມານບໍ່ຖືກຕ້ອງ' }
  }
  if (!name) return { error: 'ກະລຸນາປ້ອນຊື່ເສັ້ນງົບປະມານ' }
  if (!isBudgetCategory(category)) return { error: 'ໝວດບໍ່ຖືກຕ້ອງ' }
  if (!isBudgetSource(source)) return { error: 'ແຫຼ່ງຂອງຍອດໃຊ້ຈິງບໍ່ຖືກຕ້ອງ' }
  if (!isSubCurrency(currency)) return { error: 'ສະກຸນເງິນບໍ່ຖືກຕ້ອງ' }

  const plannedRaw = String(formData.get('planned_amount') ?? '')
    .replace(/,/g, '')
    .trim()
  const planned = Number(plannedRaw || '0')
  if (!Number.isFinite(planned) || planned < 0) return { error: 'ຍອດງົບປະມານບໍ່ຖືກຕ້ອງ' }

  const params = [
    year,
    name,
    category,
    source,
    String(formData.get('source_filter') ?? '').trim().slice(0, 20) || null,
    currency,
    planned,
    String(formData.get('note') ?? '').trim().slice(0, 300) || null,
  ]

  try {
    if (id) {
      const rows = await query<{ id: string }>(
        `update it.budget_lines
            set fiscal_year = $2::int, name = $3::varchar, category = $4::varchar,
                source = $5::varchar, source_filter = $6::varchar,
                currency = $7::varchar, planned_amount = $8::numeric,
                note = $9::varchar, updated_at = now()
          where id = $1::bigint
          returning id`,
        [id, ...params]
      )
      if (rows.length === 0) return { error: 'ບໍ່ພົບເສັ້ນງົບປະມານນີ້' }
      await logAudit(user.employee_id, 'budget_line', id, 'update', name)
    } else {
      const rows = await query<{ id: string }>(
        `insert into it.budget_lines
           (fiscal_year, name, category, source, source_filter, currency,
            planned_amount, note, created_by)
         values ($1::int, $2::varchar, $3::varchar, $4::varchar, $5::varchar,
                 $6::varchar, $7::numeric, $8::varchar, $9::int)
         returning id`,
        [...params, user.employee_id]
      )
      await logAudit(user.employee_id, 'budget_line', rows[0].id, 'create', name)
    }
  } catch (err) {
    if (String((err as { code?: string })?.code) === '23505') {
      return { error: 'ປີນີ້ມີເສັ້ນງົບປະມານຊື່ດຽວກັນ ແລະ ສະກຸນດຽວກັນແລ້ວ' }
    }
    throw err
  }

  revalidatePath('/budget')
  if (id) revalidatePath(`/budget/${id}`)
  return { ok: true }
}

export async function deleteBudgetLine(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.module(user, 'budget', 'delete')) return { error: 'ບໍ່ມີສິດລຶບ' }

  const id = String(formData.get('id') ?? '').trim()
  const rows = await query<{ name: string }>(
    'delete from it.budget_lines where id = $1::bigint returning name',
    [id]
  )
  if (rows.length === 0) return { error: 'ບໍ່ພົບເສັ້ນງົບປະມານນີ້' }

  await logAudit(user.employee_id, 'budget_line', id, 'delete', rows[0].name)
  revalidatePath('/budget')
  return { ok: true }
}

/** ບັນທຶກລາຍຈ່າຍເອງ — ໃຊ້ໄດ້ສະເພາະເສັ້ນທີ່ຕັ້ງເປັນ manual */
export async function addBudgetSpend(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.module(user, 'budget', 'create')) return { error: 'ບໍ່ມີສິດບັນທຶກລາຍຈ່າຍ' }

  const lineId = String(formData.get('line_id') ?? '').trim()
  const description = String(formData.get('description') ?? '')
    .trim()
    .slice(0, 200)
  if (!description) return { error: 'ກະລຸນາປ້ອນລາຍລະອຽດ' }

  const amountRaw = String(formData.get('amount') ?? '').replace(/,/g, '').trim()
  const amount = Number(amountRaw)
  if (!Number.isFinite(amount) || amount < 0) return { error: 'ຈຳນວນເງິນບໍ່ຖືກຕ້ອງ' }

  const rows = await query<{ source: string }>(
    'select source from it.budget_lines where id = $1::bigint',
    [lineId]
  )
  if (rows.length === 0) return { error: 'ບໍ່ພົບເສັ້ນງົບປະມານນີ້' }
  if (rows[0].source !== 'manual') {
    return { error: 'ເສັ້ນນີ້ອ່ານຍອດໃຊ້ຈິງຈາກລະບົບອັດຕະໂນມັດ ບໍ່ຕ້ອງປ້ອນເອງ' }
  }

  await query(
    `insert into it.budget_spends
       (line_id, spend_date, amount, description, ref_no, created_by)
     values ($1::bigint, $2::date, $3::numeric, $4::varchar, $5::varchar, $6::int)`,
    [
      lineId,
      String(formData.get('spend_date') ?? '').trim() || todayISO(),
      amount,
      description,
      String(formData.get('ref_no') ?? '').trim().slice(0, 60) || null,
      user.employee_id,
    ]
  )

  await logAudit(user.employee_id, 'budget_line', lineId, 'spend', description)
  revalidatePath('/budget')
  revalidatePath(`/budget/${lineId}`)
  return { ok: true }
}

export async function deleteBudgetSpend(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.module(user, 'budget', 'delete')) return { error: 'ບໍ່ມີສິດລຶບ' }

  const spendId = String(formData.get('spend_id') ?? '').trim()
  const rows = await query<{ line_id: string }>(
    'delete from it.budget_spends where id = $1::bigint returning line_id',
    [spendId]
  )
  if (rows.length === 0) return { error: 'ບໍ່ພົບລາຍຈ່າຍນີ້' }

  revalidatePath(`/budget/${rows[0].line_id}`)
  revalidatePath('/budget')
  return { ok: true }
}

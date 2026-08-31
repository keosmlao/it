'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { query } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { logAudit } from '@/lib/activity'
import { isoDate, todayISO } from '@/lib/format'
import {
  isPmCategory,
  isPmResult,
  nextDueAfterDone,
} from '@/lib/maintenance/model'
import { getMaintenancePlan } from '@/lib/maintenance/queries'
import type { FormState } from '@/lib/action-state'

function readFields(formData: FormData) {
  const text = (name: string, max: number) => {
    const v = String(formData.get(name) ?? '').trim()
    return v ? v.slice(0, max) : null
  }

  return {
    title: String(formData.get('title') ?? '')
      .trim()
      .slice(0, 150),
    category: String(formData.get('category') ?? '').trim(),
    asset_code: text('asset_code', 40),
    location_code: text('location_code', 20),
    interval_days: Number(String(formData.get('interval_days') ?? '').trim()),
    next_due_date: String(formData.get('next_due_date') ?? '').trim() || null,
    owner_employee_id: text('owner_employee_id', 12),
    checklist: text('checklist', 4000),
  }
}

type Fields = ReturnType<typeof readFields>

function validate(f: Fields): string | null {
  if (!f.title) return 'ກະລຸນາປ້ອນຊື່ວຽກ'
  if (!isPmCategory(f.category)) return 'ກະລຸນາເລືອກປະເພດວຽກ'
  if (!Number.isInteger(f.interval_days) || f.interval_days < 1 || f.interval_days > 3650) {
    return 'ຮອບຕ້ອງເປັນຈຳນວນວັນລະຫວ່າງ 1 ຫາ 3650'
  }
  if (!f.next_due_date) return 'ກະລຸນາປ້ອນກຳນົດຄັ້ງຕໍ່ໄປ'
  if (f.owner_employee_id && !/^\d+$/.test(f.owner_employee_id)) {
    return 'ຜູ້ຮັບຜິດຊອບບໍ່ຖືກຕ້ອງ'
  }
  return null
}

function values(f: Fields) {
  return [
    f.title,
    f.category,
    f.asset_code,
    f.location_code,
    f.interval_days,
    f.next_due_date,
    f.owner_employee_id ? Number(f.owner_employee_id) : null,
    f.checklist,
  ]
}

export async function createMaintenancePlan(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.module(user, 'maintenance', 'create')) return { error: 'ບໍ່ມີສິດຕັ້ງແຜນບຳລຸງຮັກສາ' }

  const f = readFields(formData)
  const invalid = validate(f)
  if (invalid) return { error: invalid }

  const rows = await query<{ id: string; code: string }>(
    `insert into it.maintenance_plans
       (title, category, asset_code, location_code, interval_days, next_due_date,
        owner_employee_id, checklist, created_by)
     values ($1::varchar, $2::varchar, $3::varchar, $4::varchar, $5::int,
             $6::date, $7::int, $8::text, $9::int)
     returning id, code`,
    [...values(f), user.employee_id]
  )

  await logAudit(user.employee_id, 'maintenance_plan', rows[0].id, 'create', f.title)
  revalidatePath('/maintenance')
  redirect(`/maintenance/${rows[0].id}`)
}

export async function updateMaintenancePlan(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.module(user, 'maintenance', 'edit')) return { error: 'ບໍ່ມີສິດແກ້ແຜນ' }

  const id = String(formData.get('id') ?? '').trim()
  const f = readFields(formData)
  const invalid = validate(f)
  if (invalid) return { error: invalid }

  const updated = await query<{ id: string }>(
    `update it.maintenance_plans
        set title = $2::varchar, category = $3::varchar, asset_code = $4::varchar,
            location_code = $5::varchar, interval_days = $6::int,
            next_due_date = $7::date, owner_employee_id = $8::int,
            checklist = $9::text, updated_at = now()
      where id = $1::bigint
      returning id`,
    [id, ...values(f)]
  )
  if (updated.length === 0) return { error: 'ບໍ່ພົບແຜນນີ້' }

  await logAudit(user.employee_id, 'maintenance_plan', id, 'update', f.title)
  revalidatePath('/maintenance')
  revalidatePath(`/maintenance/${id}`)
  redirect(`/maintenance/${id}`)
}

/**
 * ບັນທຶກວ່າເຮັດແລ້ວ
 *
 * ກຳນົດຄັ້ງຕໍ່ໄປນັບຈາກ "ມື້ທີ່ເຮັດແທ້" ບໍ່ແມ່ນກຳນົດເກົ່າ — ບໍ່ດັ່ງນັ້ນວຽກທີ່
 * ຊັກຊ້າຈະຍັງຄ້າງເປັນ "ເລີຍກຳນົດ" ຢູ່ ທັງທີ່ຫາກໍເຮັດແລ້ວ.
 * ຂ້າມຮອບ (skipped) ກໍເລື່ອນຄືກັນ ບໍ່ດັ່ງນັ້ນຈະຄ້າງເຕືອນຕະຫຼອດ
 */
export async function logMaintenance(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.module(user, 'maintenance', 'edit')) return { error: 'ບໍ່ມີສິດບັນທຶກ' }

  const id = String(formData.get('id') ?? '').trim()
  const plan = await getMaintenancePlan(id)
  if (!plan) return { error: 'ບໍ່ພົບແຜນນີ້' }

  const result = String(formData.get('result') ?? 'ok').trim()
  if (!isPmResult(result)) return { error: 'ຜົນບໍ່ຖືກຕ້ອງ' }

  const performedAt = String(formData.get('performed_at') ?? '').trim() || todayISO()
  if (performedAt > todayISO()) return { error: 'ວັນທີເຮັດຢູ່ໃນອະນາຄົດບໍ່ໄດ້' }

  const minutesRaw = String(formData.get('minutes') ?? '').trim()
  const minutes = minutesRaw ? Number(minutesRaw) : null
  if (minutes !== null && (!Number.isFinite(minutes) || minutes < 0 || minutes > 10000)) {
    return { error: 'ເວລາທີ່ໃຊ້ບໍ່ຖືກຕ້ອງ' }
  }

  const note = String(formData.get('note') ?? '').trim()
  if (result === 'issue' && !note) return { error: 'ພົບບັນຫາ — ກະລຸນາບັນທຶກລາຍລະອຽດ' }

  await query(
    `insert into it.maintenance_logs
       (plan_id, performed_at, result, note, minutes, created_by)
     values ($1::bigint, $2::date, $3::varchar, $4::text, $5::int, $6::int)`,
    [id, performedAt, result, note || null, minutes, user.employee_id]
  )

  const nextDue = nextDueAfterDone(performedAt, plan.interval_days)
  await query(
    `update it.maintenance_plans
        set last_done_at = $2::date, next_due_date = $3::date, updated_at = now()
      where id = $1::bigint`,
    [id, performedAt, nextDue]
  )

  await logAudit(user.employee_id, 'maintenance_plan', id, `log_${result}`, performedAt)
  revalidatePath('/maintenance')
  revalidatePath(`/maintenance/${id}`)
  return { ok: true, message: `ບັນທຶກແລ້ວ — ກຳນົດຕໍ່ໄປ ${nextDue}` }
}

export async function setMaintenanceActive(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.module(user, 'maintenance', 'edit')) return { error: 'ບໍ່ມີສິດແກ້ແຜນ' }

  const id = String(formData.get('id') ?? '').trim()
  const active = String(formData.get('is_active') ?? '') === '1'

  const plan = await getMaintenancePlan(id)
  if (!plan) return { error: 'ບໍ່ພົບແຜນນີ້' }

  // ເປີດຄືນຫຼັງປິດໄວ້ດົນ — ກຳນົດເກົ່າອາດຜ່ານໄປແລ້ວ ຈຶ່ງເລື່ອນມາເປັນມື້ນີ້
  const nextDue =
    active && isoDate(plan.next_due_date) < todayISO()
      ? todayISO()
      : isoDate(plan.next_due_date)

  await query(
    `update it.maintenance_plans
        set is_active = $2::boolean, next_due_date = $3::date, updated_at = now()
      where id = $1::bigint`,
    [id, active, nextDue]
  )

  await logAudit(
    user.employee_id,
    'maintenance_plan',
    id,
    active ? 'activate' : 'deactivate'
  )
  revalidatePath('/maintenance')
  revalidatePath(`/maintenance/${id}`)
  return { ok: true }
}

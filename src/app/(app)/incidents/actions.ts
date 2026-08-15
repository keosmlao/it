'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { query } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { logAudit } from '@/lib/activity'
import { isIncidentService, isIncidentSeverity } from '@/lib/incidents/model'
import { getIncident } from '@/lib/incidents/queries'
import type { FormState } from '@/lib/action-state'

function readFields(formData: FormData) {
  const text = (name: string, max: number) => {
    const v = String(formData.get(name) ?? '').trim()
    return v ? v.slice(0, max) : null
  }

  return {
    title: String(formData.get('title') ?? '')
      .trim()
      .slice(0, 200),
    service: String(formData.get('service') ?? '').trim(),
    severity: String(formData.get('severity') ?? 'major').trim(),
    subscription_id: text('subscription_id', 20),
    asset_code: text('asset_code', 40),
    impact: text('impact', 300),
    started_at: String(formData.get('started_at') ?? '').trim(),
    resolved_at: String(formData.get('resolved_at') ?? '').trim() || null,
    cause: text('cause', 4000),
    action: text('action', 4000),
    prevention: text('prevention', 4000),
    reported_by: text('reported_by', 120),
  }
}

type Fields = ReturnType<typeof readFields>

function validate(f: Fields): string | null {
  if (!f.title) return 'ກະລຸນາປ້ອນຫົວຂໍ້'
  if (!isIncidentService(f.service)) return 'ກະລຸນາເລືອກບໍລິການທີ່ລົ້ມ'
  if (!isIncidentSeverity(f.severity)) return 'ລະດັບຄວາມຮ້າຍແຮງບໍ່ຖືກຕ້ອງ'
  if (!f.started_at) return 'ກະລຸນາປ້ອນເວລາທີ່ເລີ່ມລົ້ມ'
  if (f.resolved_at && f.resolved_at < f.started_at) {
    return 'ເວລາທີ່ແກ້ໄດ້ຢູ່ກ່ອນເວລາທີ່ເລີ່ມລົ້ມບໍ່ໄດ້'
  }
  if (f.subscription_id && !/^\d+$/.test(f.subscription_id)) {
    return 'ສັນຍາເຊົ່າທີ່ເລືອກບໍ່ຖືກຕ້ອງ'
  }
  return null
}

function values(f: Fields) {
  return [
    f.title,
    f.service,
    f.severity,
    f.subscription_id ? Number(f.subscription_id) : null,
    f.asset_code,
    f.impact,
    f.started_at,
    f.resolved_at,
    f.cause,
    f.action,
    f.prevention,
    f.reported_by,
    // ມີເວລາທີ່ແກ້ໄດ້ = ຈົບແລ້ວ — ບໍ່ໃຫ້ຜູ້ໃຊ້ຕັ້ງສະຖານະເອງໃຫ້ຂັດກັນ
    f.resolved_at ? 'resolved' : 'open',
  ]
}

export async function createIncident(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.manageAssets(user)) return { error: 'ບໍ່ມີສິດບັນທຶກເຫດຂັດຂ້ອງ' }

  const f = readFields(formData)
  const invalid = validate(f)
  if (invalid) return { error: invalid }

  const rows = await query<{ id: string; code: string }>(
    `insert into it.incidents
       (title, service, severity, subscription_id, asset_code, impact,
        started_at, resolved_at, cause, action, prevention, reported_by, status,
        created_by)
     values ($1::varchar, $2::varchar, $3::varchar, $4::bigint, $5::varchar,
             $6::varchar, $7::timestamptz, $8::timestamptz, $9::text, $10::text,
             $11::text, $12::varchar, $13::varchar, $14::int)
     returning id, code`,
    [...values(f), user.employee_id]
  )

  await logAudit(user.employee_id, 'incident', rows[0].id, 'create', f.title)
  revalidatePath('/incidents')
  redirect(`/incidents/${rows[0].id}`)
}

export async function updateIncident(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.manageAssets(user)) return { error: 'ບໍ່ມີສິດແກ້ເຫດຂັດຂ້ອງ' }

  const id = String(formData.get('id') ?? '').trim()
  const f = readFields(formData)
  const invalid = validate(f)
  if (invalid) return { error: invalid }

  const updated = await query<{ id: string }>(
    `update it.incidents
        set title = $2::varchar, service = $3::varchar, severity = $4::varchar,
            subscription_id = $5::bigint, asset_code = $6::varchar,
            impact = $7::varchar, started_at = $8::timestamptz,
            resolved_at = $9::timestamptz, cause = $10::text, action = $11::text,
            prevention = $12::text, reported_by = $13::varchar,
            status = $14::varchar, updated_at = now()
      where id = $1::bigint
      returning id`,
    [id, ...values(f)]
  )
  if (updated.length === 0) return { error: 'ບໍ່ພົບເຫດຂັດຂ້ອງນີ້' }

  await logAudit(user.employee_id, 'incident', id, 'update', f.title)
  revalidatePath('/incidents')
  revalidatePath(`/incidents/${id}`)
  redirect(`/incidents/${id}`)
}

/**
 * ປິດເຫດຂັດຂ້ອງ — ປຸ່ມດ່ວນຕອນລະບົບກັບມາໃຊ້ໄດ້
 *
 * ບໍ່ບັງຄັບໃຫ້ຂຽນສາເຫດຕອນນີ້ ເພາະຕອນຫາກໍແກ້ໄດ້ຍັງບໍ່ທັນຮູ້ສາເຫດແທ້ —
 * ກັບມາຕື່ມພາຍຫຼັງໄດ້
 */
export async function resolveIncident(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.manageAssets(user)) return { error: 'ບໍ່ມີສິດປິດເຫດຂັດຂ້ອງ' }

  const id = String(formData.get('id') ?? '').trim()
  const incident = await getIncident(id)
  if (!incident) return { error: 'ບໍ່ພົບເຫດຂັດຂ້ອງນີ້' }
  if (incident.status === 'resolved') return { error: 'ເຫດນີ້ປິດໄປແລ້ວ' }

  const resolvedAt = String(formData.get('resolved_at') ?? '').trim()
  if (!resolvedAt) return { error: 'ກະລຸນາປ້ອນເວລາທີ່ກັບມາໃຊ້ໄດ້' }

  const action = String(formData.get('action') ?? '').trim()

  const updated = await query<{ id: string }>(
    `update it.incidents
        set resolved_at = $2::timestamptz, status = 'resolved',
            action = coalesce(nullif($3::text, ''), action), updated_at = now()
      where id = $1::bigint and started_at <= $2::timestamptz
      returning id`,
    [id, resolvedAt, action]
  )
  if (updated.length === 0) {
    return { error: 'ເວລາທີ່ກັບມາໃຊ້ໄດ້ຢູ່ກ່ອນເວລາທີ່ເລີ່ມລົ້ມ' }
  }

  await logAudit(user.employee_id, 'incident', id, 'resolve', resolvedAt)
  revalidatePath('/incidents')
  revalidatePath(`/incidents/${id}`)
  return { ok: true }
}

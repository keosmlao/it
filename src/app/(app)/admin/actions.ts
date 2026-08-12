'use server'

import { revalidatePath } from 'next/cache'
import { query } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { logAudit } from '@/lib/activity'
import { invalidate } from '@/lib/cache'
import type { FormState } from '@/lib/action-state'
import { validateSla } from '@/lib/action-policy'

async function requireManager() {
  const user = await requireUser()
  if (!can.administer(user)) throw new Error('ສະເພາະຜູ້ຈັດການເທົ່ານັ້ນ')
  return user
}

export async function updateSla(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireManager()
  const priority = String(formData.get('priority'))
  const respond = Number(formData.get('respond_minutes'))
  const resolve = Number(formData.get('resolve_minutes'))

  const invalid = validateSla(respond, resolve)
  if (invalid) return { error: invalid }

  await query(
    `update it.sla_policies
        set respond_minutes = $2, resolve_minutes = $3
      where priority = $1`,
    [priority, respond, resolve]
  )

  await logAudit(user.employee_id, 'sla', priority, 'update', `${respond}/${resolve}`)
  invalidate('ticket:')
  revalidatePath('/admin')

  return { ok: true }
}

export async function saveTicketCategory(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireManager()
  const code = String(formData.get('code') ?? '').trim().toUpperCase()
  const nameLo = String(formData.get('name_lo') ?? '').trim()
  if (!code || !nameLo) return { error: 'ຕ້ອງມີລະຫັດ ແລະ ຊື່' }

  await query(
    `insert into it.ticket_categories (code, name_lo, unit_code, sort_order)
     values ($1, $2, $3, $4)
     on conflict (code) do update
       set name_lo = excluded.name_lo,
           unit_code = excluded.unit_code,
           sort_order = excluded.sort_order`,
    [
      code,
      nameLo,
      String(formData.get('unit_code') ?? '') || null,
      Number(formData.get('sort_order')) || 50,
    ]
  )

  await logAudit(user.employee_id, 'ticket_category', code, 'save', nameLo)
  invalidate('ticket:')
  revalidatePath('/admin')
  revalidatePath('/tickets')

  return { ok: true }
}

export async function toggleCategory(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireManager()
  const code = String(formData.get('code'))

  await query(
    `update it.ticket_categories set is_active = not is_active where code = $1`,
    [code]
  )

  await logAudit(user.employee_id, 'ticket_category', code, 'toggle')
  invalidate('ticket:')
  revalidatePath('/admin')

  return { ok: true }
}

export async function setRoleOverride(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireManager()
  const employeeId = Number(formData.get('employee_id'))
  const role = String(formData.get('role') ?? '')

  if (!role) {
    await query('delete from it.user_role_override where employee_id = $1', [employeeId])
  } else {
    await query(
      `insert into it.user_role_override (employee_id, role, note, created_by)
       values ($1, $2, $3, $4)
       on conflict (employee_id) do update
         set role = excluded.role, note = excluded.note`,
      [employeeId, role, String(formData.get('note') ?? '').trim() || null, user.employee_id]
    )
  }

  await logAudit(user.employee_id, 'role_override', employeeId, 'set', role || 'clear')
  invalidate('ticket:')
  revalidatePath('/admin')
  revalidatePath('/', 'layout')

  return { ok: true }
}

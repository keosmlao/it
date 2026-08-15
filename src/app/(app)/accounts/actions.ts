'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { query } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { logAudit } from '@/lib/activity'
import { todayISO } from '@/lib/format'
import { isAccountStatus, isSystemKind } from '@/lib/accounts/model'
import type { FormState } from '@/lib/action-state'

// ------------------------------------------------------------- ລະບົບ

export async function saveAccountSystem(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.manageAccounts(user)) return { error: 'ບໍ່ມີສິດຈັດການລະບົບ' }

  const code = String(formData.get('code') ?? '')
    .trim()
    .toUpperCase()
    .slice(0, 20)
  const name = String(formData.get('name') ?? '')
    .trim()
    .slice(0, 120)
  const kind = String(formData.get('kind') ?? 'app').trim()
  const editing = String(formData.get('editing') ?? '') === '1'

  if (!code || !/^[A-Z0-9_-]+$/.test(code)) {
    return { error: 'ລະຫັດລະບົບໃຫ້ໃຊ້ A–Z, 0–9, ຂີດ ຫຼື ຂີດລຸ່ມ ເທົ່ານັ້ນ' }
  }
  if (!name) return { error: 'ກະລຸນາປ້ອນຊື່ລະບົບ' }
  if (!isSystemKind(kind)) return { error: 'ປະເພດລະບົບບໍ່ຖືກຕ້ອງ' }

  const seatRaw = String(formData.get('seat_limit') ?? '').trim()
  const seatLimit = seatRaw ? Number(seatRaw) : null
  if (seatLimit !== null && (!Number.isInteger(seatLimit) || seatLimit < 0)) {
    return { error: 'ຈຳນວນ seat ຕ້ອງເປັນຈຳນວນເຕັມ' }
  }

  const subscriptionId = String(formData.get('subscription_id') ?? '').trim() || null
  const ownerId = String(formData.get('owner_employee_id') ?? '').trim() || null
  const note = String(formData.get('note') ?? '').trim().slice(0, 300) || null

  const params = [code, name, kind, subscriptionId, seatLimit, ownerId, note]

  if (editing) {
    const rows = await query<{ code: string }>(
      `update it.account_systems
          set name = $2::varchar, kind = $3::varchar, subscription_id = $4::bigint,
              seat_limit = $5::int, owner_employee_id = $6::int, note = $7::varchar
        where code = $1::varchar
        returning code`,
      params
    )
    if (rows.length === 0) return { error: 'ບໍ່ພົບລະບົບນີ້' }
  } else {
    try {
      await query(
        `insert into it.account_systems
           (code, name, kind, subscription_id, seat_limit, owner_employee_id, note)
         values ($1::varchar, $2::varchar, $3::varchar, $4::bigint, $5::int,
                 $6::int, $7::varchar)`,
        params
      )
    } catch (err) {
      if (String((err as { code?: string })?.code) === '23505') {
        return { error: 'ລະຫັດລະບົບນີ້ມີແລ້ວ' }
      }
      throw err
    }
  }

  await logAudit(user.employee_id, 'account_system', code, editing ? 'update' : 'create', name)
  revalidatePath('/accounts/systems')
  revalidatePath('/accounts')
  return { ok: true }
}

export async function setSystemActive(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.manageAccounts(user)) return { error: 'ບໍ່ມີສິດຈັດການລະບົບ' }

  const code = String(formData.get('code') ?? '').trim()
  const active = String(formData.get('is_active') ?? '') === '1'

  const rows = await query<{ code: string }>(
    `update it.account_systems set is_active = $2::boolean
      where code = $1::varchar returning code`,
    [code, active]
  )
  if (rows.length === 0) return { error: 'ບໍ່ພົບລະບົບນີ້' }

  await logAudit(user.employee_id, 'account_system', code, active ? 'activate' : 'deactivate')
  revalidatePath('/accounts/systems')
  return { ok: true }
}

// ------------------------------------------------------------- ບັນຊີ

export async function createAccount(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.manageAccounts(user)) return { error: 'ບໍ່ມີສິດເປີດບັນຊີ' }

  const systemCode = String(formData.get('system_code') ?? '').trim()
  const employeeId = String(formData.get('employee_id') ?? '').trim()
  const username = String(formData.get('username') ?? '')
    .trim()
    .slice(0, 150)

  if (!systemCode) return { error: 'ກະລຸນາເລືອກລະບົບ' }
  if (!/^\d+$/.test(employeeId)) return { error: 'ກະລຸນາເລືອກພະນັກງານ' }
  if (!username) return { error: 'ກະລຸນາປ້ອນຊື່ບັນຊີ (username)' }

  const grantedAt = String(formData.get('granted_at') ?? '').trim() || todayISO()
  const note = String(formData.get('note') ?? '').trim().slice(0, 300) || null

  try {
    await query(
      `insert into it.system_accounts
         (system_code, employee_id, username, granted_at, note, created_by)
       values ($1::varchar, $2::int, $3::varchar, $4::date, $5::varchar, $6::int)`,
      [systemCode, Number(employeeId), username, grantedAt, note, user.employee_id]
    )
  } catch (err) {
    if (
      String((err as { constraint?: string })?.constraint ?? '').includes(
        'system_accounts_open_idx'
      )
    ) {
      return { error: 'ຄົນນີ້ມີບັນຊີທີ່ຍັງເປີດຢູ່ໃນລະບົບນີ້ແລ້ວ' }
    }
    throw err
  }

  await logAudit(user.employee_id, 'system_account', systemCode, 'grant', username)
  revalidatePath('/accounts')
  redirect('/accounts')
}

export async function setAccountStatus(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.manageAccounts(user)) return { error: 'ບໍ່ມີສິດແກ້ບັນຊີ' }

  const id = String(formData.get('id') ?? '').trim()
  const status = String(formData.get('status') ?? '').trim()
  if (!isAccountStatus(status)) return { error: 'ສະຖານະບໍ່ຖືກຕ້ອງ' }

  const rows = await query<{ id: string; username: string }>(
    `update it.system_accounts
        set status = $2::varchar,
            closed_at = case when $2::varchar = 'closed'
                             then coalesce(closed_at, current_date) else null end,
            updated_at = now()
      where id = $1::bigint
      returning id, username`,
    [id, status]
  )
  if (rows.length === 0) return { error: 'ບໍ່ພົບບັນຊີນີ້' }

  await logAudit(user.employee_id, 'system_account', id, status, rows[0].username)
  revalidatePath('/accounts')
  return { ok: true }
}

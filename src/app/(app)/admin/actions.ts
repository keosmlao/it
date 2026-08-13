'use server'

import { revalidatePath } from 'next/cache'
import { pool, query } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import {
  can,
  PERMISSIONS,
  roleAllows,
  type Permission,
  type Role,
} from '@/lib/auth/roles'
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

/** ເພີ່ມ ຫຼື ແກ້ຂັ້ນຕອນອະນຸມັດໃບສະເໜີຊື້ */
export async function savePrStep(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireManager()

  const stepNo = Number(formData.get('step_no'))
  const nameLo = String(formData.get('name_lo') ?? '').trim()
  if (!Number.isInteger(stepNo) || stepNo < 1) return { error: 'ລຳດັບຂັ້ນຕ້ອງເປັນ 1 ຂຶ້ນໄປ' }
  if (!nameLo) return { error: 'ຕ້ອງມີຊື່ຂັ້ນ' }

  const role = String(formData.get('approver_role') ?? '')
  const employeeRaw = String(formData.get('approver_employee_id') ?? '')
  const employeeId = employeeRaw ? Number(employeeRaw) : null
  if (!role && !employeeId) {
    return { error: 'ຕ້ອງເລືອກບົດບາດ ຫຼື ລະບຸຄົນຢ່າງໃດຢ່າງໜຶ່ງ' }
  }

  const minAmount = Number(String(formData.get('min_amount') ?? '0').replace(/,/g, ''))
  if (!Number.isFinite(minAmount) || minAmount < 0) {
    return { error: 'ມູນຄ່າຕັ້ງແຕ່ ຕ້ອງເປັນຕົວເລກ 0 ຂຶ້ນໄປ' }
  }

  await query(
    `insert into it.pr_approval_steps
       (step_no, name_lo, approver_role, approver_employee_id, min_amount, note)
     values ($1::int, $2::varchar, $3::varchar, $4::int, $5::numeric, $6::text)
     on conflict (step_no) do update
       set name_lo              = excluded.name_lo,
           approver_role        = excluded.approver_role,
           approver_employee_id = excluded.approver_employee_id,
           min_amount           = excluded.min_amount,
           note                 = excluded.note`,
    [
      stepNo,
      nameLo,
      // ລະບຸຄົນໂດຍກົງ = ບໍ່ໃຊ້ບົດບາດ
      employeeId ? null : role || null,
      employeeId,
      minAmount,
      String(formData.get('note') ?? '').trim() || null,
    ]
  )

  await logAudit(user.employee_id, 'pr_step', String(stepNo), 'save', nameLo)
  revalidatePath('/admin')
  revalidatePath('/purchase')
  return { ok: true }
}

/** ເປີດ/ປິດ ຫຼື ລຶບຂັ້ນ */
export async function togglePrStep(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireManager()
  const stepNo = Number(formData.get('step_no'))

  if (String(formData.get('mode')) === 'delete') {
    const used = await query<{ count: string }>(
      'select count(*) from it.pr_step_approvals where step_no = $1::int',
      [stepNo]
    )
    if (Number(used[0].count) > 0) {
      return { error: 'ຂັ້ນນີ້ຖືກໃຊ້ໃນໃບທີ່ອະນຸມັດໄປແລ້ວ — ໃຫ້ປິດແທນການລຶບ' }
    }
    await query('delete from it.pr_approval_steps where step_no = $1::int', [stepNo])
    await logAudit(user.employee_id, 'pr_step', String(stepNo), 'delete')
  } else {
    await query(
      'update it.pr_approval_steps set is_active = not is_active where step_no = $1::int',
      [stepNo]
    )
    await logAudit(user.employee_id, 'pr_step', String(stepNo), 'toggle')
  }

  revalidatePath('/admin')
  revalidatePath('/purchase')
  return { ok: true }
}

/** ກົດສົ່ງຂໍ້ຄວາມທີ່ຄ້າງຢູ່ຄິວດຽວນີ້ */
export async function sendQueuedNotifications(
  _prev: FormState,
  _formData: FormData
): Promise<FormState> {
  const user = await requireManager()
  const { drainOutbox } = await import('@/lib/notify/outbox')
  const result = await drainOutbox(50)

  await logAudit(
    user.employee_id,
    'notify',
    null,
    'drain',
    `ສົ່ງ ${result.sent} · ລົ້ມ ${result.failed}`
  )
  revalidatePath('/admin')

  if (!result.configured) {
    return { error: 'ຍັງບໍ່ໄດ້ຕັ້ງ LINE_CHANNEL_ACCESS_TOKEN ໃນ .env.local' }
  }
  if (result.picked === 0) return { error: 'ບໍ່ມີຂໍ້ຄວາມຄ້າງຢູ່ຄິວ' }
  if (result.failed > 0) {
    return { error: `ສົ່ງສຳເລັດ ${result.sent} · ລົ້ມເຫຼວ ${result.failed} (ເບິ່ງເຫດຜົນລຸ່ມ)` }
  }
  return { ok: true }
}

/** ເອົາລາຍການທີ່ລົ້ມເຫຼວກັບເຂົ້າຄິວໃໝ່ */
export async function retryNotifications(
  _prev: FormState,
  _formData: FormData
): Promise<FormState> {
  const user = await requireManager()
  const { retryFailed } = await import('@/lib/notify/outbox')
  const n = await retryFailed()

  await logAudit(user.employee_id, 'notify', null, 'retry', String(n))
  revalidatePath('/admin')
  return n > 0 ? { ok: true } : { error: 'ບໍ່ມີລາຍການທີ່ລົ້ມເຫຼວ' }
}

/** ສົ່ງຂໍ້ຄວາມທົດສອບຫາຕົນເອງ ເພື່ອກວດວ່າຕັ້ງຄ່າ LINE ຖືກແລ້ວ */
export async function sendTestNotification(
  _prev: FormState,
  _formData: FormData
): Promise<FormState> {
  const user = await requireManager()
  const { enqueueNotification, drainOutbox } = await import('@/lib/notify/outbox')

  await enqueueNotification(
    user.employee_id,
    null,
    'ທົດສອບການແຈ້ງເຕືອນ',
    `ຖ້າທ່ານເຫັນຂໍ້ຄວາມນີ້ ໝາຍວ່າ LINE ເຮັດວຽກແລ້ວ (${user.fullname_lo})`,
    '/notifications'
  )

  const result = await drainOutbox(5)
  revalidatePath('/admin')

  if (!result.configured) {
    return { error: 'ຍັງບໍ່ໄດ້ຕັ້ງ LINE_CHANNEL_ACCESS_TOKEN ໃນ .env.local' }
  }
  if (result.sent === 0) {
    return { error: 'ສົ່ງບໍ່ສຳເລັດ — ເບິ່ງເຫດຜົນໃນຕາຕະລາງລຸ່ມ' }
  }
  return { ok: true }
}

/**
 * ຕັ້ງສິດລາຍຄົນ — ຮັບຄ່າ 3 ແບບຕໍ່ໜຶ່ງຂໍ້: '' ຕາມບົດບາດ, 'allow', 'deny'
 *
 * ບັນທຶກໝົດທຸກຂໍ້ໃນຄັ້ງດຽວ ຈຶ່ງກວດ "ຍັງເຫຼືອຜູ້ດູແລລະບົບ" ໄດ້ຖືກຕ້ອງ
 */
export async function setUserPermissions(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireManager()
  const employeeId = Number(formData.get('employee_id'))
  if (!Number.isInteger(employeeId)) return { error: 'ບໍ່ພົບຜູ້ໃຊ້' }

  const target = (
    await query<{ role: Role; fullname_lo: string }>(
      `select v.role, v.fullname_lo from it.v_portal_users v
        where v.employee_id = $1::int`,
      [employeeId]
    )
  )[0]
  if (!target) return { error: 'ບໍ່ພົບຜູ້ໃຊ້' }

  const wanted = new Map<Permission, boolean | null>()
  for (const p of PERMISSIONS) {
    const raw = String(formData.get(`perm_${p}`) ?? '')
    wanted.set(p, raw === 'allow' ? true : raw === 'deny' ? false : null)
  }

  const adminWanted = wanted.get('administer')
  const adminEffective =
    adminWanted === null ? roleAllows(target.role, 'administer') : adminWanted

  // ກັນລັອກຕົນເອງອອກ — ຖອດສິດຕົນເອງແລ້ວແກ້ຄືນບໍ່ໄດ້ອີກ
  if (employeeId === user.employee_id && !adminEffective) {
    return { error: 'ຖອດສິດຕັ້ງຄ່າລະບົບຂອງຕົນເອງບໍ່ໄດ້ — ໃຫ້ຄົນອື່ນຖອດໃຫ້' }
  }

  // transaction ຈິງ ຕ້ອງໃຊ້ connection ດຽວ — pool.query ແຈກຄົນລະເສັ້ນ
  const client = await pool.connect()
  try {
    await client.query('begin')
    await client.query(
      'delete from it.user_permissions where employee_id = $1::int',
      [employeeId]
    )

    for (const [permission, allowed] of wanted) {
      if (allowed === null) continue
      // ຄ່າທີ່ກົງກັບບົດບາດຢູ່ແລ້ວ ບໍ່ຕ້ອງເກັບ — ໃຫ້ຕາມບົດບາດຕໍ່ໄປ
      if (allowed === roleAllows(target.role, permission)) continue

      await client.query(
        `insert into it.user_permissions
           (employee_id, permission, allowed, note, updated_by)
         values ($1::int, $2::varchar, $3::boolean, $4::varchar, $5::int)`,
        [
          employeeId,
          permission,
          allowed,
          String(formData.get('note') ?? '').trim() || null,
          user.employee_id,
        ]
      )
    }

    // ຕ້ອງເຫຼືອຜູ້ດູແລລະບົບຢ່າງໜ້ອຍ 1 ຄົນສະເໝີ
    const admins = await client.query<{ n: string }>(
      `select count(*) as n
         from it.v_portal_users v
         left join it.user_permissions p
           on p.employee_id = v.employee_id and p.permission = 'administer'
        where coalesce(p.allowed, v.role = 'manager')`
    )
    if (Number(admins.rows[0]?.n ?? 0) === 0) {
      await client.query('rollback')
      return { error: 'ຕ້ອງເຫຼືອຜູ້ດູແລລະບົບຢ່າງໜ້ອຍ 1 ຄົນ' }
    }

    await client.query('commit')
  } catch (err) {
    await client.query('rollback')
    throw err
  } finally {
    client.release()
  }

  const changed = [...wanted.entries()]
    .filter(([, v]) => v !== null)
    .map(([k, v]) => `${k}=${v ? 'allow' : 'deny'}`)
    .join(', ')

  await logAudit(
    user.employee_id,
    'user_permission',
    employeeId,
    'set',
    changed || 'ຕາມບົດບາດທັງໝົດ'
  )
  revalidatePath('/admin')
  revalidatePath('/', 'layout')

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

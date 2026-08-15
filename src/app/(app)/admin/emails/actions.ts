'use server'

import { revalidatePath } from 'next/cache'
import { query } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { logAudit } from '@/lib/activity'
import { verifyEmail } from '@/lib/notify/email'
import type { FormState } from '@/lib/action-state'

/** ຮູບແບບອີເມວແບບພໍໃຊ້ — ບໍ່ພະຍາຍາມກວດຄົບຕາມ RFC ເພາະບໍ່ຄຸ້ມ */
function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)
}

export async function saveEmployeeEmail(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.administer(user)) return { error: 'ບໍ່ມີສິດຕັ້ງອີເມວ' }

  const employeeId = String(formData.get('employee_id') ?? '').trim()
  const email = String(formData.get('email') ?? '')
    .trim()
    .slice(0, 150)

  if (!/^\d+$/.test(employeeId)) return { error: 'ບໍ່ພົບພະນັກງານ' }

  // ວ່າງ = ລຶບອອກຈາກທະບຽນ
  if (!email) {
    await query('delete from it.employee_emails where employee_id = $1::int', [
      Number(employeeId),
    ])
    await logAudit(user.employee_id, 'employee_email', employeeId, 'clear')
    revalidatePath('/admin/emails')
    return { ok: true }
  }

  if (!looksLikeEmail(email)) return { error: 'ອີເມວບໍ່ຖືກຮູບແບບ' }

  try {
    await query(
      `insert into it.employee_emails (employee_id, email, updated_by)
       values ($1::int, $2::varchar, $3::int)
       on conflict (employee_id) do update
          set email = $2::varchar, updated_by = $3::int, updated_at = now()`,
      [Number(employeeId), email, user.employee_id]
    )
  } catch (err) {
    if (String((err as { code?: string })?.code) === '23505') {
      return { error: 'ອີເມວນີ້ຜູກກັບພະນັກງານຄົນອື່ນແລ້ວ' }
    }
    throw err
  }

  await logAudit(user.employee_id, 'employee_email', employeeId, 'set', email)
  revalidatePath('/admin/emails')
  return { ok: true }
}

/**
 * ເປີດ/ປິດການຮັບທາງອີເມວລາຍຄົນ
 *
 * ບາງຄົນຢາກຮັບແຕ່ LINE ຢ່າງດຽວ — ບໍ່ຄວນບັງຄັບໃຫ້ລຶບອີເມວອອກ
 * ເພາະອີເມວຍັງໃຊ້ອ້າງອີງໃນເລື່ອງອື່ນໄດ້
 */
export async function setEmailEnabled(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.administer(user)) return { error: 'ບໍ່ມີສິດແກ້ການຕັ້ງຄ່າ' }

  const employeeId = String(formData.get('employee_id') ?? '').trim()
  const enabled = String(formData.get('enabled') ?? '') === '1'
  if (!/^\d+$/.test(employeeId)) return { error: 'ບໍ່ພົບພະນັກງານ' }

  await query(
    `insert into it.notify_prefs (employee_id, channel, enabled)
     values ($1::int, 'email', $2::boolean)
     on conflict (employee_id, channel) do update
        set enabled = $2::boolean, updated_at = now()`,
    [Number(employeeId), enabled]
  )

  await logAudit(
    user.employee_id,
    'employee_email',
    employeeId,
    enabled ? 'enable' : 'disable'
  )
  revalidatePath('/admin/emails')
  return { ok: true }
}

/** ກົດທົດສອບການເຊື່ອມຕໍ່ SMTP ກ່ອນເປີດໃຊ້ຈິງ */
export async function testSmtp(): Promise<FormState> {
  const user = await requireUser()
  if (!can.administer(user)) return { error: 'ບໍ່ມີສິດທົດສອບ' }

  const result = await verifyEmail()
  return result.ok
    ? { ok: true, message: 'ເຊື່ອມຕໍ່ SMTP ໄດ້ປົກກະຕິ' }
    : { error: `ເຊື່ອມຕໍ່ບໍ່ໄດ້: ${result.error}` }
}

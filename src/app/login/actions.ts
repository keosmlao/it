'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { query } from '@/lib/db'
import { verifyPassword } from '@/lib/auth/password'
import { createSession } from '@/lib/auth/session'

export type LoginState = { error?: string }

const GENERIC_ERROR = 'ລະຫັດພະນັກງານ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ'

export async function login(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const employeeCode = String(formData.get('employee_code') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!employeeCode || !password) {
    return { error: 'ກະລຸນາປ້ອນລະຫັດພະນັກງານ ແລະ ລະຫັດຜ່ານ' }
  }

  const headerList = await headers()
  const ip =
    headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headerList.get('x-real-ip') ??
    null

  const record = async (succeeded: boolean, reason?: string) => {
    await query(
      `insert into it.login_attempts (employee_code, succeeded, reason, ip)
       values ($1, $2, $3, $4)`,
      [employeeCode, succeeded, reason ?? null, ip]
    )
  }

  // ພະນັກງານທີ່ຍັງເຮັດວຽກຢູ່ເຂົ້າໄດ້ໝົດ — ພະແນກ IT ໄດ້ບົດບາດຕາມຕຳແໜ່ງ,
  // ພະແນກອື່ນໄດ້ບົດບາດ requester (ແຈ້ງບັນຫາຂອງຕົນເອງເທົ່ານັ້ນ).
  // view ເປັນຕົວກັ່ນຄົນທີ່ລາອອກແລ້ວອອກ ຈຶ່ງໃຊ້ join ນີ້ເປັນດ່ານກວດສິດ
  const rows = await query<{
    employee_id: number
    role: string
    password: string | null
  }>(
    `select v.employee_id, v.role, e.password
       from it.v_portal_users v
       join public.odg_employee e on e.employee_id = v.employee_id
      where v.employee_code = $1`,
    [employeeCode]
  )

  const account = rows[0]
  if (!account) {
    await record(false, 'not_active_employee')
    return { error: GENERIC_ERROR }
  }

  if (!(await verifyPassword(password, account.password))) {
    await record(false, 'bad_password')
    return { error: GENERIC_ERROR }
  }

  await record(true)
  await createSession(account.employee_id, headerList.get('user-agent') ?? undefined)
  redirect(account.role === 'requester' ? '/my' : '/')
}

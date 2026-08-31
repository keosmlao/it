import 'server-only'
import { randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { query } from '@/lib/db'
import { can, type ItStaff } from './roles'

export const SESSION_COOKIE = 'it_session'
const SESSION_HOURS = 8

export async function createSession(employeeId: number, userAgent?: string) {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000)

  await query(
    `insert into it.sessions (token, employee_id, expires_at, user_agent)
     values ($1, $2, $3, $4)`,
    [token, employeeId, expiresAt, userAgent ?? null]
  )

  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  })
}

export async function destroySession() {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (token) {
    await query('update it.sessions set revoked_at = now() where token = $1', [token])
  }
  store.delete(SESSION_COOKIE)
}

/**
 * The signed-in staff member, or null. Cached per request so a layout and its
 * pages share one query.
 */
export const getCurrentUser = cache(async (): Promise<ItStaff | null> => {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null

  const rows = await query<ItStaff>(
    `select s.employee_id, v.employee_code, v.fullname_lo, v.nickname,
            v.unit_code, v.unit_name_lo, v.position_code, v.position_name_lo,
            v.role, v.is_it_staff, v.department_code, v.department_name,
            (select count(*)::int from it.notifications n
              where n.employee_id = s.employee_id and n.is_read = false) as unread_count,
            (select json_object_agg(p.permission, p.allowed)
               from it.user_permissions p
              where p.employee_id = s.employee_id)                       as permissions
       from it.sessions s
       join it.v_portal_users v on v.employee_id = s.employee_id
      where s.token = $1
        and s.revoked_at is null
        and s.expires_at > now()`,
    [token]
  )

  return rows[0] ?? null
})

/**
 * Same as getCurrentUser but never returns null — an expired session sends the
 * caller back to the login page instead of surfacing a runtime error, which is
 * what the user sees if a server action throws.
 */
export async function requireUser(): Promise<ItStaff> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return user
}

/**
 * ດ່ານດຽວທີ່ກັນຜູ້ແຈ້ງບັນຫາ (requester) ອອກຈາກໜ້າພາຍໃນຂອງພະແນກ IT.
 * ເອີ້ນຢູ່ (app)/layout.tsx ຈຶ່ງຄຸມທຸກໜ້າໃນກຸ່ມນັ້ນພ້ອມກັນ
 */
export async function requireStaff(): Promise<ItStaff> {
  const user = await requireUser()
  if (!can.useStaffArea(user)) redirect('/my')
  return user
}

/**
 * ດ່ານກວດຂອງແຕ່ລະໜ້າ — ຄົນທີ່ຜູ້ຈັດການປິດສິດ "ເບິ່ງ" ຂອງເມນູນັ້ນໄວ້
 * ຈະຖືກສົ່ງກັບໜ້າພາບລວມ ເຖິງແມ່ນຈະພິມ URL ເຂົ້າມາກົງໆ
 *
 * ຮັບກະແຈເປັນ href ຂອງເມນູ ຈຶ່ງອ່ານແລ້ວຮູ້ທັນທີວ່າໜ້ານີ້ຢູ່ໃຕ້ເມນູໃດ
 */
export async function requireMenuView(menuKey: string): Promise<ItStaff> {
  const user = await requireStaff()
  if (!can.viewMenu(user, menuKey)) redirect('/')
  return user
}

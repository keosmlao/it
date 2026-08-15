import 'server-only'
import { query } from '@/lib/db'

/**
 * ການກວດຄວາມປອດໄພ — **ອ່ານຢ່າງດຽວ**
 *
 * ບໍ່ມີບ່ອນໃດໃນນີ້ຂຽນລົງ `public.odg_employee` ເລີຍ ເພາະຕາຕະລາງນັ້ນແອັບອື່ນ
 * ໃຊ້ຮ່ວມ — ປ່ຽນ hash ຂອງລະຫັດຜ່ານອາດເຮັດໃຫ້ລະບົບອື່ນ login ບໍ່ໄດ້.
 * ໜ້ານີ້ຈຶ່ງເປັນ "ຫຼັກຖານ" ໄປລົມກັບເຈົ້າຂອງລະບົບ HR ບໍ່ແມ່ນຕົວແກ້
 *
 * ⚠️ ບໍ່ສະແດງລະຫັດຜ່ານຈິງ — ສະແດງແຕ່ຮູບແບບ ແລະ ຄວາມຍາວ
 */

/** ຮູບແບບທີ່ພົບໃນຄໍລຳ password (ເບິ່ງ src/lib/auth/password.ts) */
const FORMAT_SQL = `
  case
    when p.password is null or p.password = ''       then 'empty'
    when p.password like 'scrypt:%$%'                then 'werkzeug'
    when p.password like 'scrypt$%'                  then 'scrypt'
    when length(p.password) < 8                      then 'plaintext_weak'
    else 'plaintext'
  end`

export const FORMAT_LABEL_LO: Record<string, string> = {
  empty: 'ບໍ່ໄດ້ຕັ້ງລະຫັດຜ່ານ',
  plaintext_weak: 'ຂໍ້ຄວາມລ້ວນ ສັ້ນກວ່າ 8 ຕົວ',
  plaintext: 'ຂໍ້ຄວາມລ້ວນ',
  scrypt: 'ເຂົ້າລະຫັດ scrypt',
  werkzeug: 'ເຂົ້າລະຫັດ scrypt (Werkzeug)',
}

export const FORMAT_RISK: Record<string, 'high' | 'medium' | 'ok'> = {
  empty: 'high',
  plaintext_weak: 'high',
  plaintext: 'medium',
  scrypt: 'ok',
  werkzeug: 'ok',
}

export async function getPasswordFormats() {
  return query<{ format: string; total: string; it_staff: string }>(
    `select ${FORMAT_SQL}                                       as format,
            count(*)                                            as total,
            count(*) filter (where p.department_code = '801')   as it_staff
       from public.odg_employee p
      where p.employment_status = 'ACTIVE'
      group by 1
      order by count(*) desc`
  )
}

/** ພະນັກງານ IT ລາຍຄົນ — ຄົນກຸ່ມນີ້ມີສິດສູງສຸດ ຈຶ່ງສ່ຽງທີ່ສຸດ */
export async function getItStaffPasswordRisk() {
  return query<{
    employee_code: string
    fullname_lo: string
    role: string
    format: string
    length: number
  }>(
    `select v.employee_code, v.fullname_lo, v.role,
            ${FORMAT_SQL}                        as format,
            coalesce(length(p.password), 0)      as length
       from it.v_it_staff v
       join public.odg_employee p on p.employee_id = v.employee_id
      order by case ${FORMAT_SQL}
                 when 'empty' then 0
                 when 'plaintext_weak' then 1
                 when 'plaintext' then 2
                 else 3
               end,
               v.fullname_lo`
  )
}

/** ຜູ້ໃຊ້ທີ່ຖືກຕັ້ງສິດ administer ໄວ້ລາຍຄົນ */
export async function getAdminGrants() {
  return query<{
    employee_name: string
    employee_code: string
    allowed: boolean
    updated_by_name: string | null
    updated_at: string
  }>(
    `select employee_name, employee_code, allowed, updated_by_name, updated_at
       from it.v_user_permissions
      where permission = 'administer'
      order by allowed desc, employee_name`
  )
}

export async function getSessionStats() {
  const rows = await query<{
    active: string
    people: string
    oldest: string | null
    long_lived: string
  }>(
    `select count(*)                                          as active,
            count(distinct employee_id)                       as people,
            min(created_at)::text                             as oldest,
            count(*) filter (where created_at < now() - interval '1 day')
                                                              as long_lived
       from it.sessions
      where revoked_at is null and expires_at > now()`
  )
  return rows[0]
}

/** ການ login ລົ້ມເຫຼວໄລຍະຫຼັງ — ຫຼາຍຜິດປົກກະຕິ = ມີຄົນລອງເດົາລະຫັດ */
export async function getFailedLogins(days = 7) {
  return query<{
    employee_code: string
    attempts: string
    last_at: string
    reasons: string
  }>(
    `select employee_code,
            count(*)                                  as attempts,
            max(attempted_at)::text                   as last_at,
            string_agg(distinct reason, ', ')         as reasons
       from it.login_attempts
      where not succeeded
        and attempted_at >= now() - ($1::int || ' days')::interval
      group by employee_code
      having count(*) >= 3
      order by count(*) desc
      limit 20`,
    [days]
  )
}

/** ບັນຊີໃນລະບົບອື່ນທີ່ຄວນປິດ — ດຶງມາຢູ່ນີ້ນຳ ເພື່ອໃຫ້ເຫັນພາບຄວາມສ່ຽງບ່ອນດຽວ */
export async function getSecuritySummary() {
  const rows = await query<{
    closable_accounts: string
    weak_it_passwords: string
    inactive_with_session: string
  }>(
    `select (select count(*) from it.v_system_accounts where should_close)
                                                              as closable_accounts,
            (select count(*)
               from it.v_it_staff v
               join public.odg_employee p on p.employee_id = v.employee_id
              where p.password is null or p.password = ''
                 or (p.password not like 'scrypt%'))          as weak_it_passwords,
            (select count(distinct s.employee_id)
               from it.sessions s
               join public.odg_employee e on e.employee_id = s.employee_id
              where s.revoked_at is null and s.expires_at > now()
                and e.employment_status <> 'ACTIVE')          as inactive_with_session`
  )
  return rows[0]
}

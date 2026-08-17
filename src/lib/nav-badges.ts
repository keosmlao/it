import 'server-only'
import { query } from '@/lib/db'
import { can, type ItStaff } from '@/lib/auth/roles'
import { EMPTY_BADGES, type NavBadges } from './nav-badges-model'

export { EMPTY_BADGES, type NavBadges }

/**
 * ນັບທັງໝົດໃນ query ດຽວ — ທຸກ view ອ່ານຈາກ cache ຫຼື ຕາຕະລາງນ້ອຍ
 * ຈຶ່ງໄວພໍທີ່ຈະໂຫຼດພ້ອມທຸກໜ້າ
 */
export async function getNavBadges(user: ItStaff): Promise<NavBadges> {
  if (!can.useStaffArea(user)) return EMPTY_BADGES

  const units = can.visibleUnits(user)

  const rows = await query<Record<keyof NavBadges, string>>(
    `select
       (select count(*) from it.v_tickets
         where status in ('new','assigned','in_progress')
           and ($1::text[] is null
                or unit_code = any($1::text[]) or unit_code is null
                or assignee_employee_id = $2::int))            as tickets,
       (select count(*) from it.v_tickets
         where assignee_employee_id = $2::int
           and status in ('new','assigned','in_progress'))
                                                                as "myWork",
       (select count(*) from it.v_requests
         where status in ('submitted','head_approved'))         as requests,
       (select count(*) from it.v_pr where status = 'submitted') as purchase,
       (select count(*) from it.v_subscriptions
         where due_status in ('overdue', 'due_soon'))           as subscriptions,
       (select count(*) from it.v_maintenance_plans
         where due_status in ('overdue', 'due_soon'))           as maintenance,
       (select count(*) from it.v_incidents
         where status = 'open')                                 as incidents,
       (select count(*) from it.v_system_accounts
         where should_close)                                    as accounts,
       (select count(*) from it.v_consumables
         where stock_state in ('low', 'empty'))                 as consumables,
       (select count(*) from it.v_recovery_targets
         where recovery_status is null or recovery_status = 'open')
                                                                as recovery,
       (select count(distinct asset_code) from it.v_loan_conflicts)
                                                                as conflicts,
       (select count(*) from it.v_damaged_assets
         where stock_state in ('damaged','repair','missing'))   as damaged,
       (select count(*) from it.notifications
         where employee_id = $2::int and is_read = false)       as notifications`,
    [units, user.employee_id]
  )

  const row = rows[0]
  return {
    tickets: Number(row?.tickets ?? 0),
    myWork: Number(row?.myWork ?? 0),
    requests: Number(row?.requests ?? 0),
    purchase: Number(row?.purchase ?? 0),
    subscriptions: Number(row?.subscriptions ?? 0),
    maintenance: Number(row?.maintenance ?? 0),
    incidents: Number(row?.incidents ?? 0),
    accounts: Number(row?.accounts ?? 0),
    consumables: Number(row?.consumables ?? 0),
    recovery: Number(row?.recovery ?? 0),
    conflicts: Number(row?.conflicts ?? 0),
    damaged: Number(row?.damaged ?? 0),
    notifications: Number(row?.notifications ?? 0),
  }
}

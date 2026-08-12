import 'server-only'
import { query } from '@/lib/db'
import type { PlanItem, PlanRow } from './model'

/** ແຜນຂອງຄົນໜຶ່ງໃນວັນໜຶ່ງ — ອ່ານຢ່າງດຽວ, null ຖ້າຍັງບໍ່ໄດ້ວາງແຜນ */
export async function getPlan(employeeId: number, planDate: string) {
  const rows = await query<PlanRow>(
    `select * from it.v_daily_plans
      where employee_id = $1::int and plan_date = $2::date`,
    [employeeId, planDate]
  )
  return rows[0] ?? null
}

/**
 * ແຜນຂອງຄົນໜຶ່ງໃນວັນໜຶ່ງ — ສ້າງໃຫ້ຖ້າຍັງບໍ່ມີ.
 * ໃຊ້ສະເພາະໃນ server action ຕອນຜູ້ໃຊ້ບັນທຶກຈິງ ບໍ່ແມ່ນຕອນເປີດເບິ່ງໜ້າ
 * ບໍ່ດັ່ງນັ້ນຈະເກີດແຜນເປົ່າໆເຕັມໄປໝົດ ແລ້ວລາຍງານທັງທີມຈະຫຼອກຕາ
 */
export async function getOrCreatePlan(employeeId: number, planDate: string) {
  const existing = await getPlan(employeeId, planDate)
  if (existing) return existing

  await query(
    `insert into it.daily_plans (employee_id, plan_date)
     values ($1::int, $2::date)
     on conflict (employee_id, plan_date) do nothing`,
    [employeeId, planDate]
  )

  const created = await query<PlanRow>(
    `select * from it.v_daily_plans
      where employee_id = $1::int and plan_date = $2::date`,
    [employeeId, planDate]
  )
  return created[0]
}

export async function getPlanById(planId: string) {
  const rows = await query<PlanRow>(
    'select * from it.v_daily_plans where id = $1::bigint',
    [planId]
  )
  return rows[0] ?? null
}

export async function getPlanItems(planId: string) {
  return query<PlanItem>(
    `select * from it.v_daily_plan_items
      where plan_id = $1::bigint
      order by sort_order, id`,
    [planId]
  )
}

/** ແຜນຂອງທັງໜ່ວຍງານ/ພະແນກໃນວັນໜຶ່ງ — ສຳລັບຫົວໜ້າ ແລະ ຜູ້ຈັດການ */
export async function listTeamPlans(planDate: string, unitCode: string | null) {
  return query<PlanRow>(
    `select * from it.v_daily_plans
      where plan_date = $1::date
        and ($2::varchar is null or unit_code = $2::varchar)
      order by unit_code nulls last, employee_name`,
    [planDate, unitCode]
  )
}

/** ພະນັກງານ IT ທີ່ຍັງບໍ່ໄດ້ວາງແຜນມື້ນີ້ */
export async function listPlanlessStaff(planDate: string, unitCode: string | null) {
  return query<{
    employee_id: number
    fullname_lo: string
    unit_code: string | null
    unit_name_lo: string | null
  }>(
    `select s.employee_id, s.fullname_lo, s.unit_code, s.unit_name_lo
       from it.v_it_staff s
       left join it.daily_plans p
              on p.employee_id = s.employee_id and p.plan_date = $1::date
      where p.id is null
        and ($2::varchar is null or s.unit_code = $2::varchar)
      order by s.fullname_lo`,
    [planDate, unitCode]
  )
}

/** ວຽກທີ່ຄ້າງຢູ່ຂອງຄົນນີ້ — ໃຫ້ດຶງເຂົ້າແຜນໄດ້ໄວ */
export async function getPlanSources(employeeId: number) {
  const [tickets, tasks] = await Promise.all([
    query<{ id: string; ticket_no: string; title: string }>(
      `select id, ticket_no, title
         from it.v_tickets
        where assignee_employee_id = $1::int
          and status not in ('resolved','closed','cancelled')
        order by created_at desc
        limit 30`,
      [employeeId]
    ),
    query<{ id: string; title: string; project_name: string | null }>(
      `select t.id, t.title, p.name as project_name
         from it.v_tasks t
         left join it.projects p on p.id = t.project_id
        where t.assignee_employee_id = $1::int
          and t.status <> 'done'
        order by t.id desc
        limit 30`,
      [employeeId]
    ),
  ])
  return { tickets, tasks }
}

/** ສະຫຼຸບ 7 ມື້ຫຼ້າສຸດຂອງຄົນນີ້ */
export async function getPlanStreak(employeeId: number, endDate: string) {
  return query<{
    plan_date: string
    item_count: string
    done_count: string
    planned_hours: string
    actual_hours: string
  }>(
    `select plan_date, item_count, done_count, planned_hours, actual_hours
       from it.v_daily_plans
      where employee_id = $1::int
        and plan_date between $2::date - 6 and $2::date
      order by plan_date`,
    [employeeId, endDate]
  )
}

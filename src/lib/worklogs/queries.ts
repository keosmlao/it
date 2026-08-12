import 'server-only'
import { query } from '@/lib/db'
import { can, type ItStaff } from '@/lib/auth/roles'
import type { WorkLogRow } from './model'

export async function listWorkLogs(
  user: ItStaff,
  filters: { employeeId?: number; from?: string; to?: string } = {}
) {
  const params: unknown[] = []
  const where: string[] = ['true']

  // ພະນັກງານທົ່ວໄປເຫັນສະເພາະບັນທຶກຂອງຕົນ; ຫົວໜ້າ/ຜູ້ຈັດການເຫັນຂອງທີມ
  if (!can.viewReports(user)) {
    params.push(user.employee_id)
    where.push(`w.employee_id = $${params.length}`)
  } else if (filters.employeeId) {
    params.push(filters.employeeId)
    where.push(`w.employee_id = $${params.length}`)
  }

  if (filters.from) {
    params.push(filters.from)
    where.push(`w.log_date >= $${params.length}`)
  }
  if (filters.to) {
    params.push(filters.to)
    where.push(`w.log_date <= $${params.length}`)
  }

  return query<WorkLogRow>(
    `select w.id, w.employee_id, e.fullname_lo as employee_name,
            w.log_date, w.hours,
            w.ticket_id, t.ticket_no, t.title as ticket_title,
            w.task_id, k.title as task_title,
            w.work_type, w.note, w.created_at
       from it.work_logs w
       join public.odg_employee e on e.employee_id = w.employee_id
       left join it.tickets t on t.id = w.ticket_id
       left join it.tasks k on k.id = w.task_id
      where ${where.join(' and ')}
      order by w.log_date desc, w.created_at desc
      limit 300`,
    params
  )
}

/** ສະຫຼຸບຊົ່ວໂມງຕໍ່ຄົນໃນຊ່ວງເວລາ */
export async function summariseHours(from: string, to: string) {
  return query<{
    employee_id: number
    employee_name: string
    total_hours: string
    ticket_hours: string
    task_hours: string
    other_hours: string
  }>(
    `select w.employee_id, e.fullname_lo as employee_name,
            sum(w.hours)                                            as total_hours,
            coalesce(sum(w.hours) filter (where w.ticket_id is not null), 0) as ticket_hours,
            coalesce(sum(w.hours) filter (where w.task_id is not null), 0)   as task_hours,
            coalesce(sum(w.hours) filter (where w.ticket_id is null
                                            and w.task_id is null), 0)       as other_hours
       from it.work_logs w
       join public.odg_employee e on e.employee_id = w.employee_id
      where w.log_date between $1 and $2
      group by w.employee_id, e.fullname_lo
      order by sum(w.hours) desc`,
    [from, to]
  )
}

/** ລາຍການ ticket ແລະ task ທີ່ຍັງເປີດຢູ່ ສຳລັບເລືອກຕອນບັນທຶກຊົ່ວໂມງ */
export async function getLoggableWork(employeeId: number) {
  const [tickets, tasks] = await Promise.all([
    query<{ id: string; label: string }>(
      `select id, ticket_no || ' · ' || title as label
         from it.v_tickets
        where not is_finished
          and (assignee_employee_id = $1 or assignee_employee_id is null)
        order by created_at desc limit 100`,
      [employeeId]
    ),
    query<{ id: string; label: string }>(
      `select id, coalesce(project_no || ' · ', '') || title as label
         from it.v_tasks
        where not is_finished
          and (assignee_employee_id = $1 or assignee_employee_id is null)
        order by created_at desc limit 100`,
      [employeeId]
    ),
  ])

  return { tickets, tasks }
}

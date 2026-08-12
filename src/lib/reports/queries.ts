import 'server-only'
import { query } from '@/lib/db'

/** ພາບລວມ ticket ໃນຊ່ວງເວລາ: ປະລິມານ, ຄວາມໄວ, ອັດຕາຕາມ SLA */
export async function ticketSummary(from: string, to: string) {
  const rows = await query<{
    created: string
    resolved: string
    sla_met: string
    sla_missed: string
    avg_resolve_minutes: string | null
    avg_respond_minutes: string | null
  }>(
    `select
       count(*)                                                        as created,
       count(*) filter (where resolved_at is not null)                 as resolved,
       count(*) filter (where resolved_at is not null
                          and resolved_at <= sla_resolve_due_at)       as sla_met,
       count(*) filter (where resolved_at is not null
                          and resolved_at > sla_resolve_due_at)        as sla_missed,
       avg(extract(epoch from resolved_at - created_at)/60)
         filter (where resolved_at is not null)                        as avg_resolve_minutes,
       avg(extract(epoch from first_responded_at - created_at)/60)
         filter (where first_responded_at is not null)                 as avg_respond_minutes
     from it.v_tickets
     where created_at::date between $1 and $2`,
    [from, to]
  )
  return rows[0]
}

export async function ticketsByCategory(from: string, to: string) {
  return query<{ category_name_lo: string; total: string; resolved: string }>(
    `select category_name_lo,
            count(*)                                        as total,
            count(*) filter (where resolved_at is not null) as resolved
       from it.v_tickets
      where created_at::date between $1 and $2
      group by category_name_lo
      order by count(*) desc`,
    [from, to]
  )
}

export async function ticketsByStaff(from: string, to: string) {
  return query<{
    employee_id: number
    fullname_lo: string
    role: string
    assigned: string
    resolved: string
    sla_met: string
    avg_resolve_minutes: string | null
  }>(
    `select s.employee_id, s.fullname_lo, s.role,
            count(t.id)                                                  as assigned,
            count(t.id) filter (where t.resolved_at is not null)          as resolved,
            count(t.id) filter (where t.resolved_at is not null
                                  and t.resolved_at <= t.sla_resolve_due_at) as sla_met,
            avg(extract(epoch from t.resolved_at - t.created_at)/60)
              filter (where t.resolved_at is not null)                   as avg_resolve_minutes
       from it.v_it_staff s
       left join it.v_tickets t
              on t.assignee_employee_id = s.employee_id
             and t.created_at::date between $1 and $2
      group by s.employee_id, s.fullname_lo, s.role
      order by count(t.id) desc`,
    [from, to]
  )
}

export async function ticketsByMonth() {
  return query<{ month: string; created: string; resolved: string }>(
    `select to_char(date_trunc('month', created_at), 'YYYY-MM')     as month,
            count(*)                                                as created,
            count(*) filter (where resolved_at is not null)         as resolved
       from it.v_tickets
      where created_at >= date_trunc('month', now()) - interval '11 months'
      group by 1
      order by 1`
  )
}

export async function projectSummary() {
  const rows = await query<{
    total: string
    active: string
    done: string
    overdue: string
  }>(
    `select count(*)                                         as total,
            count(*) filter (where status = 'active')        as active,
            count(*) filter (where status = 'done')          as done,
            count(*) filter (where is_overdue)               as overdue
       from it.v_projects`
  )
  return rows[0]
}

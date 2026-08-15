import 'server-only'
import { query } from '@/lib/db'
import type { IncidentRow } from './model'

export async function listIncidents(
  filters: { service?: string; status?: string; from?: string; to?: string; q?: string } = {}
) {
  const params: unknown[] = []
  const where: string[] = ['true']

  if (filters.service && filters.service !== 'all') {
    params.push(filters.service)
    where.push(`service = $${params.length}`)
  }

  if (filters.status && filters.status !== 'all') {
    params.push(filters.status)
    where.push(`status = $${params.length}`)
  }

  if (filters.from) {
    params.push(filters.from)
    where.push(`started_at >= $${params.length}::date`)
  }

  if (filters.to) {
    params.push(filters.to)
    where.push(`started_at < $${params.length}::date + 1`)
  }

  if (filters.q) {
    params.push(`%${filters.q}%`)
    const i = params.length
    where.push(`(code ilike $${i} or title ilike $${i} or impact ilike $${i}
                 or cause ilike $${i})`)
  }

  return query<IncidentRow>(
    `select * from it.v_incidents
      where ${where.join(' and ')}
      order by status desc, started_at desc
      limit 300`,
    params
  )
}

export async function getIncident(id: string) {
  const rows = await query<IncidentRow>(
    'select * from it.v_incidents where id = $1::bigint',
    [id]
  )
  return rows[0] ?? null
}

export async function getIncidentStats(from: string, to: string) {
  const rows = await query<{
    total: string
    open: string
    critical: string
    downtime_minutes: string
  }>(
    `select count(*)                                        as total,
            count(*) filter (where status = 'open')         as open,
            count(*) filter (where severity = 'critical')   as critical,
            coalesce(sum(minutes), 0)                       as downtime_minutes
       from it.v_incidents
      where started_at >= $1::date and started_at < $2::date + 1`,
    [from, to]
  )
  return rows[0]
}

/** ເວລາລົ້ມລວມແຍກຕາມບໍລິການ — ຕົວເລກທີ່ເອົາໄປຕໍ່ລອງກັບຜູ້ໃຫ້ບໍລິການໄດ້ */
export async function getDowntimeByService(from: string, to: string) {
  return query<{
    service: string
    total: string
    minutes: string
    worst: string
  }>(
    `select service,
            count(*)                  as total,
            coalesce(sum(minutes), 0) as minutes,
            coalesce(max(minutes), 0) as worst
       from it.v_incidents
      where started_at >= $1::date and started_at < $2::date + 1
      group by service
      order by sum(minutes) desc`,
    [from, to]
  )
}

export async function getDowntimeByMonth(months = 12) {
  return query<{ month: string; total: string; minutes: string }>(
    `select month, count(*) as total, coalesce(sum(minutes), 0) as minutes
       from it.v_incidents
      where started_at >= date_trunc('month', current_date)
                          - ($1::int || ' months')::interval
      group by month
      order by month desc`,
    [months]
  )
}

/** ສັນຍາເຊົ່າໃຫ້ຜູກກັບເຫດຂັດຂ້ອງ */
export async function getSubscriptionOptions() {
  return query<{ id: string; code: string; service_name: string }>(
    `select id, code, service_name
       from it.v_subscriptions
      where status = 'active'
      order by service_name
      limit 300`
  )
}

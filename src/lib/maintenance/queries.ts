import 'server-only'
import { query } from '@/lib/db'
import type { MaintenanceLog, MaintenancePlan } from './model'

export async function listMaintenancePlans(
  filters: { category?: string; due?: string; q?: string; all?: boolean } = {}
) {
  const params: unknown[] = []
  const where: string[] = ['true']

  if (!filters.all) where.push('is_active')

  if (filters.category && filters.category !== 'all') {
    params.push(filters.category)
    where.push(`category = $${params.length}`)
  }

  if (filters.due === 'soon') where.push(`due_status in ('overdue', 'due_soon')`)
  else if (filters.due === 'overdue') where.push(`due_status = 'overdue'`)

  if (filters.q) {
    params.push(`%${filters.q}%`)
    const i = params.length
    where.push(`(code ilike $${i} or title ilike $${i} or asset_code ilike $${i})`)
  }

  return query<MaintenancePlan>(
    `select * from it.v_maintenance_plans
      where ${where.join(' and ')}
      order by case due_status
                 when 'overdue'  then 0
                 when 'due_soon' then 1
                 when 'ok'       then 2
                 else 3
               end,
               next_due_date, title
      limit 300`,
    params
  )
}

export async function getMaintenancePlan(id: string) {
  const rows = await query<MaintenancePlan>(
    'select * from it.v_maintenance_plans where id = $1::bigint',
    [id]
  )
  return rows[0] ?? null
}

export async function getMaintenanceLogs(planId: string) {
  return query<MaintenanceLog>(
    `select * from it.v_maintenance_logs
      where plan_id = $1::bigint
      order by performed_at desc, id desc
      limit 60`,
    [planId]
  )
}

/** ປະຫວັດຫຼ້າສຸດທັງໝົດ — ໃຊ້ໃນໜ້າລວມ */
export async function listRecentMaintenanceLogs(limit = 40) {
  return query<MaintenanceLog>(
    `select * from it.v_maintenance_logs
      order by performed_at desc, id desc
      limit $1::int`,
    [limit]
  )
}

export async function getMaintenanceStats() {
  const rows = await query<{
    active: string
    overdue: string
    due_soon: string
    issues: string
  }>(
    `select count(*) filter (where is_active)                    as active,
            count(*) filter (where due_status = 'overdue')       as overdue,
            count(*) filter (where due_status = 'due_soon')      as due_soon,
            coalesce(sum(issue_count), 0)                        as issues
       from it.v_maintenance_plans`
  )
  return rows[0]
}

/** ອຸປະກອນທີ່ຜູກແຜນໄດ້ — ຈຳກັດໃຫ້ພຽງເຄື່ອງທີ່ຍັງໃຊ້ງານຢູ່ */
export async function getAssetOptions(limit = 500) {
  return query<{ asset_code: string; name: string }>(
    `select asset_code, name
       from it.v_it_assets
      where is_active
      order by name
      limit $1::int`,
    [limit]
  )
}

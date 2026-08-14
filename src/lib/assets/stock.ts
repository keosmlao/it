import 'server-only'
import { query } from '@/lib/db'
import { PAGE_SIZE, type PageResult } from '@/lib/pagination'
import type { RecoveryTarget, SurveyRow } from './stock-model'

/**
 * ໜ້າສຳຫຼວດ: ອຸປະກອນທີ່ບໍ່ມີໃບຢືມຄ້າງ — ໃຫ້ IT ໄປກວດຂອງຈິງແລ້ວໝາຍສະຖານະ.
 * ຄ່າເລີ່ມຕົ້ນສະແດງອັນທີ່ **ຍັງບໍ່ໄດ້ກວດ** ກ່ອນ
 */
export async function paginateSurvey(
  filters: { state?: string; q?: string; location?: string },
  page: number
): Promise<PageResult<SurveyRow>> {
  const params: unknown[] = []
  const where: string[] = ['not a.is_assigned', 'a.is_active']

  if (filters.state === 'unchecked') where.push('s.asset_code is null')
  else if (filters.state === 'never_lent') {
    where.push('a.movement_count = 0', 's.asset_code is null')
  } else if (filters.state && filters.state !== 'all') {
    params.push(filters.state)
    where.push(`s.stock_state = $${params.length}`)
  }

  if (filters.location) {
    params.push(filters.location)
    where.push(`coalesce(a.location_code, '') = $${params.length}`)
  }

  if (filters.q) {
    params.push(`%${filters.q}%`)
    const i = params.length
    where.push(
      `(a.asset_code ilike $${i} or a.name ilike $${i} or a.serial_no ilike $${i})`
    )
  }

  params.push(PAGE_SIZE, (page - 1) * PAGE_SIZE)
  const rows = await query<SurveyRow & { total_count: string }>(
    `select a.asset_code, a.name, a.category_name, a.serial_no,
            a.location_name, a.holder_name, a.movement_count,
            s.stock_state, s.location_note, s.checked_at, s.note,
            e.fullname_lo as checked_by_name,
            count(*) over () as total_count
       from it.v_it_assets a
       left join it.asset_stock_status s on s.asset_code = a.asset_code
       left join public.odg_employee e on e.employee_id = s.checked_by
      where ${where.join(' and ')}
      order by s.checked_at nulls first, a.asset_code desc
      limit $${params.length - 1} offset $${params.length}`,
    params
  )

  const total = Number(rows[0]?.total_count ?? 0)
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return {
    items: rows as SurveyRow[],
    page: Math.min(page, pageCount),
    pageSize: PAGE_SIZE,
    total,
    pageCount,
  }
}

export async function getSurveyStats() {
  const rows = await query<{
    total: string
    checked: string
    unchecked: string
    never_lent: string
    in_stock: string
    with_user: string
    missing: string
  }>(
    `select count(*)                                          as total,
            count(s.asset_code)                               as checked,
            count(*) - count(s.asset_code)                    as unchecked,
            count(*) filter (where a.movement_count = 0
                               and s.asset_code is null)      as never_lent,
            count(*) filter (where s.stock_state = 'in_stock')  as in_stock,
            count(*) filter (where s.stock_state = 'with_user') as with_user,
            count(*) filter (where s.stock_state = 'missing')   as missing
       from it.v_it_assets a
       left join it.asset_stock_status s on s.asset_code = a.asset_code
      where not a.is_assigned and a.is_active`
  )
  return rows[0]
}

// ---------- ການທວງຄືນ ----------

export async function paginateRecoveries(
  filters: { reason?: string; status?: string; q?: string },
  page: number
): Promise<PageResult<RecoveryTarget>> {
  const params: unknown[] = []
  const where: string[] = ['true']

  if (
    filters.reason === 'former' ||
    filters.reason === 'unknown_employee' ||
    filters.reason === 'long_held'
  ) {
    params.push(filters.reason)
    where.push(`reason = $${params.length}`)
  }

  if (filters.status === 'pending') {
    where.push(`(recovery_status is null or recovery_status = 'open')`)
  } else if (filters.status && filters.status !== 'all') {
    params.push(filters.status)
    where.push(`recovery_status = $${params.length}`)
  }

  if (filters.q) {
    params.push(`%${filters.q}%`)
    const i = params.length
    where.push(
      `(emp_name ilike $${i} or asset_name ilike $${i} or asset_code ilike $${i}
        or org_department ilike $${i})`
    )
  }

  params.push(PAGE_SIZE, (page - 1) * PAGE_SIZE)
  const rows = await query<RecoveryTarget & { total_count: string }>(
    `select *, count(*) over () as total_count
       from it.v_recovery_targets
      where ${where.join(' and ')}
      order by is_former_employee desc, days_held desc
      limit $${params.length - 1} offset $${params.length}`,
    params
  )

  const total = Number(rows[0]?.total_count ?? 0)
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return {
    items: rows as RecoveryTarget[],
    page: Math.min(page, pageCount),
    pageSize: PAGE_SIZE,
    total,
    pageCount,
  }
}

export async function getRecoveryStats() {
  const rows = await query<{
    total: string
    former: string
    unknown_employee: string
    long_held: string
    pending: string
    in_progress: string
  }>(
    `select count(*)                                            as total,
            count(*) filter (where reason = 'former')           as former,
            count(*) filter (where reason = 'unknown_employee')
                                                        as unknown_employee,
            count(*) filter (where reason = 'long_held')        as long_held,
            count(*) filter (where recovery_status is null
                               or recovery_status = 'open')     as pending,
            count(*) filter (where recovery_status in ('contacted','promised'))
                                                                as in_progress
       from it.v_recovery_targets`
  )
  return rows[0]
}

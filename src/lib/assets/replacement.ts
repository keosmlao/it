import 'server-only'
import { query } from '@/lib/db'

/**
 * ແຜນປ່ຽນເຄື່ອງ — ອ່ານຈາກ view `it.v_replacement_candidates` ລ້ວນໆ
 * ບໍ່ມີຕາຕະລາງໃໝ່ ຈຶ່ງບໍ່ມີຫຍັງໃຫ້ປ້ອນເພີ່ມ
 */

export const PRIORITIES = ['high', 'medium', 'low'] as const
export type Priority = (typeof PRIORITIES)[number]

export const PRIORITY_LABEL_LO: Record<Priority, string> = {
  high: 'ດ່ວນ',
  medium: 'ຄວນວາງແຜນ',
  low: 'ເຝົ້າເບິ່ງ',
}

export const PRIORITY_STYLE: Record<Priority, string> = {
  high: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  medium: 'bg-brand-orange/20 text-brand-orange',
  low: 'bg-brand-navy/10 text-muted dark:bg-white/5',
}

export type ReplacementCandidate = {
  asset_code: string
  name: string
  category_name: string | null
  brand: string | null
  model: string | null
  location_name: string | null
  department_name: string | null
  holder_name: string | null
  is_assigned: boolean
  purchase_date: string | Date | null
  purchase_price: string | null
  warranty_until: string | Date | null
  warranty_status: string
  stock_state: string
  age_years: string | null
  repair_count: string
  repair_cost: string
  reason_age: boolean
  reason_warranty: boolean
  reason_cost: boolean
  reason_repairs: boolean
  reason_condition: boolean
  reason_count: number
  priority: Priority
  estimated_cost: string
}

/** ເຫດຜົນເປັນຄຳເວົ້າ — ໃຫ້ຄົນອ່ານແລ້ວຮູ້ວ່າເປັນຫຍັງເຄື່ອງນີ້ຈຶ່ງຢູ່ໃນລາຍການ */
export function reasonsOf(c: ReplacementCandidate): string[] {
  const out: string[] = []
  if (c.reason_condition) out.push('ສະພາບເພ / ສົ່ງສ້ອມ / ຫາຍ')
  if (c.reason_age) out.push(`ອາຍຸ ${c.age_years} ປີ`)
  if (c.reason_repairs) out.push(`ສ້ອມມາແລ້ວ ${c.repair_count} ຄັ້ງ`)
  if (c.reason_cost) out.push('ຄ່າສ້ອມເກີນ 40% ຂອງລາຄາຊື້')
  if (c.reason_warranty) out.push('ໝົດປະກັນແລ້ວ')
  return out
}

export async function listReplacementCandidates(
  filters: { priority?: string; minAge?: number; category?: string; q?: string } = {}
) {
  const params: unknown[] = []
  const where: string[] = ['true']

  if (filters.priority && filters.priority !== 'all') {
    if (filters.priority === 'plan') where.push(`priority in ('high', 'medium')`)
    else {
      params.push(filters.priority)
      where.push(`priority = $${params.length}`)
    }
  }

  if (filters.minAge && filters.minAge > 0) {
    params.push(filters.minAge)
    where.push(`age_years >= $${params.length}::numeric`)
  }

  if (filters.category && filters.category !== 'all') {
    params.push(filters.category)
    where.push(`category_name = $${params.length}`)
  }

  if (filters.q) {
    params.push(`%${filters.q}%`)
    const i = params.length
    where.push(
      `(asset_code ilike $${i} or name ilike $${i} or holder_name ilike $${i}
        or department_name ilike $${i})`
    )
  }

  return query<ReplacementCandidate>(
    `select * from it.v_replacement_candidates
      where ${where.join(' and ')}
      order by case priority when 'high' then 0 when 'medium' then 1 else 2 end,
               reason_count desc, age_years desc nulls last, asset_code
      limit 500`,
    params
  )
}

export async function getReplacementSummary() {
  const rows = await query<{
    total: string
    high: string
    medium: string
    low: string
    estimated: string
    no_price: string
  }>(
    `select count(*)                                        as total,
            count(*) filter (where priority = 'high')       as high,
            count(*) filter (where priority = 'medium')     as medium,
            count(*) filter (where priority = 'low')        as low,
            coalesce(sum(estimated_cost), 0)                as estimated,
            count(*) filter (where coalesce(purchase_price, 0) = 0) as no_price
       from it.v_replacement_candidates`
  )
  return rows[0]
}

/** ແຍກຕາມປະເພດ — ໃຊ້ຕັ້ງງົບປະມານເປັນກ້ອນ */
export async function getReplacementByCategory() {
  return query<{
    category_name: string | null
    total: string
    high: string
    estimated: string
  }>(
    `select category_name,
            count(*)                                   as total,
            count(*) filter (where priority = 'high')  as high,
            coalesce(sum(estimated_cost), 0)           as estimated
       from it.v_replacement_candidates
      where priority in ('high', 'medium')
      group by category_name
      order by count(*) desc
      limit 20`
  )
}

export async function getCategoryNames() {
  return query<{ category_name: string }>(
    `select distinct category_name
       from it.v_replacement_candidates
      where category_name is not null
      order by category_name`
  )
}

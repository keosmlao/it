import 'server-only'
import { query } from '@/lib/db'
import type { Consumable, ConsumableMove } from './model'

export async function listConsumables(
  filters: { category?: string; state?: string; q?: string; all?: boolean } = {}
) {
  const params: unknown[] = []
  const where: string[] = ['true']

  if (!filters.all) where.push('is_active')

  if (filters.category && filters.category !== 'all') {
    params.push(filters.category)
    where.push(`category = $${params.length}`)
  }

  if (filters.state === 'low') where.push(`stock_state in ('low', 'empty')`)

  if (filters.q) {
    params.push(`%${filters.q}%`)
    const i = params.length
    where.push(`(code ilike $${i} or name ilike $${i} or location ilike $${i})`)
  }

  return query<Consumable>(
    `select * from it.v_consumables
      where ${where.join(' and ')}
      order by case stock_state
                 when 'empty' then 0
                 when 'low'   then 1
                 when 'ok'    then 2
                 else 3
               end,
               name
      limit 300`,
    params
  )
}

export async function getConsumable(id: string) {
  const rows = await query<Consumable>(
    'select * from it.v_consumables where id = $1::bigint',
    [id]
  )
  return rows[0] ?? null
}

export async function getConsumableMoves(id: string) {
  return query<ConsumableMove>(
    `select * from it.v_consumable_moves
      where consumable_id = $1::bigint
      order by moved_at desc, id desc
      limit 100`,
    [id]
  )
}

export async function getConsumableStats() {
  const rows = await query<{
    total: string
    low: string
    empty: string
    stock_value: string
  }>(
    `select count(*) filter (where is_active)                  as total,
            count(*) filter (where stock_state = 'low')        as low,
            count(*) filter (where stock_state = 'empty')      as empty,
            coalesce(sum(stock_value), 0)                      as stock_value
       from it.v_consumables`
  )
  return rows[0]
}

/** ການເຄື່ອນໄຫວຫຼ້າສຸດທັງໝົດ — ໃຫ້ເຫັນວ່າໃຜເບີກຫຍັງໄປ */
export async function listRecentMoves(limit = 20) {
  return query<ConsumableMove>(
    `select * from it.v_consumable_moves
      order by moved_at desc, id desc
      limit $1::int`,
    [limit]
  )
}

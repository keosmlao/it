import { getCurrentUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * ຄົ້ນຫາສິນຄ້າຈາກທະບຽນ ERP (ic_inventory — 24,538 ລາຍການ)
 * ສຳລັບຕົວເລືອກໃນຟອມໃບສະເໜີຊື້
 */
export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return new Response('Unauthorized', { status: 401 })
  if (!can.useStaffArea(user)) return new Response('Forbidden', { status: 403 })

  const q = new URL(request.url).searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return Response.json([])

  const rows = await query<{
    code: string
    name: string
    unit_name: string | null
    avg_cost: string
    stock_qty: string
    category_name: string | null
  }>(
    `select code, name, unit_name, avg_cost, stock_qty, category_name
       from it.v_inventory_items
      where code ilike $1::text or name ilike $1::text
      order by case when code ilike $2::text then 0 else 1 end,
               name
      limit 25`,
    [`%${q}%`, `${q}%`]
  )

  return Response.json(rows)
}

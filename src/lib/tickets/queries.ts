import 'server-only'
import { query } from '@/lib/db'
import { can, type ItStaff } from '@/lib/auth/roles'
import type { TicketComment, TicketRow } from './model'
import { PAGE_SIZE, type PageResult } from '@/lib/pagination'
import { cached } from '@/lib/cache'

/**
 * ຂອບເຂດການເບິ່ງເຫັນ: manager ເຫັນໝົດ; ພະນັກງານ IT ຄົນອື່ນເຫັນວຽກຂອງໜ່ວຍງານຕົນ,
 * ວຽກທີ່ຍັງບໍ່ໄດ້ລະບຸໜ່ວຍງານ ແລະ ວຽກທີ່ມອບໝາຍໃຫ້ຕົນເອງ.
 *
 * ຜູ້ແຈ້ງບັນຫາຈາກພະແນກອື່ນ (requester) ເຫັນ**ສະເພາະ ticket ທີ່ຕົນເປັນຜູ້ແຈ້ງ** —
 * ຕ້ອງກວດກ່ອນເງື່ອນໄຂໜ່ວຍງານ ເພາະ `unit_code is null` ຈະເປີດວຽກຂອງຄົນອື່ນໃຫ້ເຫັນ
 */
function scopeClause(user: ItStaff, params: unknown[]): string {
  if (user.role === 'requester') {
    params.push(user.employee_id)
    return `requester_employee_id = $${params.length}`
  }

  const units = can.visibleUnits(user)
  if (units === null) return 'true'

  params.push(units, user.employee_id)
  const unitsIdx = params.length - 1
  const meIdx = params.length
  return `(unit_code = any($${unitsIdx}::text[])
           or unit_code is null
           or assignee_employee_id = $${meIdx})`
}

export type TicketFilters = {
  status?: string
  priority?: string
  category?: string
  mine?: boolean
  overdue?: boolean
  q?: string
}

function ticketWhere(user: ItStaff, filters: TicketFilters) {
  const params: unknown[] = []
  const where = [scopeClause(user, params)]

  // 'open' = ຍັງບໍ່ຈົບ, 'all' = ບໍ່ກັ່ນຕອງ, ນອກນັ້ນຄືສະຖານະໃດໜຶ່ງ
  if (filters.status === 'open') {
    where.push(`status in ('new','assigned','in_progress','pending')`)
  } else if (filters.status && filters.status !== 'all') {
    params.push(filters.status)
    where.push(`status = $${params.length}`)
  }

  if (filters.priority) {
    params.push(filters.priority)
    where.push(`priority = $${params.length}`)
  }

  if (filters.category) {
    params.push(filters.category)
    where.push(`category_code = $${params.length}`)
  }

  if (filters.mine) {
    params.push(user.employee_id)
    where.push(`assignee_employee_id = $${params.length}`)
  }

  if (filters.overdue) {
    where.push(`(respond_overdue or resolve_overdue)`)
  }

  if (filters.q) {
    params.push(`%${filters.q}%`)
    where.push(
      `(title ilike $${params.length} or ticket_no ilike $${params.length}
        or requester_name ilike $${params.length})`
    )
  }

  return { params, where }
}

export async function listTickets(user: ItStaff, filters: TicketFilters = {}) {
  const { params, where } = ticketWhere(user, filters)
  return query<TicketRow>(
    `select * from it.v_tickets
      where ${where.join(' and ')}
      order by is_finished, priority_order, created_at desc
      limit 200`,
    params
  )
}

export async function paginateTickets(user: ItStaff, filters: TicketFilters, page: number): Promise<PageResult<TicketRow>> {
  const { params, where } = ticketWhere(user, filters)
  const count = await query<{ total: string }>(`select count(*) as total from it.v_tickets where ${where.join(' and ')}`, params)
  const total = Number(count[0]?.total ?? 0)
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  params.push(PAGE_SIZE, (safePage - 1) * PAGE_SIZE)
  const items = await query<TicketRow>(`select * from it.v_tickets where ${where.join(' and ')} order by is_finished, priority_order, created_at desc limit $${params.length - 1} offset $${params.length}`, params)
  return { items, page: safePage, pageSize: PAGE_SIZE, total, pageCount }
}

export async function getTicket(user: ItStaff, id: string) {
  const params: unknown[] = []
  const scope = scopeClause(user, params)
  params.push(id)

  const rows = await query<TicketRow>(
    `select * from it.v_tickets where ${scope} and id = $${params.length}`,
    params
  )
  return rows[0] ?? null
}

/**
 * ຂໍ້ຄວາມໃນ ticket. `includeInternal = false` ໃຊ້ກັບຜູ້ແຈ້ງຈາກພະແນກອື່ນ —
 * ບັນທຶກພາຍໃນຂອງທີມ IT ຕ້ອງບໍ່ຫຼຸດອອກໄປໃຫ້ເຂົາເຫັນ
 */
export async function getComments(ticketId: string, includeInternal = true) {
  return query<TicketComment>(
    `select c.id, c.kind, c.body, c.is_internal, c.author_employee_id,
            e.fullname_lo as author_name, e.nickname as author_nickname,
            c.created_at
       from it.ticket_comments c
       join public.odg_employee e on e.employee_id = c.author_employee_id
      where c.ticket_id = $1::bigint
        and ($2::boolean or not c.is_internal)
      order by c.created_at`,
    [ticketId, includeInternal]
  )
}

export async function getTicketStats(user: ItStaff) {
  const params: unknown[] = []
  const scope = scopeClause(user, params)
  params.push(user.employee_id)

  const rows = await query<{
    open_count: string
    mine_count: string
    overdue_count: string
    resolved_today: string
    resolved_count: string
    closed_count: string
    total_count: string
  }>(
    `select
       count(*) filter (where not is_finished)                       as open_count,
       count(*) filter (where not is_finished
                          and assignee_employee_id = $${params.length}) as mine_count,
       count(*) filter (where respond_overdue or resolve_overdue)    as overdue_count,
       count(*) filter (where resolved_at::date = current_date)      as resolved_today,
       count(*) filter (where status = 'resolved')                   as resolved_count,
       count(*) filter (where status = 'closed')                     as closed_count,
       count(*)                                                      as total_count
     from it.v_tickets
     where ${scope}`,
    params
  )

  return rows[0]
}

// ປະເພດບັນຫາ ແລະ SLA ຜູ້ຈັດການແກ້ໄດ້ຈາກໜ້າຕັ້ງຄ່າ — TTL ສັ້ນພໍໃຫ້ເຫັນຜົນໄວ
export async function getCategories() {
  return cached('ticket:categories', 60, () =>
    query<{ code: string; name_lo: string; unit_code: string | null }>(
      `select code, name_lo, unit_code from it.ticket_categories
        where is_active order by sort_order`
    )
  )
}

export async function getPriorities() {
  return cached('ticket:priorities', 60, () =>
    query<{
      priority: string
      name_lo: string
      respond_minutes: number
      resolve_minutes: number
    }>(
      `select priority, name_lo, respond_minutes, resolve_minutes
         from it.sla_policies order by sort_order`
    )
  )
}

/** ພະນັກງານທັງບໍລິສັດ ສຳລັບເລືອກເປັນ "ຜູ້ແຈ້ງ" */
export async function getAllEmployees() {
  return cached('employees:all', 300, () =>
    query<{
    employee_id: number
    employee_code: string
    fullname_lo: string
    department_name_lo: string | null
  }>(
    `select e.employee_id, e.employee_code, e.fullname_lo,
            d.department_name_lo
       from public.odg_employee e
       left join public.odg_department d on d.department_code = e.department_code
      where e.employment_status = 'ACTIVE'
      order by d.department_name_lo nulls last, e.fullname_lo`
    )
  )
}

/** ພະນັກງານ IT ທີ່ມອບໝາຍວຽກໃຫ້ໄດ້ */
export async function getAssignableStaff(user: ItStaff) {
  const units = can.visibleUnits(user)
  return query<{
    employee_id: number
    fullname_lo: string
    nickname: string | null
    unit_name_lo: string | null
    role: string
  }>(
    `select employee_id, fullname_lo, nickname, unit_name_lo, role
       from it.v_it_staff
      where $1::text[] is null or unit_code = any($1::text[])
      order by fullname_lo`,
    [units]
  )
}

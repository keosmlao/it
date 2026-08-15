import 'server-only'
import { query } from '@/lib/db'
import type { SubscriptionPeriodRow, SubscriptionRow } from './model'

export type SubscriptionFilters = {
  category?: string
  status?: string
  due?: string
  q?: string
}

/**
 * ລາຍການສັນຍາ
 *
 * ຈັດລຳດັບເອົາອັນທີ່ຕ້ອງເບິ່ງກ່ອນຂຶ້ນເທິງ: ເລີຍກຳນົດ → ໃກ້ຮອດ → ຍັງອີກໄກ
 * ຈຶ່ງບໍ່ຕ້ອງກັ່ນຕອງກ່ອນຈຶ່ງເຫັນວ່າມີອັນໃດຄ້າງ
 */
export async function listSubscriptions(filters: SubscriptionFilters = {}) {
  const params: unknown[] = []
  const where: string[] = ['true']

  if (filters.status && filters.status !== 'all') {
    params.push(filters.status)
    where.push(`status = $${params.length}`)
  } else if (!filters.status) {
    where.push(`status = 'active'`)
  }

  if (filters.category && filters.category !== 'all') {
    params.push(filters.category)
    where.push(`category = $${params.length}`)
  }

  if (filters.due === 'soon') where.push(`due_status in ('overdue', 'due_soon')`)
  else if (filters.due === 'overdue') where.push(`due_status = 'overdue'`)

  if (filters.q) {
    params.push(`%${filters.q}%`)
    const i = params.length
    where.push(
      `(code ilike $${i} or service_name ilike $${i} or vendor ilike $${i}
        or plan_name ilike $${i} or account_ref ilike $${i})`
    )
  }

  return query<SubscriptionRow>(
    `select * from it.v_subscriptions
      where ${where.join(' and ')}
      order by case due_status
                 when 'overdue'  then 0
                 when 'due_soon' then 1
                 when 'ok'       then 2
                 when 'unknown'  then 3
                 else 4
               end,
               next_due_date nulls last, service_name
      limit 300`,
    params
  )
}

export async function getSubscription(id: string) {
  const rows = await query<SubscriptionRow>(
    'select * from it.v_subscriptions where id = $1::bigint',
    [id]
  )
  return rows[0] ?? null
}

export async function getSubscriptionPeriods(subscriptionId: string) {
  return query<SubscriptionPeriodRow>(
    `select * from it.v_subscription_periods
      where subscription_id = $1::bigint
      order by period_start desc
      limit 60`,
    [subscriptionId]
  )
}

export type SubscriptionStats = {
  active: string
  overdue: string
  due_soon: string
  unpaid_periods: string
}

export async function getSubscriptionStats() {
  const rows = await query<SubscriptionStats>(
    `select count(*) filter (where status = 'active')            as active,
            count(*) filter (where due_status = 'overdue')       as overdue,
            count(*) filter (where due_status = 'due_soon')      as due_soon,
            coalesce(sum(unpaid_count), 0)                       as unpaid_periods
       from it.v_subscriptions`
  )
  return rows[0]
}

/**
 * ຄ່າໃຊ້ຈ່າຍປະຈຳແຍກຕາມສະກຸນ
 *
 * ບໍ່ລວມຫຼາຍສະກຸນເຂົ້າເປັນຕົວເລກດຽວ ເພາະຕ້ອງໃຊ້ອັດຕາແລກປ່ຽນທີ່ປ່ຽນທຸກມື້ —
 * ຖ້າລວມໄວ້ໃນ DB ຕົວເລກເກົ່າຈະຜິດທັນທີທີ່ອັດຕາປ່ຽນ
 */
export async function getCostByCurrency() {
  return query<{ currency: string; monthly: string; yearly: string; total: string }>(
    `select currency,
            sum(monthly_amount) as monthly,
            sum(yearly_amount)  as yearly,
            count(*)            as total
       from it.v_subscriptions
      where status = 'active'
      group by currency
      order by currency`
  )
}

export async function getCostByCategory() {
  return query<{
    category: string
    currency: string
    monthly: string
    yearly: string
    total: string
  }>(
    `select category, currency,
            sum(monthly_amount) as monthly,
            sum(yearly_amount)  as yearly,
            count(*)            as total
       from it.v_subscriptions
      where status = 'active'
      group by category, currency
      order by category, currency`
  )
}

export async function getCostByDepartment() {
  return query<{
    department_code: string | null
    department_name: string | null
    currency: string
    monthly: string
    yearly: string
    total: string
  }>(
    `select department_code, department_name, currency,
            sum(monthly_amount) as monthly,
            sum(yearly_amount)  as yearly,
            count(*)            as total
       from it.v_subscriptions
      where status = 'active'
      group by department_code, department_name, currency
      order by sum(yearly_amount) desc
      limit 50`
  )
}

/** ຍອດທີ່ຈ່າຍຈິງແຕ່ລະເດືອນ — ອີງງວດທີ່ບັນທຶກວ່າຈ່າຍແລ້ວ ບໍ່ແມ່ນຄ່າໃນສັນຍາ */
export async function getPaidByMonth(months = 12) {
  return query<{ month: string; currency: string; paid: string; items: string }>(
    `select to_char(date_trunc('month', paid_at), 'YYYY-MM') as month,
            currency,
            sum(amount) as paid,
            count(*)    as items
       from it.subscription_periods
      where status = 'paid' and paid_at is not null
        and paid_at >= (date_trunc('month', current_date) - ($1::int || ' months')::interval)
      group by 1, 2
      order by 1 desc, 2`,
    [months]
  )
}

/** ງວດທີ່ຍັງບໍ່ຈ່າຍທັງລະບົບ — ໃຊ້ໃນໜ້າຄ່າໃຊ້ຈ່າຍ */
export async function listUnpaidPeriods() {
  return query<SubscriptionPeriodRow>(
    `select * from it.v_subscription_periods
      where status = 'unpaid'
      order by due_date
      limit 100`
  )
}

/** ພະນັກງານ IT ທີ່ຕັ້ງເປັນຜູ້ຮັບຜິດຊອບໄດ້ */
export async function getOwnerOptions() {
  return query<{ employee_id: number; fullname_lo: string }>(
    `select employee_id, fullname_lo
       from it.v_it_staff
      order by fullname_lo`
  )
}

export async function getDepartmentOptions() {
  return query<{ code: string; name: string }>(
    `select code, name_1 as name
       from public.erp_department_list
      order by name_1`
  )
}

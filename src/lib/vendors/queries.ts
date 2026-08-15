import 'server-only'
import { query } from '@/lib/db'
import type { VendorRow, VendorSpend } from './model'

export async function listVendors(filters: { q?: string; active?: boolean } = {}) {
  const params: unknown[] = []
  const where: string[] = ['true']

  if (filters.active !== false) where.push('is_active')

  if (filters.q) {
    params.push(`%${filters.q}%`)
    const i = params.length
    where.push(
      `(name ilike $${i} or short_name ilike $${i} or contact_name ilike $${i}
        or phone ilike $${i} or email ilike $${i})`
    )
  }

  return query<VendorRow>(
    `select * from it.v_vendors
      where ${where.join(' and ')}
      order by name
      limit 300`,
    params
  )
}

export async function getVendor(id: string) {
  const rows = await query<VendorRow>('select * from it.v_vendors where id = $1::bigint', [
    id,
  ])
  return rows[0] ?? null
}

export async function getVendorSpend(id: string) {
  return query<VendorSpend>(
    'select * from it.v_vendor_spend where vendor_id = $1::bigint order by currency',
    [id]
  )
}

/** ສັນຍາເຊົ່າຂອງຜູ້ຂາຍນີ້ */
export async function getVendorSubscriptions(id: string) {
  return query<{
    id: string
    code: string
    service_name: string
    amount: string
    currency: string
    billing_cycle: string
    next_due_date: string | Date | null
    status: string
  }>(
    `select id, code, service_name, amount, currency, billing_cycle,
            next_due_date, status
       from it.v_subscriptions
      where vendor_id = $1::bigint
      order by status, next_due_date nulls last
      limit 100`,
    [id]
  )
}

/** ໃບສ້ອມທີ່ສົ່ງໃຫ້ຜູ້ຂາຍນີ້ */
export async function getVendorRepairs(id: string) {
  return query<{
    id: string
    asset_code: string
    repair_date: string | Date
    issue: string
    cost: string | null
    status: string
  }>(
    `select id, asset_code, repair_date, issue, cost, status
       from it.asset_repairs
      where vendor_id = $1::bigint and deleted_at is null
      order by repair_date desc
      limit 50`,
    [id]
  )
}

/** ຕົວເລືອກສຳລັບ dropdown ໃນໜ້າອື່ນ (ສັນຍາເຊົ່າ, ຂອງສິ້ນເປືອງ) */
export async function getVendorOptions() {
  return query<{ id: string; name: string }>(
    'select id, name from it.vendors where is_active order by name'
  )
}

/** ຜູ້ຈຳໜ່າຍຂອງ ERP — ໃຫ້ຜູກເຂົ້າກັນໄດ້ຖ້າເປັນເຈົ້າດຽວກັນ */
export async function getErpSupplierOptions() {
  return query<{ code: string; name: string }>(
    `select code, name_1 as name
       from public.ap_supplier
      where coalesce(status, 0) = 0 and coalesce(name_1, '') <> ''
      order by name_1
      limit 500`
  )
}

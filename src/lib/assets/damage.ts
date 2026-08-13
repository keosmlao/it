import 'server-only'
import { query } from '@/lib/db'
import type { StockState, WriteoffReason } from './stock-model'

export type DamagedAsset = {
  asset_code: string
  asset_name: string
  category_name: string | null
  brand: string | null
  model: string | null
  serial_no: string | null
  location_name: string | null
  purchase_date: string | Date | null
  purchase_price: string | null
  warranty_status: string
  warranty_until: string | Date | null
  is_assigned: boolean
  holder_name: string | null
  holder_department: string | null
  stock_state: StockState
  damaged_at: string | Date | null
  damage_detail: string | null
  location_note: string | null
  check_note: string | null
  checked_at: string | Date | null
  checked_by_name: string | null
  writeoff_id: string | null
  writeoff_reason: WriteoffReason | null
  writeoff_detail: string | null
  written_off_at: string | Date | null
  book_value: string | null
  decided_by_name: string | null
  writeoff_approved: boolean
  approved_by_name: string | null
  repair_count: string
  last_repair_at: string | Date | null
  repair_cost_total: string
}

/**
 * ອຸປະກອນທີ່ມີບັນຫາ.
 * `state` = 'broken' ລວມທັງເພ ແລະ ສົ່ງສ້ອມ (ອັນທີ່ຍັງແກ້ໄດ້)
 *          'scrapped' ຄືທີ່ຕັດຈຳໜ່າຍ/ປົດລະວາງແລ້ວ
 */
export async function listDamagedAssets(
  filters: { state?: string; q?: string } = {}
) {
  const params: unknown[] = []
  const where: string[] = ['true']

  if (filters.state === 'broken') {
    where.push(`stock_state in ('damaged', 'repair')`)
  } else if (filters.state === 'scrapped') {
    where.push(`stock_state in ('scrapped', 'retired')`)
  } else if (filters.state && filters.state !== 'all') {
    params.push(filters.state)
    where.push(`stock_state = $${params.length}`)
  }

  if (filters.q) {
    params.push(`%${filters.q}%`)
    const i = params.length
    where.push(
      `(asset_code ilike $${i} or asset_name ilike $${i} or serial_no ilike $${i}
        or damage_detail ilike $${i})`
    )
  }

  return query<DamagedAsset>(
    `select * from it.v_damaged_assets
      where ${where.join(' and ')}
      order by case stock_state
                 when 'damaged'  then 1
                 when 'repair'   then 2
                 when 'missing'  then 3
                 when 'scrapped' then 4
                 else 5 end,
               damaged_at desc nulls last, asset_code`,
    params
  )
}

export async function getDamageStats() {
  const rows = await query<{
    damaged: string
    repair: string
    missing: string
    scrapped: string
    retired: string
    total: string
    lost_value: string
  }>(
    `select count(*) filter (where stock_state = 'damaged')  as damaged,
            count(*) filter (where stock_state = 'repair')   as repair,
            count(*) filter (where stock_state = 'missing')  as missing,
            count(*) filter (where stock_state = 'scrapped') as scrapped,
            count(*) filter (where stock_state = 'retired')  as retired,
            count(*)                                         as total,
            coalesce(sum(purchase_price) filter
                     (where stock_state in ('scrapped', 'retired')), 0)
                                                             as lost_value
       from it.v_damaged_assets`
  )
  return rows[0]
}

export async function getAssetDamage(assetCode: string) {
  const rows = await query<DamagedAsset>(
    'select * from it.v_damaged_assets where asset_code = $1::varchar',
    [assetCode]
  )
  return rows[0] ?? null
}

export type AssetCondition = {
  stock_state: StockState | null
  damaged_at: string | Date | null
  damage_detail: string | null
  location_note: string | null
  checked_at: string | Date | null
  checked_by_name: string | null
  writeoff_reason: WriteoffReason | null
  writeoff_detail: string | null
  written_off_at: string | Date | null
  decided_by_name: string | null
  repair_count: string
  repair_cost_total: string
  purchase_price: string | null
}

/**
 * ສະພາບປັດຈຸບັນຂອງເຄື່ອງໜຶ່ງ — ໃຊ້ຢູ່ໜ້າລາຍລະອຽດ.
 * ຄືນຄ່າໄດ້ເຖິງແມ່ນເຄື່ອງຍັງບໍ່ເຄີຍຖືກໝາຍສະຖານະ (stock_state = null)
 * ບໍ່ດັ່ງນັ້ນຈະບໍ່ມີບ່ອນໝາຍເຄື່ອງທີ່ຍັງປົກກະຕິວ່າເພ
 */
export async function getAssetCondition(assetCode: string) {
  const rows = await query<AssetCondition>(
    `select s.stock_state, s.damaged_at, s.damage_detail, s.location_note,
            s.checked_at, chk.fullname_lo as checked_by_name,
            w.reason        as writeoff_reason,
            w.detail        as writeoff_detail,
            w.written_off_at,
            dec.fullname_lo as decided_by_name,
            coalesce(rp.total, 0)  as repair_count,
            coalesce(rp.cost, 0)   as repair_cost_total,
            a.purchase_price
       from it.v_it_assets a
       left join it.asset_stock_status s on s.asset_code = a.asset_code
       left join public.odg_employee chk on chk.employee_id = s.checked_by
       left join it.asset_writeoffs w
              on w.asset_code = a.asset_code and w.cancelled_at is null
       left join public.odg_employee dec on dec.employee_id = w.decided_by
       left join lateral (
             select count(*) as total, sum(coalesce(r.cost, 0)) as cost
               from it.v_asset_repairs r where r.asset_code = a.asset_code
       ) rp on true
      where a.asset_code = $1::varchar`,
    [assetCode]
  )
  return rows[0] ?? null
}

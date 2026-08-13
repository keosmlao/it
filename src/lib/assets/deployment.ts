import 'server-only'
import { query } from '@/lib/db'
import type { StockState } from './stock-model'

export type Deployment = {
  id: string
  asset_code: string
  asset_name: string
  category_name: string | null
  brand: string | null
  model: string | null
  serial_no: string | null
  mac_address: string | null
  location_code: string | null
  location_name: string | null
  place: string
  purpose: string | null
  responsible_emp_code: string | null
  responsible_name: string | null
  responsible_department: string | null
  installed_at: string | Date
  days_installed: number
  removed_at: string | Date | null
  remove_note: string | null
  note: string | null
  created_by_name: string | null
  created_at: string
  stock_state: StockState | null
  warranty_status: string | null
  warranty_until: string | Date | null
}

/** ອຸປະກອນສ່ວນກາງທີ່ຕິດຕັ້ງຢູ່ (ຫຼື ຖອດອອກແລ້ວ ຖ້າ state = 'removed') */
export async function listDeployments(
  filters: { state?: string; q?: string; place?: string } = {}
) {
  const params: unknown[] = []
  const where: string[] = [
    filters.state === 'removed' ? 'removed_at is not null' : 'removed_at is null',
  ]

  if (filters.place) {
    params.push(filters.place)
    where.push(`place = $${params.length}`)
  }

  if (filters.q) {
    params.push(`%${filters.q}%`)
    const i = params.length
    where.push(
      `(asset_code ilike $${i} or asset_name ilike $${i} or place ilike $${i}
        or purpose ilike $${i} or responsible_name ilike $${i}
        or serial_no ilike $${i})`
    )
  }

  return query<Deployment>(
    `select * from it.v_asset_deployments
      where ${where.join(' and ')}
      order by place, asset_name`,
    params
  )
}

export async function getDeploymentStats() {
  const rows = await query<{
    active: string
    places: string
    removed: string
    no_owner: string
    value: string
  }>(
    `select count(*) filter (where removed_at is null)              as active,
            count(distinct place) filter (where removed_at is null) as places,
            count(*) filter (where removed_at is not null)          as removed,
            count(*) filter (where removed_at is null
                               and responsible_emp_code is null)    as no_owner,
            coalesce(sum(a.purchase_price) filter
                     (where d.removed_at is null), 0)               as value
       from it.v_asset_deployments d
       left join it.v_it_assets a on a.asset_code = d.asset_code`
  )
  return rows[0]
}

/** ບ່ອນຕິດຕັ້ງທີ່ມີຢູ່ແລ້ວ — ໃຊ້ເປັນຕົວກັ່ນຕອງ ແລະ ຕົວຊ່ວຍພິມ */
export async function getDeploymentPlaces() {
  return query<{ place: string; total: string }>(
    `select place, count(*) as total
       from it.v_asset_deployments
      where removed_at is null
      group by place
      order by count(*) desc, place`
  )
}

/** ການຕິດຕັ້ງທີ່ຍັງໃຊ້ຢູ່ຂອງເຄື່ອງນີ້ — ໃຊ້ເຕືອນຢູ່ໜ້າລາຍລະອຽດ */
export async function getAssetDeployment(assetCode: string) {
  const rows = await query<Deployment>(
    `select * from it.v_asset_deployments
      where asset_code = $1::varchar and removed_at is null`,
    [assetCode]
  )
  return rows[0] ?? null
}

/** ສະຖານທີ່ຕັ້ງຈາກທະບຽນ ERP — ໃຫ້ເລືອກຕອນຕິດຕັ້ງ */
export async function getAssetLocations() {
  return query<{ code: string; name: string }>(
    `select code, name_1 as name
       from public.as_asset_location
      where coalesce(name_1, '') <> ''
      order by name_1`
  )
}

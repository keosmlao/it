import 'server-only'
import { query } from '@/lib/db'

export type LocalAsset = {
  asset_code: string
  name: string
  category_code: string | null
  brand: string | null
  model: string | null
  serial_no: string | null
  mac_address: string | null
  location_code: string | null
  department_code: string | null
  purchase_date: string | Date | null
  purchase_price: string | null
  source_note: string | null
  is_active: boolean
  registered_at: string | Date
}

/** null ຖ້າລະຫັດນີ້ມາຈາກ ERP — ໃຊ້ຕັດສິນວ່າແກ້ຂໍ້ມູນຫຼັກໄດ້ບໍ */
export async function getLocalAsset(assetCode: string) {
  const rows = await query<LocalAsset>(
    `select asset_code, name, category_code, brand, model, serial_no,
            mac_address, location_code, department_code, purchase_date,
            purchase_price, source_note, is_active, registered_at
       from it.local_assets
      where asset_code = $1::varchar`,
    [assetCode]
  )
  return rows[0] ?? null
}

/** ໝວດທີ່ຕັ້ງໄວ້ໃນ ERP — ໃຊ້ເປັນຕົວເລືອກຕອນລົງທະບຽນ */
export async function getCategoryOptions() {
  return query<{ code: string; name: string }>(
    `select code, name_1 as name
       from public.odg_it_category
      order by name_1`
  )
}

/** ສະຖານທີ່ຈາກ ERP */
export async function getLocationOptions() {
  return query<{ code: string; name: string }>(
    `select code, name_1 as name
       from public.as_asset_location
      order by name_1`
  )
}

/** ພະແນກຈາກ ERP */
export async function getDepartmentOptions() {
  return query<{ code: string; name: string }>(
    `select code, name_1 as name
       from public.erp_department_list
      order by name_1`
  )
}

/** ນັບທະບຽນທ້ອງຖິ່ນ — ໃຊ້ໃນໜ້າລາຍການເພື່ອບອກວ່າມີເທົ່າໃດ */
export async function getLocalAssetCount() {
  const rows = await query<{ total: string; active: string }>(
    `select count(*) as total,
            count(*) filter (where is_active) as active
       from it.local_assets`
  )
  return rows[0]
}

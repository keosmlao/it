'use server'

import { revalidatePath } from 'next/cache'
import { query } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { logAudit } from '@/lib/activity'
import { invalidate } from '@/lib/cache'
import { refreshMovements } from '@/lib/assets/cache'
import type { FormState } from '@/lib/action-state'

/** ຄ່າທີ່ຮັບຈາກຟອມ — ໃຊ້ຮ່ວມກັນທັງລົງທະບຽນ ແລະ ແກ້ໄຂ */
function readFields(formData: FormData) {
  const text = (name: string, max: number) => {
    const v = String(formData.get(name) ?? '').trim()
    return v ? v.slice(0, max) : null
  }

  return {
    name: String(formData.get('name') ?? '').trim().slice(0, 100),
    category_code: text('category_code', 20),
    brand: text('brand', 120),
    model: text('model', 120),
    serial_no: text('serial_no', 120),
    mac_address: text('mac_address', 60),
    location_code: text('location_code', 20),
    department_code: text('department_code', 20),
    purchase_date: String(formData.get('purchase_date') ?? '') || null,
    purchase_price: String(formData.get('purchase_price') ?? '').trim() || null,
    source_note: text('source_note', 200),
  }
}

function validate(f: ReturnType<typeof readFields>): string | null {
  if (!f.name) return 'ກະລຸນາປ້ອນຊື່ອຸປະກອນ'
  if (f.purchase_price && Number.isNaN(Number(f.purchase_price))) {
    return 'ລາຄາຕ້ອງເປັນຕົວເລກ'
  }
  if (f.purchase_date && f.purchase_date > new Date().toISOString().slice(0, 10)) {
    return 'ວັນທີຊື້ຢູ່ໃນອະນາຄົດບໍ່ໄດ້'
  }
  return null
}

/** ຂໍ້ຄວາມທີ່ອ່ານຮູ້ເລື່ອງ ແທນ error ດິບຈາກ index ຊໍ້າ */
function duplicateSerial(err: unknown): boolean {
  return String((err as { constraint?: string })?.constraint ?? '').includes(
    'local_assets_serial_idx'
  )
}

/**
 * ລົງທະບຽນອຸປະກອນທີ່ບໍ່ໄດ້ມາຈາກ ERP
 *
 * ລະຫັດອອກໃຫ້ເອງເປັນ ITA-ປີ-ລຳດັບ ຈຶ່ງບໍ່ຊົນກັບ 200-… ຂອງ ERP
 */
export async function registerLocalAsset(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.manageAssets(user)) return { error: 'ບໍ່ມີສິດລົງທະບຽນຊັບສິນ' }

  const f = readFields(formData)
  const invalid = validate(f)
  if (invalid) return { error: invalid }

  let assetCode: string
  try {
    const rows = await query<{ asset_code: string }>(
      `insert into it.local_assets
         (name, category_code, brand, model, serial_no, mac_address,
          location_code, department_code, purchase_date, purchase_price,
          source_note, registered_by)
       values ($1::varchar, $2::varchar, $3::varchar, $4::varchar, $5::varchar,
               $6::varchar, $7::varchar, $8::varchar, $9::date, $10::numeric,
               $11::varchar, $12::int)
       returning asset_code`,
      [
        f.name,
        f.category_code,
        f.brand,
        f.model,
        f.serial_no,
        f.mac_address,
        f.location_code,
        f.department_code,
        f.purchase_date,
        f.purchase_price,
        f.source_note,
        user.employee_id,
      ]
    )
    assetCode = rows[0].asset_code
  } catch (err) {
    if (duplicateSerial(err)) {
      return { error: 'Serial ນີ້ລົງທະບຽນໄວ້ແລ້ວ — ຄົ້ນຫາເບິ່ງກ່ອນ' }
    }
    throw err
  }

  await logAudit(user.employee_id, 'local_asset', assetCode, 'register', f.name)
  invalidate('asset:')
  await refreshMovements()
  revalidatePath('/assets')
  revalidatePath(`/assets/${assetCode}`)

  return { ok: true, message: `ລົງທະບຽນແລ້ວ — ລະຫັດ ${assetCode}` }
}

/** ແກ້ຂໍ້ມູນຫຼັກ — ໄດ້ສະເພາະອຸປະກອນທີ່ລົງທະບຽນໃນລະບົບນີ້ */
export async function updateLocalAsset(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.manageAssets(user)) return { error: 'ບໍ່ມີສິດແກ້ຂໍ້ມູນ' }

  const assetCode = String(formData.get('asset_code') ?? '').trim()
  if (!assetCode) return { error: 'ບໍ່ພົບລະຫັດອຸປະກອນ' }

  const f = readFields(formData)
  const invalid = validate(f)
  if (invalid) return { error: invalid }

  let updated: { asset_code: string }[]
  try {
    updated = await query<{ asset_code: string }>(
      `update it.local_assets
          set name = $2::varchar, category_code = $3::varchar,
              brand = $4::varchar, model = $5::varchar,
              serial_no = $6::varchar, mac_address = $7::varchar,
              location_code = $8::varchar, department_code = $9::varchar,
              purchase_date = $10::date, purchase_price = $11::numeric,
              source_note = $12::varchar, updated_at = now()
        where asset_code = $1::varchar
        returning asset_code`,
      [
        assetCode,
        f.name,
        f.category_code,
        f.brand,
        f.model,
        f.serial_no,
        f.mac_address,
        f.location_code,
        f.department_code,
        f.purchase_date,
        f.purchase_price,
        f.source_note,
      ]
    )
  } catch (err) {
    if (duplicateSerial(err)) return { error: 'Serial ນີ້ມີໃນທະບຽນແລ້ວ' }
    throw err
  }

  if (updated.length === 0) {
    return { error: 'ອຸປະກອນນີ້ມາຈາກ ERP — ແກ້ຢູ່ນີ້ບໍ່ໄດ້' }
  }

  await logAudit(user.employee_id, 'local_asset', assetCode, 'update', f.name)
  invalidate('asset:')
  revalidatePath('/assets')
  revalidatePath(`/assets/${assetCode}`)

  return { ok: true }
}

/**
 * ປິດ/ເປີດການໃຊ້ງານ
 *
 * ບໍ່ໃຫ້ລຶບຖິ້ມ ເພາະປະຫວັດຢືມ–ຄືນ ແລະ ການສ້ອມຜູກກັບລະຫັດນີ້ຢູ່ —
 * ລຶບແລ້ວປະຫວັດຈະກາຍເປັນລະຫັດລອຍ ຄືກັບບັນຫາຂອງ HR ທີ່ພົບມາແລ້ວ
 */
export async function setLocalAssetActive(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.manageAssets(user)) return { error: 'ບໍ່ມີສິດແກ້ຂໍ້ມູນ' }

  const assetCode = String(formData.get('asset_code') ?? '').trim()
  const active = String(formData.get('is_active') ?? '') === '1'

  if (!active) {
    const held = await query<{ n: string }>(
      `select count(*) as n from it.v_asset_movements
        where asset_code = $1::varchar and not is_returned`,
      [assetCode]
    )
    if (Number(held[0]?.n ?? 0) > 0) {
      return { error: 'ຍັງມີຜູ້ຖືຄອງ — ບັນທຶກການຄືນກ່ອນ' }
    }
  }

  const updated = await query<{ asset_code: string }>(
    `update it.local_assets
        set is_active = $2::boolean, updated_at = now()
      where asset_code = $1::varchar
      returning asset_code`,
    [assetCode, active]
  )
  if (updated.length === 0) {
    return { error: 'ອຸປະກອນນີ້ມາຈາກ ERP — ແກ້ຢູ່ນີ້ບໍ່ໄດ້' }
  }

  await logAudit(
    user.employee_id,
    'local_asset',
    assetCode,
    active ? 'activate' : 'deactivate'
  )
  invalidate('asset:')
  revalidatePath('/assets')
  revalidatePath(`/assets/${assetCode}`)

  return { ok: true }
}

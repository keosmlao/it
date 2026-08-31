'use server'

import { revalidatePath } from 'next/cache'
import { query, tx, type Run } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { logAudit } from '@/lib/activity'
import { invalidate } from '@/lib/cache'
import { refreshMovements } from '@/lib/assets/cache'
import { getCategoryName } from '@/lib/assets/local'
import {
  REQUIRED_SPEC_FIELDS,
  SPEC_FIELDS,
  SPEC_NOTE_MAX,
  isComputerCategory,
} from '@/lib/assets/model'
import type { FormState } from '@/lib/action-state'
import { todayISO } from '@/lib/format'

/** ຄ່າທີ່ຮັບຈາກຟອມ — ໃຊ້ຮ່ວມກັນທັງລົງທະບຽນ ແລະ ແກ້ໄຂ */
function readFields(formData: FormData) {
  const text = (name: string, max: number) => {
    const v = String(formData.get(name) ?? '').trim()
    return v ? v.slice(0, max) : null
  }

  const spec = Object.fromEntries(
    SPEC_FIELDS.map((f) => [f.name, text(f.name, f.max)])
  ) as Record<(typeof SPEC_FIELDS)[number]['name'], string | null>

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
    spec: { ...spec, spec_note: text('spec_note', SPEC_NOTE_MAX) },
  }
}

type Fields = ReturnType<typeof readFields>

async function validate(f: Fields): Promise<string | null> {
  if (!f.name) return 'ກະລຸນາປ້ອນຊື່ອຸປະກອນ'
  if (f.purchase_price && Number.isNaN(Number(f.purchase_price))) {
    return 'ລາຄາຕ້ອງເປັນຕົວເລກ'
  }
  if (f.purchase_date && f.purchase_date > todayISO()) {
    return 'ວັນທີຊື້ຢູ່ໃນອະນາຄົດບໍ່ໄດ້'
  }

  // ຄອມທີ່ບໍ່ຮູ້ສະເປັກ ບອກອາຍຸເຄື່ອງ ຫຼື ວາງແຜນປ່ຽນເຄື່ອງບໍ່ໄດ້ —
  // ບັງຄັບຕັ້ງແຕ່ຕອນລົງທະບຽນ ຈຶ່ງບໍ່ຕ້ອງໄລ່ຖາມຄືນພາຍຫຼັງ
  if (f.category_code) {
    const category = await getCategoryName(f.category_code)
    if (isComputerCategory(category)) {
      const missing = SPEC_FIELDS.filter(
        (s) => REQUIRED_SPEC_FIELDS.some((k) => k === s.name) && !f.spec[s.name]
      )
      if (missing.length > 0) {
        const labels = missing.map((s) => s.label).join(', ')
        return `${category} ເປັນຄອມ — ຕ້ອງປ້ອນ ${labels}`
      }
    }
  }

  return null
}

/**
 * ບັນທຶກສະເປັກລົງ `it.asset_specs` (ຕາຕະລາງດຽວກັນກັບເຄື່ອງ ERP)
 *
 * ຂ້າມໄປຖ້າຟອມບໍ່ໄດ້ສົ່ງຄ່າມາເລີຍ — ບໍ່ລຶບຂອງເກົ່າຖິ້ມ ເພາະຟອມນີ້
 * ເຊື່ອງຊ່ອງສະເປັກໄວ້ເມື່ອບໍ່ແມ່ນຄອມ ຈະລຶບກໍ່ບໍ່ຮູ້ຕົວ.
 * ການລຶບສະເປັກ ເຮັດຢູ່ຟອມ spec ໃນໜ້າລາຍລະອຽດ.
 */
async function saveSpec(
  run: Run,
  assetCode: string,
  f: Fields,
  employeeId: number
) {
  const s = f.spec
  const values = [s.cpu, s.ram, s.storage, s.gpu, s.os, s.screen, s.spec_note]
  if (values.every((v) => !v)) return

  await run(
    `insert into it.asset_specs
       (asset_code, cpu, ram, storage, gpu, os, screen, spec_note, updated_by)
     values ($1::varchar, $2::varchar, $3::varchar, $4::varchar, $5::varchar,
             $6::varchar, $7::varchar, $8::text, $9::int)
     on conflict (asset_code) do update
       set cpu        = excluded.cpu,
           ram        = excluded.ram,
           storage    = excluded.storage,
           gpu        = excluded.gpu,
           os         = excluded.os,
           screen     = excluded.screen,
           spec_note  = excluded.spec_note,
           updated_by = excluded.updated_by,
           updated_at = now()`,
    [assetCode, ...values, employeeId]
  )
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
  if (!can.menu(user, '/assets/new', 'create')) return { error: 'ບໍ່ມີສິດລົງທະບຽນຊັບສິນ' }

  const f = readFields(formData)
  const invalid = await validate(f)
  if (invalid) return { error: invalid }

  // ເຄື່ອງ ແລະ ສະເປັກຕ້ອງລົງພ້ອມກັນ — ບໍ່ດັ່ງນັ້ນຖ້າສະເປັກລົ້ມ
  // ຈະໄດ້ຄອມທີ່ບໍ່ມີສະເປັກຄ້າງໄວ້ ທັງທີ່ຫາກໍ່ບັງຄັບວ່າຕ້ອງມີ
  let assetCode: string
  try {
    assetCode = await tx(async (run) => {
      const rows = await run<{ asset_code: string }>(
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

      const code = rows[0].asset_code
      await saveSpec(run, code, f, user.employee_id)
      return code
    })
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
  if (!can.menu(user, '/assets', 'edit')) return { error: 'ບໍ່ມີສິດແກ້ຂໍ້ມູນ' }

  const assetCode = String(formData.get('asset_code') ?? '').trim()
  if (!assetCode) return { error: 'ບໍ່ພົບລະຫັດອຸປະກອນ' }

  const f = readFields(formData)
  const invalid = await validate(f)
  if (invalid) return { error: invalid }

  let updated: { asset_code: string }[]
  try {
    updated = await tx(async (run) => {
      const rows = await run<{ asset_code: string }>(
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

      // ເຄື່ອງ ERP ບໍ່ມີແຖວໃນ `it.local_assets` — ບໍ່ຕ້ອງແຕະສະເປັກ
      if (rows.length > 0) await saveSpec(run, assetCode, f, user.employee_id)
      return rows
    })
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
  if (!can.menu(user, '/assets', 'delete')) return { error: 'ບໍ່ມີສິດແກ້ຂໍ້ມູນ' }

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

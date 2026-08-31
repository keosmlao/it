'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { query } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { logAudit } from '@/lib/activity'
import { todayISO } from '@/lib/format'
import { isConsumableCategory, isMoveKind } from '@/lib/consumables/model'
import { getConsumable } from '@/lib/consumables/queries'
import type { FormState } from '@/lib/action-state'

function readFields(formData: FormData) {
  const text = (name: string, max: number) => {
    const v = String(formData.get(name) ?? '').trim()
    return v ? v.slice(0, max) : null
  }

  return {
    name: String(formData.get('name') ?? '')
      .trim()
      .slice(0, 150),
    category: String(formData.get('category') ?? 'other').trim(),
    unit: String(formData.get('unit') ?? 'ອັນ')
      .trim()
      .slice(0, 20),
    min_qty: String(formData.get('min_qty') ?? '0').replace(/,/g, '').trim(),
    location: text('location', 120),
    vendor_id: text('vendor_id', 20),
    unit_price: String(formData.get('unit_price') ?? '').replace(/,/g, '').trim(),
    note: text('note', 300),
  }
}

type Fields = ReturnType<typeof readFields>

function validate(f: Fields): string | null {
  if (!f.name) return 'ກະລຸນາປ້ອນຊື່ລາຍການ'
  if (!isConsumableCategory(f.category)) return 'ໝວດບໍ່ຖືກຕ້ອງ'
  if (!f.unit) return 'ກະລຸນາປ້ອນຫົວໜ່ວຍ'

  const min = Number(f.min_qty || '0')
  if (!Number.isFinite(min) || min < 0) return 'ຈຸດສັ່ງຊື້ຕ້ອງເປັນຕົວເລກ 0 ຂຶ້ນໄປ'

  if (f.unit_price) {
    const price = Number(f.unit_price)
    if (!Number.isFinite(price) || price < 0) return 'ລາຄາຕໍ່ຫົວໜ່ວຍບໍ່ຖືກຕ້ອງ'
  }
  return null
}

function values(f: Fields) {
  return [
    f.name,
    f.category,
    f.unit,
    Number(f.min_qty || '0'),
    f.location,
    f.vendor_id ? Number(f.vendor_id) : null,
    f.unit_price ? Number(f.unit_price) : null,
    f.note,
  ]
}

function duplicateName(err: unknown): boolean {
  return String((err as { constraint?: string })?.constraint ?? '').includes(
    'consumables_name_idx'
  )
}

export async function createConsumable(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.module(user, 'consumables', 'create')) return { error: 'ບໍ່ມີສິດເພີ່ມລາຍການ' }

  const f = readFields(formData)
  const invalid = validate(f)
  if (invalid) return { error: invalid }

  let id: string
  try {
    const rows = await query<{ id: string; code: string }>(
      `insert into it.consumables
         (name, category, unit, min_qty, location, vendor_id, unit_price, note,
          created_by)
       values ($1::varchar, $2::varchar, $3::varchar, $4::numeric, $5::varchar,
               $6::bigint, $7::numeric, $8::varchar, $9::int)
       returning id, code`,
      [...values(f), user.employee_id]
    )
    id = rows[0].id
  } catch (err) {
    if (duplicateName(err)) return { error: 'ລາຍການຊື່ນີ້ມີໃນສາງແລ້ວ' }
    throw err
  }

  await logAudit(user.employee_id, 'consumable', id, 'create', f.name)
  revalidatePath('/consumables')
  redirect(`/consumables/${id}`)
}

export async function updateConsumable(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.module(user, 'consumables', 'edit')) return { error: 'ບໍ່ມີສິດແກ້ລາຍການ' }

  const id = String(formData.get('id') ?? '').trim()
  const f = readFields(formData)
  const invalid = validate(f)
  if (invalid) return { error: invalid }

  let updated: { id: string }[]
  try {
    updated = await query<{ id: string }>(
      `update it.consumables
          set name = $2::varchar, category = $3::varchar, unit = $4::varchar,
              min_qty = $5::numeric, location = $6::varchar, vendor_id = $7::bigint,
              unit_price = $8::numeric, note = $9::varchar, updated_at = now()
        where id = $1::bigint
        returning id`,
      [id, ...values(f)]
    )
  } catch (err) {
    if (duplicateName(err)) return { error: 'ລາຍການຊື່ນີ້ມີໃນສາງແລ້ວ' }
    throw err
  }
  if (updated.length === 0) return { error: 'ບໍ່ພົບລາຍການນີ້' }

  await logAudit(user.employee_id, 'consumable', id, 'update', f.name)
  revalidatePath('/consumables')
  revalidatePath(`/consumables/${id}`)
  return { ok: true }
}

/**
 * ຮັບເຂົ້າ / ເບີກອອກ / ປັບຍອດ
 *
 * ບໍ່ໃຫ້ເບີກເກີນຍອດຄົງເຫຼືອ — ຖ້າຍອດຈິງບໍ່ກົງໃຫ້ໃຊ້ "ປັບຍອດ" ພ້ອມໝາຍເຫດ
 * ຈຶ່ງຮູ້ວ່າສ່ວນຕ່າງເກີດຈາກຫຍັງ ບໍ່ແມ່ນປ່ອຍໃຫ້ຕິດລົບແບບງຽບໆ
 */
export async function moveConsumable(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.module(user, 'consumables', 'edit')) return { error: 'ບໍ່ມີສິດບັນທຶກການເຄື່ອນໄຫວ' }

  const id = String(formData.get('id') ?? '').trim()
  const item = await getConsumable(id)
  if (!item) return { error: 'ບໍ່ພົບລາຍການນີ້' }

  const kind = String(formData.get('kind') ?? '').trim()
  if (!isMoveKind(kind)) return { error: 'ປະເພດການເຄື່ອນໄຫວບໍ່ຖືກຕ້ອງ' }

  const qtyRaw = String(formData.get('qty') ?? '').replace(/,/g, '').trim()
  const qty = Number(qtyRaw)
  if (!Number.isFinite(qty) || qty === 0) return { error: 'ຈຳນວນຕ້ອງບໍ່ເປັນ 0' }
  if (kind !== 'adjust' && qty < 0) return { error: 'ຈຳນວນຕ້ອງຫຼາຍກວ່າ 0' }

  if (kind === 'out' && qty > Number(item.on_hand)) {
    return {
      error: `ຄົງເຫຼືອມີພຽງ ${item.on_hand} ${item.unit} — ເບີກເກີນບໍ່ໄດ້ (ຖ້ານັບຈິງບໍ່ກົງ ໃຫ້ໃຊ້ “ປັບຍອດ”)`,
    }
  }

  const movedAt = String(formData.get('moved_at') ?? '').trim() || todayISO()
  if (movedAt > todayISO()) return { error: 'ວັນທີຢູ່ໃນອະນາຄົດບໍ່ໄດ້' }

  const employeeId = String(formData.get('employee_id') ?? '').trim()
  const note = String(formData.get('note') ?? '').trim().slice(0, 300) || null
  if (kind === 'adjust' && !note) return { error: 'ປັບຍອດຕ້ອງລະບຸເຫດຜົນ' }

  await query(
    `insert into it.consumable_moves
       (consumable_id, kind, qty, moved_at, employee_id, department_code,
        asset_code, ref_no, note, created_by)
     values ($1::bigint, $2::varchar, $3::numeric, $4::date, $5::int, $6::varchar,
             $7::varchar, $8::varchar, $9::varchar, $10::int)`,
    [
      id,
      kind,
      qty,
      movedAt,
      employeeId && /^\d+$/.test(employeeId) ? Number(employeeId) : null,
      String(formData.get('department_code') ?? '').trim().slice(0, 20) || null,
      String(formData.get('asset_code') ?? '').trim().slice(0, 40) || null,
      String(formData.get('ref_no') ?? '').trim().slice(0, 60) || null,
      note,
      user.employee_id,
    ]
  )

  await logAudit(user.employee_id, 'consumable', id, `move_${kind}`, `${qty} ${item.unit}`)
  revalidatePath('/consumables')
  revalidatePath(`/consumables/${id}`)
  return { ok: true, message: 'ບັນທຶກແລ້ວ' }
}

export async function deleteConsumableMove(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.module(user, 'consumables', 'delete')) return { error: 'ບໍ່ມີສິດລຶບ' }

  const moveId = String(formData.get('move_id') ?? '').trim()
  const rows = await query<{ consumable_id: string }>(
    'delete from it.consumable_moves where id = $1::bigint returning consumable_id',
    [moveId]
  )
  const deleted = rows[0]
  if (!deleted) return { error: 'ບໍ່ພົບລາຍການເຄື່ອນໄຫວນີ້' }

  await logAudit(user.employee_id, 'consumable', deleted.consumable_id, 'move_delete')
  revalidatePath(`/consumables/${deleted.consumable_id}`)
  revalidatePath('/consumables')
  return { ok: true }
}

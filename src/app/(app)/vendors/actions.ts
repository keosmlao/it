'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { query } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { logAudit } from '@/lib/activity'
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
    short_name: text('short_name', 60),
    erp_supplier_code: text('erp_supplier_code', 25),
    contact_name: text('contact_name', 120),
    phone: text('phone', 60),
    email: text('email', 150),
    website: text('website', 300),
    address: text('address', 300),
    support_phone: text('support_phone', 60),
    support_email: text('support_email', 150),
    support_hours: text('support_hours', 120),
    sla_note: text('sla_note', 300),
    note: text('note', 2000),
  }
}

type Fields = ReturnType<typeof readFields>

function validate(f: Fields): string | null {
  if (!f.name) return 'ກະລຸນາປ້ອນຊື່ຜູ້ຂາຍ'
  if (f.email && !f.email.includes('@')) return 'ອີເມວບໍ່ຖືກຮູບແບບ'
  if (f.support_email && !f.support_email.includes('@')) {
    return 'ອີເມວແຈ້ງບັນຫາບໍ່ຖືກຮູບແບບ'
  }
  if (f.website && !/^https?:\/\//i.test(f.website)) {
    return 'ເວັບໄຊຕ້ອງຂຶ້ນຕົ້ນດ້ວຍ http:// ຫຼື https://'
  }
  return null
}

function values(f: Fields) {
  return [
    f.name,
    f.short_name,
    f.erp_supplier_code,
    f.contact_name,
    f.phone,
    f.email,
    f.website,
    f.address,
    f.support_phone,
    f.support_email,
    f.support_hours,
    f.sla_note,
    f.note,
  ]
}

/** ຊື່ຊໍ້າ = ໜ້າຈໍຈະມີສອງແຖວທີ່ແຍກບໍ່ອອກ ຈຶ່ງກັນໄວ້ດ້ວຍ unique index */
function duplicateName(err: unknown): boolean {
  return String((err as { constraint?: string })?.constraint ?? '').includes(
    'vendors_name_idx'
  )
}

export async function createVendor(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.module(user, 'vendors', 'create')) return { error: 'ບໍ່ມີສິດເພີ່ມຜູ້ຂາຍ' }

  const f = readFields(formData)
  const invalid = validate(f)
  if (invalid) return { error: invalid }

  let id: string
  try {
    const rows = await query<{ id: string }>(
      `insert into it.vendors
         (name, short_name, erp_supplier_code, contact_name, phone, email,
          website, address, support_phone, support_email, support_hours,
          sla_note, note, created_by)
       values ($1::varchar, $2::varchar, $3::varchar, $4::varchar, $5::varchar,
               $6::varchar, $7::varchar, $8::varchar, $9::varchar, $10::varchar,
               $11::varchar, $12::varchar, $13::text, $14::int)
       returning id`,
      [...values(f), user.employee_id]
    )
    id = rows[0].id
  } catch (err) {
    if (duplicateName(err)) return { error: 'ຜູ້ຂາຍຊື່ນີ້ມີໃນທະບຽນແລ້ວ' }
    throw err
  }

  await logAudit(user.employee_id, 'vendor', id, 'create', f.name)
  revalidatePath('/vendors')
  redirect(`/vendors/${id}`)
}

export async function updateVendor(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.module(user, 'vendors', 'edit')) return { error: 'ບໍ່ມີສິດແກ້ຂໍ້ມູນຜູ້ຂາຍ' }

  const id = String(formData.get('id') ?? '').trim()
  const f = readFields(formData)
  const invalid = validate(f)
  if (invalid) return { error: invalid }

  let updated: { id: string }[]
  try {
    updated = await query<{ id: string }>(
      `update it.vendors
          set name = $2::varchar, short_name = $3::varchar,
              erp_supplier_code = $4::varchar, contact_name = $5::varchar,
              phone = $6::varchar, email = $7::varchar, website = $8::varchar,
              address = $9::varchar, support_phone = $10::varchar,
              support_email = $11::varchar, support_hours = $12::varchar,
              sla_note = $13::varchar, note = $14::text, updated_at = now()
        where id = $1::bigint
        returning id`,
      [id, ...values(f)]
    )
  } catch (err) {
    if (duplicateName(err)) return { error: 'ຜູ້ຂາຍຊື່ນີ້ມີໃນທະບຽນແລ້ວ' }
    throw err
  }
  if (updated.length === 0) return { error: 'ບໍ່ພົບຜູ້ຂາຍນີ້' }

  await logAudit(user.employee_id, 'vendor', id, 'update', f.name)
  revalidatePath('/vendors')
  revalidatePath(`/vendors/${id}`)
  return { ok: true }
}

/**
 * ປິດ/ເປີດການໃຊ້ງານ — ບໍ່ໃຫ້ລຶບ ເພາະສັນຍາເຊົ່າ ແລະ ໃບສ້ອມເກົ່າຊີ້ມາຫາຢູ່
 */
export async function setVendorActive(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.module(user, 'vendors', 'edit')) return { error: 'ບໍ່ມີສິດແກ້ຂໍ້ມູນຜູ້ຂາຍ' }

  const id = String(formData.get('id') ?? '').trim()
  const active = String(formData.get('is_active') ?? '') === '1'

  const rows = await query<{ id: string }>(
    `update it.vendors set is_active = $2::boolean, updated_at = now()
      where id = $1::bigint
      returning id`,
    [id, active]
  )
  if (rows.length === 0) return { error: 'ບໍ່ພົບຜູ້ຂາຍນີ້' }

  await logAudit(user.employee_id, 'vendor', id, active ? 'activate' : 'deactivate')
  revalidatePath('/vendors')
  revalidatePath(`/vendors/${id}`)
  return { ok: true }
}

'use server'

import { revalidatePath } from 'next/cache'
import { pool, query } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { logAudit, notify } from '@/lib/activity'
import { refreshMovements } from '@/lib/assets/cache'
import {
  SPEC_FIELDS,
  SPEC_NOTE_MAX,
  WARRANTY_NOTE_MAX,
  type SpecField,
} from '@/lib/assets/model'
import type { FormState } from '@/lib/action-state'

/**
 * ບັນທຶກການຢືມ.
 * ໃບຢືມ–ຄືນຂອງ ERP ບໍ່ຖືກແຕະ — ບັນທຶກຂອງພະແນກ IT ເກັບແຍກ
 * ແລ້ວສະແດງລວມກັນໃນປະຫວັດ
 */
export async function lendAsset(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.menu(user, '/assets/lend', 'create')) return { error: 'ບໍ່ມີສິດຈັດການອຸປະກອນ' }
  const assetCode = String(formData.get('asset_code') ?? '').trim()
  const empCode = String(formData.get('emp_code') ?? '').trim()

  if (!assetCode || !empCode) {
    return { error: 'ກະລຸນາເລືອກຜູ້ຢືມ' }
  }

  // ຢືມຊ້ອນບໍ່ໄດ້ — ຕ້ອງຄືນອັນເກົ່າກ່ອນ
  const holder = await query<{ emp_name: string | null }>(
    'select emp_name from it.v_asset_holders where item_code = $1',
    [assetCode]
  )
  if (holder[0]) {
    return {
      error: `ເຄື່ອງນີ້ຍັງຢູ່ກັບ ${holder[0].emp_name ?? 'ຄົນອື່ນ'} — ຕ້ອງບັນທຶກການຄືນກ່ອນ`,
    }
  }

  const borrowedAt = String(formData.get('borrowed_at') ?? '') || null
  const expected = String(formData.get('expected_return') ?? '') || null
  if (borrowedAt && expected && expected < borrowedAt) {
    return { error: 'ວັນທີຄາດວ່າຈະຄືນຕ້ອງຫຼັງວັນທີຢືມ' }
  }

  const rows = await query<{ borrow_doc_no: string }>(
    `insert into it.asset_loans
       (asset_code, emp_code, borrowed_at, expected_return, borrow_note, created_by)
     values ($1::varchar, $2::varchar, coalesce($3::date, current_date),
             $4::date, $5::text, $6::int)
     returning borrow_doc_no`,
    [
      assetCode,
      empCode,
      borrowedAt,
      expected,
      String(formData.get('borrow_note') ?? '').trim() || null,
      user.employee_id,
    ]
  )

  await logAudit(
    user.employee_id,
    'asset_loan',
    assetCode,
    'lend',
    `${rows[0].borrow_doc_no} → ${empCode}`
  )

  await revalidateAssetViews(assetCode)
  return { ok: true }
}

/**
 * ບັນທຶກການຄືນ.
 *
 * ໃບຢືມທີ່ອອກຈາກລະບົບນີ້ → ອັບເດດ it.asset_loans ໂດຍກົງ.
 * ໃບຢືມເກົ່າຈາກ ERP → ອອກໃບຄືນຂອງ IT ໄວ້ it.erp_loan_returns ແລ້ວທັບຢູ່ຊັ້ນ view
 * (ບໍ່ຂຽນລົງ public.asset_trans ເພາະເປັນຂອງລະບົບບັນຊີ)
 */
export async function returnAsset(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.menu(user, '/assets/lend', 'edit')) return { error: 'ບໍ່ມີສິດຈັດການອຸປະກອນ' }
  const assetCode = String(formData.get('asset_code') ?? '').trim()
  const returnedAt = String(formData.get('returned_at') ?? '') || null
  const condition = String(formData.get('return_condition') ?? 'good')
  const note = String(formData.get('return_note') ?? '').trim() || null

  const open = await query<{ id: string; borrow_doc_no: string }>(
    `select id, borrow_doc_no from it.asset_loans
      where asset_code = $1 and returned_at is null and deleted_at is null
      order by borrowed_at desc limit 1`,
    [assetCode]
  )

  if (!open[0]) {
    return returnErpLoan(user.employee_id, assetCode, returnedAt, condition, note)
  }

  const rows = await query<{ return_doc_no: string }>(
    `update it.asset_loans
        set returned_at      = coalesce($2::date, current_date),
            return_doc_no    = it.next_loan_no('RTIT'),
            return_note      = $3::text,
            return_condition = $4::varchar,
            returned_by      = $5::int,
            updated_at       = now()
      where id = $1::bigint
      returning return_doc_no`,
    [open[0].id, returnedAt, note, condition, user.employee_id]
  )

  await logAudit(
    user.employee_id,
    'asset_loan',
    assetCode,
    'return',
    rows[0].return_doc_no
  )

  await revalidateAssetViews(assetCode)
  return { ok: true }
}

/**
 * ໂອນເຄື່ອງໃຫ້ຄົນອື່ນ ໂດຍບໍ່ຕ້ອງຄືນເຂົ້າສາງກ່ອນ.
 *
 * ເຮັດ 2 ຢ່າງໃນ transaction ດຽວ: ປິດໃບຢືມຂອງຜູ້ຖືເກົ່າ ແລ້ວເປີດໃບໃໝ່ໃຫ້ຜູ້ຮັບ
 * ຖ້າຢ່າງໃດຢ່າງໜຶ່ງລົ້ມ ຈະບໍ່ມີການປ່ຽນແປງເລີຍ — ກັນບໍ່ໃຫ້ເກີດໃບຄ້າງຊ້ອນກັນ
 * ຫຼື ເຄື່ອງຫາຍໄປຈາກມືທັງສອງຄົນ
 */
export async function transferAsset(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.menu(user, '/assets/lend', 'edit')) return { error: 'ບໍ່ມີສິດຈັດການອຸປະກອນ' }
  const assetCode = String(formData.get('asset_code') ?? '').trim()
  const toEmpCode = String(formData.get('to_emp_code') ?? '').trim()
  const at = String(formData.get('transferred_at') ?? '') || null
  const condition = String(formData.get('condition') ?? 'good')
  const note = String(formData.get('note') ?? '').trim() || null

  if (!assetCode || !toEmpCode) return { error: 'ກະລຸນາເລືອກຜູ້ຮັບໂອນ' }

  // ຜູ້ຖືປັດຈຸບັນ — ຕ້ອງມີ ບໍ່ດັ່ງນັ້ນໃຫ້ໃຊ້ "ບັນທຶກການຢືມ" ແທນ
  const current = await query<{
    source: 'erp' | 'it'
    borrow_doc_no: string | null
    emp_code: string
    emp_name: string | null
    borrowed_at: string | Date
  }>(
    `select source, borrow_doc_no, emp_code, emp_name, borrowed_at
       from it.v_asset_movements
      where asset_code = $1::varchar and not is_returned
      order by borrowed_at desc nulls last, borrow_doc_no desc nulls last
      limit 1`,
    [assetCode]
  )

  const from = current[0]
  if (!from) {
    return { error: 'ເຄື່ອງນີ້ບໍ່ມີຜູ້ຖືຄອງ — ໃຫ້ໃຊ້ "ບັນທຶກການຢືມ" ແທນ' }
  }
  if (from.emp_code === toEmpCode) {
    return { error: 'ຜູ້ຮັບໂອນເປັນຄົນດຽວກັບຜູ້ຖືປັດຈຸບັນ' }
  }

  const receiver = await query<{ fullname_lo: string; employee_id: number }>(
    `select employee_id, fullname_lo from public.odg_employee
      where employee_code = $1::varchar and employment_status = 'ACTIVE'`,
    [toEmpCode]
  )
  if (!receiver[0]) return { error: 'ບໍ່ພົບຜູ້ຮັບໂອນ ຫຼື ພະນັກງານຄົນນີ້ອອກແລ້ວ' }

  if (at && new Date(at) < new Date(String(from.borrowed_at).slice(0, 10))) {
    return { error: 'ວັນທີໂອນຕ້ອງບໍ່ກ່ອນວັນທີຜູ້ຖືເກົ່າຢືມ' }
  }

  const fromName = from.emp_name ?? from.emp_code
  const toName = receiver[0].fullname_lo

  const client = await pool.connect()
  let newDoc: string
  let returnDoc: string | null = null
  try {
    await client.query('begin')

    // ---- 1. ປິດໃບຂອງຜູ້ຖືເກົ່າ ----
    if (from.source === 'it') {
      const closed = await client.query<{ return_doc_no: string }>(
        `update it.asset_loans
            set returned_at      = coalesce($2::date, current_date),
                return_doc_no    = it.next_loan_no('RTIT'),
                return_condition = $3::varchar,
                return_note      = $4::text,
                returned_by      = $5::int,
                updated_at       = now()
          where asset_code = $1::varchar
            and returned_at is null and deleted_at is null
          returning return_doc_no`,
        [assetCode, at, condition, `ໂອນໃຫ້ ${toName}`, user.employee_id]
      )
      returnDoc = closed.rows[0]?.return_doc_no ?? null
    } else {
      if (!from.borrow_doc_no) {
        await client.query('rollback')
        return { error: 'ໃບຢືມ ERP ໃບນີ້ບໍ່ມີເລກທີ່ ຈຶ່ງໂອນຕໍ່ບໍ່ໄດ້' }
      }
      const closed = await client.query<{ return_doc_no: string }>(
        `insert into it.erp_loan_returns
           (borrow_doc_no, asset_code, emp_code, returned_at, return_condition,
            return_note, returned_by)
         values ($1::varchar, $2::varchar, $3::varchar,
                 coalesce($4::date, current_date), $5::varchar, $6::text, $7::int)
         returning return_doc_no`,
        [
          from.borrow_doc_no,
          assetCode,
          from.emp_code,
          at,
          condition,
          `ໂອນໃຫ້ ${toName}`,
          user.employee_id,
        ]
      )
      returnDoc = closed.rows[0]?.return_doc_no ?? null
    }

    // ---- 2. ເປີດໃບໃໝ່ໃຫ້ຜູ້ຮັບ ----
    const opened = await client.query<{ borrow_doc_no: string }>(
      `insert into it.asset_loans
         (asset_code, emp_code, borrowed_at, borrow_note, created_by)
       values ($1::varchar, $2::varchar, coalesce($3::date, current_date),
               $4::text, $5::int)
       returning borrow_doc_no`,
      [
        assetCode,
        toEmpCode,
        at,
        note ? `ຮັບໂອນຈາກ ${fromName} — ${note}` : `ຮັບໂອນຈາກ ${fromName}`,
        user.employee_id,
      ]
    )
    newDoc = opened.rows[0].borrow_doc_no

    // ---- 3. ບັນທຶກວ່ານີ້ຄືການໂອນ ບໍ່ແມ່ນຄືນແລ້ວຢືມໃໝ່ບັງເອີນ ----
    await client.query(
      `insert into it.asset_transfers
         (asset_code, from_emp_code, to_emp_code, transferred_at,
          from_borrow_doc_no, from_return_doc_no, to_borrow_doc_no,
          condition, note, created_by)
       values ($1::varchar, $2::varchar, $3::varchar, coalesce($4::date, current_date),
               $5::varchar, $6::varchar, $7::varchar, $8::varchar, $9::text, $10::int)`,
      [
        assetCode,
        from.emp_code,
        toEmpCode,
        at,
        from.borrow_doc_no,
        returnDoc,
        newDoc,
        condition,
        note,
        user.employee_id,
      ]
    )

    await client.query('commit')
  } catch (e) {
    await client.query('rollback')
    return { error: `ໂອນບໍ່ສຳເລັດ: ${(e as Error).message}` }
  } finally {
    client.release()
  }

  await logAudit(
    user.employee_id,
    'asset_transfer',
    assetCode,
    'transfer',
    `${fromName} → ${toName} (${newDoc})`
  )

  await notify(
    receiver[0].employee_id,
    user.employee_id,
    'ທ່ານໄດ້ຮັບໂອນອຸປະກອນ',
    `${assetCode} ໂອນມາຈາກ ${fromName} · ໃບຢືມ ${newDoc}`,
    `/assets/${assetCode}`
  )

  await revalidateAssetViews(assetCode)
  return { ok: true }
}

/** ອອກໃບຄືນທັບໃບຢືມຂອງ ERP ທີ່ຍັງຄ້າງຢູ່ */
async function returnErpLoan(
  employeeId: number,
  assetCode: string,
  returnedAt: string | null,
  condition: string,
  note: string | null
): Promise<FormState> {
  const open = await query<{ borrow_doc_no: string; emp_code: string }>(
    `select borrow_doc_no, emp_code
       from it.v_asset_movements
      where asset_code = $1::varchar and source = 'erp' and not is_returned
      order by borrowed_at desc nulls last, borrow_doc_no desc nulls last
      limit 1`,
    [assetCode]
  )

  if (!open[0]) return { error: 'ບໍ່ພົບໃບຢືມທີ່ຍັງຄ້າງຢູ່ຂອງອຸປະກອນນີ້' }
  if (!open[0].borrow_doc_no) {
    return { error: 'ໃບຢືມ ERP ໃບນີ້ບໍ່ມີເລກທີ່ ຈຶ່ງອ້າງອີງບໍ່ໄດ້' }
  }

  const rows = await query<{ return_doc_no: string }>(
    `insert into it.erp_loan_returns
       (borrow_doc_no, asset_code, emp_code, returned_at, return_condition,
        return_note, returned_by)
     values ($1::varchar, $2::varchar, $3::varchar,
             coalesce($4::date, current_date), $5::varchar, $6::text, $7::int)
     on conflict do nothing
     returning return_doc_no`,
    [
      open[0].borrow_doc_no,
      assetCode,
      open[0].emp_code,
      returnedAt,
      condition,
      note,
      employeeId,
    ]
  )

  if (!rows[0]) return { error: 'ອຸປະກອນນີ້ຖືກບັນທຶກວ່າຄືນແລ້ວ' }

  await logAudit(
    employeeId,
    'erp_loan_return',
    assetCode,
    'return',
    `${open[0].borrow_doc_no} → ${rows[0].return_doc_no}`
  )

  await revalidateAssetViews(assetCode)
  return { ok: true }
}

async function revalidateAssetViews(assetCode: string) {
  // ປະຫວັດຢືມ–ຄືນເກັບເປັນ cache ໄວ້ (materialized view) ຈຶ່ງຕ້ອງອັບເດດກ່ອນ
  // ບໍ່ດັ່ງນັ້ນຜູ້ໃຊ້ຈະບໍ່ເຫັນຜົນຂອງສິ່ງທີ່ຫາກໍບັນທຶກ
  await refreshMovements()
  revalidateAssetPaths(assetCode)
}

function revalidateAssetPaths(assetCode: string) {
  revalidatePath(`/assets/${assetCode}`)
  revalidatePath('/assets')
  revalidatePath('/assets/holders')
  revalidatePath('/assets/movements')
  revalidatePath('/assets/lend')
  revalidatePath('/assets/recovery')
  revalidatePath('/assets/documents')
}

/** ບັນທຶກ spec, ວັນທີຊື້ ແລະ ປະກັນ ທີ່ພະແນກ IT ຕື່ມເອງ */
export async function saveAssetSpec(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.menu(user, '/assets', 'edit')) return { error: 'ບໍ່ມີສິດຈັດການອຸປະກອນ' }
  const assetCode = String(formData.get('asset_code') ?? '').trim()
  if (!assetCode) return { error: 'ບໍ່ພົບລະຫັດອຸປະກອນ' }

  // ຕັດຄວາມຍາວຕາມຄໍລຳຈິງ — `maxLength` ຢູ່ຟອມກັນໄດ້ແຕ່ browser
  // ບໍ່ໄດ້ກັນ request ທີ່ສົ່ງກົງ ແລະ Postgres ຈະຖິ້ມ 22001 ໃສ່
  const text = (name: string, max: number) => {
    const v = String(formData.get(name) ?? '').trim()
    return v ? v.slice(0, max) : null
  }
  const date = (name: string) => String(formData.get(name) ?? '') || null
  const price = String(formData.get('purchase_price') ?? '').trim()

  const spec = Object.fromEntries(
    SPEC_FIELDS.map((f) => [f.name, text(f.name, f.max)])
  ) as Record<SpecField, string | null>

  if (price && Number.isNaN(Number(price))) {
    return { error: 'ລາຄາຕ້ອງເປັນຕົວເລກ' }
  }

  const purchaseDate = date('purchase_date')
  const warrantyUntil = date('warranty_until')
  if (purchaseDate && warrantyUntil && warrantyUntil < purchaseDate) {
    return { error: 'ວັນໝົດປະກັນຕ້ອງຫຼັງວັນທີຊື້' }
  }

  await query(
    `insert into it.asset_specs
       (asset_code, cpu, ram, storage, gpu, os, screen, spec_note,
        purchase_date, purchase_price, warranty_until, warranty_note, updated_by)
     values ($1::varchar, $2::varchar, $3::varchar, $4::varchar, $5::varchar,
             $6::varchar, $7::varchar, $8::text, $9::date, $10::numeric,
             $11::date, $12::varchar, $13::int)
     on conflict (asset_code) do update
       set cpu            = excluded.cpu,
           ram            = excluded.ram,
           storage        = excluded.storage,
           gpu            = excluded.gpu,
           os             = excluded.os,
           screen         = excluded.screen,
           spec_note      = excluded.spec_note,
           purchase_date  = excluded.purchase_date,
           purchase_price = excluded.purchase_price,
           warranty_until = excluded.warranty_until,
           warranty_note  = excluded.warranty_note,
           updated_by     = excluded.updated_by,
           updated_at     = now()`,
    [
      assetCode,
      spec.cpu,
      spec.ram,
      spec.storage,
      spec.gpu,
      spec.os,
      spec.screen,
      text('spec_note', SPEC_NOTE_MAX),
      purchaseDate,
      price || null,
      warrantyUntil,
      text('warranty_note', WARRANTY_NOTE_MAX),
      user.employee_id,
    ]
  )

  await logAudit(user.employee_id, 'asset_spec', assetCode, 'save')
  revalidatePath(`/assets/${assetCode}`)
  revalidatePath('/assets')
  return { ok: true }
}

/** ບັນທຶກການສ້ອມໜຶ່ງຄັ້ງ */
export async function addRepair(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.menu(user, '/assets', 'edit')) return { error: 'ບໍ່ມີສິດຈັດການອຸປະກອນ' }
  const assetCode = String(formData.get('asset_code') ?? '').trim()
  const issue = String(formData.get('issue') ?? '').trim()

  if (!assetCode || !issue) return { error: 'ກະລຸນາປ້ອນອາການ ຫຼື ສາເຫດທີ່ສ້ອມ' }

  const cost = String(formData.get('cost') ?? '').trim()
  if (cost && Number.isNaN(Number(cost))) {
    return { error: 'ຄ່າສ້ອມຕ້ອງເປັນຕົວເລກ' }
  }

  await query(
    `insert into it.asset_repairs
       (asset_code, repair_date, issue, action, cost, vendor, status, created_by)
     values ($1::varchar, coalesce($2::date, current_date), $3::text, $4::text,
             $5::numeric, $6::varchar, $7::varchar, $8::int)`,
    [
      assetCode,
      String(formData.get('repair_date') ?? '') || null,
      issue,
      String(formData.get('action') ?? '').trim() || null,
      cost || null,
      String(formData.get('vendor') ?? '').trim() || null,
      String(formData.get('status') ?? 'done'),
      user.employee_id,
    ]
  )

  await logAudit(user.employee_id, 'asset_repair', assetCode, 'create', issue)
  revalidatePath(`/assets/${assetCode}`)
  return { ok: true }
}

export async function deleteRepair(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.menu(user, '/assets', 'delete')) return { error: 'ບໍ່ມີສິດຈັດການອຸປະກອນ' }
  const id = String(formData.get('repair_id'))
  const assetCode = String(formData.get('asset_code') ?? '')

  // ລຶບໄດ້ສະເພາະລາຍການທີ່ຕົນບັນທຶກ ເວັ້ນແຕ່ຜູ້ຈັດການ
  await query(
    `update it.asset_repairs set deleted_at = now()
      where id = $1::bigint
        and ($2::boolean or created_by = $3::int)`,
    [id, user.role === 'manager', user.employee_id]
  )

  await logAudit(user.employee_id, 'asset_repair', id, 'delete')
  revalidatePath(`/assets/${assetCode}`)
  return { ok: true }
}

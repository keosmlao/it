'use server'

import { revalidatePath } from 'next/cache'
import { pool, query } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { logAudit } from '@/lib/activity'
import { refreshMovements } from '@/lib/assets/cache'
import {
  STOCK_STATES,
  WRITEOFF_REASONS,
  type StockState,
  type WriteoffReason,
} from '@/lib/assets/stock-model'
import type { FormState } from '@/lib/action-state'

/** ໝາຍວ່າເຄື່ອງເພ / ສົ່ງສ້ອມ / ຫາບໍ່ພົບ */
export async function markDamaged(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.manageAssets(user)) return { error: 'ບໍ່ມີສິດຈັດການອຸປະກອນ' }
  const assetCode = String(formData.get('asset_code') ?? '').trim()
  const state = String(formData.get('stock_state') ?? '') as StockState
  const detail = String(formData.get('damage_detail') ?? '').trim()

  if (!assetCode) return { error: 'ບໍ່ພົບລະຫັດອຸປະກອນ' }
  if (!STOCK_STATES.includes(state)) return { error: 'ສະຖານະບໍ່ຖືກຕ້ອງ' }
  if (['damaged', 'repair', 'missing'].includes(state) && !detail) {
    return { error: 'ກະລຸນາອະທິບາຍວ່າເພແນວໃດ / ຫາຍໄປແນວໃດ' }
  }

  const damagedAt = String(formData.get('damaged_at') ?? '') || null

  await query(
    `insert into it.asset_stock_status
       (asset_code, stock_state, damaged_at, damage_detail, note, checked_by)
     values ($1::varchar, $2::varchar, coalesce($3::date, current_date),
             $4::text, $5::text, $6::int)
     on conflict (asset_code) do update
       set stock_state   = excluded.stock_state,
           damaged_at    = excluded.damaged_at,
           damage_detail = excluded.damage_detail,
           note          = excluded.note,
           checked_at    = current_date,
           checked_by    = excluded.checked_by,
           updated_at    = now()`,
    [
      assetCode,
      state,
      damagedAt,
      detail || null,
      String(formData.get('note') ?? '').trim() || null,
      user.employee_id,
    ]
  )

  await logAudit(user.employee_id, 'asset_condition', assetCode, state, detail)
  revalidateCondition(assetCode)
  return { ok: true }
}

/** ຕັດຈຳໜ່າຍ — ຕ້ອງມີເຫດຜົນ ແລະ ບັນທຶກໄວ້ກວດຄືນໄດ້ */
export async function writeOffAsset(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.approve(user)) {
    return { error: 'ຕັດຈຳໜ່າຍໄດ້ສະເພາະຫົວໜ້າ ຫຼື ຜູ້ຈັດການ' }
  }

  const assetCode = String(formData.get('asset_code') ?? '').trim()
  const reason = String(formData.get('reason') ?? '') as WriteoffReason
  const detail = String(formData.get('detail') ?? '').trim()

  if (!assetCode) return { error: 'ບໍ່ພົບລະຫັດອຸປະກອນ' }
  if (!WRITEOFF_REASONS.includes(reason)) return { error: 'ເຫດຜົນບໍ່ຖືກຕ້ອງ' }
  if (!detail) return { error: 'ກະລຸນາອະທິບາຍເຫດຜົນລະອຽດ' }

  // ເຄື່ອງທີ່ຍັງຢູ່ກັບຄົນ ຫຼື ຕິດຕັ້ງໃຊ້ຢູ່ ຕ້ອງເອົາຄືນກ່ອນ
  const blocked = await query<{ holder: string | null; place: string | null }>(
    `select h.emp_name as holder, d.place
       from it.v_it_assets a
       left join it.v_asset_holders h on h.item_code = a.asset_code
       left join it.v_asset_deployments d
              on d.asset_code = a.asset_code and d.removed_at is null
      where a.asset_code = $1::varchar`,
    [assetCode]
  )
  if (blocked[0]?.holder) {
    return { error: `ຍັງຢູ່ກັບ ${blocked[0].holder} — ຕ້ອງບັນທຶກການຄືນກ່ອນ` }
  }
  if (blocked[0]?.place) {
    return { error: `ຍັງຕິດຕັ້ງຢູ່ ${blocked[0].place} — ຕ້ອງຖອດອອກກ່ອນ` }
  }

  const bookValue = String(formData.get('book_value') ?? '').replace(/,/g, '').trim()
  if (bookValue && !Number.isFinite(Number(bookValue))) {
    return { error: 'ມູນຄ່າຄົງເຫຼືອຕ້ອງເປັນຕົວເລກ' }
  }

  const client = await pool.connect()
  try {
    await client.query('begin')

    await client.query(
      `insert into it.asset_writeoffs
         (asset_code, reason, detail, written_off_at, decided_by, book_value)
       values ($1::varchar, $2::varchar, $3::text,
               coalesce($4::date, current_date), $5::int, $6::numeric)`,
      [
        assetCode,
        reason,
        detail,
        String(formData.get('written_off_at') ?? '') || null,
        user.employee_id,
        bookValue || null,
      ]
    )

    await client.query(
      `insert into it.asset_stock_status
         (asset_code, stock_state, damage_detail, checked_by)
       values ($1::varchar, 'scrapped', $2::text, $3::int)
       on conflict (asset_code) do update
         set stock_state   = 'scrapped',
             damage_detail = excluded.damage_detail,
             checked_at    = current_date,
             checked_by    = excluded.checked_by,
             updated_at    = now()`,
      [assetCode, detail, user.employee_id]
    )

    await client.query('commit')
  } catch (e) {
    await client.query('rollback')
    const message = (e as Error).message
    if (message.includes('asset_writeoffs_active_idx')) {
      return { error: 'ເຄື່ອງນີ້ຖືກຕັດຈຳໜ່າຍໄປແລ້ວ' }
    }
    return { error: `ບັນທຶກບໍ່ສຳເລັດ: ${message}` }
  } finally {
    client.release()
  }

  await logAudit(user.employee_id, 'asset_writeoff', assetCode, reason, detail)
  revalidateCondition(assetCode)
  return { ok: true }
}

/** ຍົກເລີກການຕັດຈຳໜ່າຍ (ເຊັ່ນ ພົບເຄື່ອງຄືນ ຫຼື ຕັດສິນຜິດ) */
export async function cancelWriteOff(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.approve(user)) return { error: 'ບໍ່ມີສິດຍົກເລີກ' }

  const assetCode = String(formData.get('asset_code') ?? '').trim()
  const note = String(formData.get('cancel_note') ?? '').trim()
  if (!note) return { error: 'ກະລຸນາລະບຸເຫດຜົນທີ່ຍົກເລີກ' }

  const rows = await query<{ id: string }>(
    `update it.asset_writeoffs
        set cancelled_at = now(), cancel_note = $2::text
      where asset_code = $1::varchar and cancelled_at is null
      returning id`,
    [assetCode, note]
  )
  if (!rows[0]) return { error: 'ບໍ່ພົບການຕັດຈຳໜ່າຍທີ່ຍັງມີຜົນ' }

  await query(
    `update it.asset_stock_status
        set stock_state = 'in_stock', checked_at = current_date,
            checked_by = $2::int, updated_at = now()
      where asset_code = $1::varchar`,
    [assetCode, user.employee_id]
  )

  await logAudit(user.employee_id, 'asset_writeoff', assetCode, 'cancel', note)
  revalidateCondition(assetCode)
  return { ok: true }
}

// ---------------------------------------------------------------------------
// ອຸປະກອນສ່ວນກາງ
// ---------------------------------------------------------------------------

/** ຕິດຕັ້ງອຸປະກອນໃຊ້ງານສ່ວນກາງ (switch, ຫ້ອງປະຊຸມ ແລະ ອື່ນໆ) */
export async function deployAsset(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.manageAssets(user)) return { error: 'ບໍ່ມີສິດຈັດການອຸປະກອນ' }
  const assetCode = String(formData.get('asset_code') ?? '').trim()
  const place = String(formData.get('place') ?? '').trim()

  if (!assetCode) return { error: 'ບໍ່ພົບລະຫັດອຸປະກອນ' }
  if (!place) return { error: 'ກະລຸນາລະບຸບ່ອນຕິດຕັ້ງ' }

  const holder = await query<{ emp_name: string | null }>(
    'select emp_name from it.v_asset_holders where item_code = $1::varchar',
    [assetCode]
  )
  if (holder[0]) {
    return {
      error: `ເຄື່ອງນີ້ຍັງຢູ່ກັບ ${holder[0].emp_name ?? 'ຄົນອື່ນ'} — ຕ້ອງບັນທຶກການຄືນກ່ອນ`,
    }
  }

  const installedAt = String(formData.get('installed_at') ?? '') || null

  const client = await pool.connect()
  try {
    await client.query('begin')

    await client.query(
      `insert into it.asset_deployments
         (asset_code, location_code, place, purpose, responsible_emp_code,
          installed_at, note, created_by)
       values ($1::varchar, $2::varchar, $3::varchar, $4::varchar, $5::varchar,
               coalesce($6::date, current_date), $7::text, $8::int)`,
      [
        assetCode,
        String(formData.get('location_code') ?? '').trim() || null,
        place,
        String(formData.get('purpose') ?? '').trim() || null,
        String(formData.get('responsible_emp_code') ?? '').trim() || null,
        installedAt,
        String(formData.get('note') ?? '').trim() || null,
        user.employee_id,
      ]
    )

    // ໝາຍສະຖານະໃຫ້ກົງ ເພື່ອບໍ່ໃຫ້ໄປປະກົດໃນລາຍການ "ຢືມໄດ້"
    await client.query(
      `insert into it.asset_stock_status
         (asset_code, stock_state, location_note, checked_by)
       values ($1::varchar, 'with_user', $2::varchar, $3::int)
       on conflict (asset_code) do update
         set stock_state   = 'with_user',
             location_note = excluded.location_note,
             checked_at    = current_date,
             checked_by    = excluded.checked_by,
             updated_at    = now()`,
      [assetCode, `ຕິດຕັ້ງສ່ວນກາງ: ${place}`, user.employee_id]
    )

    await client.query('commit')
  } catch (e) {
    await client.query('rollback')
    const message = (e as Error).message
    if (message.includes('asset_deployments_active_idx')) {
      return { error: 'ເຄື່ອງນີ້ຕິດຕັ້ງຢູ່ບ່ອນອື່ນແລ້ວ — ຕ້ອງຖອດອອກກ່ອນ' }
    }
    return { error: `ບັນທຶກບໍ່ສຳເລັດ: ${message}` }
  } finally {
    client.release()
  }

  await logAudit(user.employee_id, 'asset_deployment', assetCode, 'deploy', place)
  revalidateCondition(assetCode)
  return { ok: true }
}

/** ຖອດອຸປະກອນສ່ວນກາງອອກ — ກັບເຂົ້າສາງ */
export async function undeployAsset(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.manageAssets(user)) return { error: 'ບໍ່ມີສິດຈັດການອຸປະກອນ' }
  const assetCode = String(formData.get('asset_code') ?? '').trim()
  const note = String(formData.get('remove_note') ?? '').trim()

  const rows = await query<{ place: string }>(
    `update it.asset_deployments
        set removed_at = coalesce($2::date, current_date),
            remove_note = $3::text, updated_at = now()
      where asset_code = $1::varchar and removed_at is null
      returning place`,
    [assetCode, String(formData.get('removed_at') ?? '') || null, note || null]
  )
  if (!rows[0]) return { error: 'ບໍ່ພົບການຕິດຕັ້ງທີ່ຍັງໃຊ້ຢູ່' }

  await query(
    `update it.asset_stock_status
        set stock_state = 'in_stock', location_note = null,
            checked_at = current_date, checked_by = $2::int, updated_at = now()
      where asset_code = $1::varchar`,
    [assetCode, user.employee_id]
  )

  await logAudit(user.employee_id, 'asset_deployment', assetCode, 'undeploy', rows[0].place)
  revalidateCondition(assetCode)
  return { ok: true }
}

function revalidateCondition(assetCode: string) {
  void refreshMovements()
  revalidatePath(`/assets/${assetCode}`)
  revalidatePath('/assets')
  revalidatePath('/assets/damaged')
  revalidatePath('/assets/deployed')
  revalidatePath('/assets/survey')
  revalidatePath('/assets/lend')
}

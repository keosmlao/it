'use server'

import { revalidatePath } from 'next/cache'
import { query } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { logAudit } from '@/lib/activity'
import type { FormState } from '@/lib/action-state'

/** ໝາຍສະຖານະຈິງຂອງອຸປະກອນຫຼັງໄປກວດຂອງຈິງ */
export async function markStock(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  const assetCode = String(formData.get('asset_code') ?? '').trim()
  const state = String(formData.get('stock_state') ?? '')

  if (!assetCode || !state) return { error: 'ບໍ່ຄົບຂໍ້ມູນ' }

  await query(
    `insert into it.asset_stock_status
       (asset_code, stock_state, location_note, note, checked_by)
     values ($1::varchar, $2::varchar, $3::varchar, $4::text, $5::int)
     on conflict (asset_code) do update
       set stock_state   = excluded.stock_state,
           location_note = excluded.location_note,
           note          = excluded.note,
           checked_at    = current_date,
           checked_by    = excluded.checked_by,
           updated_at    = now()`,
    [
      assetCode,
      state,
      String(formData.get('location_note') ?? '').trim() || null,
      String(formData.get('note') ?? '').trim() || null,
      user.employee_id,
    ]
  )

  await logAudit(user.employee_id, 'asset_stock', assetCode, 'check', state)
  revalidatePath('/assets/survey')
  revalidatePath(`/assets/${assetCode}`)
  return { ok: true }
}

/** ບັນທຶກຄວາມຄືບໜ້າການທວງຄືນ */
export async function updateRecovery(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  const assetCode = String(formData.get('asset_code') ?? '').trim()
  const empCode = String(formData.get('emp_code') ?? '').trim()
  const status = String(formData.get('status') ?? '')

  if (!assetCode || !empCode || !status) return { error: 'ບໍ່ຄົບຂໍ້ມູນ' }

  const closing = status === 'recovered' || status === 'written_off'

  await query(
    `insert into it.asset_recoveries
       (asset_code, emp_code, status, contacted_at, promised_date, note,
        closed_at, created_by)
     values ($1::varchar, $2::varchar, $3::varchar,
             case when $3::varchar <> 'open' then current_date end,
             $4::date, $5::text,
             case when $6::boolean then current_date end, $7::int)
     on conflict (asset_code, emp_code)
       where status not in ('recovered', 'written_off')
     do update
       set status        = excluded.status,
           contacted_at  = coalesce(it.asset_recoveries.contacted_at,
                                    excluded.contacted_at),
           promised_date = excluded.promised_date,
           note          = excluded.note,
           closed_at     = excluded.closed_at,
           updated_at    = now()`,
    [
      assetCode,
      empCode,
      status,
      String(formData.get('promised_date') ?? '') || null,
      String(formData.get('note') ?? '').trim() || null,
      closing,
      user.employee_id,
    ]
  )

  await logAudit(
    user.employee_id,
    'asset_recovery',
    assetCode,
    status,
    `${empCode}`
  )
  revalidatePath('/assets/recovery')
  return { ok: true }
}

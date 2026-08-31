'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { query } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { logAudit } from '@/lib/activity'
import { isoDate, todayISO } from '@/lib/format'
import {
  isBillingCycle,
  isPeriodStatus,
  isSubCategory,
  isSubCurrency,
  nextDueAfter,
  periodEndFor,
  rollForwardDue,
  type BillingCycle,
} from '@/lib/subscriptions/model'
import { getSubscription } from '@/lib/subscriptions/queries'
import type { FormState } from '@/lib/action-state'

/** ຄ່າຈາກຟອມສັນຍາ — ໃຊ້ຮ່ວມກັນທັງລົງທະບຽນ ແລະ ແກ້ໄຂ */
function readFields(formData: FormData) {
  const text = (name: string, max: number) => {
    const v = String(formData.get(name) ?? '').trim()
    return v ? v.slice(0, max) : null
  }
  const date = (name: string) => String(formData.get(name) ?? '').trim() || null

  return {
    category: String(formData.get('category') ?? '').trim(),
    service_name: String(formData.get('service_name') ?? '')
      .trim()
      .slice(0, 150),
    vendor: text('vendor', 150),
    plan_name: text('plan_name', 150),
    account_ref: text('account_ref', 150),
    admin_url: text('admin_url', 300),
    billing_cycle: String(formData.get('billing_cycle') ?? '').trim(),
    amount: String(formData.get('amount') ?? '')
      .replace(/,/g, '')
      .trim(),
    currency: String(formData.get('currency') ?? 'LAK').trim(),
    start_date: date('start_date'),
    end_date: date('end_date'),
    next_due_date: date('next_due_date'),
    auto_renew: String(formData.get('auto_renew') ?? '') === '1',
    owner_employee_id: text('owner_employee_id', 12),
    department_code: text('department_code', 20),
    vendor_id: text('vendor_id', 20),
    note: text('note', 2000),
  }
}

type Fields = ReturnType<typeof readFields>

function validate(f: Fields): string | null {
  if (!f.service_name) return 'ກະລຸນາປ້ອນຊື່ບໍລິການ'
  if (!isSubCategory(f.category)) return 'ກະລຸນາເລືອກປະເພດບໍລິການ'
  if (!isBillingCycle(f.billing_cycle)) return 'ກະລຸນາເລືອກຮອບການຈ່າຍ'
  if (!isSubCurrency(f.currency)) return 'ສະກຸນເງິນບໍ່ຖືກຕ້ອງ'

  const amount = Number(f.amount || '0')
  if (!Number.isFinite(amount) || amount < 0) return 'ຈຳນວນເງິນບໍ່ຖືກຕ້ອງ'

  if (!f.start_date) return 'ກະລຸນາປ້ອນວັນເລີ່ມສັນຍາ'
  if (f.end_date && f.end_date < f.start_date) {
    return 'ວັນສິ້ນສຸດຢູ່ກ່ອນວັນເລີ່ມບໍ່ໄດ້'
  }
  if (f.admin_url && !/^https?:\/\//i.test(f.admin_url)) {
    return 'ລິ້ງໜ້າຈັດການຕ້ອງຂຶ້ນຕົ້ນດ້ວຍ http:// ຫຼື https://'
  }
  if (f.owner_employee_id && !/^\d+$/.test(f.owner_employee_id)) {
    return 'ຜູ້ຮັບຜິດຊອບບໍ່ຖືກຕ້ອງ'
  }
  return null
}

/** ຄ່າທີ່ສົ່ງເຂົ້າ SQL — ລຳດັບຕ້ອງກົງກັບ $1…$17 ຂອງທັງ insert ແລະ update */
function sqlValues(f: Fields) {
  return [
    f.category,
    f.service_name,
    f.vendor,
    f.plan_name,
    f.account_ref,
    f.admin_url,
    f.billing_cycle,
    Number(f.amount || '0'),
    f.currency,
    f.start_date,
    f.end_date,
    f.next_due_date ||
      rollForwardDue(f.start_date!, f.billing_cycle as BillingCycle, todayISO()),
    f.auto_renew,
    f.owner_employee_id ? Number(f.owner_employee_id) : null,
    f.department_code,
    f.note,
    f.vendor_id ? Number(f.vendor_id) : null,
  ]
}

export async function createSubscription(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.module(user, 'subscriptions', 'create')) return { error: 'ບໍ່ມີສິດລົງທະບຽນສັນຍາເຊົ່າ' }

  const f = readFields(formData)
  const invalid = validate(f)
  if (invalid) return { error: invalid }

  const rows = await query<{ id: string; code: string }>(
    `insert into it.subscriptions
       (category, service_name, vendor, plan_name, account_ref, admin_url,
        billing_cycle, amount, currency, start_date, end_date, next_due_date,
        auto_renew, owner_employee_id, department_code, note, vendor_id,
        created_by)
     values ($1::varchar, $2::varchar, $3::varchar, $4::varchar, $5::varchar,
             $6::varchar, $7::varchar, $8::numeric, $9::varchar, $10::date,
             $11::date, $12::date, $13::boolean, $14::int, $15::varchar,
             $16::text, $17::bigint, $18::int)
     returning id, code`,
    [...sqlValues(f), user.employee_id]
  )

  const created = rows[0]
  await logAudit(
    user.employee_id,
    'subscription',
    created.id,
    'create',
    `${created.code} · ${f.service_name}`
  )
  revalidatePath('/subscriptions')
  redirect(`/subscriptions/${created.id}`)
}

export async function updateSubscription(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.module(user, 'subscriptions', 'edit')) return { error: 'ບໍ່ມີສິດແກ້ສັນຍາເຊົ່າ' }

  const id = String(formData.get('id') ?? '').trim()
  if (!id) return { error: 'ບໍ່ພົບສັນຍາ' }

  const f = readFields(formData)
  const invalid = validate(f)
  if (invalid) return { error: invalid }

  const updated = await query<{ code: string }>(
    `update it.subscriptions
        set category = $2::varchar, service_name = $3::varchar,
            vendor = $4::varchar, plan_name = $5::varchar,
            account_ref = $6::varchar, admin_url = $7::varchar,
            billing_cycle = $8::varchar, amount = $9::numeric,
            currency = $10::varchar, start_date = $11::date,
            end_date = $12::date, next_due_date = $13::date,
            auto_renew = $14::boolean, owner_employee_id = $15::int,
            department_code = $16::varchar, note = $17::text,
            vendor_id = $18::bigint, updated_at = now()
      where id = $1::bigint
      returning code`,
    [id, ...sqlValues(f)]
  )
  if (updated.length === 0) return { error: 'ບໍ່ພົບສັນຍານີ້' }

  await logAudit(user.employee_id, 'subscription', id, 'update', f.service_name)
  revalidatePath('/subscriptions')
  revalidatePath(`/subscriptions/${id}`)
  redirect(`/subscriptions/${id}`)
}

export async function cancelSubscription(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.module(user, 'subscriptions', 'delete')) return { error: 'ບໍ່ມີສິດຍົກເລີກສັນຍາ' }

  const id = String(formData.get('id') ?? '').trim()
  const reason = String(formData.get('cancel_reason') ?? '')
    .trim()
    .slice(0, 200)
  if (!reason) return { error: 'ກະລຸນາລະບຸເຫດຜົນທີ່ຍົກເລີກ' }

  const sub = await getSubscription(id)
  if (!sub) return { error: 'ບໍ່ພົບສັນຍານີ້' }
  if (sub.status === 'cancelled') return { error: 'ສັນຍານີ້ຍົກເລີກໄປແລ້ວ' }

  // ບໍ່ລຶບຖິ້ມ ເພາະງວດທີ່ຈ່າຍໄປແລ້ວຜູກກັບສັນຍານີ້ຢູ່ —
  // ລຶບແລ້ວຄ່າໃຊ້ຈ່າຍປີກ່ອນຈະຫາຍໄປຈາກລາຍງານ
  await query(
    `update it.subscriptions
        set status = 'cancelled', cancelled_at = current_date,
            cancel_reason = $2::varchar, next_due_date = null, updated_at = now()
      where id = $1::bigint`,
    [id, reason]
  )

  await logAudit(user.employee_id, 'subscription', id, 'cancel', reason)
  revalidatePath('/subscriptions')
  revalidatePath(`/subscriptions/${id}`)
  return { ok: true }
}

export async function reopenSubscription(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.module(user, 'subscriptions', 'edit')) return { error: 'ບໍ່ມີສິດເປີດສັນຍາຄືນ' }

  const id = String(formData.get('id') ?? '').trim()
  const sub = await getSubscription(id)
  if (!sub) return { error: 'ບໍ່ພົບສັນຍານີ້' }
  if (sub.status === 'active') return { error: 'ສັນຍານີ້ໃຊ້ງານຢູ່ແລ້ວ' }

  const due = rollForwardDue(isoDate(sub.start_date), sub.billing_cycle, todayISO())

  await query(
    `update it.subscriptions
        set status = 'active', cancelled_at = null, cancel_reason = null,
            next_due_date = $2::date, updated_at = now()
      where id = $1::bigint`,
    [id, due]
  )

  await logAudit(user.employee_id, 'subscription', id, 'reopen', sub.service_name)
  revalidatePath('/subscriptions')
  revalidatePath(`/subscriptions/${id}`)
  return { ok: true }
}

/**
 * ບັນທຶກງວດການຈ່າຍ
 *
 * ບັນທຶກງວດແລ້ວເລື່ອນກຳນົດຈ່າຍໄປງວດຖັດໄປໃຫ້ເລີຍ ຈຶ່ງບໍ່ຕ້ອງແກ້ 2 ບ່ອນ.
 * ເລື່ອນສະເພາະເມື່ອງວດໃໝ່ຢູ່ຫຼັງກຳນົດປັດຈຸບັນ — ບັນທຶກງວດເກົ່າຍ້ອນຫຼັງ
 * ຈຶ່ງບໍ່ດຶງກຳນົດຖອຍຫຼັງ
 */
export async function recordPeriod(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.module(user, 'subscriptions', 'edit')) return { error: 'ບໍ່ມີສິດບັນທຶກການຈ່າຍ' }

  const id = String(formData.get('id') ?? '').trim()
  const sub = await getSubscription(id)
  if (!sub) return { error: 'ບໍ່ພົບສັນຍານີ້' }

  const periodStart = String(formData.get('period_start') ?? '').trim()
  if (!periodStart) return { error: 'ກະລຸນາປ້ອນວັນເລີ່ມງວດ' }

  const status = String(formData.get('period_status') ?? 'paid').trim()
  if (!isPeriodStatus(status)) return { error: 'ສະຖານະງວດບໍ່ຖືກຕ້ອງ' }

  const amountRaw = String(formData.get('period_amount') ?? '')
    .replace(/,/g, '')
    .trim()
  const amount = Number(amountRaw || sub.amount)
  if (!Number.isFinite(amount) || amount < 0) return { error: 'ຈຳນວນເງິນບໍ່ຖືກຕ້ອງ' }

  const currency = String(formData.get('period_currency') ?? sub.currency).trim()
  if (!isSubCurrency(currency)) return { error: 'ສະກຸນເງິນບໍ່ຖືກຕ້ອງ' }

  const paidAt = String(formData.get('paid_at') ?? '').trim() || null
  if (status === 'paid' && !paidAt) return { error: 'ກະລຸນາປ້ອນວັນທີຈ່າຍ' }

  const periodEnd = periodEndFor(periodStart, sub.billing_cycle)

  try {
    await query(
      `insert into it.subscription_periods
         (subscription_id, period_start, period_end, due_date, amount, currency,
          status, paid_at, invoice_no, note, created_by)
       values ($1::bigint, $2::date, $3::date, $2::date, $4::numeric, $5::varchar,
               $6::varchar, $7::date, $8::varchar, $9::varchar, $10::int)`,
      [
        id,
        periodStart,
        periodEnd,
        amount,
        currency,
        status,
        status === 'paid' ? paidAt : null,
        String(formData.get('invoice_no') ?? '').trim().slice(0, 60) || null,
        String(formData.get('period_note') ?? '').trim().slice(0, 300) || null,
        user.employee_id,
      ]
    )
  } catch (err) {
    if (
      String((err as { constraint?: string })?.constraint ?? '').includes(
        'subscription_periods_unique_idx'
      )
    ) {
      return { error: 'ງວດທີ່ເລີ່ມວັນນີ້ບັນທຶກໄວ້ແລ້ວ — ໄປແກ້ງວດເກົ່າແທນ' }
    }
    throw err
  }

  if (status !== 'unpaid') await advanceDue(id, periodStart, sub.billing_cycle)

  await logAudit(user.employee_id, 'subscription', id, `period_${status}`, periodStart)
  revalidatePath('/subscriptions')
  revalidatePath(`/subscriptions/${id}`)
  return { ok: true, message: `ບັນທຶກງວດ ${periodStart} ແລ້ວ` }
}

export async function setPeriodStatus(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.module(user, 'subscriptions', 'edit')) return { error: 'ບໍ່ມີສິດແກ້ງວດການຈ່າຍ' }

  const periodId = String(formData.get('period_id') ?? '').trim()
  const status = String(formData.get('status') ?? '').trim()
  if (!isPeriodStatus(status)) return { error: 'ສະຖານະບໍ່ຖືກຕ້ອງ' }

  const rows = await query<{
    subscription_id: string
    period_start: string | Date
    billing_cycle: BillingCycle
  }>(
    `select p.subscription_id, p.period_start, s.billing_cycle
       from it.subscription_periods p
       join it.subscriptions s on s.id = p.subscription_id
      where p.id = $1::bigint`,
    [periodId]
  )
  const period = rows[0]
  if (!period) return { error: 'ບໍ່ພົບງວດນີ້' }

  await query(
    `update it.subscription_periods
        set status = $2::varchar,
            paid_at = case when $2::varchar = 'paid'
                           then coalesce(paid_at, current_date) else null end
      where id = $1::bigint`,
    [periodId, status]
  )

  if (status !== 'unpaid') {
    await advanceDue(
      period.subscription_id,
      isoDate(period.period_start),
      period.billing_cycle
    )
  }

  await logAudit(
    user.employee_id,
    'subscription_period',
    periodId,
    `mark_${status}`,
    isoDate(period.period_start)
  )
  revalidatePath(`/subscriptions/${period.subscription_id}`)
  revalidatePath('/subscriptions')
  return { ok: true }
}

export async function deletePeriod(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.module(user, 'subscriptions', 'delete')) return { error: 'ບໍ່ມີສິດລຶບງວດ' }

  const periodId = String(formData.get('period_id') ?? '').trim()
  const rows = await query<{ subscription_id: string }>(
    'delete from it.subscription_periods where id = $1::bigint returning subscription_id',
    [periodId]
  )
  const deleted = rows[0]
  if (!deleted) return { error: 'ບໍ່ພົບງວດນີ້' }

  await logAudit(user.employee_id, 'subscription_period', periodId, 'delete')
  revalidatePath(`/subscriptions/${deleted.subscription_id}`)
  return { ok: true }
}

/**
 * ຕໍ່ອາຍຸໂດຍບໍ່ບັນທຶກໃບບິນ
 *
 * ໃຊ້ກັບບໍລິການທີ່ຕັດບັດອັດຕະໂນມັດ ແລະ ໃບບິນມາຊ້າ — ເລື່ອນກຳນົດອອກໄປ
 * 1 ງວດເພື່ອບໍ່ໃຫ້ຄ້າງຢູ່ລາຍການ "ເລີຍກຳນົດ" ທັງທີ່ບໍລິການຍັງໃຊ້ໄດ້ປົກກະຕິ
 */
export async function renewSubscription(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.module(user, 'subscriptions', 'edit')) return { error: 'ບໍ່ມີສິດຕໍ່ອາຍຸ' }

  const id = String(formData.get('id') ?? '').trim()
  const sub = await getSubscription(id)
  if (!sub) return { error: 'ບໍ່ພົບສັນຍານີ້' }
  if (sub.status !== 'active') return { error: 'ສັນຍານີ້ບໍ່ໄດ້ໃຊ້ງານຢູ່' }
  if (sub.billing_cycle === 'one_time') return { error: 'ຈ່າຍເທື່ອດຽວ ຕໍ່ອາຍຸບໍ່ໄດ້' }

  const from = isoDate(sub.next_due_date) || todayISO()
  const next = nextDueAfter(from, sub.billing_cycle)
  if (!next) return { error: 'ຄິດກຳນົດຕໍ່ໄປບໍ່ໄດ້' }

  await query(
    `update it.subscriptions
        set next_due_date = $2::date, updated_at = now()
      where id = $1::bigint`,
    [id, next]
  )

  await logAudit(user.employee_id, 'subscription', id, 'renew', next)
  revalidatePath('/subscriptions')
  revalidatePath(`/subscriptions/${id}`)
  return { ok: true, message: `ເລື່ອນກຳນົດຈ່າຍໄປ ${next}` }
}

/** ເລື່ອນກຳນົດຈ່າຍໄປງວດຫຼັງ periodStart — ບໍ່ດຶງຖອຍຫຼັງ */
async function advanceDue(
  subscriptionId: string,
  periodStart: string,
  cycle: BillingCycle
) {
  const next = nextDueAfter(periodStart, cycle)
  if (!next) return

  await query(
    `update it.subscriptions
        set next_due_date = $2::date, updated_at = now()
      where id = $1::bigint
        and (next_due_date is null or next_due_date < $2::date)`,
    [subscriptionId, next]
  )
}

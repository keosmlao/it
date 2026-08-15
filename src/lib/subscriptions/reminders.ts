import 'server-only'
import { query } from '@/lib/db'
import { notify } from '@/lib/activity'
import { safeDate } from '@/lib/assets/model'
import {
  OVERDUE_REMINDER_KEY,
  REMINDER_DAYS,
  SUB_CATEGORY_LABEL_LO,
  formatAmount,
  type SubCategory,
  type SubCurrency,
} from './model'

/**
 * ຕົວແທນຂອງ "ລະບົບ" ຕອນສົ່ງແຈ້ງເຕືອນຕາມຕາຕະລາງ
 *
 * `notify()` ຂ້າມການແຈ້ງຫາຕົນເອງ ໂດຍທຽບກັບຜູ້ກະທຳ — ວຽກຕາມຕາຕະລາງ
 * ບໍ່ມີຜູ້ກະທຳ ຈຶ່ງໃສ່ 0 ທີ່ບໍ່ມີວັນກົງກັບ employee_id ຂອງໃຜ
 */
const SYSTEM_ACTOR = 0

type DueRow = {
  id: string
  code: string
  service_name: string
  category: SubCategory
  vendor: string | null
  amount: string
  currency: SubCurrency
  next_due_date: string | Date
  days_to_due: number
  owner_employee_id: number | null
  created_by: number
}

export type ReminderResult = {
  checked: number
  sent: number
  expired: number
}

/**
 * ແຈ້ງເຕືອນສັນຍາທີ່ໃກ້ຮອດກຳນົດຈ່າຍ — ຕັ້ງໃຫ້ແລ່ນມື້ລະເທື່ອ
 *
 * ເຕືອນລ່ວງໜ້າ 30 / 7 / 1 ມື້ ແລະ ມື້ຮອດກຳນົດ ບວກອີກເທື່ອດຽວເມື່ອເລີຍກຳນົດ.
 * ບັນທຶກທຸກເທື່ອທີ່ເຕືອນໄວ້ໃນ it.subscription_reminders ຈຶ່ງບໍ່ສົ່ງຊໍ້າ
 * ເຖິງວ່າວຽກຈະຖືກເອີ້ນຫຼາຍເທື່ອຕໍ່ມື້.
 *
 * ຖ້າວຽກຂາດໄປຫຼາຍມື້ (ເຄື່ອງດັບ) ຈະບໍ່ຍິງຍ້ອນຫຼັງທຸກຂັ້ນພ້ອມກັນ —
 * ສົ່ງສະເພາະຂັ້ນທີ່ດ່ວນທີ່ສຸດ ແລ້ວໝາຍຂັ້ນທີ່ຜ່ານມາແລ້ວວ່າສົ່ງແລ້ວ
 */
export async function sendDueReminders(): Promise<ReminderResult> {
  const expired = await markExpired()

  const rows = await query<DueRow>(
    `select id, code, service_name, category, vendor, amount, currency,
            next_due_date, days_to_due, owner_employee_id, created_by
       from it.v_subscriptions
      where status = 'active'
        and next_due_date is not null
        and next_due_date <= current_date + 30
      order by next_due_date`
  )

  let sent = 0
  for (const row of rows) {
    if (await remindOne(row)) sent++
  }

  return { checked: rows.length, sent, expired }
}

/** ໝົດອາຍຸແລ້ວ ແລະ ບໍ່ຕໍ່ອັດຕະໂນມັດ = ປິດເອງ ບໍ່ໃຫ້ຄ້າງເປັນ "ໃຊ້ງານຢູ່" ຕະຫຼອດ */
async function markExpired(): Promise<number> {
  const rows = await query<{ id: string }>(
    `update it.subscriptions
        set status = 'expired', next_due_date = null, updated_at = now()
      where status = 'active'
        and auto_renew = false
        and end_date is not null
        and end_date < current_date
      returning id`
  )
  return rows.length
}

async function remindOne(row: DueRow): Promise<boolean> {
  const overdue = row.days_to_due < 0

  // ຂັ້ນທີ່ຮອດແລ້ວທັງໝົດ — ຂັ້ນທີ່ດ່ວນທີ່ສຸດເປັນຕົວສົ່ງ ສ່ວນຂັ້ນເກົ່າພຽງໝາຍໄວ້
  const reached = REMINDER_DAYS.filter((d) => row.days_to_due <= d)
  const key = overdue ? OVERDUE_REMINDER_KEY : Math.min(...reached)
  if (!overdue && reached.length === 0) return false

  const claimed = await claim(row.id, row.next_due_date, key)
  if (!claimed) return false

  for (const d of reached) {
    if (d !== key) await claim(row.id, row.next_due_date, d)
  }

  const due = safeDate(row.next_due_date)
  const when = overdue
    ? `ເລີຍກຳນົດມາ ${Math.abs(row.days_to_due)} ມື້ແລ້ວ (ກຳນົດ ${due})`
    : row.days_to_due === 0
      ? `ຮອດກຳນົດຈ່າຍມື້ນີ້ (${due})`
      : `ອີກ ${row.days_to_due} ມື້ຈະຮອດກຳນົດ (${due})`

  const title = overdue
    ? 'ຄ່າເຊົ່າບໍລິການເລີຍກຳນົດຈ່າຍ'
    : 'ຄ່າເຊົ່າບໍລິການໃກ້ຮອດກຳນົດຈ່າຍ'

  const body =
    `${row.code} · ${row.service_name}` +
    `${row.vendor ? ` (${row.vendor})` : ''}\n` +
    `${SUB_CATEGORY_LABEL_LO[row.category]} · ${formatAmount(row.amount, row.currency)}\n` +
    when

  for (const employeeId of await recipients(row, overdue)) {
    await notify(employeeId, SYSTEM_ACTOR, title, body, `/subscriptions/${row.id}`)
  }
  return true
}

/** ຈອງສິດສົ່ງ — ຄືນ false ຖ້າຂັ້ນນີ້ຂອງກຳນົດນີ້ເຕືອນໄປແລ້ວ */
async function claim(
  subscriptionId: string,
  dueDate: string | Date,
  daysBefore: number
): Promise<boolean> {
  const rows = await query<{ subscription_id: string }>(
    `insert into it.subscription_reminders (subscription_id, due_date, days_before)
     values ($1::bigint, $2::date, $3::int)
     on conflict (subscription_id, due_date, days_before) do nothing
     returning subscription_id`,
    [subscriptionId, dueDate, daysBefore]
  )
  return rows.length > 0
}

/**
 * ໃຜຄວນຮູ້: ຜູ້ຮັບຜິດຊອບ (ບໍ່ມີກໍໃຊ້ຜູ້ລົງທະບຽນ) —
 * ຖ້າເລີຍກຳນົດແລ້ວແຈ້ງຜູ້ຈັດການນຳ ເພາະບໍລິການໃກ້ຈະຖືກຕັດ
 */
async function recipients(row: DueRow, overdue: boolean): Promise<number[]> {
  const ids = new Set<number>([row.owner_employee_id ?? row.created_by])

  if (overdue) {
    const managers = await query<{ employee_id: number }>(
      `select employee_id from it.v_it_staff where role = 'manager'`
    )
    for (const m of managers) ids.add(m.employee_id)
  }

  return [...ids].filter((id) => id > 0)
}

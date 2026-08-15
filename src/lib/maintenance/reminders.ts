import 'server-only'
import { query } from '@/lib/db'
import { notify } from '@/lib/activity'
import { safeDate } from '@/lib/assets/model'
import {
  PM_CATEGORY_LABEL_LO,
  PM_OVERDUE_KEY,
  PM_REMINDER_DAYS,
  type PmCategory,
} from './model'

/** ຄືກັບ 040 — ວຽກຕາມຕາຕະລາງບໍ່ມີຜູ້ກະທຳ ຈຶ່ງໃສ່ 0 ທີ່ບໍ່ກົງກັບໃຜ */
const SYSTEM_ACTOR = 0

type DueRow = {
  id: string
  code: string
  title: string
  category: PmCategory
  asset_code: string | null
  next_due_date: string | Date
  days_to_due: number
  owner_employee_id: number | null
  created_by: number
}

export type PmReminderResult = { checked: number; sent: number }

/**
 * ແຈ້ງເຕືອນວຽກບຳລຸງຮັກສາທີ່ຮອດກຳນົດ — ຕັ້ງໃຫ້ແລ່ນມື້ລະເທື່ອ
 *
 * ເຕືອນ 7 / 1 / 0 ມື້ ແລະ ອີກເທື່ອດຽວເມື່ອເລີຍກຳນົດ. ວຽກແບບນີ້ໃຊ້ເວລາສັ້ນ
 * ກວ່າການຕໍ່ສັນຍາ ຈຶ່ງບໍ່ຕ້ອງເຕືອນລ່ວງໜ້າ 30 ມື້ຄືຂອງຄ່າເຊົ່າ
 */
export async function sendMaintenanceReminders(): Promise<PmReminderResult> {
  const rows = await query<DueRow>(
    `select id, code, title, category, asset_code, next_due_date, days_to_due,
            owner_employee_id, created_by
       from it.v_maintenance_plans
      where is_active and next_due_date <= current_date + 7
      order by next_due_date`
  )

  let sent = 0
  for (const row of rows) {
    if (await remindOne(row)) sent++
  }

  return { checked: rows.length, sent }
}

async function remindOne(row: DueRow): Promise<boolean> {
  const overdue = row.days_to_due < 0
  const reached = PM_REMINDER_DAYS.filter((d) => row.days_to_due <= d)
  const key = overdue ? PM_OVERDUE_KEY : Math.min(...reached)
  if (!overdue && reached.length === 0) return false

  if (!(await claim(row.id, row.next_due_date, key))) return false
  for (const d of reached) {
    if (d !== key) await claim(row.id, row.next_due_date, d)
  }

  const due = safeDate(row.next_due_date)
  const when = overdue
    ? `ເລີຍກຳນົດມາ ${Math.abs(row.days_to_due)} ມື້ແລ້ວ (ກຳນົດ ${due})`
    : row.days_to_due === 0
      ? `ຮອດກຳນົດມື້ນີ້ (${due})`
      : `ອີກ ${row.days_to_due} ມື້ຈະຮອດກຳນົດ (${due})`

  const body =
    `${row.code} · ${row.title}\n` +
    `${PM_CATEGORY_LABEL_LO[row.category]}` +
    `${row.asset_code ? ` · ${row.asset_code}` : ''}\n` +
    when

  for (const employeeId of await recipients(row, overdue)) {
    await notify(
      employeeId,
      SYSTEM_ACTOR,
      overdue ? 'ວຽກບຳລຸງຮັກສາເລີຍກຳນົດ' : 'ວຽກບຳລຸງຮັກສາຮອດກຳນົດ',
      body,
      `/maintenance/${row.id}`
    )
  }
  return true
}

async function claim(
  planId: string,
  dueDate: string | Date,
  daysBefore: number
): Promise<boolean> {
  const rows = await query<{ plan_id: string }>(
    `insert into it.maintenance_reminders (plan_id, due_date, days_before)
     values ($1::bigint, $2::date, $3::int)
     on conflict (plan_id, due_date, days_before) do nothing
     returning plan_id`,
    [planId, dueDate, daysBefore]
  )
  return rows.length > 0
}

/** ຜູ້ຮັບຜິດຊອບແຜນ (ບໍ່ມີກໍໃຊ້ຜູ້ສ້າງ) — ເລີຍກຳນົດແລ້ວແຈ້ງຫົວໜ້ານຳ */
async function recipients(row: DueRow, overdue: boolean): Promise<number[]> {
  const ids = new Set<number>([row.owner_employee_id ?? row.created_by])

  if (overdue) {
    const heads = await query<{ employee_id: number }>(
      `select employee_id from it.v_it_staff where role in ('manager', 'head')`
    )
    for (const h of heads) ids.add(h.employee_id)
  }

  return [...ids].filter((id) => id > 0)
}

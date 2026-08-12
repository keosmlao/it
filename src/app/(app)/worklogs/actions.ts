'use server'

import { revalidatePath } from 'next/cache'
import { query } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'

export type ActionState = { error?: string; ok?: boolean }

export async function addWorkLog(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser()

  const hours = Number(formData.get('hours'))
  if (!hours || hours <= 0 || hours > 24) {
    return { error: 'ຊົ່ວໂມງຕ້ອງຢູ່ລະຫວ່າງ 0 ຫາ 24' }
  }

  // ຜູກກັບ ticket ຫຼື task ຫຼື ວຽກທົ່ວໄປ — ຢ່າງໃດຢ່າງໜຶ່ງເທົ່ານັ້ນ
  const target = String(formData.get('target') ?? '')
  const [kind, rawId] = target.split(':')

  const ticketId = kind === 'ticket' ? rawId : null
  const taskId = kind === 'task' ? rawId : null
  const workType =
    kind === 'ticket' || kind === 'task'
      ? null
      : String(formData.get('work_type') ?? 'ອື່ນໆ')

  try {
    await query(
      `insert into it.work_logs
         (employee_id, log_date, hours, ticket_id, task_id, work_type, note)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [
        user.employee_id,
        String(formData.get('log_date') ?? '') || new Date().toISOString().slice(0, 10),
        hours,
        ticketId,
        taskId,
        workType,
        String(formData.get('note') ?? '').trim() || null,
      ]
    )
  } catch (e) {
    return { error: `ບັນທຶກບໍ່ສຳເລັດ: ${(e as Error).message}` }
  }

  revalidatePath('/worklogs')
  return { ok: true }
}

export async function deleteWorkLog(formData: FormData) {
  const user = await requireUser()
  const id = String(formData.get('id'))

  // ລຶບໄດ້ສະເພາະບັນທຶກຂອງຕົນ ເວັ້ນແຕ່ຜູ້ຈັດການ
  await query(
    `delete from it.work_logs
      where id = $1::bigint and ($2::boolean or employee_id = $3::int)`,
    [id, can.administer(user), user.employee_id]
  )

  revalidatePath('/worklogs')
}

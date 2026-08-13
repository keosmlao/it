import 'server-only'
import { query } from '@/lib/db'

/** ບັນທຶກການປ່ຽນແປງ — ໃຜເຮັດຫຍັງ ກັບຫຍັງ ເມື່ອໃດ */
export async function logAudit(
  employeeId: number,
  entity: string,
  entityId: string | number | null,
  action: string,
  detail?: string
) {
  await query(
    `insert into it.audit_logs (employee_id, entity, entity_id, action, detail)
     values ($1, $2, $3, $4, $5)`,
    [employeeId, entity, entityId?.toString() ?? null, action, detail ?? null]
  )
}

/**
 * ແຈ້ງເຕືອນຄົນໜຶ່ງ — ຂ້າມຖ້າແຈ້ງຫາຕົນເອງ.
 *
 * ບັນທຶກໃນລະບົບກ່ອນ ແລ້ວເອົາເຂົ້າຄິວສົ່ງ LINE. ຄິວລົ້ມກໍບໍ່ໃຫ້ກະທົບການບັນທຶກ
 * ເພາະການແຈ້ງເຕືອນໃນລະບົບສຳຄັນກວ່າ ແລະ ຜູ້ໃຊ້ກຳລັງລໍຜົນຂອງການບັນທຶກຢູ່
 */
export async function notify(
  employeeId: number | null,
  actorEmployeeId: number,
  title: string,
  body: string | null,
  link: string
) {
  if (!employeeId || employeeId === actorEmployeeId) return

  const rows = await query<{ id: string }>(
    `insert into it.notifications (employee_id, title, body, link)
     values ($1, $2, $3, $4)
     returning id`,
    [employeeId, title, body, link]
  )

  try {
    const { enqueueNotification } = await import('./notify/outbox')
    await enqueueNotification(employeeId, rows[0]?.id ?? null, title, body, link)
  } catch (e) {
    console.error('ເອົາການແຈ້ງເຕືອນເຂົ້າຄິວບໍ່ສຳເລັດ:', (e as Error).message)
  }
}

export async function getUnreadCount(employeeId: number): Promise<number> {
  const rows = await query<{ count: string }>(
    `select count(*) from it.notifications
      where employee_id = $1 and is_read = false`,
    [employeeId]
  )
  return Number(rows[0]?.count ?? 0)
}

export type Notification = {
  id: string
  title: string
  body: string | null
  link: string | null
  is_read: boolean
  created_at: string
}

export async function listNotifications(employeeId: number) {
  return query<Notification>(
    `select id, title, body, link, is_read, created_at
       from it.notifications
      where employee_id = $1
      order by created_at desc
      limit 100`,
    [employeeId]
  )
}

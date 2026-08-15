import 'server-only'
import { query } from '@/lib/db'
import { lineConfigured, pushLine } from './line'
import { emailConfigured, sendEmail } from './email'

const MAX_ATTEMPTS = 5

/** ບ່ອນທີ່ຢູ່ຂອງລະບົບ — ໃສ່ໃນຂໍ້ຄວາມເພື່ອໃຫ້ກົດເຂົ້າມາເບິ່ງໄດ້ */
function appUrl(link: string | null): string {
  const base = process.env.APP_BASE_URL?.replace(/\/$/, '')
  if (!base || !link) return ''
  return `\n${base}${link}`
}

/**
 * ເອົາການແຈ້ງເຕືອນເຂົ້າຄິວສົ່ງອອກ.
 *
 * ບໍ່ສົ່ງທັນທີຢູ່ນີ້ — ບັນທຶກໄວ້ກ່ອນ ເພື່ອບໍ່ໃຫ້ຜູ້ໃຊ້ລໍ ແລະ ບໍ່ໃຫ້ການແຈ້ງເຕືອນ
 * ຫາຍໄປເມື່ອປາຍທາງຕອບຊ້າ ຫຼື ລົ້ມ
 *
 * ເຂົ້າຄິວທຸກຊ່ອງທາງທີ່ຄົນນັ້ນມີ (LINE + ອີເມວ) — ຄົນທີ່ບໍ່ໄດ້ຜູກ LINE
 * ຈຶ່ງຍັງໄດ້ຮັບທາງອີເມວ ແທນທີ່ຈະບໍ່ໄດ້ຮັບຫຍັງເລີຍຄືເມື່ອກ່ອນ
 */
export async function enqueueNotification(
  employeeId: number,
  notificationId: string | null,
  title: string,
  body: string | null,
  link: string | null
) {
  const rows = await query<{
    line_target: string | null
    line_enabled: boolean
    email_target: string | null
    email_enabled: boolean
  }>(
    `select line_target, line_enabled, email_target, email_enabled
       from it.v_notify_targets
      where employee_id = $1::int and is_active`,
    [employeeId]
  )

  const target = rows[0]
  if (!target) return

  const channels: { channel: 'line' | 'email'; to: string }[] = []
  if (target.line_enabled && target.line_target) {
    channels.push({ channel: 'line', to: target.line_target })
  }
  if (target.email_enabled && target.email_target) {
    channels.push({ channel: 'email', to: target.email_target })
  }

  if (channels.length === 0) {
    // ບໍ່ມີຊ່ອງທາງໃດເລີຍ — ບັນທຶກໄວ້ວ່າຂ້າມ ເພື່ອໃຫ້ຕິດຕາມໄດ້ວ່າໃຜຍັງບໍ່ໄດ້ຕັ້ງ
    await query(
      `insert into it.notification_outbox
         (notification_id, employee_id, channel, title, body, link, status, last_error)
       values ($1::bigint, $2::int, 'line', $3::varchar, $4::text, $5::varchar,
               'skipped', 'ຄົນນີ້ຍັງບໍ່ໄດ້ຜູກ LINE ແລະ ບໍ່ມີອີເມວໃນລະບົບ')`,
      [notificationId, employeeId, title, body, link]
    )
    return
  }

  for (const c of channels) {
    await query(
      `insert into it.notification_outbox
         (notification_id, employee_id, channel, target, title, body, link)
       values ($1::bigint, $2::int, $3::varchar, $4::varchar, $5::varchar, $6::text,
               $7::varchar)`,
      [notificationId, employeeId, c.channel, c.to, title, body, link]
    )
  }
}

export type DrainResult = {
  picked: number
  sent: number
  failed: number
  configured: boolean
}

/**
 * ສົ່ງຂໍ້ຄວາມທີ່ຄ້າງຢູ່ຄິວ — ເອີ້ນຈາກ /api/notify/drain ຫຼື ຫຼັງບັນທຶກ
 *
 * ດຶງສະເພາະຊ່ອງທາງທີ່ຕັ້ງຄ່າໄວ້ແລ້ວ — ຖ້າຕັ້ງແຕ່ LINE ຂໍ້ຄວາມອີເມວຈະຄ້າງລໍຢູ່
 * (ບໍ່ຫາຍ ແລະ ບໍ່ນັບເປັນລົ້ມເຫຼວ) ຈົນກວ່າຈະຕັ້ງ SMTP
 */
export async function drainOutbox(limit = 25): Promise<DrainResult> {
  const line = lineConfigured()
  const mail = emailConfigured()
  const configured = line || mail
  if (!configured) return { picked: 0, sent: 0, failed: 0, configured }

  const channels = [line ? 'line' : null, mail ? 'email' : null].filter(
    (c): c is string => c !== null
  )

  const pending = await query<{
    id: string
    channel: string
    target: string
    title: string
    body: string | null
    link: string | null
  }>(
    `select id, channel, target, title, body, link
       from it.notification_outbox
      where status = 'pending' and channel = any($2::text[]) and target is not null
      order by created_at
      limit $1::int`,
    [limit, channels]
  )

  let sent = 0
  let failed = 0

  for (const row of pending) {
    const text = [row.title, row.body, appUrl(row.link)].filter(Boolean).join('\n')
    const result =
      row.channel === 'email'
        ? await sendEmail(row.target, row.title, text)
        : await pushLine(row.target, text)

    if (result.ok) {
      sent++
      await query(
        `update it.notification_outbox
            set status = 'sent', sent_at = now(), attempts = attempts + 1,
                last_error = null
          where id = $1::bigint`,
        [row.id]
      )
    } else {
      failed++
      await query(
        `update it.notification_outbox
            set attempts = attempts + 1,
                last_error = $2::text,
                status = case when attempts + 1 >= $3::int then 'failed' else 'pending' end
          where id = $1::bigint`,
        [row.id, result.error, MAX_ATTEMPTS]
      )
    }
  }

  return { picked: pending.length, sent, failed, configured }
}

/** ສະຫຼຸບສະຖານະຄິວ — ສຳລັບໜ້າຕັ້ງຄ່າ */
export async function getOutboxStats() {
  const rows = await query<{
    pending: string
    sent: string
    failed: string
    skipped: string
    no_line: string
  }>(
    `select count(*) filter (where status = 'pending') as pending,
            count(*) filter (where status = 'sent')    as sent,
            count(*) filter (where status = 'failed')  as failed,
            count(*) filter (where status = 'skipped') as skipped,
            (select count(*) from it.v_notify_targets
              where is_active and line_target is null
                and email_target is null)              as no_line
       from it.notification_outbox`
  )
  return rows[0]
}

export async function listOutbox(limit = 50) {
  return query<{
    id: string
    fullname_lo: string
    channel: string
    title: string
    status: string
    attempts: number
    last_error: string | null
    created_at: string
    sent_at: string | null
  }>(
    `select o.id, e.fullname_lo, o.channel, o.title, o.status, o.attempts,
            o.last_error, o.created_at, o.sent_at
       from it.notification_outbox o
       join public.odg_employee e on e.employee_id = o.employee_id
      order by o.created_at desc
      limit $1::int`,
    [limit]
  )
}

/** ເອົາລາຍການທີ່ລົ້ມເຫຼວກັບເຂົ້າຄິວໃໝ່ */
export async function retryFailed() {
  const rows = await query<{ id: string }>(
    `update it.notification_outbox
        set status = 'pending', attempts = 0, last_error = null
      where status = 'failed'
      returning id`
  )
  return rows.length
}

'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { pool } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { notify } from '@/lib/activity'
import { query } from '@/lib/db'
import {
  recordAttachments,
  ticketFolder,
} from '@/lib/tickets/attachments'
import { pickFiles, saveImages, validateImages } from '@/lib/uploads'
import type { FormState } from '@/lib/action-state'

/**
 * ແຈ້ງບັນຫາໂດຍພະນັກງານເອງ.
 *
 * ຕ່າງຈາກ createTicket ຂອງທີມ IT ຢູ່ 2 ຈຸດສຳຄັນ:
 *   • ຜູ້ແຈ້ງ = ຕົນເອງສະເໝີ (ບໍ່ຮັບຄ່າຈາກຟອມ ຈຶ່ງແຈ້ງແທນຄົນອື່ນບໍ່ໄດ້)
 *   • ມອບໝາຍຜູ້ຮັບຜິດຊອບບໍ່ໄດ້ — ປ່ອຍໃຫ້ທີມ IT ຮັບເອງ
 */
export async function reportIssue(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()

  const title = String(formData.get('title') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const categoryCode = String(formData.get('category_code') ?? '')
  const priority = String(formData.get('priority') ?? 'normal')

  if (!title || !categoryCode) {
    return { error: 'ກະລຸນາປ້ອນຫົວຂໍ້ ແລະ ເລືອກປະເພດບັນຫາ' }
  }

  const images = pickFiles(formData.getAll('images'))
  const invalid = validateImages(images)
  if (invalid.error) return { error: invalid.error }

  const client = await pool.connect()
  let ticketId: string
  let ticketNo: string
  try {
    await client.query('begin')

    const { rows } = await client.query<{ id: string; ticket_no: string }>(
      `insert into it.tickets
         (title, description, category_code, priority, status,
          requester_employee_id, unit_code,
          sla_respond_due_at, sla_resolve_due_at, created_by)
       select $1::varchar, $2::text, $3::varchar, $4::varchar, 'new',
              $5::int, c.unit_code,
              now() + (s.respond_minutes || ' minutes')::interval,
              now() + (s.resolve_minutes || ' minutes')::interval,
              $5::int
         from it.ticket_categories c
         join it.sla_policies s on s.priority = $4::varchar
        where c.code = $3::varchar
       returning id, ticket_no`,
      [title, description || null, categoryCode, priority, user.employee_id]
    )

    if (!rows[0]) {
      await client.query('rollback')
      return { error: 'ປະເພດ ຫຼື ລະດັບຄວາມດ່ວນບໍ່ຖືກຕ້ອງ' }
    }

    ticketId = rows[0].id
    ticketNo = rows[0].ticket_no

    await client.query(
      `insert into it.ticket_comments (ticket_id, kind, body, author_employee_id)
       values ($1, 'system', $2, $3)`,
      [ticketId, 'ແຈ້ງບັນຫາຜ່ານໜ້າພະນັກງານ', user.employee_id]
    )

    await client.query('commit')
  } catch (e) {
    await client.query('rollback')
    return { error: `ບັນທຶກບໍ່ສຳເລັດ: ${(e as Error).message}` }
  } finally {
    client.release()
  }

  if (images.length > 0) {
    const saved = await saveImages(images, ticketFolder(ticketId))
    if (saved.ok) {
      await recordAttachments(ticketId, 'report', saved.files, user.employee_id)
    }
  }

  // ແຈ້ງທີມ IT ຂອງໜ່ວຍງານທີ່ຮັບຜິດຊອບປະເພດນີ້
  const staff = await query<{ employee_id: number }>(
    `select s.employee_id
       from it.v_it_staff s
       join it.ticket_categories c on c.code = $1::varchar
      where s.role in ('head', 'manager')
         or s.unit_code = c.unit_code`,
    [categoryCode]
  )
  for (const s of staff) {
    await notify(
      s.employee_id,
      user.employee_id,
      'ມີການແຈ້ງບັນຫາໃໝ່',
      `${ticketNo} · ${title} (${user.fullname_lo})`,
      `/tickets/${ticketId}`
    )
  }

  revalidatePath('/my/tickets')
  revalidatePath('/tickets')
  redirect(`/my/tickets/${ticketId}`)
}

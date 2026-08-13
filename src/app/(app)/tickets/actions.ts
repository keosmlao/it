'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { pool, query } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { getTicket } from '@/lib/tickets/queries'
import {
  ALLOWED_TRANSITIONS,
  REQUIRE_EVIDENCE_ON_RESOLVE,
  STATUS_LABEL_LO,
  canClaimTicket,
  canEditTicket,
  type TicketStatus,
} from '@/lib/tickets/model'
import {
  countEvidence,
  recordAttachments,
  ticketFolder,
} from '@/lib/tickets/attachments'
import { pickFiles, saveImages, validateImages } from '@/lib/uploads'
import type { FormState } from '@/lib/action-state'
import { canAssignTarget } from '@/lib/action-policy'

export type ActionState = FormState

export async function createTicket(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser()

  const title = String(formData.get('title') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const categoryCode = String(formData.get('category_code') ?? '')
  const priority = String(formData.get('priority') ?? '')
  const requesterId = Number(formData.get('requester_employee_id'))
  const assigneeRaw = String(formData.get('assignee_employee_id') ?? '')

  if (!title || !categoryCode || !priority || !requesterId) {
    return { error: 'ກະລຸນາປ້ອນຫົວຂໍ້, ປະເພດ, ລະດັບຄວາມດ່ວນ ແລະ ຜູ້ແຈ້ງ' }
  }

  const assigneeId = assigneeRaw ? Number(assigneeRaw) : null
  if (!canAssignTarget(user, assigneeId)) {
    return { error: 'ທ່ານບໍ່ມີສິດມອບໝາຍວຽກໃຫ້ຄົນອື່ນ' }
  }

  // ກວດຮູບກ່ອນສ້າງ ticket ເພື່ອບໍ່ໃຫ້ເຫຼືອ ticket ທີ່ຮູບແນບບໍ່ຜ່ານ
  const images = pickFiles(formData.getAll('images'))
  const invalid = validateImages(images)
  if (invalid.error) return { error: invalid.error }

  const client = await pool.connect()
  let ticketId: string
  try {
    await client.query('begin')

    // SLA ນັບຈາກເວລາທີ່ແຈ້ງ ໂດຍໃຊ້ນະໂຍບາຍຂອງລະດັບຄວາມດ່ວນນັ້ນ
    const { rows } = await client.query<{ id: string }>(
      `insert into it.tickets
         (title, description, category_code, priority, status,
          requester_employee_id, assignee_employee_id, unit_code,
          sla_respond_due_at, sla_resolve_due_at, created_by)
       -- PG11 leaves parameters in an INSERT…SELECT list untyped, so every one
       -- carries an explicit cast or the planner deduces conflicting types.
       select $1::varchar, $2::text, $3::varchar, $4::varchar,
              (case when $6::int is null then 'new' else 'assigned' end)::varchar,
              $5::int, $6::int,
              coalesce($7::varchar, c.unit_code),
              now() + (s.respond_minutes || ' minutes')::interval,
              now() + (s.resolve_minutes || ' minutes')::interval,
              $8::int
         from it.ticket_categories c
         join it.sla_policies s on s.priority = $4::varchar
        where c.code = $3::varchar
       returning id`,
      [
        title,
        description || null,
        categoryCode,
        priority,
        requesterId,
        assigneeId,
        formData.get('unit_code') || null,
        user.employee_id,
      ]
    )

    if (!rows[0]) {
      await client.query('rollback')
      return { error: 'ປະເພດ ຫຼື ລະດັບຄວາມດ່ວນບໍ່ຖືກຕ້ອງ' }
    }

    ticketId = rows[0].id

    await client.query(
      `insert into it.ticket_comments (ticket_id, kind, body, author_employee_id)
       values ($1, 'system', $2, $3)`,
      [ticketId, 'ສ້າງ ticket', user.employee_id]
    )

    await client.query('commit')
  } catch (e) {
    await client.query('rollback')
    return { error: `ບັນທຶກບໍ່ສຳເລັດ: ${(e as Error).message}` }
  } finally {
    client.release()
  }

  // ຮູບຖືກກວດແລ້ວຂ້າງເທິງ — ບັນທຶກຫຼັງ ticket ມີ id ຈຶ່ງຮູ້ໂຟນເດີປາຍທາງ
  if (images.length > 0) {
    const saved = await saveImages(images, ticketFolder(ticketId))
    if (saved.ok) {
      await recordAttachments(ticketId, 'report', saved.files, user.employee_id)
    }
  }

  revalidatePath('/tickets')
  redirect(`/tickets/${ticketId}`)
}

/** ແນບຮູບເພີ່ມເຂົ້າ ticket ທີ່ມີຢູ່ແລ້ວ (ຮູບບັນຫາ ຫຼື ຮູບຫຼັກຖານ) */
export async function addAttachments(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  const ticketId = String(formData.get('ticket_id'))
  const kind = formData.get('kind') === 'evidence' ? 'evidence' : 'report'

  const ticket = await getTicket(user, ticketId)
  if (!ticket) return { error: 'ບໍ່ພົບ ticket' }

  const images = pickFiles(formData.getAll('images'))
  if (images.length === 0) return { error: 'ກະລຸນາເລືອກຮູບກ່ອນ' }

  const saved = await saveImages(images, ticketFolder(ticketId))
  if (!saved.ok) return { error: saved.error }

  await recordAttachments(ticketId, kind, saved.files, user.employee_id)

  await query(
    `insert into it.ticket_comments (ticket_id, kind, body, author_employee_id)
     values ($1, 'system', $2, $3)`,
    [
      ticketId,
      `${kind === 'evidence' ? 'ແນບຮູບຫຼັກຖານ' : 'ແນບຮູບບັນຫາ'} ${saved.files.length} ຮູບ`,
      user.employee_id,
    ]
  )

  revalidatePath(`/tickets/${ticketId}`)
  return { ok: true }
}

export async function assignTicket(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  const ticketId = String(formData.get('ticket_id'))
  const assigneeRaw = String(formData.get('assignee_employee_id') ?? '')
  const assigneeId = assigneeRaw ? Number(assigneeRaw) : null

  const ticket = await getTicket(user, ticketId)
  if (!ticket) return { error: 'ບໍ່ພົບ ticket' }

  const claimingSelf = assigneeId === user.employee_id
  const allowed = claimingSelf
    ? canClaimTicket(user, ticket) || canEditTicket(user, ticket)
    : can.assignWork(user)
  if (!allowed) return { error: 'ບໍ່ມີສິດມອບໝາຍວຽກນີ້' }

  const [name] = assigneeId
    ? await query<{ fullname_lo: string }>(
        'select fullname_lo from it.v_it_staff where employee_id = $1',
        [assigneeId]
      )
    : [{ fullname_lo: '' }]

  if (assigneeId && !name) {
    return { error: 'ຜູ້ຮັບຜິດຊອບຕ້ອງເປັນພະນັກງານໄອທີ' }
  }

  await query(
    `update it.tickets
        set assignee_employee_id = $2::int,
            status = case when status = 'new' and $2::int is not null
                          then 'assigned' else status end,
            updated_at = now()
      where id = $1::bigint`,
    [ticketId, assigneeId]
  )

  await query(
    `insert into it.ticket_comments (ticket_id, kind, body, author_employee_id)
     values ($1, 'assignment', $2, $3)`,
    [
      ticketId,
      assigneeId ? `ມອບໝາຍໃຫ້ ${name.fullname_lo}` : 'ຍົກເລີກການມອບໝາຍ',
      user.employee_id,
    ]
  )

  revalidatePath(`/tickets/${ticketId}`)
  revalidatePath('/tickets')
  return { ok: true }
}

export async function changeStatus(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  const ticketId = String(formData.get('ticket_id'))
  const next = String(formData.get('status')) as TicketStatus
  const resolution = String(formData.get('resolution') ?? '').trim()

  const ticket = await getTicket(user, ticketId)
  if (!ticket) return { error: 'ບໍ່ພົບ ticket' }
  if (!canEditTicket(user, ticket)) return { error: 'ບໍ່ມີສິດແກ້ໄຂ ticket ນີ້' }

  if (!ALLOWED_TRANSITIONS[ticket.status]?.includes(next)) {
    return {
      error: `ປ່ຽນຈາກ "${STATUS_LABEL_LO[ticket.status]}" ໄປ "${STATUS_LABEL_LO[next]}" ບໍ່ໄດ້`,
    }
  }

  if (next === 'resolved' && !resolution && !ticket.resolution) {
    return { error: 'ກະລຸນາບັນທຶກວິທີແກ້ໄຂກ່ອນປິດວຽກ' }
  }

  // ຮູບຫຼັກຖານທີ່ແນບມາພ້ອມກັບການປ່ຽນສະຖານະ
  const images = pickFiles(formData.getAll('images'))
  const invalid = validateImages(images)
  if (invalid.error) return { error: invalid.error }

  if (REQUIRE_EVIDENCE_ON_RESOLVE && next === 'resolved') {
    const already = await countEvidence(ticketId)
    if (already + images.length === 0) {
      return { error: 'ກະລຸນາແນບຮູບຫຼັກຖານການແກ້ໄຂຢ່າງໜ້ອຍ 1 ຮູບ' }
    }
  }

  if (images.length > 0) {
    const saved = await saveImages(images, ticketFolder(ticketId))
    if (!saved.ok) return { error: saved.error }
    await recordAttachments(ticketId, 'evidence', saved.files, user.employee_id)
  }

  // ທຸກ parameter ຕ້ອງ cast ຢ່າງຈະແຈ້ງ — PG11 ຄິດ type ບໍ່ອອກ
  // ເມື່ອ parameter ດຽວກັນຖືກໃຊ້ທັງເປັນຄ່າຂອງຄໍລຳ ແລະ ໃນການປຽບທຽບ
  await query(
    `update it.tickets
        set status = $2::varchar,
            resolution = coalesce(nullif($3::text, ''), resolution),
            first_responded_at = coalesce(first_responded_at, now()),
            resolved_at = case when $2::varchar in ('resolved','closed')
                               then coalesce(resolved_at, now()) else null end,
            closed_at = case when $2::varchar = 'closed' then now() else closed_at end,
            updated_at = now()
      where id = $1::bigint`,
    [ticketId, next, resolution]
  )

  await query(
    `insert into it.ticket_comments (ticket_id, kind, body, author_employee_id)
     values ($1, 'status_change', $2, $3)`,
    [ticketId, `ປ່ຽນສະຖານະເປັນ "${STATUS_LABEL_LO[next]}"`, user.employee_id]
  )

  revalidatePath(`/tickets/${ticketId}`)
  revalidatePath('/tickets')
  return { ok: true }
}

export async function addComment(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  const ticketId = String(formData.get('ticket_id'))
  const body = String(formData.get('body') ?? '').trim()
  // ຜູ້ແຈ້ງຈາກພະແນກອື່ນຂຽນ "ບັນທຶກພາຍໃນ" ບໍ່ໄດ້ ເຖິງແມ່ນສົ່ງ field ມາເອງ
  const isInternal = user.is_it_staff && formData.get('is_internal') === 'on'

  if (!body) return { error: 'ກະລຸນາຂຽນຂໍ້ຄວາມກ່ອນບັນທຶກ' }

  const ticket = await getTicket(user, ticketId)
  if (!ticket) return { error: 'ບໍ່ພົບ ticket' }

  await query(
    `insert into it.ticket_comments (ticket_id, body, is_internal, author_employee_id)
     values ($1, $2, $3, $4)`,
    [ticketId, body, isInternal, user.employee_id]
  )

  // ຄຳຕອບທຳອິດ**ຈາກທີມ IT** = ຈຸດຢຸດເວລາຕອບຂອງ SLA.
  // ຂໍ້ຄວາມທີ່ຜູ້ແຈ້ງຂຽນເອງບໍ່ນັບ ບໍ່ດັ່ງນັ້ນ SLA ຈະຢຸດເອງໂດຍທີ່ IT ຍັງບໍ່ທັນຕອບ
  const isItReply = user.is_it_staff && ticket.requester_employee_id !== user.employee_id

  await query(
    `update it.tickets
        set first_responded_at = case when $2::boolean
                                      then coalesce(first_responded_at, now())
                                      else first_responded_at end,
            updated_at = now()
      where id = $1::bigint`,
    [ticketId, isItReply]
  )

  revalidatePath(`/tickets/${ticketId}`)
  revalidatePath(`/my/tickets/${ticketId}`)
  return { ok: true }
}

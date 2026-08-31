'use client'

import Link from 'next/link'
import { useActionState, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SubmitButton } from '@/components/action-form'
import Modal, { useModalClose } from '@/components/modal'
import { blockNativeDrag, dropColumn, usePointerDrag } from '@/components/pointer-drag'
import ImagePicker from '@/components/image-picker'
import { OverdueBadge, PriorityBadge } from '@/components/badge'
import { formatDeadline } from '@/lib/format'
import { EMPTY_STATE } from '@/lib/action-state'
import type { ItStaff } from '@/lib/auth/roles'
import {
  ALLOWED_TRANSITIONS,
  REQUIRE_EVIDENCE_ON_RESOLVE,
  STATUS_LABEL_LO,
  TICKET_BOARD_COLUMNS,
  canEditTicket,
  type TicketRow,
  type TicketStatus,
} from '@/lib/tickets/model'
import { changeStatus } from './actions'

/**
 * ກະດານ ticket — ຖັນຄືສະຖານະ ຈຶ່ງເຫັນວຽກຄ້າງທຸກຂັ້ນໃນຈໍດຽວ
 *
 * ຍ້າຍໄດ້ 2 ທາງ ແລະ ທັງສອງທາງເອີ້ນ changeStatus ອັນດຽວກັນ:
 *   • ລາກດ້ວຍເມົ້າ — ທາງຫຼັກຢູ່ຄອມພິວເຕີ
 *   • dropdown + ປຸ່ມ "ຍ້າຍ" — ມືຖື, ຄີບອດ ແລະ ຕອນ JS ບໍ່ແລ່ນ
 *     (HTML5 drag & drop ບໍ່ເຮັດວຽກເທິງໜ້າຈໍສຳຜັດ ຈຶ່ງຕັດອອກບໍ່ໄດ້)
 *
 * ຖັນທີ່ຕ້ອງມີຂໍ້ມູນເພີ່ມ (ສຳເລັດ / ສ້ອມບໍ່ໄດ້) ຢ່ອນລົງໄດ້ຄືກັນ ແຕ່ຈະເປີດ
 * ໜ້າຕ່າງຖາມວິທີແກ້ໄຂ ແລະ ຮູບຫຼັກຖານກ່ອນບັນທຶກ — ເມື່ອກ່ອນຕັດຖັນເຫຼົ່ານີ້
 * ອອກຈາກເປົ້າໝາຍ ຜົນຄື ticket ທີ່ "ກຳລັງດຳເນີນການ" ລາກໄປໃສບໍ່ໄດ້ເລີຍ
 */

/** ຕັ້ງເອງບໍ່ໄດ້ — ມາຈາກການເລືອກຜູ້ຮັບຜິດຊອບ (assignTicket ຕັ້ງໃຫ້) */
const NOT_A_DROP_TARGET: TicketStatus[] = ['assigned', 'cancelled']

/** ຢ່ອນລົງໄດ້ ແຕ່ຕ້ອງຕອບຄຳຖາມກ່ອນ */
const NEEDS_FORM: TicketStatus[] = ['resolved', 'unrepairable']

function dropTargets(status: TicketStatus): TicketStatus[] {
  return (ALLOWED_TRANSITIONS[status] ?? []).filter(
    (s) => !NOT_A_DROP_TARGET.includes(s)
  )
}

export default function TicketBoard({
  tickets,
  user,
}: {
  tickets: TicketRow[]
  user: ItStaff
}) {
  const [asking, setAsking] = useState<{
    ticket: TicketRow
    to: TicketStatus
  } | null>(null)
  const stopAsking = useCallback(() => setAsking(null), [])

  /**
   * ຍ້າຍຜ່ານ <form> ຈິງ ບໍ່ແມ່ນເອີ້ນ action ຈາກ JS ໂດຍກົງ
   *
   * ເສັ້ນທາງນີ້ Next ຈັດການ revalidatePath ແລະ render ໃໝ່ໃຫ້ເອງ —
   * ຕອນເອີ້ນເອງ optimistic state ດີດກັບເປັນຂອງເກົ່າທັນທີທີ່ transition ຈົບ
   * ໂດຍທີ່ຂໍ້ມູນໃໝ່ຍັງບໍ່ມາຮອດ ຈຶ່ງເຫັນເປັນ "ລາກແລ້ວບໍ່ໄປ"
   */
  const [state, formAction, pending] = useActionState(changeStatus, EMPTY_STATE)
  const moveForm = useRef<HTMLFormElement>(null)
  const moveId = useRef<HTMLInputElement>(null)
  const moveTo = useRef<HTMLInputElement>(null)

  const { item: dragging, over, begin, ghost } = usePointerDrag<TicketRow>({
    // ບໍ່ຕ້ອງ memo — hook ເກັບ callback ໄວ້ໃນ ref ຂອງມັນເອງ ຈຶ່ງບໍ່ຄ້າງເກົ່າ
    canDrop: (ticket: TicketRow, column: string) => dropTargets(ticket.status).includes(column as TicketStatus),
    onDrop: (ticket: TicketRow, column: string) => drop(ticket, column as TicketStatus),
    label: (ticket: TicketRow) => ticket.title,
  })

  // ສະຖານະນອກສາຍຫຼັກ (ຍົກເລີກ) ຕໍ່ທ້າຍໃຫ້ສະເພາະຕອນມີວຽກຄ້າງຢູ່
  const extra = tickets
    .map((t) => t.status)
    .filter((s) => !TICKET_BOARD_COLUMNS.includes(s))
  const columns = [...TICKET_BOARD_COLUMNS, ...new Set(extra)]

  function drop(ticket: TicketRow, to: TicketStatus) {
    if (to === ticket.status) return

    // ຕ້ອງມີວິທີແກ້ໄຂ / ເຫດຜົນ / ຮູບ — ຖາມກ່ອນ ຢ່າຍ້າຍລອຍໆ
    if (NEEDS_FORM.includes(to)) {
      setAsking({ ticket, to })
      return
    }

    if (!moveId.current || !moveTo.current) return
    moveId.current.value = ticket.id
    moveTo.current.value = to
    moveForm.current?.requestSubmit()
  }


  return (
    <div className="mt-5">
      {/* ຟອມລັບອັນດຽວຂອງກະດານ — ການລາກ ແລະ ປຸ່ມໃນກາດສົ່ງຜ່ານອັນນີ້ໝົດ */}
      <form ref={moveForm} action={formAction} className="hidden">
        <input type="hidden" name="ticket_id" ref={moveId} />
        <input type="hidden" name="status" ref={moveTo} />
      </form>

      {state.error && (
        <p
          role="alert"
          className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          {state.error}
        </p>
      )}

      {/* ຖັນສູງຕາມກາດທີ່ມີ ແຕ່ບໍ່ເກີນຈໍ — ກາດໜ້ອຍຖັນກໍ່ສັ້ນ ບໍ່ມີບ່ອນຫວ່າງລອຍ
          ກາດຫຼາຍຈຶ່ງເລື່ອນຢູ່ໃນຖັນ ໂດຍຫົວຖັນຄ້າງໃຫ້ເຫັນ */}
      <div className="flex max-h-[calc(100vh-17rem)] items-stretch gap-3 overflow-x-auto pb-2">
        {columns.map((column) => {
          const all = tickets.filter((t) => t.status === column)
          const items =
            column === 'closed'
              ? [...all]
                  .sort((a, b) => closedAtKey(b).localeCompare(closedAtKey(a)))
                  .slice(0, CLOSED_LIMIT)
              : all

          const accepts = dragging
            ? dropTargets(dragging.status).includes(column)
            : false
          const blocked = Boolean(dragging) && !accepts && dragging?.status !== column

          return (
            <section
              key={column}
              {...dropColumn(column)}
              className={`flex min-h-0 w-64 shrink-0 flex-col glass-subtle rounded-xl p-2 transition ${
                over === column
                  ? 'ring-2 ring-brand-blue/60'
                  : accepts
                    ? 'ring-1 ring-brand-blue/25'
                    : ''
              } ${blocked ? 'opacity-40' : ''}`}
            >
              <h3 className="shrink-0 px-2 py-1.5 text-sm font-medium text-body">
                {STATUS_LABEL_LO[column]}
                <span className="ml-1.5 text-faint">{all.length}</span>
                {items.length < all.length && (
                  <span className="ml-1.5 text-xs font-normal text-faint">
                    · {CLOSED_LIMIT} ລ້າສຸດ
                  </span>
                )}
              </h3>

              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-0.5">
                {items.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    user={user}
                    dimmed={dragging?.id === ticket.id}
                    onGrab={(event) => begin(event, ticket)}
                    onPick={(to) => drop(ticket, to)}
                  />
                ))}

                {items.length === 0 && (
                  <p className="px-2 py-4 text-center text-xs text-faint">
                    {accepts ? 'ຢ່ອນລົງນີ້' : 'ວ່າງ'}
                  </p>
                )}
              </div>
            </section>
          )
        })}
      </div>

      <p className="mt-2 text-xs text-muted">
        {pending
          ? 'ກຳລັງບັນທຶກການຍ້າຍ…'
          : 'ລາກກາດໄປວາງໃສ່ຖັນທີ່ຕ້ອງການ — ຖັນທີ່ຢ່ອນໄດ້ຈະຂຶ້ນຂອບຟ້າ'}
      </p>

      {ghost}

      <Modal
        open={asking !== null}
        onClose={stopAsking}
        title={
          asking
            ? `${asking.ticket.ticket_no} → ${STATUS_LABEL_LO[asking.to]}`
            : ''
        }
      >
        {asking && <FinishForm ticket={asking.ticket} to={asking.to} />}
      </Modal>
    </div>
  )
}

/**
 * ຟອມທີ່ໂຜ່ຫຼັງລາກໃສ່ຖັນ ສຳເລັດ / ສ້ອມບໍ່ໄດ້
 * ຖາມຂໍ້ມູນອັນດຽວກັນກັບກ່ອງ "ຂັ້ນຕອນຕໍ່ໄປ" ຢູ່ໜ້າ ticket ຈຶ່ງກົດການດຽວກັນ
 */
function FinishForm({ ticket, to }: { ticket: TicketRow; to: TicketStatus }) {
  const close = useModalClose()
  const router = useRouter()
  const [state, formAction] = useActionState(changeStatus, EMPTY_STATE)

  const unrepairable = to === 'unrepairable'
  const needsResolution = unrepairable || !ticket.resolution

  /**
   * ສົ່ງຜ່ານແລ້ວຈຶ່ງປິດໜ້າຕ່າງ ແລະ ດຶງຂໍ້ມູນໃໝ່
   *
   * ຮູ້ວ່າ "ຍັງບໍ່ທັນສົ່ງ" ຈາກ identity ຂອງ state — ທຸກຄັ້ງທີ່ action ຈົບ
   * useActionState ຄືນ object ໃໝ່ ສ່ວນກ່ອນສົ່ງມັນຍັງເປັນ EMPTY_STATE ອັນເກົ່າ
   *
   * ຢ່າໃຊ້ ref ແບບ "ຂ້າມຮອບທຳອິດ" — Strict Mode (ເປີດຢູ່ຕອນ dev) ແລ່ນ
   * effect ຂອງການ mount ສອງເທື່ອ ຮອບທີສອງ ref ຖືກລ້າງໄປແລ້ວຈຶ່ງຕົກລົງມາ
   * ປິດໜ້າຕ່າງໃສ່ທັນທີທີ່ເປີດ — ຜົນຄື "ລາກ/ກົດແລ້ວບໍ່ມີຫຍັງເກີດຂຶ້ນ"
   */
  useEffect(() => {
    if (state === EMPTY_STATE) return
    if (!state.error) {
      close()
      router.refresh()
    }
  }, [state, close, router])

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="ticket_id" value={ticket.id} />
      <input type="hidden" name="status" value={to} />

      <p className="text-sm text-muted">{ticket.title}</p>

      <label className="block">
        <span className="text-sm font-medium text-body">
          {unrepairable ? 'ເຫດຜົນທີ່ສ້ອມບໍ່ໄດ້' : 'ວິທີແກ້ໄຂ'}
          {needsResolution && <span className="text-red-600"> *</span>}
        </span>
        <textarea
          name="resolution"
          rows={3}
          required={needsResolution}
          defaultValue={unrepairable ? '' : (ticket.resolution ?? '')}
          placeholder={
            unrepairable
              ? 'ເຊັ່ນ ອາໄຫຼ່ບໍ່ມີແລ້ວ, ຄ່າສ້ອມແພງກວ່າຊື້ໃໝ່'
              : 'ແກ້ດ້ວຍວິທີໃດ'
          }
          className="input mt-1 w-full rounded px-2 py-1 text-[13px]"
        />
      </label>

      <ImagePicker
        label={unrepairable ? 'ຮູບສະພາບເຄື່ອງ' : 'ຮູບຫຼັກຖານການແກ້ໄຂ'}
        required={!unrepairable && REQUIRE_EVIDENCE_ON_RESOLVE}
        hint={
          unrepairable
            ? 'ຮູບຄວາມເສຍຫາຍ — ໃຊ້ອ້າງອີງຕອນຕັດຈຳໜ່າຍ ຫຼື ຂໍຊື້ໃໝ່ (ບໍ່ບັງຄັບ)'
            : 'ຮູບຜົນລັບຫຼັງແກ້ໄຂ — ຖ້າແນບໄວ້ແລ້ວຢູ່ໜ້າ ticket ບໍ່ຕ້ອງແນບຊໍ້າ'
        }
      />

      {state.error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          {state.error}
        </p>
      )}

      <div className="flex justify-end">
        <SubmitButton
          pendingLabel="ກຳລັງບັນທຶກ…"
          className="btn-primary rounded px-3 py-1.5 text-[13px] font-medium"
        >
          ບັນທຶກ
        </SubmitButton>
      </div>
    </form>
  )
}

function TicketCard({
  ticket,
  user,
  dimmed,
  onGrab,
  onPick,
}: {
  ticket: TicketRow
  user: ItStaff
  dimmed: boolean
  onGrab: (event: React.PointerEvent) => void
  onPick: (to: TicketStatus) => void
}) {
  const deadline = formatDeadline(
    ticket.is_finished ? null : ticket.sla_resolve_due_at
  )
  const targets = dropTargets(ticket.status)
  const editable = canEditTicket(user, ticket)
  const draggable = editable && targets.length > 0

  return (
    <article
      onPointerDown={draggable ? onGrab : undefined}
      {...blockNativeDrag()}
      className={`glass-card shrink-0 select-none rounded-lg p-3 transition ${
        draggable ? 'cursor-grab active:cursor-grabbing' : ''
      } ${dimmed ? 'opacity-40' : ''}`}
    >
      <Link
        href={`/tickets/${ticket.id}`}
        className="text-sm font-medium text-fg underline-offset-2 hover:underline"
      >
        {ticket.title}
      </Link>
      <p className="mt-0.5 font-mono text-xs text-muted">{ticket.ticket_no}</p>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <PriorityBadge
          priority={ticket.priority}
          label={ticket.priority_name_lo}
        />
        {deadline.overdue && <OverdueBadge>{deadline.text}</OverdueBadge>}
      </div>

      <p className="mt-2 text-xs text-muted">
        {ticket.assignee_nickname ?? ticket.assignee_name ?? 'ຍັງບໍ່ມອບໝາຍ'}
        {!ticket.is_finished && !deadline.overdue && ` · ${deadline.text}`}
      </p>

      {/* ທາງເລືອກສຳລັບມືຖື/ຄີບອດ — ຜ່ານ onPick ຈຶ່ງໄດ້ໜ້າຕ່າງຖາມຂໍ້ມູນຄືກັນ */}
      {editable && targets.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {targets.map((to) => (
            <button
              key={to}
              type="button"
              onClick={() => onPick(to)}
              className="btn-secondary rounded px-2 py-1 text-xs"
            >
              → {STATUS_LABEL_LO[to]}
            </button>
          ))}
        </div>
      )}
    </article>
  )
}

/**
 * ຖັນ "ປິດແລ້ວ" ເອົາແຕ່ 10 ລ້າສຸດ — ວຽກທີ່ຈົບແລ້ວບໍ່ຕ້ອງລົງມືຫຍັງອີກ
 * ມີໄວ້ພຽງໃຫ້ເຫັນວ່າຫາກໍປິດອັນໃດໄປ. ຢາກເບິ່ງໃຫ້ຄົບໃຫ້ໄປຕາຕະລາງ
 */
const CLOSED_LIMIT = 10

/** ອັນທີ່ຫາກໍລາກມາປິດຍັງບໍ່ທັນມີເວລາປິດຈາກເຊີບເວີ — ໃຫ້ຂຶ້ນເທິງສຸດໄວ້ກ່ອນ */
function closedAtKey(ticket: TicketRow) {
  return String(ticket.closed_at ?? ticket.resolved_at ?? '9999-12-31')
}

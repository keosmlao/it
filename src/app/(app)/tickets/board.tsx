'use client'

import Link from 'next/link'
import { useOptimistic, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import ActionForm from '@/components/action-form'
import { OverdueBadge, PriorityBadge } from '@/components/badge'
import { formatDeadline } from '@/lib/format'
import { EMPTY_STATE } from '@/lib/action-state'
import type { ItStaff } from '@/lib/auth/roles'
import {
  ALLOWED_TRANSITIONS,
  STATUS_LABEL_LO,
  TICKET_BOARD_COLUMNS,
  canEditTicket,
  quickMoves,
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
 * ຖັນທີ່ຢ່ອນລົງບໍ່ໄດ້ຈະຈາງລົງຂະນະລາກ — ອີງ ALLOWED_TRANSITIONS ອັນດຽວກັບ
 * ທີ່ເຊີບເວີກວດ ຈຶ່ງບໍ່ມີກໍລະນີລາກໄດ້ແຕ່ບັນທຶກບໍ່ຜ່ານ
 */

/**
 * ຖັນ "ປິດແລ້ວ" ເອົາແຕ່ 10 ລ້າສຸດ — ວຽກທີ່ຈົບແລ້ວບໍ່ຕ້ອງລົງມືຫຍັງອີກ
 * ມີໄວ້ພຽງໃຫ້ເຫັນວ່າຫາກໍປິດອັນໃດໄປ. ຢາກເບິ່ງໃຫ້ຄົບໃຫ້ໄປຕາຕະລາງ
 */
const CLOSED_LIMIT = 10

/** ອັນທີ່ຫາກໍລາກມາປິດຍັງບໍ່ທັນມີເວລາປິດຈາກເຊີບເວີ — ໃຫ້ຂຶ້ນເທິງສຸດໄວ້ກ່ອນ */
function closedAtKey(ticket: TicketRow) {
  return String(ticket.closed_at ?? ticket.resolved_at ?? '9999-12-31')
}
export default function TicketBoard({
  tickets,
  user,
}: {
  tickets: TicketRow[]
  user: ItStaff
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState<TicketRow | null>(null)
  const [overColumn, setOverColumn] = useState<TicketStatus | null>(null)

  // ຍ້າຍໃຫ້ເຫັນທັນທີ ບໍ່ຕ້ອງລໍເຊີບເວີ — ຖ້າບັນທຶກບໍ່ຜ່ານ React ຈະດຶງກັບຄືນເອງ
  const [board, applyMove] = useOptimistic(
    tickets,
    (state: TicketRow[], move: { id: string; status: TicketStatus }) =>
      state.map((t) => (t.id === move.id ? { ...t, status: move.status } : t))
  )

  // ສະຖານະນອກສາຍຫຼັກ (ລໍຂໍ້ມູນ, ຍົກເລີກ) ຕໍ່ທ້າຍໃຫ້ສະເພາະຕອນມີວຽກຄ້າງຢູ່
  const extra = board
    .map((t) => t.status)
    .filter((s) => !TICKET_BOARD_COLUMNS.includes(s))
  const columns = [...TICKET_BOARD_COLUMNS, ...new Set(extra)]

  function move(ticket: TicketRow, to: TicketStatus) {
    if (to === ticket.status) return
    setError(null)

    startTransition(async () => {
      applyMove({ id: ticket.id, status: to })

      const form = new FormData()
      form.set('ticket_id', ticket.id)
      form.set('status', to)

      const result = await changeStatus(EMPTY_STATE, form)
      if (result.error) setError(result.error)
      router.refresh()
    })
  }

  return (
    <div className="mt-5">
      {error && (
        <p
          role="alert"
          className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          {error}
        </p>
      )}

      {/* ຖັນສູງເທົ່າຈໍ ແລ້ວເລື່ອນຢູ່ໃນຖັນ — ຫົວຖັນຈຶ່ງຄ້າງໃຫ້ເຫັນຕະຫຼອດ
          ແລະ ໜ້າບໍ່ຍາວຕາມຖັນທີ່ມີກາດຫຼາຍທີ່ສຸດ */}
      <div className="flex h-[calc(100vh-20rem)] min-h-96 items-stretch gap-3 overflow-x-auto pb-2">
        {columns.map((column) => {
          const all = board.filter((t) => t.status === column)
          const items =
            column === 'closed'
              ? [...all]
                  .sort((a, b) => closedAtKey(b).localeCompare(closedAtKey(a)))
                  .slice(0, CLOSED_LIMIT)
              : all
          const accepts = dragging
            ? quickMoves(dragging.status).includes(column)
            : false
          const blocked = Boolean(dragging) && !accepts && dragging?.status !== column

          return (
            <section
              key={column}
              onDragOver={(event) => {
                if (!accepts) return
                event.preventDefault()
                event.dataTransfer.dropEffect = 'move'
                setOverColumn(column)
              }}
              onDragLeave={() => setOverColumn((c) => (c === column ? null : c))}
              onDrop={(event) => {
                if (!accepts || !dragging) return
                event.preventDefault()
                move(dragging, column)
                setDragging(null)
                setOverColumn(null)
              }}
              className={`flex min-h-0 w-64 shrink-0 flex-col glass-subtle rounded-xl p-2 transition ${
                overColumn === column && accepts
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
                    onDragStart={() => setDragging(ticket)}
                    onDragEnd={() => {
                      setDragging(null)
                      setOverColumn(null)
                    }}
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
        {pending ? 'ກຳລັງບັນທຶກການຍ້າຍ…' : 'ລາກກາດໄປວາງໃສ່ຖັນທີ່ຕ້ອງການເພື່ອປ່ຽນສະຖານະ'}
      </p>
    </div>
  )
}

function TicketCard({
  ticket,
  user,
  dimmed,
  onDragStart,
  onDragEnd,
}: {
  ticket: TicketRow
  user: ItStaff
  dimmed: boolean
  onDragStart: () => void
  onDragEnd: () => void
}) {
  const deadline = formatDeadline(
    ticket.is_finished ? null : ticket.sla_resolve_due_at
  )
  const moves = quickMoves(ticket.status)
  const mayResolve = (ALLOWED_TRANSITIONS[ticket.status] ?? []).includes('resolved')
  const editable = canEditTicket(user, ticket)
  const draggable = editable && moves.length > 0

  return (
    <article
      draggable={draggable}
      onDragStart={(event) => {
        // ລາກຈາກໃນ dropdown ຫຼື ປຸ່ມ ບໍ່ໃຫ້ນັບເປັນການລາກກາດ
        if ((event.target as HTMLElement).closest('form, a')) {
          event.preventDefault()
          return
        }
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', ticket.id)
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      className={`glass-card shrink-0 rounded-lg p-3 transition ${
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

      {editable && moves.length > 0 && (
        <ActionForm action={changeStatus} className="mt-2 flex gap-1">
          <input type="hidden" name="ticket_id" value={ticket.id} />
          <select
            name="status"
            defaultValue={moves[0]}
            aria-label={`ຍ້າຍ ${ticket.ticket_no} ໄປສະຖານະ`}
            className="input min-w-0 flex-1 rounded px-1.5 py-1 text-xs"
          >
            {moves.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL_LO[s]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="btn-secondary rounded px-2 py-1 text-xs"
          >
            ຍ້າຍ
          </button>
        </ActionForm>
      )}

      {/* ປິດວຽກຕ້ອງມີວິທີແກ້ + ຫຼັກຖານ ຈຶ່ງສົ່ງໄປເຮັດຢູ່ໜ້າ ticket */}
      {editable && mayResolve && (
        <Link
          href={`/tickets/${ticket.id}`}
          className="btn-secondary mt-1.5 block rounded px-2 py-1 text-center text-xs"
        >
          ບັນທຶກການແກ້ໄຂ →
        </Link>
      )}
    </article>
  )
}

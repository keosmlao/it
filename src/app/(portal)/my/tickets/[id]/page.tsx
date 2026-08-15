import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth/session'
import { getComments, getTicket } from '@/lib/tickets/queries'
import { listAttachments } from '@/lib/tickets/attachments'
import { getTicketRating } from '@/lib/tickets/ratings'
import { STATUS_LABEL_LO, STATUS_STYLE } from '@/lib/tickets/model'
import { formatDateTime } from '@/lib/format'
import ActionForm, { SubmitButton } from '@/components/action-form'
import { addComment } from '@/app/(app)/tickets/actions'
import RatingForm from './rating-form'

export default async function MyTicketPage({ params }: PageProps<'/my/tickets/[id]'>) {
  const { id } = await params
  const user = await requireUser()

  // getTicket ຈຳກັດຂອບເຂດຢູ່ແລ້ວ — ຜູ້ແຈ້ງເຫັນສະເພາະເລື່ອງຂອງຕົນ
  const ticket = await getTicket(user, id)
  if (!ticket) notFound()

  const [comments, attachments, rating] = await Promise.all([
    getComments(id, user.is_it_staff),
    listAttachments(id),
    getTicketRating(id),
  ])

  // ໃຫ້ຄະແນນໄດ້ຫຼັງເລື່ອງຈົບ ແລະ ສະເພາະຜູ້ແຈ້ງເອງ (server action ກວດຊໍ້າອີກ)
  const canRate =
    (ticket.status === 'resolved' || ticket.status === 'closed') &&
    ticket.requester_employee_id === user.employee_id

  const evidence = attachments.filter((a) => a.kind === 'evidence')
  const reportImages = attachments.filter((a) => a.kind !== 'evidence')

  return (
    <div>
      <Link
        href="/my/tickets"
        className="text-sm text-muted underline-offset-2 hover:underline"
      >
        ← ກັບໄປລາຍການ
      </Link>

      <header className="mt-2">
        <p className="font-mono text-sm text-muted">{ticket.ticket_no}</p>
        <h1 className="text-xl font-semibold text-fg">{ticket.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[ticket.status]}`}
          >
            {STATUS_LABEL_LO[ticket.status]}
          </span>
          <span>
            {ticket.category_name_lo} · ແຈ້ງເມື່ອ {formatDateTime(ticket.created_at)}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted">
          ຜູ້ຮັບຜິດຊອບ:{' '}
          {ticket.assignee_name ?? <span className="text-faint">ລໍທີມໄອທີຮັບເລື່ອງ</span>}
        </p>
      </header>

      {ticket.description && (
        <section className="glass-card mt-4 rounded-xl p-4">
          <h2 className="mb-2 text-sm font-semibold text-fg">ລາຍລະອຽດທີ່ແຈ້ງ</h2>
          <p className="whitespace-pre-wrap text-body">{ticket.description}</p>
        </section>
      )}

      {reportImages.length > 0 && (
        <section className="glass-card mt-4 rounded-xl p-4">
          <h2 className="mb-2 text-sm font-semibold text-fg">ຮູບບັນຫາ</h2>
          <ImageGrid items={reportImages} />
        </section>
      )}

      {ticket.resolution && (
        <section className="mt-4 rounded-xl bg-emerald-50 p-4 dark:bg-emerald-950/40">
          <h2 className="mb-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
            ວິທີແກ້ໄຂ
          </h2>
          <p className="whitespace-pre-wrap text-body">{ticket.resolution}</p>
          {evidence.length > 0 && (
            <div className="mt-3">
              <p className="mb-2 text-xs text-muted">ຮູບຫຼັກຖານການແກ້ໄຂ</p>
              <ImageGrid items={evidence} />
            </div>
          )}
        </section>
      )}

      {canRate && <RatingForm ticketId={ticket.id} current={rating} />}

      <section className="glass-card mt-4 rounded-xl">
        <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-fg">
          ຄວາມຄືບໜ້າ
        </h2>

        <ul className="divide-y divide-line">
          {comments.map((c) => (
            <li key={c.id} className="px-4 py-3">
              <p className="text-xs text-muted">
                {c.author_nickname ?? c.author_name} · {formatDateTime(c.created_at)}
              </p>
              <p
                className={`mt-0.5 whitespace-pre-wrap ${
                  c.kind === 'system' ? 'text-sm text-muted' : 'text-body'
                }`}
              >
                {c.body}
              </p>
            </li>
          ))}

          {comments.length === 0 && (
            <li className="px-4 py-8 text-center text-muted">ຍັງບໍ່ມີຄວາມຄືບໜ້າ</li>
          )}
        </ul>

        {!ticket.is_finished && (
          <div className="border-t border-line p-4">
            <ActionForm action={addComment}>
              <input type="hidden" name="ticket_id" value={ticket.id} />
              <textarea
                name="body"
                rows={3}
                required
                placeholder="ຕື່ມຂໍ້ມູນ ຫຼື ຖາມຄວາມຄືບໜ້າ…"
                className="input w-full rounded-lg px-3 py-2 text-sm"
              />
              <SubmitButton className="btn-primary mt-2 rounded-lg px-4 py-2 text-sm font-medium">
                ສົ່ງຂໍ້ຄວາມ
              </SubmitButton>
            </ActionForm>
          </div>
        )}
      </section>
    </div>
  )
}

function ImageGrid({
  items,
}: {
  items: { id: string; file_name: string }[]
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((a) => (
        <a
          key={a.id}
          href={`/api/attachments/${a.id}`}
          target="_blank"
          rel="noreferrer"
          className="block overflow-hidden rounded-lg border border-line"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/attachments/${a.id}`}
            alt={a.file_name}
            className="h-28 w-full object-cover"
          />
        </a>
      ))}
    </div>
  )
}

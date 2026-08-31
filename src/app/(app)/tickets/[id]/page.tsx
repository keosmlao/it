import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireModuleView } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { getAssignableStaff, getComments, getTicket } from '@/lib/tickets/queries'
import {
  ALLOWED_TRANSITIONS,
  STATUS_LABEL_LO,
  canClaimTicket,
  canEditTicket,
} from '@/lib/tickets/model'
import { OverdueBadge, PriorityBadge, StatusBadge } from '@/components/badge'
import ActionForm, { SubmitButton } from '@/components/action-form'
import { formatDateTime, formatDeadline } from '@/lib/format'
import ImagePicker from '@/components/image-picker'
import AttachmentGallery from '@/components/attachment-gallery'
import { listAttachments } from '@/lib/tickets/attachments'
import { addAttachments, addComment, assignTicket } from '../actions'
import StatusForm from './status-form'
import TicketSteps from './steps'
import DeleteTicketButton from '../delete-button'

export default async function TicketDetailPage({
  params,
}: PageProps<'/tickets/[id]'>) {
  const { id } = await params
  const user = await requireModuleView('tickets')

  const ticket = await getTicket(user, id)
  if (!ticket) notFound()

  const [comments, staff, attachments] = await Promise.all([
    getComments(ticket.id),
    can.assignWork(user) ? getAssignableStaff(user) : Promise.resolve([]),
    listAttachments(ticket.id),
  ])

  const reportImages = attachments.filter((a) => a.kind === 'report')
  const evidenceImages = attachments.filter((a) => a.kind === 'evidence')

  const editable = canEditTicket(user, ticket)
  const showAssignee =
    !ticket.is_finished && (can.assignWork(user) || canClaimTicket(user, ticket))
  // "ມອບໝາຍແລ້ວ" ຕັ້ງເອງບໍ່ໄດ້ — ມາຈາກການເລືອກຜູ້ຮັບຜິດຊອບເທົ່ານັ້ນ
  const transitions = (ALLOWED_TRANSITIONS[ticket.status] ?? []).filter(
    (s) => s !== 'assigned' || ticket.assignee_employee_id !== null
  )
  const respond = formatDeadline(
    ticket.first_responded_at ? null : ticket.sla_respond_due_at
  )
  const resolve = formatDeadline(ticket.is_finished ? null : ticket.sla_resolve_due_at)

  return (
    <div className="w-full">
      <Link
        href="/tickets"
        className="text-sm text-muted underline-offset-2 hover:underline"
      >
        ← ກັບໄປລາຍການ ticket
      </Link>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-sm text-muted">
            {ticket.ticket_no}
          </p>
          <h1 className="text-2xl font-semibold text-fg">
            {ticket.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={ticket.status} />
            <PriorityBadge
              priority={ticket.priority}
              label={ticket.priority_name_lo}
            />
            <span className="text-sm text-muted">
              {ticket.category_name_lo}
            </span>
            {ticket.respond_overdue && <OverdueBadge>ຕອບຊ້າ</OverdueBadge>}
            {ticket.resolve_overdue && <OverdueBadge>ແກ້ໄຂຊ້າ</OverdueBadge>}
          </div>
        </div>
      </header>

      <TicketSteps status={ticket.status} showHint={editable} />

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_18rem]">
        <div className="min-w-0">
          <Card title="ລາຍລະອຽດ">
            <p className="whitespace-pre-wrap text-body">
              {ticket.description || '— ບໍ່ມີລາຍລະອຽດ —'}
            </p>
          </Card>

          <Card title={`ຮູບບັນຫາ (${reportImages.length})`} className="mt-4">
            <AttachmentGallery
              attachments={reportImages}
              emptyText="ບໍ່ມີຮູບແນບຕອນແຈ້ງ"
            />

            <ActionForm
              action={addAttachments}
              className="mt-4 border-t border-line pt-4"
            >
              <input type="hidden" name="ticket_id" value={ticket.id} />
              <input type="hidden" name="kind" value="report" />
              <ImagePicker label="ເພີ່ມຮູບບັນຫາ" />
              <SubmitButton
                pendingLabel="ກຳລັງອັບໂຫລດ…"
                className="btn-secondary mt-3 rounded px-3 py-1.5 text-[13px]"
              >
                ອັບໂຫລດ
              </SubmitButton>
            </ActionForm>
          </Card>

          {/*
            ຫຼັກຖານແນບຢູ່ບ່ອນດຽວ — ໃນຂັ້ນຕອນປິດວຽກຂ້າງຂວາ
            ເມື່ອກ່ອນມີຟອມອັບໂຫລດຢູ່ນີ້ອີກອັນ ເຮັດວຽກຢ່າງດຽວກັນກັບຢູ່ນັ້ນ
            ຄົນຈຶ່ງບໍ່ຮູ້ວ່າຄວນໃຊ້ອັນໃດ ແລະ ມັກອັບສອງເທື່ອ
          */}
          <Card
            title={`ຮູບຫຼັກຖານການແກ້ໄຂ (${evidenceImages.length})`}
            className="mt-4"
          >
            <AttachmentGallery
              attachments={evidenceImages}
              emptyText={
                editable
                  ? `ຍັງບໍ່ມີຫຼັກຖານ — ແນບຕອນກົດ “${STATUS_LABEL_LO.resolved}” ຢູ່ກ່ອງຂັ້ນຕອນຂ້າງຂວາ`
                  : 'ຍັງບໍ່ມີຫຼັກຖານ'
              }
            />
          </Card>

          {ticket.resolution && (
            <Card
              title={
                ticket.status === 'unrepairable'
                  ? 'ເຫດຜົນທີ່ສ້ອມບໍ່ໄດ້'
                  : 'ວິທີແກ້ໄຂ'
              }
              className="mt-4"
            >
              <p className="whitespace-pre-wrap text-body">
                {ticket.resolution}
              </p>
            </Card>
          )}

          <Card title={`ການເຄື່ອນໄຫວ (${comments.length})`} className="mt-4">
            <ol className="space-y-4">
              {comments.map((c) => (
                <li key={c.id} className="flex gap-3">
                  <span
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${
                      c.kind === 'comment'
                        ? 'bg-brand-blue'
                        : 'bg-brand-blue/30'
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-xs text-muted">
                      {c.author_nickname ?? c.author_name} ·{' '}
                      {formatDateTime(c.created_at)}
                      {c.is_internal && (
                        <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          ພາຍໃນ
                        </span>
                      )}
                    </p>
                    <p
                      className={`whitespace-pre-wrap ${
                        c.kind === 'comment'
                          ? 'text-body'
                          : 'text-sm text-muted'
                      }`}
                    >
                      {c.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <ActionForm
              action={addComment}
              className="mt-5 border-t border-line pt-4"
            >
              <input type="hidden" name="ticket_id" value={ticket.id} />
              <textarea
                name="body"
                rows={3}
                required
                placeholder="ຂຽນຄວາມຄືບໜ້າ ຫຼື ບັນທຶກການແກ້ໄຂ…"
                className="input w-full rounded-lg px-3 py-2"
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm text-muted">
                  <input type="checkbox" name="is_internal" className="size-4" />
                  ບັນທຶກພາຍໃນ
                </label>
                <SubmitButton className="btn-primary rounded px-3 py-1.5 text-[13px] font-medium">
                  ບັນທຶກ
                </SubmitButton>
              </div>
            </ActionForm>
          </Card>
        </div>

        {/*
          ຮຽງກ່ອງຂ້າງຕາມລຳດັບການລົງມື: ເຮັດຫຍັງຕໍ່ → ໃຜເຮັດ → ຕ້ອງແລ້ວເມື່ອໃດ
          → ຂໍ້ມູນປະກອບ. ເມື່ອກ່ອນປຸ່ມປ່ຽນສະຖານະຢູ່ລຸ່ມສຸດ ຕ້ອງເລື່ອນຫາທຸກເທື່ອ
        */}
        <aside className="space-y-4">
          {editable && transitions.length > 0 && (
            <Card title="ຂັ້ນຕອນຕໍ່ໄປ">
              <StatusForm
                ticketId={ticket.id}
                transitions={transitions}
                currentResolution={ticket.resolution}
                evidenceCount={evidenceImages.length}
              />
            </Card>
          )}

          {showAssignee && (
            <Card title="ຜູ້ຮັບຜິດຊອບ">
              {/*
                ມີເຈົ້າພາບແລ້ວ = ບອກຊື່ພໍ ບໍ່ຕ້ອງໃຫ້ມອບໝາຍຊໍ້າອີກ.
                ການປ່ຽນຜູ້ຮັບຜິດຊອບເປັນເລື່ອງນານໆເທື່ອ ຈຶ່ງພັບໄວ້ໃຫ້ກົດເປີດເອົາ
              */}
              {ticket.assignee_employee_id ? (
                <>
                  <p className="text-sm font-medium text-fg">
                    {ticket.assignee_name}
                  </p>

                  {can.assignWork(user) && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-brand-blue underline-offset-2 hover:underline">
                        ປ່ຽນຜູ້ຮັບຜິດຊອບ
                      </summary>
                      <div className="mt-2">
                        <AssignForm
                          ticketId={ticket.id}
                          staff={staff}
                          current={ticket.assignee_employee_id}
                          label="ບັນທຶກການປ່ຽນ"
                        />
                      </div>
                    </details>
                  )}

                  {canClaimTicket(user, ticket) && !can.assignWork(user) && (
                    <ClaimForm ticketId={ticket.id} employeeId={user.employee_id} />
                  )}
                </>
              ) : can.assignWork(user) ? (
                <AssignForm
                  ticketId={ticket.id}
                  staff={staff}
                  current={null}
                  label="ມອບໝາຍ"
                />
              ) : (
                <ClaimForm ticketId={ticket.id} employeeId={user.employee_id} />
              )}
            </Card>
          )}

          <Card title="SLA">
            <Row
              label="ຕອບກັບ"
              value={
                ticket.first_responded_at
                  ? formatDateTime(ticket.first_responded_at)
                  : respond.text
              }
              danger={!ticket.first_responded_at && respond.overdue}
            />
            <Row
              label="ກຳນົດແກ້ໄຂ"
              value={
                ticket.is_finished
                  ? formatDateTime(ticket.resolved_at)
                  : resolve.text
              }
              danger={!ticket.is_finished && resolve.overdue}
            />
          </Card>

          <Card title="ຂໍ້ມູນ">
            <Row label="ຜູ້ແຈ້ງ" value={ticket.requester_name} />
            <Row label="ພະແນກ" value={ticket.requester_department_name ?? '—'} />
            {/* ກ່ອງ "ຜູ້ຮັບຜິດຊອບ" ຂ້າງເທິງບອກຢູ່ແລ້ວ — ບອກຢູ່ນີ້ອີກກໍຊໍ້າ */}
            {!showAssignee && (
              <Row
                label="ຜູ້ຮັບຜິດຊອບ"
                value={ticket.assignee_name ?? 'ຍັງບໍ່ມອບໝາຍ'}
              />
            )}
            <Row label="ໜ່ວຍງານ" value={ticket.unit_name_lo ?? '—'} />
            <Row label="ແຈ້ງເມື່ອ" value={formatDateTime(ticket.created_at)} />
          </Card>

          {/*
            ລຶບໄວ້ລຸ່ມສຸດ ແລະ ໃຫ້ສະເພາະຜູ້ຈັດການ — ໃຊ້ກັບອັນທີ່ພິມຜິດ ຫຼື ຊໍ້າ.
            ວຽກທີ່ບໍ່ຕ້ອງເຮັດແລ້ວໃຫ້ໃຊ້ສະຖານະ "ຍົກເລີກ" ຈຶ່ງຍັງນັບໃນລາຍງານໄດ້
          */}
          {can.administer(user) && (
            <div className="flex justify-end">
              <DeleteTicketButton
                ticketId={ticket.id}
                ticketNo={ticket.ticket_no}
              />
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

type AssignableStaff = {
  employee_id: number
  fullname_lo: string
  nickname: string | null
}

function AssignForm({
  ticketId,
  staff,
  current,
  label,
}: {
  ticketId: string
  staff: AssignableStaff[]
  current: number | null
  label: string
}) {
  return (
    <ActionForm action={assignTicket} className="space-y-2">
      <input type="hidden" name="ticket_id" value={ticketId} />
      <select
        name="assignee_employee_id"
        defaultValue={current ?? ''}
        className="input w-full rounded px-2 py-1 text-[13px]"
      >
        <option value="">— ຍັງບໍ່ມອບໝາຍ —</option>
        {staff.map((s) => (
          <option key={s.employee_id} value={s.employee_id}>
            {s.fullname_lo}
            {s.nickname ? ` (${s.nickname})` : ''}
          </option>
        ))}
      </select>
      <SubmitButton className="btn-secondary w-full rounded px-3 py-1.5 text-[13px]">
        {label}
      </SubmitButton>
    </ActionForm>
  )
}

function ClaimForm({
  ticketId,
  employeeId,
}: {
  ticketId: string
  employeeId: number
}) {
  return (
    <ActionForm action={assignTicket} className="mt-2">
      <input type="hidden" name="ticket_id" value={ticketId} />
      <input type="hidden" name="assignee_employee_id" value={employeeId} />
      <SubmitButton className="btn-secondary w-full rounded px-3 py-1.5 text-[13px] font-medium">
        ຮັບວຽກນີ້ມາເຮັດ
      </SubmitButton>
    </ActionForm>
  )
}

function Card({
  title,
  children,
  className = '',
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={`glass-card rounded-xl p-4 ${className}`}
    >
      <h2 className="mb-3 text-sm font-semibold text-fg">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Row({
  label,
  value,
  danger = false,
}: {
  label: string
  value: string
  danger?: boolean
}) {
  return (
    <div className="flex justify-between gap-3 py-1 text-sm">
      <span className="text-muted">{label}</span>
      <span
        className={`text-right ${
          danger
            ? 'font-medium text-red-600 dark:text-red-400'
            : 'text-body'
        }`}
      >
        {value}
      </span>
    </div>
  )
}

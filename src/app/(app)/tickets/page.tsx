import Link from 'next/link'
import { requireModuleView } from '@/lib/auth/session'
import {
  getCategories,
  getPriorities,
  getTicketStats,
  listTickets,
  paginateTickets,
} from '@/lib/tickets/queries'
import Pagination from '@/components/pagination'
import ExportMenu from '@/components/export-menu'
import EmptyState from '@/components/empty-state'
import FilterForm from '@/components/filter-form'
import TicketBoard from './board'
import DeleteTicketButton from './delete-button'
import { can } from '@/lib/auth/roles'
import { pageNumber } from '@/lib/pagination'
import { OverdueBadge, PriorityBadge, StatusBadge } from '@/components/badge'
import { formatDeadline, formatDateTime } from '@/lib/format'
import { STATUS_LABEL_LO, type TicketRow } from '@/lib/tickets/model'

export const metadata = { title: 'Ticket ແຈ້ງບັນຫາ' }

/** ກະດານສະແດງໄດ້ເທົ່ານີ້ຕໍ່ຄັ້ງ — ຕ້ອງກົງກັບ limit ຂອງ listTickets() */
const BOARD_LIMIT = 200

/**
 * ແຖບກອງ
 *
 * ຢູ່ກະດານເຫຼືອແຕ່ 3 ອັນທຳອິດ ເພາະຖັນຂອງກະດານຄືສະຖານະຢູ່ແລ້ວ —
 * ມີແຖບກອງສະຖານະອີກກໍ່ພຽງເຮັດໃຫ້ຖັນຫວ່າງເປົ່າ ບໍ່ໄດ້ຊ່ວຍຫຍັງ
 *
 * ສ້າງໃນ function ບໍ່ແມ່ນຊັ້ນ module — ຄ່າຈາກ module ອື່ນ (STATUS_LABEL_LO)
 * ຍັງບໍ່ທັນພ້ອມຕອນ module ນີ້ຖືກປະເມີນ ຈະໄດ້ ReferenceError
 */
function ticketViews() {
  return [
    { key: 'all', label: 'ທັງໝົດ', stat: 'total_count', scope: true, params: { status: 'all' } },
    { key: 'mine', label: 'ຂອງຂ້ອຍ', stat: 'mine_count', scope: true, params: { status: 'open', mine: '1' } },
    { key: 'overdue', label: 'ເກີນ SLA', stat: 'overdue_count', scope: true, params: { status: 'all', overdue: '1' } },
    { key: 'open', label: 'ຍັງບໍ່ຈົບ', stat: 'open_count', scope: false, params: { status: 'open' } },
    { key: 'resolved', label: STATUS_LABEL_LO.resolved, stat: 'resolved_count', scope: false, params: { status: 'resolved' } },
    { key: 'closed', label: STATUS_LABEL_LO.closed, stat: 'closed_count', scope: false, params: { status: 'closed' } },
  ] as const
}

export default async function TicketsPage({
  searchParams,
}: PageProps<'/tickets'>) {
  const params = await searchParams
  const user = await requireModuleView('tickets')

  // ກະດານເປັນຄ່າຕັ້ງຕົ້ນ — ຕາຕະລາງໄວ້ຕອນຢາກກວາດຕາເບິ່ງຫຼາຍລາຍການ ຫຼື ດຶງອອກ
  const mode = str(params.view) === 'table' ? 'table' : 'board'

  // ບໍ່ໄດ້ລະບຸ status ມາ = ເອົາສະເພາະທີ່ຍັງບໍ່ຈົບ; 'all' = ເອົາໝົດ
  // (ຢ່າໃຊ້ `|| 'open'` — ຄ່າວ່າງຈາກຟອມຈະຖືກປ່ຽນກັບເປັນ open ແລ້ວເລືອກ "ທັງໝົດ" ບໍ່ໄດ້)
  // ຢູ່ກະດານບໍ່ກອງສະຖານະເລີຍ ເພາະຖັນເປັນຕົວແຍກໃຫ້ແລ້ວ
  const filters = {
    status:
      mode === 'board'
        ? 'all'
        : params.status === undefined
          ? 'open'
          : str(params.status) || 'all',
    priority: str(params.priority),
    category: str(params.category),
    mine: str(params.mine) === '1',
    overdue: str(params.overdue) === '1',
    q: str(params.q),
  }

  const [board, ticketPage, categories, priorities, stats] = await Promise.all([
    mode === 'board'
      ? listTickets(user, filters)
      : Promise.resolve([] as TicketRow[]),
    mode === 'table'
      ? paginateTickets(user, filters, pageNumber(params.page))
      : Promise.resolve(null),
    getCategories(),
    getPriorities(),
    getTicketStats(user),
  ])

  const total = mode === 'board' ? board.length : (ticketPage?.total ?? 0)
  const empty = mode === 'board' ? board.length === 0 : total === 0

  // ອັນທີ່ແຄບກວ່າຊະນະ ຈຶ່ງບໍ່ມີສອງແຖບຮຸ່ງພ້ອມກັນ
  const view = filters.overdue
    ? 'overdue'
    : filters.mine
      ? 'mine'
      : mode === 'board'
        ? 'all'
        : filters.status === 'resolved'
          ? 'resolved'
          : filters.status === 'closed'
            ? 'closed'
            : filters.status === 'all'
              ? 'all'
              : 'open'

  const views = ticketViews()
  const current = views.find((v) => v.key === view) ?? views[0]
  const shownViews = views.filter((v) => mode === 'table' || v.scope)

  /** ລິ້ງແຖບ — ພາຮູບແບບການສະແດງ ແລະ ຕົວກອງທີ່ພິມໄວ້ໄປນຳ */
  const hrefFor = (
    viewParams: Record<string, string>,
    { keepSearch = true, view: nextMode = mode } = {}
  ) => {
    const query = new URLSearchParams(viewParams)
    if (nextMode === 'table') query.set('view', 'table')
    if (keepSearch) {
      if (filters.q) query.set('q', filters.q)
      if (filters.priority) query.set('priority', filters.priority)
      if (filters.category) query.set('category', filters.category)
    }
    return `/tickets?${query}`
  }

  const narrowed = Boolean(filters.q || filters.priority || filters.category)
  const mayDelete = can.administer(user)

  return (
    <div className="w-full">
      <div className="o-page-actions">
        <p className="text-sm text-muted">
          {current.label} · ພົບ {total} ລາຍການ
        </p>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/tickets/new"
            className="btn-primary rounded px-3 py-1.5 text-[13px] font-medium"
          >
            + ແຈ້ງບັນຫາໃໝ່
          </Link>
          <ExportMenu dataset="tickets" />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-1.5">
          {shownViews.map((tab) => {
            const on = tab.key === view
            return (
              <Link
                key={tab.key}
                href={hrefFor(tab.params)}
                aria-current={on ? 'page' : undefined}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm transition ${
                  on
                    ? 'brand-gradient-cool font-medium text-white shadow-[0_6px_16px_#2c6fb640]'
                    : 'btn-secondary hover-surface'
                }`}
              >
                {tab.label}
                <span
                  className={`rounded-full px-1.5 text-xs ${
                    on ? 'bg-white/25' : 'bg-brand-blue/10 text-muted'
                  }`}
                >
                  {stats?.[tab.stat] ?? 0}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* ສະຫຼັບຮູບແບບ — ກະດານໄວ້ເບິ່ງວຽກຄ້າງ, ຕາຕະລາງໄວ້ກວາດຕາ ແລະ ແບ່ງໜ້າ */}
        <nav
          className="flex gap-1 rounded-full p-0.5 glass-subtle"
          aria-label="ຮູບແບບການສະແດງ"
        >
          {(
            [
              { key: 'board', label: 'ກະດານ' },
              { key: 'table', label: 'ຕາຕະລາງ' },
            ] as const
          ).map((option) => {
            const on = option.key === mode
            return (
              <Link
                key={option.key}
                href={hrefFor(current.params, { view: option.key })}
                aria-current={on ? 'page' : undefined}
                className={`rounded-full px-3 py-1 text-sm transition ${
                  on ? 'bg-brand-blue/15 font-medium text-brand-blue' : 'text-muted'
                }`}
              >
                {option.label}
              </Link>
            )
          })}
        </nav>
      </div>

      <FilterForm className="o-filter-bar mt-3">
        {/* ແຖບ ແລະ ຮູບແບບທີ່ເລືອກຢູ່ — ຄ້າງໄວ້ໃນຟອມ ຈຶ່ງກອງແລ້ວບໍ່ເດັ້ງກັບໄປອັນອື່ນ */}
        {mode === 'table' && (
          <input type="hidden" name="view" value="table" />
        )}
        <input type="hidden" name="status" value={current.params.status} />
        {'mine' in current.params && <input type="hidden" name="mine" value="1" />}
        {'overdue' in current.params && (
          <input type="hidden" name="overdue" value="1" />
        )}

        <Field label="ຄົ້ນຫາ">
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="ເລກ ticket, ຫົວຂໍ້, ຜູ້ແຈ້ງ"
            className="input w-52 rounded px-2 py-1 text-[13px]"
          />
        </Field>

        <Field label="ຄວາມດ່ວນ">
          <select
            name="priority"
            defaultValue={filters.priority}
            className="input rounded px-2 py-1 text-[13px]"
          >
            <option value="">ທຸກຄວາມດ່ວນ</option>
            {priorities.map((p) => (
              <option key={p.priority} value={p.priority}>
                {p.name_lo}
              </option>
            ))}
          </select>
        </Field>

        <Field label="ປະເພດ">
          <select
            name="category"
            defaultValue={filters.category}
            className="input rounded px-2 py-1 text-[13px]"
          >
            <option value="">ທຸກປະເພດ</option>
            {categories.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name_lo}
              </option>
            ))}
          </select>
        </Field>

        <button
          type="submit"
          className="btn-secondary rounded px-3 py-1.5 text-[13px]"
        >
          ຄົ້ນຫາ
        </button>

        {narrowed && (
          <Link
            href={hrefFor(current.params, { keepSearch: false })}
            className="pb-1.5 text-sm text-brand-blue underline-offset-2 hover:underline"
          >
            ລ້າງຕົວກອງ
          </Link>
        )}
      </FilterForm>

      {empty ? (
        <div className="mt-5">
          <EmptyState
            title={
              narrowed ? 'ບໍ່ພົບ ticket ຕາມທີ່ກອງ' : `ບໍ່ມີ ticket ${current.label}`
            }
            description={
              narrowed
                ? 'ລອງລ້າງຕົວກອງ ຫຼື ປ່ຽນໄປແຖບ "ທັງໝົດ" ເບິ່ງ'
                : 'ເລືອກແຖບອື່ນຂ້າງເທິງ ເພື່ອເບິ່ງລາຍການທີ່ຈົບແລ້ວ'
            }
            action={narrowed ? 'ລ້າງຕົວກອງ' : '+ ແຈ້ງບັນຫາໃໝ່'}
            href={
              narrowed
                ? hrefFor(current.params, { keepSearch: false })
                : '/tickets/new'
            }
          />
        </div>
      ) : mode === 'board' ? (
        <>
          <TicketBoard tickets={board} user={user} />
          {board.length >= BOARD_LIMIT && (
            <p className="mt-2 text-xs text-muted">
              ກະດານສະແດງໄດ້ {BOARD_LIMIT} ລາຍການຕໍ່ຄັ້ງ — ໃຊ້ຕົວກອງໃຫ້ແຄບລົງ ຫຼື
              ສະຫຼັບເປັນຕາຕະລາງເພື່ອເບິ່ງໃຫ້ຄົບ
            </p>
          )}
        </>
      ) : (
        <>
          <div className="o-list-wrap mt-3 overflow-x-auto">
            <table className="o-list w-full text-[13px]">
              <thead className="border-b border-line text-left text-muted">
                <tr>
                  <th className="px-3 py-1.5 font-medium">ເລກທີ</th>
                  <th className="px-3 py-1.5 font-medium">ຫົວຂໍ້</th>
                  <th className="hidden px-3 py-1.5 font-medium lg:table-cell">
                    ຜູ້ແຈ້ງ
                  </th>
                  <th className="hidden px-3 py-1.5 font-medium md:table-cell">
                    ຜູ້ຮັບຜິດຊອບ
                  </th>
                  <th className="px-3 py-1.5 font-medium">ສະຖານະ</th>
                  <th className="px-3 py-1.5 font-medium">ກຳນົດແກ້ໄຂ</th>
                  {mayDelete && (
                    <th className="px-3 py-1.5 font-medium">
                      <span className="sr-only">ຈັດການ</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {ticketPage?.items.map((t) => {
                  const deadline = formatDeadline(
                    t.is_finished ? null : t.sla_resolve_due_at
                  )

                  return (
                    <tr key={t.id} className="transition hover-surface">
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        <Link
                          href={`/tickets/${t.id}`}
                          className="font-medium text-fg underline-offset-2 hover:underline"
                        >
                          {t.ticket_no}
                        </Link>
                      </td>
                      <td className="px-3 py-1.5">
                        <Link
                          href={`/tickets/${t.id}`}
                          className="hover:underline"
                        >
                          <span className="text-fg">{t.title}</span>
                        </Link>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <PriorityBadge
                            priority={t.priority}
                            label={t.priority_name_lo}
                          />
                          <span className="text-xs text-muted">
                            {t.category_name_lo}
                          </span>
                          {/* ຖັນທີ່ເຊື່ອງຢູ່ຈໍນ້ອຍ — ຍ້າຍລົງມາຢູ່ນີ້ແທນ */}
                          <span className="text-xs text-muted lg:hidden">
                            · {t.requester_name}
                          </span>
                          <span className="text-xs text-muted md:hidden">
                            · {t.assignee_name ?? 'ຍັງບໍ່ມອບໝາຍ'}
                          </span>
                        </div>
                      </td>
                      <td className="hidden px-3 py-1.5 text-body lg:table-cell">
                        {t.requester_name}
                        <div className="text-xs text-muted">
                          {t.requester_department_name ?? '—'}
                        </div>
                      </td>
                      <td className="hidden px-3 py-1.5 text-body md:table-cell">
                        {t.assignee_name ?? (
                          <span className="text-faint">ຍັງບໍ່ມອບໝາຍ</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        {t.is_finished ? (
                          <span className="text-xs text-muted">
                            {formatDateTime(t.resolved_at)}
                          </span>
                        ) : deadline.overdue ? (
                          <OverdueBadge>{deadline.text}</OverdueBadge>
                        ) : (
                          <span className="text-xs text-muted">
                            {deadline.text}
                          </span>
                        )}
                      </td>
                      {mayDelete && (
                        <td className="px-3 py-1.5 text-right whitespace-nowrap">
                          <DeleteTicketButton
                            ticketId={t.id}
                            ticketNo={t.ticket_no}
                          />
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {ticketPage && <Pagination {...ticketPage} query={params} />}
        </>
      )}
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted">
      {label}
      {children}
    </label>
  )
}

function str(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

import Link from 'next/link'
import { requireUser } from '@/lib/auth/session'
import {
  getCategories,
  getPriorities,
  getTicketStats,
  paginateTickets,
} from '@/lib/tickets/queries'
import Pagination from '@/components/pagination'
import { pageNumber } from '@/lib/pagination'
import { OverdueBadge, PriorityBadge, StatusBadge } from '@/components/badge'
import { formatDeadline, formatDateTime } from '@/lib/format'
import { STATUS_LABEL_LO, TICKET_STATUSES } from '@/lib/tickets/model'

export const metadata = { title: 'Ticket ແຈ້ງບັນຫາ' }

export default async function TicketsPage({
  searchParams,
}: PageProps<'/tickets'>) {
  const params = await searchParams
  const user = await requireUser()

  // ບໍ່ໄດ້ລະບຸ status ມາ = ເອົາສະເພາະທີ່ຍັງບໍ່ຈົບ; 'all' = ເອົາໝົດ
  // (ຢ່າໃຊ້ `|| 'open'` — ຄ່າວ່າງຈາກຟອມຈະຖືກປ່ຽນກັບເປັນ open ແລ້ວເລືອກ "ທັງໝົດ" ບໍ່ໄດ້)
  const filters = {
    status: params.status === undefined ? 'open' : str(params.status) || 'all',
    priority: str(params.priority),
    category: str(params.category),
    mine: str(params.mine) === '1',
    overdue: str(params.overdue) === '1',
    q: str(params.q),
  }

  const [ticketPage, categories, priorities, stats] = await Promise.all([
    paginateTickets(user, filters, pageNumber(params.page)),
    getCategories(),
    getPriorities(),
    getTicketStats(user),
  ])
  const tickets = ticketPage.items

  const tabs = [
    { label: 'ຍັງບໍ່ຈົບ', href: '/tickets', count: stats?.open_count, on: filters.status === 'open' && !filters.mine && !filters.overdue },
    { label: 'ຂອງຂ້ອຍ', href: '/tickets?status=open&mine=1', count: stats?.mine_count, on: filters.mine },
    { label: 'ເກີນ SLA', href: '/tickets?status=all&overdue=1', count: stats?.overdue_count, on: filters.overdue },
    { label: 'ແກ້ໄຂແລ້ວ', href: '/tickets?status=resolved', count: stats?.resolved_count, on: filters.status === 'resolved' },
    { label: 'ປິດແລ້ວ', href: '/tickets?status=closed', count: stats?.closed_count, on: filters.status === 'closed' },
    { label: 'ທັງໝົດ', href: '/tickets?status=all', count: stats?.total_count, on: filters.status === 'all' && !filters.overdue },
  ]

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="mt-1 text-sm text-muted">
            ພົບ {ticketPage.total} ລາຍການ
          </p>
        </div>

        <Link
          href="/tickets/new"
          className="btn-primary rounded-lg px-4 py-2 text-sm font-medium"
        >
          + ແຈ້ງບັນຫາໃໝ່
        </Link>
      </div>

      <nav className="mt-4 flex flex-wrap gap-1.5">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            aria-current={tab.on ? 'page' : undefined}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm transition ${
              tab.on
                ? 'brand-gradient-cool font-medium text-white shadow-[0_6px_16px_#2c6fb640]'
                : 'btn-secondary hover-surface'
            }`}
          >
            {tab.label}
            <span
              className={`rounded-full px-1.5 text-xs ${
                tab.on ? 'bg-white/25' : 'bg-brand-blue/10 text-muted'
              }`}
            >
              {tab.count ?? 0}
            </span>
          </Link>
        ))}
      </nav>

      <form
        className="mt-5 flex flex-wrap items-end gap-3 glass-card rounded-xl p-4"
        role="search"
      >
        <Field label="ຄົ້ນຫາ">
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="ເລກ ticket, ຫົວຂໍ້, ຜູ້ແຈ້ງ"
            className="input w-52 rounded-lg px-3 py-1.5 text-sm"
          />
        </Field>

        <Field label="ສະຖານະ">
          <select
            name="status"
            defaultValue={filters.status}
            className="input rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="open">ຍັງບໍ່ຈົບ</option>
            <option value="all">ທັງໝົດ</option>
            {TICKET_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL_LO[s]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="ຄວາມດ່ວນ">
          <select
            name="priority"
            defaultValue={filters.priority}
            className="input rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="">ທັງໝົດ</option>
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
            className="input rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="">ທັງໝົດ</option>
            {categories.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name_lo}
              </option>
            ))}
          </select>
        </Field>

        <label className="flex items-center gap-2 pb-1.5 text-sm text-body">
          <input
            type="checkbox"
            name="mine"
            value="1"
            defaultChecked={filters.mine}
            className="size-4"
          />
          ຂອງຂ້ອຍ
        </label>

        <label className="flex items-center gap-2 pb-1.5 text-sm text-body">
          <input
            type="checkbox"
            name="overdue"
            value="1"
            defaultChecked={filters.overdue}
            className="size-4"
          />
          ເກີນ SLA
        </label>

        <button
          type="submit"
          className="btn-secondary rounded-lg px-4 py-1.5 text-sm"
        >
          ກັ່ນຕອງ
        </button>
      </form>

      <div className="mt-5 overflow-x-auto glass-card rounded-xl">
        <table className="w-full text-sm">
          <thead className="border-b border-line text-left text-muted">
            <tr>
              <th className="px-4 py-2.5 font-medium">ເລກທີ</th>
              <th className="px-4 py-2.5 font-medium">ຫົວຂໍ້</th>
              <th className="px-4 py-2.5 font-medium">ຜູ້ແຈ້ງ</th>
              <th className="px-4 py-2.5 font-medium">ຜູ້ຮັບຜິດຊອບ</th>
              <th className="px-4 py-2.5 font-medium">ສະຖານະ</th>
              <th className="px-4 py-2.5 font-medium">ກຳນົດແກ້ໄຂ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {tickets.map((t) => {
              const deadline = formatDeadline(
                t.is_finished ? null : t.sla_resolve_due_at
              )

              return (
                <tr
                  key={t.id}
                  className="transition hover-surface"
                >
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <Link
                      href={`/tickets/${t.id}`}
                      className="font-medium text-fg underline-offset-2 hover:underline"
                    >
                      {t.ticket_no}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <Link href={`/tickets/${t.id}`} className="hover:underline">
                      <span className="text-fg">
                        {t.title}
                      </span>
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <PriorityBadge
                        priority={t.priority}
                        label={t.priority_name_lo}
                      />
                      <span className="text-xs text-muted">
                        {t.category_name_lo}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-body">
                    {t.requester_name}
                    <div className="text-xs text-muted">
                      {t.requester_department_name ?? '—'}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-body">
                    {t.assignee_name ?? (
                      <span className="text-faint">ຍັງບໍ່ມອບໝາຍ</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
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
                </tr>
              )
            })}

            {tickets.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-muted"
                >
                  ບໍ່ພົບ ticket ຕາມເງື່ອນໄຂທີ່ເລືອກ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination {...ticketPage} query={params} />
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

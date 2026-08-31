import Link from 'next/link'
import { requireUser } from '@/lib/auth/session'
import { listTickets } from '@/lib/tickets/queries'
import { STATUS_LABEL_LO, STATUS_STYLE } from '@/lib/tickets/model'
import { formatDateTime } from '@/lib/format'

export const metadata = { title: 'ເລື່ອງທີ່ແຈ້ງໄວ້' }

export default async function MyTicketsPage({
  searchParams,
}: PageProps<'/my/tickets'>) {
  const params = await searchParams
  const user = await requireUser()

  const status = params.status === undefined ? 'open' : pick(params.status) || 'all'
  const tickets = await listTickets(user, { status })

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-fg">ເລື່ອງທີ່ທ່ານແຈ້ງໄວ້</h1>
        <Link
          href="/my/tickets/new"
          className="btn-primary rounded px-3 py-1.5 text-[13px] font-medium"
        >
          + ແຈ້ງບັນຫາ
        </Link>
      </div>

      <nav className="mt-4 flex flex-wrap gap-1.5">
        {[
          { label: 'ຍັງບໍ່ຈົບ', href: '/my/tickets', on: status === 'open' },
          { label: 'ທັງໝົດ', href: '/my/tickets?status=all', on: status === 'all' },
          {
            label: 'ແກ້ໄຂແລ້ວ',
            href: '/my/tickets?status=resolved',
            on: status === 'resolved',
          },
        ].map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            aria-current={tab.on ? 'page' : undefined}
            className={`rounded-full px-3.5 py-1.5 text-sm transition ${
              tab.on
                ? 'brand-gradient-cool font-medium text-white'
                : 'btn-secondary hover-surface'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className="glass-card mt-4 divide-y divide-line rounded-xl">
        {tickets.map((t) => (
          <Link
            key={t.id}
            href={`/my/tickets/${t.id}`}
            className="hover-surface flex flex-wrap items-center gap-3 px-4 py-3 transition"
          >
            <span className="font-mono text-xs text-muted">{t.ticket_no}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-fg">{t.title}</span>
              <span className="text-xs text-muted">
                {t.category_name_lo} · ແຈ້ງເມື່ອ {formatDateTime(t.created_at)}
                {t.assignee_name && ` · ຮັບຜິດຊອບໂດຍ ${t.assignee_name}`}
              </span>
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[t.status]}`}
            >
              {STATUS_LABEL_LO[t.status]}
            </span>
          </Link>
        ))}

        {tickets.length === 0 && (
          <p className="px-4 py-10 text-center text-muted">
            ບໍ່ມີເລື່ອງຕາມເງື່ອນໄຂທີ່ເລືອກ
          </p>
        )}
      </div>
    </div>
  )
}

function pick(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

import Link from 'next/link'
import { requireUser } from '@/lib/auth/session'
import { listTickets } from '@/lib/tickets/queries'
import { STATUS_LABEL_LO, STATUS_STYLE } from '@/lib/tickets/model'
import { formatDateTime } from '@/lib/format'

export const metadata = { title: 'ບໍລິການໄອທີ' }

export default async function MyHomePage() {
  const user = await requireUser()
  const tickets = await listTickets(user, { status: 'all' })

  const open = tickets.filter((t) => !t.is_finished)
  const recent = tickets.slice(0, 5)

  return (
    <div>
      <section className="brand-gradient-warm rounded-2xl p-6 text-white">
        <h1 className="text-xl font-semibold">ສະບາຍດີ {user.fullname_lo}</h1>
        <p className="mt-1 text-sm opacity-90">
          ຄອມພິວເຕີ, ເຄື່ອງພິມ, ອິນເຕີເນັດ ຫຼື ລະບົບມີບັນຫາ — ແຈ້ງໄດ້ຢູ່ນີ້
          ທີມໄອທີຈະຮັບເລື່ອງ ແລະ ທ່ານຕິດຕາມຄວາມຄືບໜ້າໄດ້ເອງ
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/my/tickets/new"
            className="rounded-lg bg-white/20 px-5 py-2.5 text-sm font-medium transition hover:bg-white/30"
          >
            + ແຈ້ງບັນຫາ
          </Link>
          <Link
            href="/my/kb"
            className="rounded-lg bg-white/10 px-5 py-2.5 text-sm transition hover:bg-white/20"
          >
            ລອງແກ້ເອງກ່ອນ →
          </Link>
        </div>
      </section>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <Stat label="ກຳລັງດຳເນີນການ" value={open.length} highlight />
        <Stat label="ແຈ້ງທັງໝົດ" value={tickets.length} />
        <Stat
          label="ແກ້ໄຂແລ້ວ"
          value={tickets.filter((t) => t.is_finished).length}
        />
      </div>

      <section className="glass-card mt-5 rounded-xl">
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-fg">ເລື່ອງລ່າສຸດຂອງທ່ານ</h2>
          <Link href="/my/tickets" className="text-sm text-muted hover:underline">
            ເບິ່ງທັງໝົດ →
          </Link>
        </header>

        <ul className="divide-y divide-line">
          {recent.map((t) => (
            <li key={t.id}>
              <Link
                href={`/my/tickets/${t.id}`}
                className="hover-surface flex flex-wrap items-center gap-3 px-4 py-3 transition"
              >
                <span className="font-mono text-xs text-muted">{t.ticket_no}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-fg">{t.title}</span>
                  <span className="text-xs text-muted">
                    {t.category_name_lo} · {formatDateTime(t.created_at)}
                  </span>
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[t.status]}`}
                >
                  {STATUS_LABEL_LO[t.status]}
                </span>
              </Link>
            </li>
          ))}

          {recent.length === 0 && (
            <li className="px-4 py-10 text-center text-muted">
              ຍັງບໍ່ເຄີຍແຈ້ງບັນຫາ
            </li>
          )}
        </ul>
      </section>
    </div>
  )
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string
  value: number
  highlight?: boolean
}) {
  return (
    <div className="glass-card rounded-xl p-4">
      <p className="text-xs text-muted">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold ${
          highlight ? 'text-brand-orange' : 'text-fg'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

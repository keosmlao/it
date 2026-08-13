import Link from 'next/link'
import { query } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { can, ROLE_LABEL_LO, type ItStaff } from '@/lib/auth/roles'
import { getTicketStats, listTickets } from '@/lib/tickets/queries'
import { getProjectStats } from '@/lib/projects/queries'
import { OverdueBadge, PriorityBadge, StatusBadge } from '@/components/badge'
import { formatDeadline } from '@/lib/format'
import { ICON } from '../nav-config'
import LiveClock from '../live-clock'

export const metadata = { title: 'ພາບລວມ' }

function Icon({ d, className = 'size-[18px]' }: { d: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${className} shrink-0`}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  )
}

export default async function DashboardPage() {
  const user = await requireUser()
  const units = can.visibleUnits(user)

  const [team, stats, projectStats, urgent] = await Promise.all([
    query<ItStaff>(
      `select employee_id, employee_code, fullname_lo, nickname,
              unit_code, unit_name_lo, position_code, position_name_lo, role
         from it.v_it_staff
        where $1::text[] is null or unit_code = any($1::text[])
        order by case role
                   when 'manager' then 1 when 'head' then 2
                   when 'developer' then 3 when 'support' then 4 else 5 end,
                 employee_code`,
      [units]
    ),
    getTicketStats(user),
    getProjectStats(user),
    listTickets(user, { status: 'open' }),
  ])

  const year = new Date().getFullYear()

  return (
    <div className="w-full">
      {/* ---------- Hero ---------- */}
      <section className="brand-gradient-cool relative overflow-hidden rounded-2xl p-6 text-white shadow-[0_20px_50px_#00326030]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] text-white/75 uppercase">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              IT Service Center
            </p>
            <h2 className="mt-2 text-3xl font-bold">ສູນບໍລິຫານວຽກງານໄອທີ</h2>
            <p className="mt-1 text-sm text-white/75">
              ພະແນກໄອທີ · ປີ {year} · ສະບາຍດີ {user.nickname ?? user.fullname_lo}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs backdrop-blur">
              <Icon d={ICON.clock} className="size-3.5" />
              <LiveClock />
            </span>
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs backdrop-blur transition hover:bg-white/25"
            >
              <Icon
                d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6"
                className="size-3.5"
              />
              ຣີເຟຣຊ
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <HeroStat
            label="Ticket ຄ້າງ"
            value={stats?.open_count ?? '0'}
            note="ຍັງບໍ່ໄດ້ແກ້ໄຂ"
            href="/tickets?status=open"
            icon={ICON.ticket}
            tone="bg-white text-brand-blue"
          />
          <HeroStat
            label="ວຽກຂອງຂ້ອຍ"
            value={stats?.mine_count ?? '0'}
            note="ມອບໝາຍໃຫ້ຂ້ອຍ"
            href="/tickets?status=open&mine=1"
            icon={ICON.task}
            tone="bg-brand-sky text-white"
          />
          <HeroStat
            label="ແກ້ໄຂມື້ນີ້"
            value={stats?.resolved_today ?? '0'}
            note="ປິດວຽກໄດ້ໃນມື້ນີ້"
            href="/tickets?status=resolved"
            icon={ICON.chart}
            tone="bg-emerald-500 text-white"
          />
          <HeroStat
            label="ເກີນ SLA"
            value={stats?.overdue_count ?? '0'}
            note={`ວຽກພັດທະນາເກີນກຳນົດ ${projectStats?.overdue_tasks ?? 0}`}
            href="/tickets?overdue=1"
            icon={ICON.clock}
            tone="bg-brand-orange text-white"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Shortcut
            href="/tickets/new"
            label="ແຈ້ງບັນຫາ"
            note="ສ້າງ ticket ໃໝ່"
            icon={ICON.plus}
          />
          <Shortcut
            href="/tasks"
            label="ວຽກຂອງຂ້ອຍ"
            note={`${projectStats?.my_tasks ?? 0} ວຽກຄ້າງ`}
            icon={ICON.task}
          />
          <Shortcut
            href="/worklogs"
            label="ບັນທຶກຊົ່ວໂມງ"
            note="ລົງເວລາເຮັດວຽກ"
            icon={ICON.clock}
          />
          <Shortcut
            href="/projects"
            label="ໂປຣເຈັກ"
            note={`${projectStats?.active_projects ?? 0} ກຳລັງດຳເນີນ`}
            icon={ICON.project}
          />
          <Shortcut
            href="/kb"
            label="ຄັງຄວາມຮູ້"
            note="ວິທີແກ້ບັນຫາ"
            icon={ICON.book}
          />
          {can.viewReports(user) && (
            <Shortcut
              href="/reports"
              label="ລາຍງານ"
              note="KPI ແລະ SLA"
              icon={ICON.chart}
            />
          )}
        </div>
      </section>

      {/* ---------- Ticket ທີ່ຕ້ອງເຮັດ ---------- */}
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-fg">Ticket ທີ່ຕ້ອງເຮັດ</h2>
            <p className="text-xs text-muted">
              {can.viewAllUnits(user)
                ? 'ທັງພະແນກ'
                : (user.unit_name_lo ?? 'ໜ່ວຍງານຕົນເອງ')}
            </p>
          </div>
          <Link
            href="/tickets"
            className="text-sm text-muted underline-offset-2 hover:underline"
          >
            ເບິ່ງທັງໝົດ →
          </Link>
        </div>

        <div className="glass-card divide-line divide-y rounded-xl">
          {urgent.slice(0, 6).map((t) => {
            const deadline = formatDeadline(t.sla_resolve_due_at)

            return (
              <Link
                key={t.id}
                href={`/tickets/${t.id}`}
                className="hover-surface flex flex-wrap items-center gap-3 px-4 py-3 transition"
              >
                <span className="font-mono text-xs text-muted">{t.ticket_no}</span>
                <span className="min-w-0 flex-1 truncate text-fg">{t.title}</span>
                <PriorityBadge priority={t.priority} label={t.priority_name_lo} />
                <StatusBadge status={t.status} />
                {deadline.overdue ? (
                  <OverdueBadge>{deadline.text}</OverdueBadge>
                ) : (
                  <span className="text-xs text-muted">{deadline.text}</span>
                )}
              </Link>
            )
          })}

          {urgent.length === 0 && (
            <p className="px-4 py-8 text-center text-muted">
              ບໍ່ມີ ticket ຄ້າງ — ດີຫຼາຍ 🎉
            </p>
          )}
        </div>
      </section>

      {/* ---------- ທີມງານ ---------- */}
      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold text-fg">
          ທີມງານ ({team.length} ຄົນ)
        </h2>

        <div className="glass-card overflow-x-auto rounded-xl">
          <table className="w-full text-sm">
            <thead className="border-b border-line text-left text-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">ລະຫັດ</th>
                <th className="px-4 py-2.5 font-medium">ຊື່ ແລະ ນາມສະກຸນ</th>
                <th className="px-4 py-2.5 font-medium">ບົດບາດ</th>
                <th className="px-4 py-2.5 font-medium">ໜ່ວຍງານ</th>
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {team.map((member) => (
                <tr key={member.employee_id}>
                  <td className="px-4 py-2.5 text-muted">{member.employee_code}</td>
                  <td className="px-4 py-2.5 text-fg">
                    {member.fullname_lo}
                    {member.nickname && (
                      <span className="text-muted"> ({member.nickname})</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-body">
                    {ROLE_LABEL_LO[member.role]}
                  </td>
                  <td className="px-4 py-2.5 text-body">
                    {member.unit_name_lo ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function HeroStat({
  label,
  value,
  note,
  href,
  icon,
  tone,
}: {
  label: string
  value: string
  note: string
  href: string
  icon: string
  tone: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-xl bg-white/12 p-4 backdrop-blur transition hover:bg-white/20"
    >
      <span className="min-w-0">
        <span className="block text-xs text-white/75">{label}</span>
        <span className="mt-0.5 block text-3xl font-bold tabular-nums">{value}</span>
        <span className="mt-0.5 block truncate text-[11px] text-white/60">{note}</span>
      </span>
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tone}`}
      >
        <Icon d={icon} />
      </span>
    </Link>
  )
}

function Shortcut({
  href,
  label,
  note,
  icon,
}: {
  href: string
  label: string
  note: string
  icon: string
}) {
  return (
    <Link
      href={href}
      className="flex flex-1 items-center gap-2.5 rounded-xl bg-white/12 px-3 py-2.5 backdrop-blur transition hover:bg-white/20"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/20">
        <Icon d={icon} className="size-4" />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-sm font-medium">{label}</span>
        <span className="block truncate text-[11px] text-white/60">{note}</span>
      </span>
      <span className="ml-auto text-white/60">→</span>
    </Link>
  )
}

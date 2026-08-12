import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import {
  projectSummary,
  ticketSummary,
  ticketsByCategory,
  ticketsByMonth,
  ticketsByStaff,
} from '@/lib/reports/queries'
import { summariseHours } from '@/lib/worklogs/queries'
import { formatDuration } from '@/lib/format'
import { ROLE_LABEL_LO, type Role } from '@/lib/auth/roles'
import Link from 'next/link'
import EmptyState from '@/components/empty-state'

export const metadata = { title: 'ລາຍງານ' }

export default async function ReportsPage({ searchParams }: PageProps<'/reports'>) {
  const params = await searchParams
  const user = await requireUser()
  if (!can.viewReports(user)) redirect('/')

  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), 1)
  const from = pick(params.from) || start.toISOString().slice(0, 10)
  const to = pick(params.to) || today.toISOString().slice(0, 10)

  const [summary, byCategory, byStaff, byMonth, projects, hours] = await Promise.all([
    ticketSummary(from, to),
    ticketsByCategory(from, to),
    ticketsByStaff(from, to),
    ticketsByMonth(),
    projectSummary(),
    summariseHours(from, to),
  ])

  const resolved = Number(summary?.resolved ?? 0)
  const slaMet = Number(summary?.sla_met ?? 0)
  const slaRate = resolved ? Math.round((slaMet / resolved) * 100) : 0
  const maxMonth = Math.max(1, ...byMonth.map((m) => Number(m.created)))

  return (
    <div className="w-full">
      <p className="mt-1 text-sm text-muted">
        {from} ຫາ {to}
      </p>

      <form className="mt-5 flex flex-wrap items-end gap-3 glass-card rounded-xl p-4">
        <label className="flex flex-col gap-1 text-xs text-muted">
          ຈາກວັນທີ
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="input rounded-lg px-3 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          ຫາວັນທີ
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="input rounded-lg px-3 py-1.5 text-sm"
          />
        </label>
        <button
          type="submit"
          className="btn-secondary rounded-lg px-4 py-1.5 text-sm"
        >
          ອອກລາຍງານ
        </button>
        <div className="ml-auto flex flex-wrap gap-2">
          {['csv', 'xlsx', 'pdf'].map((format) => (
            <Link key={format} href={`/api/reports/export?format=${format}&from=${from}&to=${to}`}
              className="btn-secondary rounded-lg px-3 py-1.5 text-xs font-semibold uppercase">
              {format === 'xlsx' ? 'Excel' : format}
            </Link>
          ))}
        </div>
      </form>

      <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Ticket ທີ່ແຈ້ງເຂົ້າ" value={summary?.created ?? '0'} />
        <Stat label="ແກ້ໄຂສຳເລັດ" value={String(resolved)} />
        <Stat
          label="ຕາມ SLA"
          value={`${slaRate}%`}
          hint={`${slaMet}/${resolved} ລາຍການ`}
          danger={resolved > 0 && slaRate < 80}
        />
        <Stat
          label="ເວລາແກ້ໄຂສະເລ່ຍ"
          value={
            summary?.avg_resolve_minutes
              ? formatDuration(Number(summary.avg_resolve_minutes))
              : '—'
          }
          hint={
            summary?.avg_respond_minutes
              ? `ຕອບກັບສະເລ່ຍ ${formatDuration(Number(summary.avg_respond_minutes))}`
              : undefined
          }
        />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Ticket ຕໍ່ເດືອນ (12 ເດືອນຫຼ້າສຸດ)">
          {byMonth.length === 0 ? (
            <Empty />
          ) : (
            <ul className="space-y-2">
              {byMonth.map((m) => (
                <li key={m.month} className="flex items-center gap-3">
                  <span className="w-16 shrink-0 text-xs text-muted">
                    {m.month}
                  </span>
                  <span className="h-4 flex-1 overflow-hidden rounded bg-brand-blue/10">
                    <span
                      className="block h-full rounded brand-gradient-cool"
                      style={{
                        width: `${(Number(m.created) / maxMonth) * 100}%`,
                      }}
                    />
                  </span>
                  <span className="w-20 shrink-0 text-right text-xs text-muted">
                    {m.created} / ແກ້ {m.resolved}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="ແຍກຕາມປະເພດບັນຫາ">
          {byCategory.length === 0 ? (
            <Empty />
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-line">
                {byCategory.map((c) => (
                  <tr key={c.category_name_lo}>
                    <td className="py-2 text-body">
                      {c.category_name_lo}
                    </td>
                    <td className="py-2 text-right text-muted">
                      {c.total} ລາຍການ
                    </td>
                    <td className="py-2 text-right text-faint">
                      ແກ້ແລ້ວ {c.resolved}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold text-fg">
          ຜົນງານຕໍ່ພະນັກງານ
        </h2>
        <div className="overflow-x-auto glass-card rounded-xl">
          <table className="w-full text-sm">
            <thead className="border-b border-line text-left text-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">ພະນັກງານ</th>
                <th className="px-4 py-2.5 font-medium">ບົດບາດ</th>
                <th className="px-4 py-2.5 text-right font-medium">ຮັບຜິດຊອບ</th>
                <th className="px-4 py-2.5 text-right font-medium">ແກ້ໄຂແລ້ວ</th>
                <th className="px-4 py-2.5 text-right font-medium">ຕາມ SLA</th>
                <th className="px-4 py-2.5 text-right font-medium">ເວລາສະເລ່ຍ</th>
                <th className="px-4 py-2.5 text-right font-medium">ຊົ່ວໂມງ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {byStaff.map((s) => {
                const staffResolved = Number(s.resolved)
                const staffRate = staffResolved
                  ? Math.round((Number(s.sla_met) / staffResolved) * 100)
                  : null
                const staffHours = hours.find((h) => h.employee_id === s.employee_id)

                return (
                  <tr key={s.employee_id}>
                    <td className="px-4 py-2.5 text-fg">
                      {s.fullname_lo}
                    </td>
                    <td className="px-4 py-2.5 text-muted">
                      {ROLE_LABEL_LO[s.role as Role] ?? s.role}
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted">
                      {s.assigned}
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted">
                      {s.resolved}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {staffRate === null ? (
                        <span className="text-faint">—</span>
                      ) : (
                        <span
                          className={
                            staffRate < 80
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-muted'
                          }
                        >
                          {staffRate}%
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted">
                      {s.avg_resolve_minutes
                        ? formatDuration(Number(s.avg_resolve_minutes))
                        : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted">
                      {staffHours ? Number(staffHours.total_hours).toFixed(1) : '0.0'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="ໂປຣເຈັກທັງໝົດ" value={projects?.total ?? '0'} />
        <Stat label="ກຳລັງດຳເນີນ" value={projects?.active ?? '0'} />
        <Stat label="ສຳເລັດແລ້ວ" value={projects?.done ?? '0'} />
        <Stat
          label="ເກີນກຳນົດ"
          value={projects?.overdue ?? '0'}
          danger={Number(projects?.overdue ?? 0) > 0}
        />
      </section>
    </div>
  )
}

function Stat({
  label,
  value,
  hint,
  danger = false,
}: {
  label: string
  value: string
  hint?: string
  danger?: boolean
}) {
  return (
    <div className="glass-card rounded-xl p-4">
      <p className="text-sm text-muted">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold ${
          danger ? 'text-red-600 dark:text-red-400' : 'text-fg'
        }`}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-1 text-xs text-faint">{hint}</p>
      )}
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass-card rounded-xl p-4">
      <h2 className="mb-3 text-sm font-semibold text-fg">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Empty() {
  return <EmptyState compact title="ຍັງບໍ່ມີຂໍ້ມູນ" description="ລອງເລືອກຊ່ວງວັນທີອື່ນ" />
}

function pick(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

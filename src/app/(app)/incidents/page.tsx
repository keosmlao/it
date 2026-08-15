import Link from 'next/link'
import { requireUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import {
  getDowntimeByService,
  getIncidentStats,
  listIncidents,
} from '@/lib/incidents/queries'
import {
  INCIDENT_SERVICES,
  INCIDENT_SERVICE_LABEL_LO,
  INCIDENT_STATUS_LABEL_LO,
  INCIDENT_STATUS_STYLE,
  SEVERITY_SHORT_LO,
  SEVERITY_STYLE,
  formatDowntime,
  type IncidentService,
} from '@/lib/incidents/model'
import EmptyState from '@/components/empty-state'
import ExportMenu from '@/components/export-menu'
import { formatDateTime } from '@/lib/format'

export const metadata = { title: 'ເຫດຂັດຂ້ອງລະບົບ' }

export default async function IncidentsPage({ searchParams }: PageProps<'/incidents'>) {
  const params = await searchParams
  const user = await requireUser()

  const today = new Date()
  const yearStart = new Date(today.getFullYear(), 0, 1)
  const from = pick(params.from) || yearStart.toISOString().slice(0, 10)
  const to = pick(params.to) || today.toISOString().slice(0, 10)
  const service = pick(params.service) || 'all'
  const status = pick(params.status) || 'all'
  const q = pick(params.q)

  const [incidents, stats, byService] = await Promise.all([
    listIncidents({ service, status, from, to, q }),
    getIncidentStats(from, to),
    getDowntimeByService(from, to),
  ])

  const editable = can.manageAssets(user)

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {from} ຫາ {to} · {stats?.total ?? 0} ຄັ້ງ · ຍັງບໍ່ຈົບ{' '}
          <span className="font-medium text-red-600 dark:text-red-400">
            {stats?.open ?? 0}
          </span>{' '}
          · ເວລາລົ້ມລວມ{' '}
          <span className="font-medium text-brand-orange">
            {formatDowntime(Number(stats?.downtime_minutes ?? 0))}
          </span>
        </p>
        <div className="flex flex-wrap gap-2">
          {editable && (
            <Link
              href="/incidents/new"
              className="btn-primary rounded-lg px-4 py-2 text-sm font-medium"
            >
              + ບັນທຶກເຫດຂັດຂ້ອງ
            </Link>
          )}
          <ExportMenu dataset="incidents" query={{ from, to, q }} />
        </div>
      </div>

      {byService.length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {byService.slice(0, 4).map((s) => (
            <div key={s.service} className="glass-card rounded-xl p-4">
              <p className="text-xs text-muted">
                {INCIDENT_SERVICE_LABEL_LO[s.service as IncidentService] ?? s.service}
              </p>
              <p className="mt-1 text-xl font-semibold text-fg">
                {formatDowntime(Number(s.minutes))}
              </p>
              <p className="mt-0.5 text-xs text-faint">
                {s.total} ຄັ້ງ · ດົນສຸດ {formatDowntime(Number(s.worst))}
              </p>
            </div>
          ))}
        </div>
      )}

      <form className="glass-card mt-5 flex flex-wrap items-end gap-3 rounded-xl p-4">
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
        <label className="flex flex-col gap-1 text-xs text-muted">
          ບໍລິການ
          <select
            name="service"
            defaultValue={service}
            className="input rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="all">ທັງໝົດ</option>
            {INCIDENT_SERVICES.map((s) => (
              <option key={s} value={s}>
                {INCIDENT_SERVICE_LABEL_LO[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          ສະຖານະ
          <select
            name="status"
            defaultValue={status}
            className="input rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="all">ທັງໝົດ</option>
            <option value="open">ຍັງບໍ່ຈົບ</option>
            <option value="resolved">ແກ້ໄຂແລ້ວ</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          ຄົ້ນຫາ
          <input
            name="q"
            defaultValue={q}
            placeholder="ຫົວຂໍ້, ສາເຫດ"
            className="input w-48 rounded-lg px-3 py-1.5 text-sm"
          />
        </label>
        <button type="submit" className="btn-secondary rounded-lg px-4 py-1.5 text-sm">
          ກັ່ນຕອງ
        </button>
      </form>

      {incidents.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            title="ບໍ່ມີເຫດຂັດຂ້ອງໃນຊ່ວງນີ້"
            description="ບັນທຶກທຸກຄັ້ງທີ່ລະບົບລົ້ມ ຈຶ່ງມີຕົວເລກຈິງໄປຕໍ່ລອງກັບຜູ້ໃຫ້ບໍລິການ ແລະ ຮູ້ວ່າຄວນປ່ຽນເຈົ້າບໍ"
            action={editable ? 'ບັນທຶກເຫດຂັດຂ້ອງ' : undefined}
            href={editable ? '/incidents/new' : undefined}
          />
        </div>
      ) : (
        <div className="glass-card divide-line mt-5 divide-y rounded-xl">
          {incidents.map((i) => (
            <Link
              key={i.id}
              href={`/incidents/${i.id}`}
              className="hover-surface flex flex-wrap items-center gap-3 px-4 py-3 transition"
            >
              <span className="font-mono text-xs text-muted">{i.code}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-fg">{i.title}</span>
                <span className="text-xs text-muted">
                  {INCIDENT_SERVICE_LABEL_LO[i.service]} ·{' '}
                  {formatDateTime(i.started_at)}
                  {i.impact && ` · ${i.impact}`}
                </span>
              </span>
              <span className="w-24 text-right text-sm text-body">
                {formatDowntime(i.minutes)}
              </span>
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_STYLE[i.severity]}`}
              >
                {SEVERITY_SHORT_LO[i.severity]}
              </span>
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${INCIDENT_STATUS_STYLE[i.status]}`}
              >
                {INCIDENT_STATUS_LABEL_LO[i.status]}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function pick(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

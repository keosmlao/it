import Link from 'next/link'
import { requireUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import {
  getMaintenanceStats,
  listMaintenancePlans,
  listRecentMaintenanceLogs,
} from '@/lib/maintenance/queries'
import {
  PM_CATEGORIES,
  PM_CATEGORY_LABEL_LO,
  PM_DUE_LABEL_LO,
  PM_DUE_STYLE,
  PM_RESULT_LABEL_LO,
} from '@/lib/maintenance/model'
import EmptyState from '@/components/empty-state'
import ExportMenu from '@/components/export-menu'
import { safeDate } from '@/lib/assets/model'

export const metadata = { title: 'ບຳລຸງຮັກສາຕາມແຜນ' }

export default async function MaintenancePage({
  searchParams,
}: PageProps<'/maintenance'>) {
  const params = await searchParams
  const user = await requireUser()

  const category = pick(params.category) || 'all'
  const due = pick(params.due)
  const q = pick(params.q)
  const all = pick(params.all) === '1'

  const [plans, stats, logs] = await Promise.all([
    listMaintenancePlans({ category, due, q, all }),
    getMaintenanceStats(),
    listRecentMaintenanceLogs(15),
  ])

  const editable = can.manageAssets(user)

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          ແຜນທີ່ເປີດຢູ່ {stats?.active ?? 0} · ເລີຍກຳນົດ{' '}
          <span className="font-medium text-red-600 dark:text-red-400">
            {stats?.overdue ?? 0}
          </span>{' '}
          · ຮອດກຳນົດໄວໆນີ້{' '}
          <span className="font-medium text-brand-orange">{stats?.due_soon ?? 0}</span> ·
          ເຄີຍພົບບັນຫາ {stats?.issues ?? 0} ຄັ້ງ
        </p>
        <div className="flex flex-wrap gap-2">
          {editable && (
            <Link
              href="/maintenance/new"
              className="btn-primary rounded-lg px-4 py-2 text-sm font-medium"
            >
              + ຕັ້ງແຜນ
            </Link>
          )}
          <ExportMenu dataset="maintenance" query={{ q }} />
        </div>
      </div>

      <form className="o-filter-bar mt-3">
        <label className="flex flex-col gap-1 text-xs text-muted">
          ປະເພດ
          <select
            name="category"
            defaultValue={category}
            className="input rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="all">ທັງໝົດ</option>
            {PM_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {PM_CATEGORY_LABEL_LO[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          ກຳນົດ
          <select
            name="due"
            defaultValue={due}
            className="input rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="">ບໍ່ກັ່ນຕອງ</option>
            <option value="soon">ຮອດກຳນົດ ຫຼື ເລີຍແລ້ວ</option>
            <option value="overdue">ເລີຍກຳນົດແລ້ວ</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          ຄົ້ນຫາ
          <input
            name="q"
            defaultValue={q}
            placeholder="ຊື່ວຽກ, ລະຫັດ, ອຸປະກອນ"
            className="input w-56 rounded-lg px-3 py-1.5 text-sm"
          />
        </label>
        <label className="flex items-center gap-2 pb-1.5 text-sm text-body">
          <input
            type="checkbox"
            name="all"
            value="1"
            defaultChecked={all}
            className="size-4"
          />
          ລວມທີ່ປິດໄວ້
        </label>
        <button type="submit" className="btn-secondary rounded-lg px-4 py-1.5 text-sm">
          ກັ່ນຕອງ
        </button>
      </form>

      {plans.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            title="ຍັງບໍ່ມີແຜນບຳລຸງຮັກສາ"
            description="ຕັ້ງວຽກທີ່ຕ້ອງເຮັດຊໍ້າ — ທົດສອບກູ້ຄືນ backup, ກວດແບັດ UPS, ລ້າງຫ້ອງ server ແລ້ວລະບົບຈະເຕືອນເອງ"
            action={editable ? 'ຕັ້ງແຜນ' : undefined}
            href={editable ? '/maintenance/new' : undefined}
          />
        </div>
      ) : (
        <div className="glass-card divide-line mt-5 divide-y rounded-xl">
          {plans.map((p) => (
            <Link
              key={p.id}
              href={`/maintenance/${p.id}`}
              className="hover-surface flex flex-wrap items-center gap-3 px-4 py-3 transition"
            >
              <span className="font-mono text-xs text-muted">{p.code}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-fg">{p.title}</span>
                <span className="text-xs text-muted">
                  {PM_CATEGORY_LABEL_LO[p.category]} · ທຸກ {p.interval_days} ວັນ
                  {p.asset_name && ` · ${p.asset_name}`}
                  {p.owner_name && ` · ${p.owner_nickname ?? p.owner_name}`}
                </span>
              </span>
              <span className="w-32 text-right text-xs text-muted">
                {p.last_done_at ? `ເຮັດຫຼ້າສຸດ ${safeDate(p.last_done_at)}` : 'ຍັງບໍ່ເຄີຍເຮັດ'}
              </span>
              <span className="w-24 text-right text-xs text-body">
                {safeDate(p.next_due_date)}
              </span>
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${PM_DUE_STYLE[p.due_status]}`}
              >
                {PM_DUE_LABEL_LO[p.due_status]}
              </span>
            </Link>
          ))}
        </div>
      )}

      {logs.length > 0 && (
        <div className="glass-card mt-5 rounded-xl">
          <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-fg">
            ບັນທຶກຫຼ້າສຸດ
          </h2>
          <div className="divide-line divide-y">
            {logs.map((l) => (
              <Link
                key={l.id}
                href={`/maintenance/${l.plan_id}`}
                className="hover-surface flex flex-wrap items-center gap-3 px-4 py-2.5 transition"
              >
                <span className="w-24 text-xs text-muted">
                  {safeDate(l.performed_at)}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-fg">
                  {l.plan_title}
                </span>
                <span className="text-xs text-muted">{l.performed_by_name}</span>
                <span
                  className={`text-xs ${l.result === 'issue' ? 'font-medium text-red-600 dark:text-red-400' : 'text-muted'}`}
                >
                  {PM_RESULT_LABEL_LO[l.result]}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function pick(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

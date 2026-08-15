import Link from 'next/link'
import { requireUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { getChecklistStats, listChecklists } from '@/lib/accounts/queries'
import {
  CHECKLIST_KINDS,
  CHECKLIST_KIND_LABEL_LO,
  CHECKLIST_KIND_STYLE,
  CHECKLIST_STATUSES,
  CHECKLIST_STATUS_LABEL_LO,
} from '@/lib/accounts/model'
import EmptyState from '@/components/empty-state'
import { safeDate } from '@/lib/assets/model'

export const metadata = { title: 'ຮັບພະນັກງານເຂົ້າ / ອອກ' }

export default async function OnboardingPage({
  searchParams,
}: PageProps<'/onboarding'>) {
  const params = await searchParams
  const user = await requireUser()

  const kind = pick(params.kind) || 'all'
  const status = pick(params.status)
  const q = pick(params.q)

  const [lists, stats] = await Promise.all([
    listChecklists({ kind, status, q }),
    getChecklistStats(),
  ])

  const editable = can.manageAccounts(user)

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          ກຳລັງເຮັດ {stats?.open ?? 0} ລາຍການ · ຮັບເຂົ້າ {stats?.onboard ?? 0} · ອອກ{' '}
          {stats?.offboard ?? 0} · ເກີນກຳນົດ{' '}
          <span className="font-medium text-red-600 dark:text-red-400">
            {stats?.late ?? 0}
          </span>
        </p>
        {editable && (
          <Link
            href="/onboarding/new"
            className="btn-primary rounded-lg px-4 py-2 text-sm font-medium"
          >
            + ເລີ່ມຂັ້ນຕອນ
          </Link>
        )}
      </div>

      <form className="glass-card mt-5 flex flex-wrap items-end gap-3 rounded-xl p-4">
        <label className="flex flex-col gap-1 text-xs text-muted">
          ປະເພດ
          <select
            name="kind"
            defaultValue={kind}
            className="input rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="all">ທັງໝົດ</option>
            {CHECKLIST_KINDS.map((k) => (
              <option key={k} value={k}>
                {CHECKLIST_KIND_LABEL_LO[k]}
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
            <option value="">ກຳລັງເຮັດ</option>
            <option value="all">ທັງໝົດ</option>
            {CHECKLIST_STATUSES.map((s) => (
              <option key={s} value={s}>
                {CHECKLIST_STATUS_LABEL_LO[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          ຄົ້ນຫາ
          <input
            name="q"
            defaultValue={q}
            placeholder="ຊື່ພະນັກງານ, ລະຫັດ"
            className="input w-52 rounded-lg px-3 py-1.5 text-sm"
          />
        </label>
        <button type="submit" className="btn-secondary rounded-lg px-4 py-1.5 text-sm">
          ກັ່ນຕອງ
        </button>
      </form>

      {lists.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            title="ບໍ່ມີຂັ້ນຕອນທີ່ກຳລັງເຮັດ"
            description="ເລີ່ມຂັ້ນຕອນເມື່ອມີພະນັກງານໃໝ່ ຫຼື ມີຄົນລາອອກ — ລະບົບຈະສ້າງລາຍການທີ່ຕ້ອງເຮັດໃຫ້ຈາກແມ່ແບບ"
            action={editable ? 'ເລີ່ມຂັ້ນຕອນ' : undefined}
            href={editable ? '/onboarding/new' : undefined}
          />
        </div>
      ) : (
        <div className="glass-card divide-line mt-5 divide-y rounded-xl">
          {lists.map((c) => (
            <Link
              key={c.id}
              href={`/onboarding/${c.id}`}
              className="hover-surface flex flex-wrap items-center gap-3 px-4 py-3 transition"
            >
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${CHECKLIST_KIND_STYLE[c.kind]}`}
              >
                {CHECKLIST_KIND_LABEL_LO[c.kind]}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-fg">
                  {c.employee_name ?? `ລະຫັດ ${c.employee_id}`}
                </span>
                <span className="text-xs text-muted">
                  {c.department_name ?? '—'} · ເລີ່ມ {safeDate(c.started_at)}
                  {c.target_date && ` · ກຳນົດ ${safeDate(c.target_date)}`}
                  {c.is_late && (
                    <span className="ml-1 font-medium text-red-600 dark:text-red-400">
                      · ເກີນກຳນົດ
                    </span>
                  )}
                </span>
              </span>

              <span className="w-40">
                <span className="flex items-center gap-2">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-brand-blue/10">
                    <span
                      className="block h-full rounded-full bg-brand-blue"
                      style={{ width: `${c.percent_done}%` }}
                    />
                  </span>
                  <span className="text-xs text-muted">
                    {c.done_count}/{c.item_count}
                  </span>
                </span>
              </span>

              <span className="text-xs text-muted">
                {CHECKLIST_STATUS_LABEL_LO[c.status]}
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

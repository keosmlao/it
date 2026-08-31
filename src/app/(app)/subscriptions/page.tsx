import Link from 'next/link'
import { requireMenuView } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import {
  getCostByCurrency,
  getSubscriptionStats,
  listSubscriptions,
} from '@/lib/subscriptions/queries'
import {
  BILLING_CYCLE_LABEL_LO,
  SUB_CATEGORIES,
  SUB_CATEGORY_LABEL_LO,
  SUB_STATUSES,
  SUB_STATUS_LABEL_LO,
  formatAmount,
} from '@/lib/subscriptions/model'
import { DueBadge } from '@/components/subscription-badge'
import EmptyState from '@/components/empty-state'
import ExportMenu from '@/components/export-menu'
import { safeDate } from '@/lib/assets/model'

export const metadata = { title: 'ຄ່າເຊົ່າບໍລິການ' }

export default async function SubscriptionsPage({
  searchParams,
}: PageProps<'/subscriptions'>) {
  const params = await searchParams
  const user = await requireMenuView('/subscriptions')

  // ບໍ່ໄດ້ລະບຸມາ = ສະເພາະທີ່ໃຊ້ງານຢູ່ (ອັນທີ່ຍົກເລີກແລ້ວບໍ່ຕ້ອງເບິ່ງທຸກມື້)
  const status = pick(params.status)
  const category = pick(params.category) || 'all'
  const due = pick(params.due)
  const q = pick(params.q)

  const [rows, stats, cost] = await Promise.all([
    listSubscriptions({ status, category, due, q }),
    getSubscriptionStats(),
    getCostByCurrency(),
  ])

  const editable = can.manageSubscriptions(user)

  return (
    <div className="w-full">
      <div className="o-page-actions">
        <p className="text-sm text-muted">
          ໃຊ້ງານຢູ່ {stats?.active ?? 0} ສັນຍາ · ເລີຍກຳນົດ{' '}
          <span className="font-medium text-red-600 dark:text-red-400">
            {stats?.overdue ?? 0}
          </span>{' '}
          · ໃກ້ຮອດກຳນົດ{' '}
          <span className="font-medium text-brand-orange">{stats?.due_soon ?? 0}</span> ·
          ງວດທີ່ຍັງບໍ່ຈ່າຍ {stats?.unpaid_periods ?? 0}
        </p>

        <div className="flex flex-wrap gap-2">
          {editable && (
            <Link
              href="/subscriptions/new"
              className="btn-primary rounded px-3 py-1.5 text-[13px] font-medium"
            >
              + ລົງທະບຽນການເຊົ່າ
            </Link>
          )}
          <Link
            href="/subscriptions/cost"
            className="btn-secondary rounded px-3 py-1.5 text-[13px]"
          >
            ຄ່າໃຊ້ຈ່າຍ
          </Link>
          <ExportMenu dataset="subscriptions" query={{ q }} />
        </div>
      </div>

      {cost.length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cost.map((c) => (
            <div key={c.currency} className="glass-card rounded-xl p-4">
              <p className="text-xs text-muted">ຄ່າປະຈຳ ({c.currency})</p>
              <p className="mt-1 text-xl font-semibold text-fg">
                {formatAmount(c.monthly, c.currency)}
              </p>
              <p className="mt-0.5 text-xs text-faint">
                ຕໍ່ເດືອນ · ຕໍ່ປີ {formatAmount(c.yearly, c.currency)} · {c.total} ສັນຍາ
              </p>
            </div>
          ))}
        </div>
      )}

      <form className="o-filter-bar mt-3">
        <label className="flex flex-col gap-1 text-xs text-muted">
          ປະເພດ
          <select
            name="category"
            defaultValue={category}
            className="input rounded px-2 py-1 text-[13px]"
          >
            <option value="all">ທັງໝົດ</option>
            {SUB_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {SUB_CATEGORY_LABEL_LO[c]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-muted">
          ສະຖານະ
          <select
            name="status"
            defaultValue={status}
            className="input rounded px-2 py-1 text-[13px]"
          >
            <option value="">ໃຊ້ງານຢູ່</option>
            <option value="all">ທັງໝົດ</option>
            {SUB_STATUSES.map((s) => (
              <option key={s} value={s}>
                {SUB_STATUS_LABEL_LO[s]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-muted">
          ກຳນົດຈ່າຍ
          <select
            name="due"
            defaultValue={due}
            className="input rounded px-2 py-1 text-[13px]"
          >
            <option value="">ບໍ່ກັ່ນຕອງ</option>
            <option value="soon">ໃກ້ຮອດ ຫຼື ເລີຍກຳນົດ</option>
            <option value="overdue">ເລີຍກຳນົດແລ້ວ</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-muted">
          ຄົ້ນຫາ
          <input
            name="q"
            defaultValue={q}
            placeholder="ຊື່ບໍລິການ, ຜູ້ຂາຍ, ເລກບັນຊີ"
            className="input w-56 rounded px-2 py-1 text-[13px]"
          />
        </label>

        <button type="submit" className="btn-secondary rounded px-3 py-1.5 text-[13px]">
          ກັ່ນຕອງ
        </button>
      </form>

      {rows.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            title="ຍັງບໍ່ມີສັນຍາເຊົ່າຕາມເງື່ອນໄຂທີ່ເລືອກ"
            description="ລົງທະບຽນອິນເຕີເນັດ, cloud, mail server, AI ແລະ ບໍລິການອື່ນທີ່ຈ່າຍເປັນງວດ ເພື່ອໃຫ້ລະບົບເຕືອນກ່ອນຮອດກຳນົດ"
            action={editable ? 'ລົງທະບຽນການເຊົ່າ' : undefined}
            href={editable ? '/subscriptions/new' : undefined}
          />
        </div>
      ) : (
        <div className="glass-card divide-line mt-5 divide-y rounded-xl">
          {rows.map((s) => (
            <Link
              key={s.id}
              href={`/subscriptions/${s.id}`}
              className="hover-surface flex flex-wrap items-center gap-3 px-4 py-3 transition"
            >
              <span className="font-mono text-xs text-muted">{s.code}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-fg">
                  {s.service_name}
                  {s.plan_name && (
                    <span className="text-muted"> · {s.plan_name}</span>
                  )}
                </span>
                <span className="text-xs text-muted">
                  {SUB_CATEGORY_LABEL_LO[s.category]}
                  {s.vendor && ` · ${s.vendor}`}
                  {s.owner_name && ` · ${s.owner_nickname ?? s.owner_name}`}
                </span>
              </span>
              <span className="text-right text-sm text-body">
                {formatAmount(s.amount, s.currency)}
                <span className="block text-xs text-faint">
                  {BILLING_CYCLE_LABEL_LO[s.billing_cycle]}
                </span>
              </span>
              <span className="w-28 text-right text-xs text-muted">
                {safeDate(s.next_due_date)}
              </span>
              <DueBadge status={s.due_status} />
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

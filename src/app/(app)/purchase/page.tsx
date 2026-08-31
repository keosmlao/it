import Link from 'next/link'
import { requireUser } from '@/lib/auth/session'
import { listPurchaseRequests, getPurchaseStats } from '@/lib/purchase/queries'
import { PR_STATUSES, PR_STATUS_LABEL_LO } from '@/lib/purchase/model'
import { PrStatusBadge } from '@/components/pr-badge'
import ExportMenu from '@/components/export-menu'
import { formatMoney, safeDate } from '@/lib/assets/model'

export const metadata = { title: 'ໃບສະເໜີຊື້' }

export default async function PurchasePage({
  searchParams,
}: PageProps<'/purchase'>) {
  const params = await searchParams
  const user = await requireUser()

  // ບໍ່ໄດ້ລະບຸມາ = ສະເພາະທີ່ລໍອະນຸມັດ; 'all' = ເອົາໝົດ
  const status = params.status === undefined ? 'pending' : pick(params.status) || 'all'
  const mine = pick(params.mine) === '1'
  const q = pick(params.q)

  const [prs, stats] = await Promise.all([
    listPurchaseRequests({ status, mine, q }, user),
    getPurchaseStats(),
  ])

  return (
    <div className="w-full">
      <div className="o-page-actions">
        <p className="text-sm text-muted">
          ປີນີ້ {stats?.total ?? 0} ໃບ · ລໍອະນຸມັດ{' '}
          <span className="font-medium text-brand-orange">{stats?.pending ?? 0}</span> ໃບ
          (~{formatMoney(stats?.pending_value ?? null)} ກີບ) · ອະນຸມັດແລ້ວ{' '}
          {stats?.approved ?? 0} · ຮ່າງ {stats?.draft ?? 0}
        </p>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/purchase/new"
            className="btn-primary rounded px-3 py-1.5 text-[13px] font-medium"
          >
            + ສ້າງໃບສະເໜີຊື້
          </Link>
          <ExportMenu dataset="purchase" />
        </div>
      </div>

      <form className="o-filter-bar mt-3">
        <label className="flex flex-col gap-1 text-xs text-muted">
          ສະຖານະ
          <select
            name="status"
            defaultValue={status}
            className="input rounded px-2 py-1 text-[13px]"
          >
            <option value="pending">ລໍອະນຸມັດ</option>
            <option value="all">ທັງໝົດ</option>
            {PR_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PR_STATUS_LABEL_LO[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          ຄົ້ນຫາ
          <input
            name="q"
            defaultValue={q}
            placeholder="ເລກໃບ, ຫົວຂໍ້, ຜູ້ສະເໜີ"
            className="input w-56 rounded px-2 py-1 text-[13px]"
          />
        </label>
        <label className="flex items-center gap-2 pb-1.5 text-sm text-body">
          <input
            type="checkbox"
            name="mine"
            value="1"
            defaultChecked={mine}
            className="size-4"
          />
          ຂອງຂ້ອຍ
        </label>
        <button type="submit" className="btn-secondary rounded px-3 py-1.5 text-[13px]">
          ກັ່ນຕອງ
        </button>
      </form>

      <div className="glass-card mt-5 divide-y divide-line rounded-xl">
        {prs.map((pr) => (
          <Link
            key={pr.id}
            href={`/purchase/${pr.id}`}
            className="hover-surface flex flex-wrap items-center gap-3 px-4 py-3 transition"
          >
            <span className="font-mono text-xs text-muted">{pr.pr_no}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-fg">{pr.title}</span>
              <span className="text-xs text-muted">
                {pr.requester_name} · {pr.line_count} ລາຍການ ·{' '}
                {safeDate(pr.doc_date)}
                {pr.need_date && ` · ຕ້ອງການ ${safeDate(pr.need_date)}`}
              </span>
            </span>
            <span className="text-right text-sm text-body">
              {formatMoney(pr.total_est)}
              <span className="ml-1 text-xs text-faint">ກີບ</span>
            </span>
            <PrStatusBadge status={pr.status} />
          </Link>
        ))}

        {prs.length === 0 && (
          <p className="px-4 py-10 text-center text-muted">
            ບໍ່ມີໃບສະເໜີຊື້ຕາມເງື່ອນໄຂທີ່ເລືອກ
          </p>
        )}
      </div>
    </div>
  )
}

function pick(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

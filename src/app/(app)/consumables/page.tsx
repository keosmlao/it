import Link from 'next/link'
import { requireMenuView } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import {
  getConsumableStats,
  listConsumables,
  listRecentMoves,
} from '@/lib/consumables/queries'
import {
  CONSUMABLE_CATEGORIES,
  CONSUMABLE_CATEGORY_LABEL_LO,
  MOVE_KIND_LABEL_LO,
  STOCK_STATE_LABEL_LO,
  STOCK_STATE_STYLE,
  formatQty,
} from '@/lib/consumables/model'
import EmptyState from '@/components/empty-state'
import ExportMenu from '@/components/export-menu'
import { formatMoney, safeDate } from '@/lib/assets/model'

export const metadata = { title: 'ອຸປະກອນສິ້ນເປືອງ' }

export default async function ConsumablesPage({
  searchParams,
}: PageProps<'/consumables'>) {
  const params = await searchParams
  const user = await requireMenuView('/consumables')

  const category = pick(params.category) || 'all'
  const state = pick(params.state)
  const q = pick(params.q)
  const all = pick(params.all) === '1'

  const [items, stats, moves] = await Promise.all([
    listConsumables({ category, state, q, all }),
    getConsumableStats(),
    listRecentMoves(12),
  ])

  const editable = can.manageAssets(user)
  const lowCount = Number(stats?.low ?? 0) + Number(stats?.empty ?? 0)

  return (
    <div className="w-full">
      <div className="o-page-actions">
        <p className="text-sm text-muted">
          {stats?.total ?? 0} ລາຍການ · ໃກ້ໝົດ{' '}
          <span className="font-medium text-brand-orange">{stats?.low ?? 0}</span> ·
          ໝົດແລ້ວ{' '}
          <span className="font-medium text-red-600 dark:text-red-400">
            {stats?.empty ?? 0}
          </span>{' '}
          · ມູນຄ່າໃນສາງ ~{formatMoney(stats?.stock_value ?? null)} ກີບ
        </p>
        <div className="flex flex-wrap gap-2">
          {editable && (
            <Link
              href="/consumables/new"
              className="btn-primary rounded px-3 py-1.5 text-[13px] font-medium"
            >
              + ເພີ່ມລາຍການ
            </Link>
          )}
          <ExportMenu dataset="consumables" query={{ q }} />
        </div>
      </div>

      {lowCount > 0 && state !== 'low' && (
        <Link
          href="/consumables?state=low"
          className="mt-4 block rounded-lg bg-brand-orange/10 px-4 py-3 text-sm text-brand-orange transition hover:brightness-95"
        >
          ⚠️ ມີ {lowCount} ລາຍການທີ່ໃກ້ໝົດ ຫຼື ໝົດແລ້ວ — ກົດເບິ່ງເພື່ອສັ່ງຊື້ →
        </Link>
      )}

      <form className="o-filter-bar mt-3">
        <label className="flex flex-col gap-1 text-xs text-muted">
          ໝວດ
          <select
            name="category"
            defaultValue={category}
            className="input rounded px-2 py-1 text-[13px]"
          >
            <option value="all">ທັງໝົດ</option>
            {CONSUMABLE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CONSUMABLE_CATEGORY_LABEL_LO[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          ຍອດ
          <select
            name="state"
            defaultValue={state}
            className="input rounded px-2 py-1 text-[13px]"
          >
            <option value="">ບໍ່ກັ່ນຕອງ</option>
            <option value="low">ສະເພາະທີ່ໃກ້ໝົດ / ໝົດ</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          ຄົ້ນຫາ
          <input
            name="q"
            defaultValue={q}
            placeholder="ຊື່, ລະຫັດ, ບ່ອນເກັບ"
            className="input w-52 rounded px-2 py-1 text-[13px]"
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
          ລວມທີ່ບໍ່ໃຊ້ແລ້ວ
        </label>
        <button type="submit" className="btn-secondary rounded px-3 py-1.5 text-[13px]">
          ກັ່ນຕອງ
        </button>
      </form>

      {items.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            title="ຍັງບໍ່ມີລາຍການໃນສາງ"
            description="ໝຶກພິມ, ສາຍ LAN, ຫົວ RJ45, ຖ່ານ — ຂອງທີ່ບໍ່ມີ serial ແລະ ບໍ່ໄດ້ຢືມ–ຄືນ ແຕ່ຕ້ອງຮູ້ວ່າເຫຼືອເທົ່າໃດ"
            action={editable ? 'ເພີ່ມລາຍການ' : undefined}
            href={editable ? '/consumables/new' : undefined}
          />
        </div>
      ) : (
        <div className="glass-card divide-line mt-5 divide-y rounded-xl">
          {items.map((c) => (
            <Link
              key={c.id}
              href={`/consumables/${c.id}`}
              className="hover-surface flex flex-wrap items-center gap-3 px-4 py-3 transition"
            >
              <span className="font-mono text-xs text-muted">{c.code}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-fg">{c.name}</span>
                <span className="text-xs text-muted">
                  {CONSUMABLE_CATEGORY_LABEL_LO[c.category]}
                  {c.location && ` · ${c.location}`}
                  {c.vendor_name && ` · ${c.vendor_name}`}
                </span>
              </span>
              <span className="text-right text-sm text-body">
                {formatQty(c.on_hand)} {c.unit}
                <span className="block text-xs text-faint">
                  ຈຸດສັ່ງຊື້ {formatQty(c.min_qty)}
                </span>
              </span>
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STOCK_STATE_STYLE[c.stock_state]}`}
              >
                {STOCK_STATE_LABEL_LO[c.stock_state]}
              </span>
            </Link>
          ))}
        </div>
      )}

      {moves.length > 0 && (
        <div className="glass-card mt-5 rounded-xl">
          <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-fg">
            ການເຄື່ອນໄຫວຫຼ້າສຸດ
          </h2>
          <div className="divide-line divide-y">
            {moves.map((m) => (
              <Link
                key={m.id}
                href={`/consumables/${m.consumable_id}`}
                className="hover-surface flex flex-wrap items-center gap-3 px-4 py-2.5 transition"
              >
                <span className="w-24 text-xs text-muted">{safeDate(m.moved_at)}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-fg">
                  {m.consumable_name}
                </span>
                <span className="text-xs text-muted">
                  {m.employee_name ?? m.department_name ?? '—'}
                </span>
                <span className="text-sm text-body">
                  {m.kind === 'out' ? '−' : '+'}
                  {formatQty(m.qty)} {m.unit}
                </span>
                <span className="w-16 text-right text-xs text-muted">
                  {MOVE_KIND_LABEL_LO[m.kind]}
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

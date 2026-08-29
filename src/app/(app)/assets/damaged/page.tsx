import Link from 'next/link'
import { requireUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { getDamageStats, listDamagedAssets } from '@/lib/assets/damage'
import {
  STOCK_LABEL_LO,
  STOCK_STYLE,
  WRITEOFF_REASON_LO,
} from '@/lib/assets/stock-model'
import { formatMoney, safeDate } from '@/lib/assets/model'
import ExportMenu from '@/components/export-menu'
import DamageRow from './damage-row'

export const metadata = { title: 'ອຸປະກອນເພ / ຕັດຈຳໜ່າຍ' }

export default async function DamagedPage({
  searchParams,
}: PageProps<'/assets/damaged'>) {
  const params = await searchParams
  const user = await requireUser()

  const filters = {
    state: pick(params.state) || 'broken',
    q: pick(params.q),
  }

  const [rows, stats] = await Promise.all([
    listDamagedAssets(filters),
    getDamageStats(),
  ])

  const tabs = [
    {
      label: 'ເພ / ສົ່ງສ້ອມ',
      href: '/assets/damaged',
      count: Number(stats?.damaged ?? 0) + Number(stats?.repair ?? 0),
      alert: true,
      on: filters.state === 'broken',
    },
    {
      label: 'ຫາບໍ່ພົບ',
      href: '/assets/damaged?state=missing',
      count: stats?.missing,
      alert: true,
      on: filters.state === 'missing',
    },
    {
      label: 'ຕັດຈຳໜ່າຍແລ້ວ',
      href: '/assets/damaged?state=scrapped',
      count: Number(stats?.scrapped ?? 0) + Number(stats?.retired ?? 0),
      on: filters.state === 'scrapped',
    },
    {
      label: 'ທັງໝົດ',
      href: '/assets/damaged?state=all',
      count: stats?.total,
      on: filters.state === 'all',
    },
  ]

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          ເພ{' '}
          <span className="font-medium text-amber-700 dark:text-amber-400">
            {stats?.damaged ?? 0}
          </span>{' '}
          · ສົ່ງສ້ອມ {stats?.repair ?? 0} · ຫາບໍ່ພົບ{' '}
          <span className="text-red-600 dark:text-red-400">{stats?.missing ?? 0}</span> ·
          ຕັດຈຳໜ່າຍແລ້ວ {Number(stats?.scrapped ?? 0) + Number(stats?.retired ?? 0)}{' '}
          (ມູນຄ່າ {formatMoney(stats?.lost_value ?? null)} ກີບ)
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/assets" className="btn-secondary rounded-lg px-4 py-2 text-sm">
            ← ທະບຽນອຸປະກອນ
          </Link>
          <ExportMenu dataset="damaged" label="ດຶງລາຍການ" />
        </div>
      </div>

      <nav className="mt-4 flex flex-wrap gap-1.5">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            aria-current={tab.on ? 'page' : undefined}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm transition ${
              tab.on
                ? 'brand-gradient-cool font-medium text-white shadow-[0_6px_16px_#2c6fb640]'
                : 'btn-secondary hover-surface'
            }`}
          >
            {tab.label}
            <span
              className={`rounded-full px-1.5 text-xs ${
                tab.on
                  ? 'bg-white/25'
                  : tab.alert && Number(tab.count ?? 0) > 0
                    ? 'bg-red-100 font-medium text-red-700 dark:bg-red-950 dark:text-red-300'
                    : 'bg-brand-blue/10 text-muted'
              }`}
            >
              {tab.count ?? 0}
            </span>
          </Link>
        ))}
      </nav>

      <form className="o-filter-bar mt-3">
        {filters.state !== 'broken' && (
          <input type="hidden" name="state" value={filters.state} />
        )}
        <label className="flex flex-col gap-1 text-xs text-muted">
          ຄົ້ນຫາ
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="ລະຫັດ, ຊື່, S/N, ອາການເພ"
            className="input w-64 rounded-lg px-3 py-1.5 text-sm"
          />
        </label>
        <button type="submit" className="btn-secondary rounded-lg px-4 py-1.5 text-sm">
          ຄົ້ນຫາ
        </button>
      </form>

      <div className="o-list-wrap mt-3 overflow-x-auto">
        <table className="o-list w-full text-[13px]">
          <thead className="border-b border-line text-left text-muted">
            <tr>
              <th className="px-2 py-1.5 font-medium sm:px-4">ອຸປະກອນ</th>
              <th className="px-2 py-1.5 font-medium sm:px-4">ສະຖານະ</th>
              <th className="hidden px-3 py-1.5 font-medium md:table-cell">
                ອາການ / ເຫດຜົນ
              </th>
              <th className="hidden px-3 py-1.5 font-medium lg:table-cell">ພົບເມື່ອ</th>
              <th className="hidden px-3 py-1.5 text-right font-medium lg:table-cell">
                ສ້ອມມາແລ້ວ
              </th>
              <th className="px-3 py-1.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <DamageRow
                key={row.asset_code}
                row={{
                  asset_code: row.asset_code,
                  asset_name: row.asset_name,
                  serial_no: row.serial_no,
                  stock_state: row.stock_state,
                  state_label: STOCK_LABEL_LO[row.stock_state],
                  state_style: STOCK_STYLE[row.stock_state],
                  damage_detail: row.damage_detail,
                  damaged_at: safeDate(row.damaged_at),
                  checked_by_name: row.checked_by_name,
                  repair_count: Number(row.repair_count),
                  repair_cost: formatMoney(row.repair_cost_total),
                  purchase_price: formatMoney(row.purchase_price),
                  writeoff_reason: row.writeoff_reason
                    ? WRITEOFF_REASON_LO[row.writeoff_reason]
                    : null,
                  written_off_at: safeDate(row.written_off_at),
                  decided_by_name: row.decided_by_name,
                }}
                canWriteOff={can.approve(user)}
              />
            ))}

            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  ບໍ່ມີອຸປະກອນໃນສະຖານະນີ້ 🎉
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-faint">
        ໝາຍສະຖານະໄດ້ຈາກໜ້ານີ້ ຫຼື ຈາກໜ້າລາຍລະອຽດຂອງແຕ່ລະເຄື່ອງ ·
        ເຄື່ອງທີ່ເພ, ສົ່ງສ້ອມ, ຫາຍ ຫຼື ຕັດຈຳໜ່າຍແລ້ວ ຈະບໍ່ປະກົດໃນລາຍການທີ່ໃຫ້ຢືມໄດ້
      </p>
    </div>
  )
}

function pick(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

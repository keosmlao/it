import Link from 'next/link'
import { requireUser } from '@/lib/auth/session'
import {
  getMovementDepartments,
  getMovementDivisions,
  getMovementUnits,
  getHolderStats,
  paginateHolders,
} from '@/lib/assets/queries'
import OrgFilter from '@/components/org-filter'
import Pagination from '@/components/pagination'
import ExportMenu from '@/components/export-menu'
import { pageNumber } from '@/lib/pagination'
import { safeDate } from '@/lib/assets/model'

export const metadata = { title: 'ຜູ້ຖືຄອງອຸປະກອນ' }

export default async function HoldersPage({
  searchParams,
}: PageProps<'/assets/holders'>) {
  const params = await searchParams
  await requireUser()

  const filters = {
    state: pick(params.state) || 'holding',
    q: pick(params.q),
    division: pick(params.division),
    department: pick(params.department),
    unit: pick(params.unit),
  }

  const [holderPage, stats, divisions, departments, units] = await Promise.all([
    paginateHolders(filters, pageNumber(params.page)),
    getHolderStats(),
    getMovementDivisions(),
    // ແຕ່ລະລະດັບແຄບລົງຕາມລະດັບເທິງທີ່ເລືອກ
    getMovementDepartments(filters.division || undefined),
    getMovementUnits(filters.division || undefined, filters.department || undefined),
  ])

  const hasFilter =
    filters.division || filters.department || filters.unit || filters.q

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {filters.state === 'former'
            ? `${holderPage.total} ຄົນອອກໄປແລ້ວ ແຕ່ຍັງບໍ່ຄືນເຄື່ອງ`
            : filters.state === 'holding'
              ? `${holderPage.total} ຄົນກຳລັງຖືອຸປະກອນຢູ່`
              : `${holderPage.total} ຄົນເຄີຍຢືມອຸປະກອນ`}
          {filters.division && ` · ${filters.division}`}
          {filters.department && ` · ${filters.department}`}
          {filters.unit && ` · ${filters.unit}`}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/assets" className="btn-secondary rounded-lg px-4 py-2 text-sm">
            ← ທະບຽນອຸປະກອນ
          </Link>
          <ExportMenu dataset="holders" />
        </div>
      </div>

      <nav className="mt-4 flex flex-wrap gap-1.5">
        {[
          {
            label: 'ກຳລັງຖືຢູ່',
            href: '/assets/holders',
            count: stats?.holding_people,
            on: filters.state === 'holding',
            alert: false,
          },
          {
            label: 'ອອກແລ້ວແຕ່ຍັງບໍ່ຄືນ',
            href: '/assets/holders?state=former',
            count: stats?.former_people,
            on: filters.state === 'former',
            alert: true,
          },
          {
            label: 'ທຸກຄົນທີ່ເຄີຍຢືມ',
            href: '/assets/holders?state=all',
            count: stats?.all_people,
            on: filters.state === 'all',
            alert: false,
          },
        ].map((tab) => (
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

      {filters.state !== 'former' && Number(stats?.former_people ?? 0) > 0 && (
        <p className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          ມີ {stats?.former_people} ຄົນທີ່ບໍ່ມີໃນທະບຽນພະນັກງານແລ້ວ ແຕ່ຍັງຄ້າງເຄື່ອງ{' '}
          {stats?.former_items} ອັນ —{' '}
          <Link href="/assets/holders?state=former" className="underline">
            ເບິ່ງລາຍຊື່
          </Link>
        </p>
      )}

      <form className="glass-card mt-5 flex flex-wrap items-end gap-3 rounded-xl p-4">
        {filters.state !== 'holding' && (
          <input type="hidden" name="state" value={filters.state} />
        )}

        <label className="flex flex-col gap-1 text-xs text-muted">
          ຄົ້ນຫາ
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="ຊື່, ລະຫັດພະນັກງານ"
            className="input w-52 rounded-lg px-3 py-1.5 text-sm"
          />
        </label>

        <OrgFilter
          divisions={divisions}
          departments={departments}
          units={units}
          selected={filters}
        />

        <button type="submit" className="btn-secondary rounded-lg px-4 py-1.5 text-sm">
          ກັ່ນຕອງ
        </button>

        {hasFilter && (
          <Link
            href={
              filters.state === 'holding'
                ? '/assets/holders'
                : '/assets/holders?state=all'
            }
            className="pb-1.5 text-sm text-muted underline-offset-2 hover:underline"
          >
            ລ້າງຕົວກັ່ນຕອງ
          </Link>
        )}
      </form>

      <div className="glass-card mt-5 overflow-x-auto rounded-xl">
        <table className="w-full text-sm">
          <thead className="border-b border-line text-left text-muted">
            <tr>
              <th className="px-4 py-2.5 font-medium">ພະນັກງານ</th>
              <th className="px-4 py-2.5 font-medium">ຝ່າຍ</th>
              <th className="px-4 py-2.5 font-medium">ພະແນກ</th>
              <th className="px-4 py-2.5 font-medium">ໜ່ວຍງານ</th>
              <th className="px-4 py-2.5 text-right font-medium">ຖືຢູ່</th>
              <th className="px-4 py-2.5 text-right font-medium">ເຄີຍຢືມ</th>
              <th className="px-4 py-2.5 font-medium">ຢືມລ່າສຸດ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {holderPage.items.map((h) => (
              <tr key={h.emp_code} className="hover-surface transition">
                <td className="px-4 py-2.5">
                  <Link
                    href={`/assets/holders/${encodeURIComponent(h.emp_code)}`}
                    className="flex items-center gap-2.5"
                  >
                    <span className="brand-gradient-warm flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white">
                      {(h.emp_name ?? '?').slice(0, 1)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-fg underline-offset-2 hover:underline">
                        {h.emp_name}
                        {h.is_former_employee && (
                          <span className="ml-2 rounded-full bg-red-100 px-1.5 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
                            ອອກແລ້ວ
                          </span>
                        )}
                      </span>
                      <span className="block font-mono text-xs text-muted">
                        {h.emp_code}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-muted">{h.division_name ?? '—'}</td>
                <td className="px-4 py-2.5 text-body">{h.department_name ?? '—'}</td>
                <td className="px-4 py-2.5 text-muted">{h.unit_name ?? '—'}</td>
                <td className="px-4 py-2.5 text-right">
                  {Number(h.holding) > 0 ? (
                    <span className="rounded-full bg-brand-orange/20 px-2 py-0.5 font-medium text-brand-orange">
                      {h.holding}
                    </span>
                  ) : (
                    <span className="text-faint">0</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right text-muted">{h.total}</td>
                <td className="px-4 py-2.5 text-xs whitespace-nowrap text-muted">
                  {safeDate(h.last_borrowed_at)}
                </td>
              </tr>
            ))}

            {holderPage.items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted">
                  ບໍ່ພົບຜູ້ຖືຄອງຕາມເງື່ອນໄຂທີ່ເລືອກ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination {...holderPage} query={params} />
    </div>
  )
}

function pick(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

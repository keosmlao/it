import Link from 'next/link'
import { requireMenuView } from '@/lib/auth/session'
import {
  getMovementDepartments,
  getMovementDivisions,
  getMovementUnits,
  paginateMovements,
} from '@/lib/assets/queries'
import OrgFilter from '@/components/org-filter'
import Pagination from '@/components/pagination'
import ExportMenu from '@/components/export-menu'
import { pageNumber } from '@/lib/pagination'
import { safeDate } from '@/lib/assets/model'

export const metadata = { title: 'ປະຫວັດຢືມ–ຄືນ' }

export default async function MovementsPage({
  searchParams,
}: PageProps<'/assets/movements'>) {
  const params = await searchParams
  await requireMenuView('/assets/movements')

  const state = pick(params.state) || 'holding'
  const q = pick(params.q)
  const division = pick(params.division)
  const department = pick(params.department)
  const unit = pick(params.unit)

  const [movementPage, divisions, departments, units] = await Promise.all([
    paginateMovements({ state, q, division, department, unit }, pageNumber(params.page)),
    getMovementDivisions(),
    getMovementDepartments(division || undefined),
    getMovementUnits(division || undefined, department || undefined),
  ])
  const movements = movementPage.items

  const tabs = [
    { label: 'ຍັງບໍ່ຄືນ', href: '/assets/movements', on: state === 'holding' },
    {
      label: 'ຄືນແລ້ວ',
      href: '/assets/movements?state=returned',
      on: state === 'returned',
    },
    { label: 'ທັງໝົດ', href: '/assets/movements?state=all', on: state === 'all' },
  ]

  return (
    <div className="w-full">
      <div className="o-page-actions">
        <p className="text-sm text-muted">ພົບ {movementPage.total} ລາຍການ</p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/assets/lend"
            className="btn-primary rounded px-3 py-1.5 text-[13px] font-medium"
          >
            + ອອກໃບຢືມ–ຄືນ
          </Link>
          <Link href="/assets" className="btn-secondary rounded px-3 py-1.5 text-[13px]">
            ← ລາຍການອຸປະກອນ
          </Link>
          <ExportMenu dataset="movements" query={{ state }} />
        </div>
      </div>

      <nav className="mt-4 flex flex-wrap gap-1.5">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            aria-current={tab.on ? 'page' : undefined}
            className={`rounded-full px-3.5 py-1.5 text-sm transition ${
              tab.on
                ? 'brand-gradient-cool font-medium text-white shadow-[0_6px_16px_#2c6fb640]'
                : 'btn-secondary hover-surface'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <form className="o-filter-bar mt-3">
        {state !== 'holding' && <input type="hidden" name="state" value={state} />}
        <label className="flex flex-col gap-1 text-xs text-muted">
          ຄົ້ນຫາ
          <input
            name="q"
            defaultValue={q}
            placeholder="ລະຫັດ, ອຸປະກອນ, ຜູ້ຢືມ, ເລກໃບຢືມ"
            className="input w-56 rounded px-2 py-1 text-[13px]"
          />
        </label>

        <OrgFilter
          divisions={divisions}
          departments={departments}
          units={units}
          selected={{ division, department, unit }}
          countBy="items"
        />

        <button type="submit" className="btn-secondary rounded px-3 py-1.5 text-[13px]">
          ກັ່ນຕອງ
        </button>
      </form>

      <div className="o-list-wrap mt-3 overflow-x-auto">
        <table className="o-list w-full text-[13px]">
          <thead className="border-b border-line text-left text-muted">
            <tr>
              <th className="hidden px-3 py-1.5 font-medium lg:table-cell">ໃບຢືມ</th>
              <th className="px-3 py-1.5 font-medium">ອຸປະກອນ</th>
              <th className="hidden px-3 py-1.5 font-medium md:table-cell">ຜູ້ຢືມ</th>
              <th className="hidden px-3 py-1.5 font-medium lg:table-cell">ຢືມ</th>
              <th className="px-3 py-1.5 font-medium">ຄືນ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {movements.map((m, index) => (
              <tr
                key={`${m.borrow_doc_no}-${m.asset_code}-${index}`}
                className="hover-surface transition"
              >
                <td className="hidden px-3 py-1.5 font-mono text-xs whitespace-nowrap text-muted lg:table-cell">
                  {m.borrow_doc_no ?? '—'}
                </td>
                <td className="px-3 py-1.5">
                  <Link
                    href={`/assets/${encodeURIComponent(m.asset_code)}`}
                    className="text-fg underline-offset-2 hover:underline"
                  >
                    {m.asset_name}
                  </Link>
                  <div className="font-mono text-xs text-muted">{m.asset_code}</div>
                  {/* ຖັນທີ່ເຊື່ອງຢູ່ຈໍນ້ອຍ — ຍ້າຍລົງມາຢູ່ນີ້ແທນ */}
                  <div className="text-xs text-muted md:hidden">
                    {m.emp_name ?? '—'} · ຢືມ {safeDate(m.borrowed_at)}
                  </div>
                </td>
                <td className="hidden px-3 py-1.5 md:table-cell">
                  <span className="text-body">{m.emp_name ?? '—'}</span>
                  <div className="text-xs text-muted">
                    {[m.org_department, m.unit_name].filter(Boolean).join(' · ') || '—'}
                  </div>
                </td>
                <td className="hidden px-3 py-1.5 text-xs whitespace-nowrap text-muted lg:table-cell">
                  {safeDate(m.borrowed_at)}
                </td>
                <td className="px-3 py-1.5 text-xs whitespace-nowrap">
                  {m.is_returned ? (
                    <span className="text-muted">{safeDate(m.returned_at)}</span>
                  ) : (
                    <span className="rounded-full bg-brand-orange/20 px-2 py-0.5 font-medium text-brand-orange">
                      ຍັງບໍ່ຄືນ
                    </span>
                  )}
                </td>
              </tr>
            ))}

            {movements.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted">
                  ບໍ່ພົບລາຍການ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination {...movementPage} query={params} />
    </div>
  )
}

function pick(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

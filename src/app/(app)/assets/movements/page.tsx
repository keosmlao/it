import Link from 'next/link'
import { requireUser } from '@/lib/auth/session'
import {
  getMovementDepartments,
  getMovementDivisions,
  getMovementUnits,
  paginateMovements,
} from '@/lib/assets/queries'
import OrgFilter from '@/components/org-filter'
import Pagination from '@/components/pagination'
import { pageNumber } from '@/lib/pagination'
import { safeDate } from '@/lib/assets/model'

export const metadata = { title: 'ປະຫວັດຢືມ–ຄືນ' }

export default async function MovementsPage({
  searchParams,
}: PageProps<'/assets/movements'>) {
  const params = await searchParams
  await requireUser()

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">ພົບ {movementPage.total} ລາຍການ</p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/assets/lend"
            className="btn-primary rounded-lg px-4 py-2 text-sm font-medium"
          >
            + ອອກໃບຢືມ–ຄືນ
          </Link>
          <Link href="/assets" className="btn-secondary rounded-lg px-4 py-2 text-sm">
            ← ລາຍການອຸປະກອນ
          </Link>
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

      <form className="glass-card mt-5 flex flex-wrap items-end gap-3 rounded-xl p-4">
        {state !== 'holding' && <input type="hidden" name="state" value={state} />}
        <label className="flex flex-col gap-1 text-xs text-muted">
          ຄົ້ນຫາ
          <input
            name="q"
            defaultValue={q}
            placeholder="ລະຫັດ, ອຸປະກອນ, ຜູ້ຢືມ, ເລກໃບຢືມ"
            className="input w-56 rounded-lg px-3 py-1.5 text-sm"
          />
        </label>

        <OrgFilter
          divisions={divisions}
          departments={departments}
          units={units}
          selected={{ division, department, unit }}
          countBy="items"
        />

        <button type="submit" className="btn-secondary rounded-lg px-4 py-1.5 text-sm">
          ກັ່ນຕອງ
        </button>
      </form>

      <div className="glass-card mt-5 overflow-x-auto rounded-xl">
        <table className="w-full text-sm">
          <thead className="border-b border-line text-left text-muted">
            <tr>
              <th className="px-4 py-2.5 font-medium">ໃບຢືມ</th>
              <th className="px-4 py-2.5 font-medium">ອຸປະກອນ</th>
              <th className="px-4 py-2.5 font-medium">ຜູ້ຢືມ</th>
              <th className="px-4 py-2.5 font-medium">ຢືມ</th>
              <th className="px-4 py-2.5 font-medium">ຄືນ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {movements.map((m, index) => (
              <tr
                key={`${m.borrow_doc_no}-${m.asset_code}-${index}`}
                className="hover-surface transition"
              >
                <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap text-muted">
                  {m.borrow_doc_no ?? '—'}
                </td>
                <td className="px-4 py-2.5">
                  <Link
                    href={`/assets/${encodeURIComponent(m.asset_code)}`}
                    className="text-fg underline-offset-2 hover:underline"
                  >
                    {m.asset_name}
                  </Link>
                  <div className="font-mono text-xs text-muted">{m.asset_code}</div>
                </td>
                <td className="px-4 py-2.5">
                  <span className="text-body">{m.emp_name ?? '—'}</span>
                  <div className="text-xs text-muted">
                    {[m.org_department, m.unit_name].filter(Boolean).join(' · ') || '—'}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-xs whitespace-nowrap text-muted">
                  {safeDate(m.borrowed_at)}
                </td>
                <td className="px-4 py-2.5 text-xs whitespace-nowrap">
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

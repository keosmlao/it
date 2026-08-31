import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireMenuView } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import {
  getBudgetTotals,
  getBudgetYears,
  listBudgetLines,
} from '@/lib/budget/queries'
import {
  BUDGET_CATEGORY_LABEL_LO,
  BUDGET_SOURCE_LABEL_LO,
  BUDGET_STATE_LABEL_LO,
  BUDGET_STATE_STYLE,
  fiscalYearOptions,
} from '@/lib/budget/model'
import { formatAmount } from '@/lib/subscriptions/model'
import EmptyState from '@/components/empty-state'
import BudgetLineForm from './budget-line-form'

export const metadata = { title: 'ງົບປະມານ' }

export default async function BudgetPage({ searchParams }: PageProps<'/budget'>) {
  const params = await searchParams
  const user = await requireMenuView('/budget')
  if (!can.viewReports(user)) redirect('/')

  const thisYear = new Date().getFullYear()
  const yearParam = pick(params.year)
  const year = /^\d{4}$/.test(yearParam) ? Number(yearParam) : thisYear

  const [lines, totals, years] = await Promise.all([
    listBudgetLines(year),
    getBudgetTotals(year),
    getBudgetYears(),
  ])

  const editable = can.manageSubscriptions(user)
  const yearChoices = [...new Set([...years, ...fiscalYearOptions(thisYear)])].sort(
    (a, b) => b - a
  )

  return (
    <div className="w-full">
      <div className="o-page-actions">
        <p className="text-sm text-muted">
          ປີ {year} · {lines.length} ເສັ້ນງົບປະມານ · ຍອດໃຊ້ຈິງອ່ານຈາກລະບົບເອງ
          ບໍ່ຕ້ອງປ້ອນຊໍ້າ
        </p>
        <form className="flex items-end gap-2">
          <select
            name="year"
            defaultValue={String(year)}
            className="input rounded px-2 py-1 text-[13px]"
          >
            {yearChoices.map((y) => (
              <option key={y} value={y}>
                ປີ {y}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-secondary rounded px-3 py-1.5 text-[13px]">
            ເບິ່ງ
          </button>
        </form>
      </div>

      {totals.length > 0 && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {totals.map((t) => {
            const used = Number(t.planned) > 0
              ? Math.round((Number(t.actual) * 100) / Number(t.planned))
              : 0
            return (
              <div key={t.currency} className="glass-card rounded-xl p-4">
                <p className="text-xs text-muted">{t.currency}</p>
                <p className="mt-1 text-xl font-semibold text-fg">
                  {formatAmount(t.actual, t.currency)}
                </p>
                <p className="mt-0.5 text-xs text-faint">
                  ຈາກງົບ {formatAmount(t.planned, t.currency)} ({used}%)
                </p>
                <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-brand-blue/10">
                  <span
                    className={`block h-full rounded-full ${used > 100 ? 'bg-red-500' : 'bg-brand-blue'}`}
                    style={{ width: `${Math.min(used, 100)}%` }}
                  />
                </span>
                {Number(t.over) > 0 && (
                  <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
                    ເກີນງົບ {t.over} ເສັ້ນ
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {lines.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            title={`ຍັງບໍ່ໄດ້ຕັ້ງງົບປະມານປີ ${year}`}
            description="ຕັ້ງເສັ້ນງົບປະມານແລ້ວລະບົບຈະທຽບກັບຍອດໃຊ້ຈິງໃຫ້ເອງ ຈາກໃບສະເໜີຊື້, ຄ່າເຊົ່າ, ຄ່າສ້ອມ ແລະ ຂອງສິ້ນເປືອງ"
          />
        </div>
      ) : (
        <div className="o-list-wrap mt-3 overflow-x-auto">
          <table className="o-list w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-3 py-1.5">ເສັ້ນງົບປະມານ</th>
                <th className="px-3 py-1.5">ຍອດໃຊ້ຈິງມາຈາກ</th>
                <th className="px-3 py-1.5 text-right">ງົບທີ່ຕັ້ງ</th>
                <th className="px-3 py-1.5 text-right">ໃຊ້ໄປແລ້ວ</th>
                <th className="px-3 py-1.5 text-right">ຍັງເຫຼືອ</th>
                <th className="px-3 py-1.5 text-right">ໃຊ້ໄປ</th>
                <th className="px-3 py-1.5" />
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {lines.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/budget/${l.id}`}
                      className="text-fg hover:text-brand-blue"
                    >
                      {l.name}
                    </Link>
                    <span className="block text-xs text-muted">
                      {BUDGET_CATEGORY_LABEL_LO[l.category]} · {l.currency}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {BUDGET_SOURCE_LABEL_LO[l.source]}
                    {l.source_filter && ` (${l.source_filter})`}
                  </td>
                  <td className="px-4 py-3 text-right text-body">
                    {formatAmount(l.planned_amount, l.currency)}
                  </td>
                  <td className="px-4 py-3 text-right text-body">
                    {formatAmount(l.actual_amount, l.currency)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right ${
                      Number(l.remaining_amount) < 0
                        ? 'font-medium text-red-600 dark:text-red-400'
                        : 'text-body'
                    }`}
                  >
                    {formatAmount(l.remaining_amount, l.currency)}
                  </td>
                  <td className="px-4 py-3 text-right text-muted">
                    {l.percent_used === null ? '—' : `${l.percent_used}%`}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${BUDGET_STATE_STYLE[l.budget_state]}`}
                    >
                      {BUDGET_STATE_LABEL_LO[l.budget_state]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editable && (
        <>
          <h2 className="mt-6 text-sm font-semibold text-fg">ເພີ່ມເສັ້ນງົບປະມານ</h2>
          <BudgetLineForm defaultYear={year} />
        </>
      )}
    </div>
  )
}

function pick(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

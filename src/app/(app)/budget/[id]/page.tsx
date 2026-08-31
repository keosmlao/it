import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { getBudgetLine, getBudgetSpends } from '@/lib/budget/queries'
import {
  BUDGET_CATEGORY_LABEL_LO,
  BUDGET_SOURCE_HINT_LO,
  BUDGET_SOURCE_LABEL_LO,
  BUDGET_STATE_LABEL_LO,
  BUDGET_STATE_STYLE,
} from '@/lib/budget/model'
import { formatAmount } from '@/lib/subscriptions/model'
import { safeDate } from '@/lib/assets/model'
import { todayISO } from '@/lib/format'
import BudgetLineForm from '../budget-line-form'
import SpendPanel from './spend-panel'

export default async function BudgetLinePage({ params }: PageProps<'/budget/[id]'>) {
  const { id } = await params
  const user = await requireUser()
  if (!can.viewReports(user)) redirect('/')

  const line = await getBudgetLine(id)
  if (!line) notFound()

  const spends = line.source === 'manual' ? await getBudgetSpends(id) : []
  const editable = can.manageSubscriptions(user)

  return (
    <div className="w-full">
      <div className="o-page-actions">
        <div>
          <h1 className="text-xl font-semibold text-fg">{line.name}</h1>
          <p className="mt-0.5 text-sm text-muted">
            ປີ {line.fiscal_year} · {BUDGET_CATEGORY_LABEL_LO[line.category]} ·{' '}
            {line.currency}
          </p>
        </div>
        <Link href="/budget" className="btn-secondary rounded px-3 py-1.5 text-[13px]">
          ← ງົບປະມານທັງໝົດ
        </Link>
      </div>

      <div className="glass-card mt-5 grid gap-4 rounded-xl p-5 sm:grid-cols-2 lg:grid-cols-4">
        <Info label="ງົບທີ່ຕັ້ງ" value={formatAmount(line.planned_amount, line.currency)} />
        <Info label="ໃຊ້ໄປແລ້ວ" value={formatAmount(line.actual_amount, line.currency)} />
        <Info
          label="ຍັງເຫຼືອ"
          value={formatAmount(line.remaining_amount, line.currency)}
        />
        <div>
          <p className="text-xs text-muted">ສະຖານະ</p>
          <span
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${BUDGET_STATE_STYLE[line.budget_state]}`}
          >
            {BUDGET_STATE_LABEL_LO[line.budget_state]}
            {line.percent_used !== null && ` · ${line.percent_used}%`}
          </span>
        </div>
      </div>

      <p className="mt-3 rounded-lg bg-brand-blue/5 px-4 py-3 text-sm text-body">
        ຍອດໃຊ້ຈິງມາຈາກ <strong>{BUDGET_SOURCE_LABEL_LO[line.source]}</strong> —{' '}
        {BUDGET_SOURCE_HINT_LO[line.source]}
        {line.source_filter && ` (ສະເພາະໝວດ ${line.source_filter})`}
      </p>

      {line.source === 'manual' && (
        <>
          {editable && <SpendPanel lineId={line.id} today={todayISO()} />}

          <div className="glass-card mt-4 rounded-xl">
            <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-fg">
              ລາຍຈ່າຍທີ່ບັນທຶກ ({spends.length})
            </h2>
            <div className="divide-line divide-y">
              {spends.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                  <span className="w-24 text-xs text-muted">
                    {safeDate(s.spend_date)}
                  </span>
                  <span className="min-w-0 flex-1 text-sm text-fg">
                    {s.description}
                    {s.ref_no && (
                      <span className="block text-xs text-muted">{s.ref_no}</span>
                    )}
                  </span>
                  <span className="text-sm text-body">
                    {formatAmount(s.amount, s.currency)}
                  </span>
                  <span className="text-xs text-faint">{s.created_by_name}</span>
                </div>
              ))}
              {spends.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-muted">
                  ຍັງບໍ່ໄດ້ບັນທຶກລາຍຈ່າຍ
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {editable && (
        <>
          <h2 className="mt-6 text-sm font-semibold text-fg">ແກ້ເສັ້ນງົບປະມານ</h2>
          <BudgetLineForm defaultYear={line.fiscal_year} line={line} />
        </>
      )}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 break-words text-sm text-body">{value}</p>
    </div>
  )
}

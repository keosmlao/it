import Link from 'next/link'
import { requireModuleView } from '@/lib/auth/session'
import {
  getCostByCategory,
  getCostByCurrency,
  getCostByDepartment,
  getPaidByMonth,
  listUnpaidPeriods,
} from '@/lib/subscriptions/queries'
import {
  SUB_CATEGORY_LABEL_LO,
  formatAmount,
  type SubCategory,
} from '@/lib/subscriptions/model'
import ExportMenu from '@/components/export-menu'
import { safeDate } from '@/lib/assets/model'

export const metadata = { title: 'ຄ່າໃຊ້ຈ່າຍການເຊົ່າ' }

export default async function SubscriptionCostPage() {
  await requireModuleView('subscriptions')

  const [byCurrency, byCategory, byDepartment, paidByMonth, unpaid] = await Promise.all([
    getCostByCurrency(),
    getCostByCategory(),
    getCostByDepartment(),
    getPaidByMonth(11),
    listUnpaidPeriods(),
  ])

  return (
    <div className="w-full">
      <div className="o-page-actions">
        <p className="text-sm text-muted">
          ຄິດຈາກສັນຍາທີ່ໃຊ້ງານຢູ່ · ແຍກຕາມສະກຸນເງິນ ບໍ່ໄດ້ແປງເປັນກີບ
          ເພາະອັດຕາແລກປ່ຽນປ່ຽນທຸກມື້
        </p>
        <div className="flex gap-2">
          <Link
            href="/subscriptions"
            className="btn-secondary rounded px-3 py-1.5 text-[13px]"
          >
            ← ລາຍການສັນຍາ
          </Link>
          <ExportMenu dataset="subscription-periods" label="ດຶງງວດການຈ່າຍ" />
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {byCurrency.map((c) => (
          <div key={c.currency} className="glass-card rounded-xl p-4">
            <p className="text-xs text-muted">{c.currency}</p>
            <p className="mt-1 text-xl font-semibold text-fg">
              {formatAmount(c.monthly, c.currency)}
            </p>
            <p className="mt-0.5 text-xs text-faint">ຕໍ່ເດືອນ</p>
            <p className="mt-2 text-sm text-body">
              {formatAmount(c.yearly, c.currency)}
              <span className="text-xs text-faint"> ຕໍ່ປີ</span>
            </p>
          </div>
        ))}
        {byCurrency.length === 0 && (
          <p className="text-sm text-muted">ຍັງບໍ່ມີສັນຍາທີ່ໃຊ້ງານຢູ່</p>
        )}
      </div>

      <Section title="ແຍກຕາມປະເພດບໍລິການ">
        <Table
          head={['ປະເພດ', 'ຈຳນວນສັນຍາ', 'ຕໍ່ເດືອນ', 'ຕໍ່ປີ']}
          rows={byCategory.map((r) => [
            SUB_CATEGORY_LABEL_LO[r.category as SubCategory] ?? r.category,
            `${r.total}`,
            formatAmount(r.monthly, r.currency),
            formatAmount(r.yearly, r.currency),
          ])}
        />
      </Section>

      <Section title="ແຍກຕາມພະແນກທີ່ຮັບພາລະ">
        <Table
          head={['ພະແນກ', 'ຈຳນວນສັນຍາ', 'ຕໍ່ເດືອນ', 'ຕໍ່ປີ']}
          rows={byDepartment.map((r) => [
            r.department_name ?? 'ບໍ່ໄດ້ລະບຸ',
            `${r.total}`,
            formatAmount(r.monthly, r.currency),
            formatAmount(r.yearly, r.currency),
          ])}
        />
      </Section>

      <Section title="ຈ່າຍຈິງແຕ່ລະເດືອນ (12 ເດືອນຫຼ້າສຸດ)">
        <Table
          head={['ເດືອນ', 'ຈຳນວນງວດ', 'ຍອດຈ່າຍ', '']}
          rows={paidByMonth.map((r) => [
            r.month,
            `${r.items}`,
            formatAmount(r.paid, r.currency),
            '',
          ])}
        />
      </Section>

      <Section title={`ງວດທີ່ຍັງບໍ່ຈ່າຍ (${unpaid.length})`}>
        {unpaid.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted">
            ບໍ່ມີງວດຄ້າງຈ່າຍ
          </p>
        ) : (
          <div className="divide-line divide-y">
            {unpaid.map((p) => (
              <Link
                key={p.id}
                href={`/subscriptions/${p.subscription_id}`}
                className="hover-surface flex flex-wrap items-center gap-3 px-4 py-3 transition"
              >
                <span className="font-mono text-xs text-muted">
                  {p.subscription_code}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-fg">
                  {p.service_name}
                </span>
                <span className="text-xs text-muted">ກຳນົດ {safeDate(p.due_date)}</span>
                <span className="text-sm text-body">
                  {formatAmount(p.amount, p.currency)}
                </span>
                {p.is_overdue && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-950 dark:text-red-300">
                    ເລີຍກຳນົດ
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card mt-5 rounded-xl">
      <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-fg">
        {title}
      </h2>
      {children}
    </div>
  )
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  if (rows.length === 0) {
    return <p className="px-4 py-6 text-center text-sm text-muted">ຍັງບໍ່ມີຂໍ້ມູນ</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="o-list w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-muted">
            {head.map((h, i) => (
              <th key={h + i} className={`px-4 py-2 ${i > 0 ? 'text-right' : ''}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-line divide-y">
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`px-3 py-1.5 ${j > 0 ? 'text-right text-body' : 'text-fg'}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

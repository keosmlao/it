import Link from 'next/link'
import { requireModuleView } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import {
  getAccountStats,
  listAccountSystems,
  listSystemAccounts,
} from '@/lib/accounts/queries'
import {
  ACCOUNT_STATUSES,
  ACCOUNT_STATUS_LABEL_LO,
  HR_STATE_LABEL_LO,
} from '@/lib/accounts/model'
import EmptyState from '@/components/empty-state'
import ExportMenu from '@/components/export-menu'
import AccountRow from './account-row'

export const metadata = { title: 'ບັນຊີຜູ້ໃຊ້' }

export default async function AccountsPage({ searchParams }: PageProps<'/accounts'>) {
  const params = await searchParams
  const user = await requireModuleView('accounts')

  const system = pick(params.system) || 'all'
  const status = pick(params.status)
  const state = pick(params.state)
  const q = pick(params.q)

  const [accounts, systems, stats] = await Promise.all([
    listSystemAccounts({ system, status, state, q }),
    listAccountSystems(),
    getAccountStats(),
  ])

  const editable = can.manageAccounts(user)
  const closable = Number(stats?.closable ?? 0)

  return (
    <div className="w-full">
      <div className="o-page-actions">
        <p className="text-sm text-muted">
          {stats?.systems ?? 0} ລະບົບ · ບັນຊີທີ່ໃຊ້ງານຢູ່ {stats?.active ?? 0} ·{' '}
          <span className="font-medium text-red-600 dark:text-red-400">
            {closable} ບັນຊີຄວນປິດ
          </span>{' '}
          (ເຈົ້າຂອງບໍ່ໄດ້ເຮັດວຽກຢູ່ແລ້ວ)
        </p>
        <div className="flex flex-wrap gap-2">
          {editable && (
            <Link
              href="/accounts/new"
              className="btn-primary rounded px-3 py-1.5 text-[13px] font-medium"
            >
              + ເປີດບັນຊີ
            </Link>
          )}
          <Link
            href="/accounts/systems"
            className="btn-secondary rounded px-3 py-1.5 text-[13px]"
          >
            ຈັດການລະບົບ
          </Link>
          <ExportMenu dataset="accounts" query={{ q }} />
        </div>
      </div>

      {closable > 0 && state !== 'closable' && (
        <Link
          href="/accounts?state=closable&status=all"
          className="mt-4 block rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 transition hover:brightness-95 dark:bg-red-950 dark:text-red-300"
        >
          ⚠️ ມີ {closable} ບັນຊີທີ່ຍັງເປີດຢູ່ ທັງທີ່ເຈົ້າຂອງບໍ່ໄດ້ຢູ່ໃນທະບຽນ HR ແລ້ວ —
          ກົດເບິ່ງລາຍການ →
        </Link>
      )}

      <form className="o-filter-bar mt-3">
        <label className="flex flex-col gap-1 text-xs text-muted">
          ລະບົບ
          <select
            name="system"
            defaultValue={system}
            className="input rounded px-2 py-1 text-[13px]"
          >
            <option value="all">ທັງໝົດ</option>
            {systems.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
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
            <option value="">ທີ່ຍັງບໍ່ປິດ</option>
            <option value="all">ທັງໝົດ</option>
            {ACCOUNT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ACCOUNT_STATUS_LABEL_LO[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          ກັ່ນຕອງ
          <select
            name="state"
            defaultValue={state}
            className="input rounded px-2 py-1 text-[13px]"
          >
            <option value="">ບໍ່ກັ່ນຕອງ</option>
            <option value="closable">ສະເພາະທີ່ຄວນປິດ</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          ຄົ້ນຫາ
          <input
            name="q"
            defaultValue={q}
            placeholder="ຊື່ບັນຊີ, ຊື່ຄົນ, ລະຫັດ"
            className="input w-52 rounded px-2 py-1 text-[13px]"
          />
        </label>
        <button type="submit" className="btn-secondary rounded px-3 py-1.5 text-[13px]">
          ກັ່ນຕອງ
        </button>
      </form>

      {accounts.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            title="ຍັງບໍ່ມີບັນຊີໃນທະບຽນ"
            description="ລົງທະບຽນວ່າໃຜມີບັນຊີຫຍັງແດ່ — email, ERP, VPN, Wi-Fi — ແລ້ວລະບົບຈະບອກເອງເມື່ອເຈົ້າຂອງລາອອກ"
            action={editable ? 'ເປີດບັນຊີ' : undefined}
            href={editable ? '/accounts/new' : undefined}
          />
        </div>
      ) : (
        <div className="glass-card divide-line mt-5 divide-y rounded-xl">
          {accounts.map((a) => (
            <AccountRow key={a.id} account={a} editable={editable} />
          ))}
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {systems.map((s) => (
          <div key={s.code} className="glass-card rounded-xl p-4">
            <p className="truncate text-sm font-medium text-fg">{s.name}</p>
            <p className="mt-1 text-xs text-muted">
              ໃຊ້ຢູ່ {s.active_count}
              {s.seat_limit !== null && ` / ${s.seat_limit} seat`}
            </p>
            {s.seats_free !== null && s.seats_free < 0 && (
              <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                ໃຊ້ເກີນ seat ທີ່ຈ່າຍ {Math.abs(s.seats_free)} ບ່ອນ
              </p>
            )}
            {Number(s.closable_count) > 0 && (
              <p className="mt-1 text-xs font-medium text-brand-orange">
                {s.closable_count} ບັນຊີຄວນປິດ
              </p>
            )}
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-faint">
        ສະຖານະຄົນອີງຈາກທະບຽນ HR ໂດຍກົງ:{' '}
        {Object.values(HR_STATE_LABEL_LO).join(' · ')} —{' '}
        {ACCOUNT_STATUS_LABEL_LO.closed} ແລ້ວຈະບໍ່ຂຶ້ນເຕືອນອີກ
      </p>
    </div>
  )
}

function pick(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

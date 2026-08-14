import Link from 'next/link'
import { requireUser } from '@/lib/auth/session'
import { getRecoveryStats, paginateRecoveries } from '@/lib/assets/stock'
import Pagination from '@/components/pagination'
import ExportMenu from '@/components/export-menu'
import { pageNumber } from '@/lib/pagination'
import { safeDate } from '@/lib/assets/model'
import RecoveryRow from './recovery-row'

export const metadata = { title: 'ທວງຄືນອຸປະກອນ' }

export default async function RecoveryPage({
  searchParams,
}: PageProps<'/assets/recovery'>) {
  const params = await searchParams
  await requireUser()

  const filters = {
    reason: pick(params.reason) || 'all',
    status: pick(params.status) || 'pending',
    q: pick(params.q),
  }

  const [targetPage, stats] = await Promise.all([
    paginateRecoveries(filters, pageNumber(params.page)),
    getRecoveryStats(),
  ])

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          ຕ້ອງທວງຄືນ {stats?.total ?? 0} ເຄື່ອງ · ຍັງບໍ່ໄດ້ຕິດຕໍ່{' '}
          <span className="font-medium text-red-600 dark:text-red-400">
            {stats?.pending ?? 0}
          </span>{' '}
          · ກຳລັງຕິດຕາມ {stats?.in_progress ?? 0}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/assets" className="btn-secondary rounded-lg px-4 py-2 text-sm">
            ← ທະບຽນອຸປະກອນ
          </Link>
          <ExportMenu dataset="recovery" label="ດຶງລາຍການທວງ" />
        </div>
      </div>

      <nav className="mt-4 flex flex-wrap gap-1.5">
        {[
          {
            label: 'ຍັງບໍ່ໄດ້ຕິດຕໍ່',
            href: '/assets/recovery',
            count: stats?.pending,
            alert: true,
            on: filters.status === 'pending' && filters.reason === 'all',
          },
          {
            label: 'ອອກໄປແລ້ວ',
            href: '/assets/recovery?reason=former&status=all',
            count: stats?.former,
            alert: true,
            on: filters.reason === 'former',
          },
          {
            // ແຍກຈາກ "ອອກໄປແລ້ວ" ເພາະລະບົບບອກບໍ່ໄດ້ວ່າຄົນນີ້ອອກແທ້ບໍ —
            // ຮູ້ພຽງວ່າລະຫັດນີ້ບໍ່ມີໃນທະບຽນ HR. ອາດເປັນຄົນໃໝ່ທີ່ຍັງບໍ່ຂຶ້ນທະບຽນ
            // ຈຶ່ງບໍ່ຄວນທວງແບບ "ເຈົ້າອອກໄປແລ້ວ" ໂດຍບໍ່ກວດກ່ອນ
            label: 'ບໍ່ພົບໃນທະບຽນ HR',
            href: '/assets/recovery?reason=unknown_employee&status=all',
            count: stats?.unknown_employee,
            alert: true,
            on: filters.reason === 'unknown_employee',
          },
          {
            label: 'ຄ້າງເກີນ 1 ປີ',
            href: '/assets/recovery?reason=long_held&status=all',
            count: stats?.long_held,
            alert: false,
            on: filters.reason === 'long_held',
          },
          {
            label: 'ທັງໝົດ',
            href: '/assets/recovery?status=all',
            count: stats?.total,
            alert: false,
            on: filters.status === 'all' && filters.reason === 'all',
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

      <form className="glass-card mt-5 flex flex-wrap items-end gap-3 rounded-xl p-4">
        {filters.reason !== 'all' && (
          <input type="hidden" name="reason" value={filters.reason} />
        )}
        {filters.status !== 'pending' && (
          <input type="hidden" name="status" value={filters.status} />
        )}
        <label className="flex flex-col gap-1 text-xs text-muted">
          ຄົ້ນຫາ
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="ຊື່ຄົນ, ອຸປະກອນ, ພະແນກ"
            className="input w-64 rounded-lg px-3 py-1.5 text-sm"
          />
        </label>
        <button type="submit" className="btn-secondary rounded-lg px-4 py-1.5 text-sm">
          ຄົ້ນຫາ
        </button>
      </form>

      <div className="glass-card mt-5 overflow-x-auto rounded-xl">
        <table className="w-full text-sm">
          <thead className="border-b border-line text-left text-muted">
            <tr>
              <th className="px-4 py-2.5 font-medium">ຜູ້ຖືຄອງ</th>
              <th className="px-4 py-2.5 font-medium">ອຸປະກອນ</th>
              <th className="px-4 py-2.5 font-medium">ຢືມເມື່ອ</th>
              <th className="px-4 py-2.5 text-right font-medium">ຖືມາແລ້ວ</th>
              <th className="px-4 py-2.5 font-medium">ສະຖານະທວງ</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {targetPage.items.map((target) => (
              <RecoveryRow
                key={`${target.asset_code}-${target.emp_code}`}
                target={target}
              />
            ))}

            {targetPage.items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  ບໍ່ມີລາຍການທີ່ຕ້ອງທວງຄືນ 🎉
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination {...targetPage} query={params} />

      <p className="mt-4 text-xs text-faint">
        ລາຍການນີ້ຄິດອັດຕະໂນມັດຈາກ: ຜູ້ຖືຄອງທີ່ບໍ່ມີໃນທະບຽນພະນັກງານແລ້ວ ຫຼື
        ຖືເຄື່ອງມາເກີນ 1 ປີ · ວັນທີແບບ dd-MM-yyyy · ອັບເດດ{' '}
        {safeDate(new Date().toISOString())}
      </p>
    </div>
  )
}

function pick(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

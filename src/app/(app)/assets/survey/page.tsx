import Link from 'next/link'
import { requireUser } from '@/lib/auth/session'
import { getSurveyStats, paginateSurvey } from '@/lib/assets/stock'
import { getLendableLocations } from '@/lib/assets/queries'
import Pagination from '@/components/pagination'
import { pageNumber } from '@/lib/pagination'
import SurveyRow from './survey-row'

export const metadata = { title: 'ສຳຫຼວດອຸປະກອນ' }

export default async function SurveyPage({
  searchParams,
}: PageProps<'/assets/survey'>) {
  const params = await searchParams
  await requireUser()

  const filters = {
    state: pick(params.state) || 'unchecked',
    q: pick(params.q),
    location: pick(params.location),
  }

  const [surveyPage, stats, locations] = await Promise.all([
    paginateSurvey(filters, pageNumber(params.page)),
    getSurveyStats(),
    getLendableLocations(),
  ])

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          ກວດແລ້ວ {stats?.checked ?? 0} / {stats?.total ?? 0} ເຄື່ອງ · ຢູ່ໃນສາງ{' '}
          {stats?.in_stock ?? 0} · ຢູ່ກັບຜູ້ໃຊ້ {stats?.with_user ?? 0} · ຫາບໍ່ພົບ{' '}
          <span className="text-red-600 dark:text-red-400">{stats?.missing ?? 0}</span>
        </p>
        <Link href="/assets" className="btn-secondary rounded-lg px-4 py-2 text-sm">
          ← ທະບຽນອຸປະກອນ
        </Link>
      </div>

      <nav className="mt-4 flex flex-wrap gap-1.5">
        {[
          {
            label: 'ຍັງບໍ່ໄດ້ກວດ',
            href: '/assets/survey',
            count: stats?.unchecked,
            on: filters.state === 'unchecked',
          },
          {
            label: 'ບໍ່ເຄີຍມີໃບຢືມ',
            href: '/assets/survey?state=never_lent',
            count: stats?.never_lent,
            on: filters.state === 'never_lent',
          },
          {
            label: 'ຢູ່ໃນສາງ',
            href: '/assets/survey?state=in_stock',
            count: stats?.in_stock,
            on: filters.state === 'in_stock',
          },
          {
            label: 'ຢູ່ກັບຜູ້ໃຊ້',
            href: '/assets/survey?state=with_user',
            count: stats?.with_user,
            on: filters.state === 'with_user',
          },
          {
            label: 'ທັງໝົດ',
            href: '/assets/survey?state=all',
            count: stats?.total,
            on: filters.state === 'all',
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
                tab.on ? 'bg-white/25' : 'bg-brand-blue/10 text-muted'
              }`}
            >
              {tab.count ?? 0}
            </span>
          </Link>
        ))}
      </nav>

      <form className="glass-card mt-5 flex flex-wrap items-end gap-3 rounded-xl p-4">
        {filters.state !== 'unchecked' && (
          <input type="hidden" name="state" value={filters.state} />
        )}
        <label className="flex flex-col gap-1 text-xs text-muted">
          ຄົ້ນຫາ
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="ລະຫັດ, ຊື່, S/N"
            className="input w-56 rounded-lg px-3 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          ສະຖານທີ່ຕາມທະບຽນ
          <select
            name="location"
            defaultValue={filters.location}
            className="input w-56 rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="">ທຸກສະຖານທີ່</option>
            {locations.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name} ({l.total})
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn-secondary rounded-lg px-4 py-1.5 text-sm">
          ກັ່ນຕອງ
        </button>
      </form>

      <div className="glass-card mt-5 overflow-x-auto rounded-xl">
        <table className="w-full text-sm">
          <thead className="border-b border-line text-left text-muted">
            <tr>
              <th className="px-4 py-2.5 font-medium">ອຸປະກອນ</th>
              <th className="px-4 py-2.5 font-medium">ສະຖານທີ່ຕາມທະບຽນ</th>
              <th className="px-4 py-2.5 font-medium">ສະຖານະຈິງ</th>
              <th className="px-4 py-2.5 font-medium">ກວດເມື່ອ</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {surveyPage.items.map((row) => (
              <SurveyRow key={row.asset_code} row={row} />
            ))}

            {surveyPage.items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted">
                  ບໍ່ພົບອຸປະກອນຕາມເງື່ອນໄຂທີ່ເລືອກ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination {...surveyPage} query={params} />

      <p className="mt-4 text-xs text-faint">
        ໃຊ້ໜ້ານີ້ຕອນໄປກວດຂອງຈິງ — ໝາຍວ່າເຄື່ອງຢູ່ໃສແທ້ ເພາະທະບຽນ ERP
        ບອກໄດ້ພຽງສະຖານທີ່ຕັ້ງ ບໍ່ໄດ້ບອກວ່າຢູ່ໃນສາງ ຫຼື ຢູ່ກັບຄົນ
      </p>
    </div>
  )
}

function pick(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

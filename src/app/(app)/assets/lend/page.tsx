import Link from 'next/link'
import { requireUser } from '@/lib/auth/session'
import {
  getLendableAssets,
  getLendableLocations,
  getOpenLoanStats,
  getOpenLoans,
} from '@/lib/assets/queries'
import { getAllEmployees } from '@/lib/tickets/queries'
import ExportMenu from '@/components/export-menu'
import { safeDate } from '@/lib/assets/model'
import LendPanel from './lend-panel'
import ReturnRow from './return-row'

export const metadata = { title: 'ບັນທຶກການຢືມ–ຄືນ' }

export default async function LendPage({ searchParams }: PageProps<'/assets/lend'>) {
  const params = await searchParams
  await requireUser()

  const tab = pick(params.tab) || 'lend'
  const source = pick(params.source)
  const q = pick(params.q)

  const [assets, employees, openLoans, locations, loanStats] = await Promise.all([
    getLendableAssets(),
    getAllEmployees(),
    getOpenLoans({ source, q }),
    getLendableLocations(),
    getOpenLoanStats(),
  ])

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          ອຸປະກອນທີ່ຢືມໄດ້ {assets.length} ເຄື່ອງ · ໃບຢືມຄ້າງທັງໝົດ{' '}
          {loanStats?.total ?? 0} ໃບ (ຈາກ ERP {loanStats?.erp ?? 0} · ຈາກລະບົບນີ້{' '}
          {loanStats?.it ?? 0})
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/assets" className="btn-secondary rounded-lg px-4 py-2 text-sm">
            ← ທະບຽນອຸປະກອນ
          </Link>
          <ExportMenu dataset="loans" label="ດຶງໃບຢືມຄ້າງ" />
        </div>
      </div>

      <nav className="mt-4 flex flex-wrap gap-1.5">
        {[
          { label: 'ອອກໃບຢືມ', href: '/assets/lend', on: tab === 'lend' },
          {
            label: 'ບັນທຶກການຄືນ',
            href: '/assets/lend?tab=return',
            count: Number(loanStats?.total ?? 0),
            on: tab === 'return',
          },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            aria-current={item.on ? 'page' : undefined}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm transition ${
              item.on
                ? 'brand-gradient-cool font-medium text-white shadow-[0_6px_16px_#2c6fb640]'
                : 'btn-secondary hover-surface'
            }`}
          >
            {item.label}
            {item.count !== undefined && (
              <span
                className={`rounded-full px-1.5 text-xs ${
                  item.on ? 'bg-white/25' : 'bg-brand-blue/10 text-muted'
                }`}
              >
                {item.count}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {tab === 'lend' ? (
        <LendPanel assets={assets} employees={employees} locations={locations} />
      ) : (
        <>
          <form className="o-filter-bar mt-3">
            <input type="hidden" name="tab" value="return" />
            <label className="flex flex-col gap-1 text-xs text-muted">
              ແຫຼ່ງໃບຢືມ
              <select
                name="source"
                defaultValue={source}
                className="input w-52 rounded-lg px-3 py-1.5 text-sm"
              >
                <option value="">ທັງໝົດ ({loanStats?.total ?? 0})</option>
                <option value="erp">ຈາກ ERP ({loanStats?.erp ?? 0})</option>
                <option value="it">ຈາກລະບົບນີ້ ({loanStats?.it ?? 0})</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">
              ຄົ້ນຫາ
              <input
                name="q"
                defaultValue={q}
                placeholder="ເລກໃບ, ອຸປະກອນ, ຊື່ຜູ້ຢືມ"
                className="input w-64 rounded-lg px-3 py-1.5 text-sm"
              />
            </label>
            <button
              type="submit"
              className="btn-secondary rounded-lg px-4 py-1.5 text-sm"
            >
              ກັ່ນຕອງ
            </button>
          </form>

          <div className="o-list-wrap mt-3 overflow-x-auto">
            <table className="o-list w-full text-[13px]">
              <thead className="border-b border-line text-left text-muted">
                <tr>
                  <th className="px-3 py-1.5 font-medium">ໃບຢືມ</th>
                  <th className="px-3 py-1.5 font-medium">ອຸປະກອນ</th>
                  <th className="px-3 py-1.5 font-medium">ຜູ້ຢືມ</th>
                  <th className="px-3 py-1.5 font-medium">ຢືມເມື່ອ</th>
                  <th className="px-3 py-1.5 font-medium">ຄາດຄືນ</th>
                  <th className="px-3 py-1.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {openLoans.map((loan) => (
                  <ReturnRow
                    key={`${loan.source}-${loan.borrow_doc_no}-${loan.asset_code}`}
                    loan={loan}
                  />
                ))}

                {openLoans.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted">
                      ບໍ່ມີໃບຢືມຄ້າງຕາມເງື່ອນໄຂທີ່ເລືອກ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-xs text-faint">
            ໃບຢືມເກົ່າຈາກ ERP ກໍປິດຢູ່ນີ້ໄດ້ — ລະບົບຈະອອກໃບຄືນເລກ RTIT… ຂອງ IT
            ໄວ້ທັບໃບຢືມນັ້ນ ໂດຍບໍ່ແກ້ຂໍ້ມູນໃນ ERP · ວັນທີແບບ dd-MM-yyyy · ວັນນີ້{' '}
            {safeDate(new Date().toISOString())}
          </p>
        </>
      )}
    </div>
  )
}

function pick(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

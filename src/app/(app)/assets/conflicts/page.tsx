import Link from 'next/link'
import { requireModuleView } from '@/lib/auth/session'
import {
  getConflictStats,
  listDateErrors,
  listLoanConflicts,
} from '@/lib/assets/conflicts'
import { safeDate } from '@/lib/assets/model'
import ExportMenu from '@/components/export-menu'

export const metadata = { title: 'ໃບຢືມທີ່ຂັດກັນ' }

export default async function ConflictsPage() {
  await requireModuleView('assets')

  const [rows, dateErrors, stats] = await Promise.all([
    listLoanConflicts(),
    listDateErrors(),
    getConflictStats(),
  ])

  // ຈັດເປັນກຸ່ມຕໍ່ເຄື່ອງ ເພື່ອໃຫ້ເຫັນວ່າໃຜຢືມຕໍ່ໃຜ
  const byAsset = new Map<string, typeof rows>()
  for (const r of rows) {
    const list = byAsset.get(r.asset_code) ?? []
    list.push(r)
    byAsset.set(r.asset_code, list)
  }

  return (
    <div className="w-full">
      <div className="o-page-actions">
        <p className="text-sm text-muted">
          <span className="font-medium text-red-600 dark:text-red-400">
            {stats?.assets ?? 0} ເຄື່ອງ
          </span>{' '}
          ຖືກໃຫ້ຢືມຕໍ່ໂດຍທີ່ຄົນເກົ່າຍັງບໍ່ຄືນ · ໃບຢືມຄ້າງລວມ {stats?.loans ?? 0} ໃບ ·
          ຫຼາຍສຸດ {stats?.worst ?? 0} ໃບຕໍ່ເຄື່ອງ
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/assets" className="btn-secondary rounded px-3 py-1.5 text-[13px]">
            ← ທະບຽນອຸປະກອນ
          </Link>
          <ExportMenu dataset="conflicts" label="ດຶງລາຍການ" />
        </div>
      </div>

      <p className="mt-4 rounded-lg bg-brand-orange/10 px-4 py-3 text-sm text-body">
        ໜ້າ &quot;ຜູ້ຖືຄອງອຸປະກອນ&quot; ສະແດງພຽງຜູ້ຢືມລ່າສຸດຕໍ່ເຄື່ອງ ຈຶ່ງ
        <strong> ເຊື່ອງຜູ້ຖືອື່ນໄວ້ {stats?.hidden ?? 0} ຄົນ</strong> —
        ລາຍຊື່ຄົບຢູ່ນີ້. ວິທີແກ້: ຕິດຕໍ່ຜູ້ຢືມແຕ່ລະຄົນ ຖ້າຜູ້ໃດຄືນເຄື່ອງໄປແລ້ວຈິງ
        ໃຫ້ບັນທຶກການຄືນຢູ່ໜ້າ &quot;ອອກໃບຢືມ–ຄືນ&quot; ເພື່ອປິດໃບນັ້ນ
      </p>

      <div className="mt-5 space-y-4">
        {[...byAsset.entries()].map(([code, loans]) => (
          <section key={code} className="glass-card overflow-hidden rounded-xl">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
              <div>
                <Link
                  href={`/assets/${encodeURIComponent(code)}`}
                  className="font-medium text-fg underline-offset-2 hover:underline"
                >
                  {loans[0].asset_name}
                </Link>
                <p className="font-mono text-xs text-muted">
                  {code}
                  {loans[0].serial_no && ` · ${loans[0].serial_no}`}
                </p>
              </div>
              <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
                ໃບຢືມຄ້າງ {loans.length} ໃບ
              </span>
            </header>

            <ol className="divide-y divide-line">
              {loans.map((loan) => (
                <li
                  key={`${loan.borrow_doc_no}-${loan.emp_code}`}
                  className="flex flex-wrap items-center gap-3 px-4 py-3"
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-xs text-muted">
                    {loan.seq}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="text-body">
                      {loan.emp_name ?? loan.emp_code}
                    </span>
                    {loan.is_former_employee && (
                      <span className="ml-2 rounded-full bg-red-100 px-1.5 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
                        ອອກແລ້ວ
                      </span>
                    )}
                    <span className="block text-xs text-muted">
                      {loan.org_department ?? '—'}
                    </span>
                  </span>

                  <span className="text-xs whitespace-nowrap text-muted">
                    <span className="font-mono">{loan.borrow_doc_no}</span>
                    <span className="block">
                      ຢືມ {safeDate(loan.borrowed_at)} · {loan.days_held} ມື້
                    </span>
                  </span>

                  {loan.is_shown_as_holder ? (
                    <span className="rounded-full bg-brand-sky/20 px-2 py-0.5 text-[11px] text-brand-navy dark:text-brand-sky">
                      ທີ່ໜ້າຈໍສະແດງ
                    </span>
                  ) : (
                    <span className="rounded-full bg-brand-orange/20 px-2 py-0.5 text-[11px] text-brand-orange">
                      ຖືກເຊື່ອງໄວ້
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </section>
        ))}

        {byAsset.size === 0 && (
          <p className="glass-card rounded-xl px-4 py-10 text-center text-muted">
            ບໍ່ພົບໃບຢືມທີ່ຂັດກັນ 🎉
          </p>
        )}
      </div>

      {dateErrors.length > 0 && (
        <section className="glass-card mt-6 rounded-xl">
          <header className="border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold text-fg">
              ວັນທີຜິດປົກກະຕິ ({dateErrors.length})
            </h2>
            <p className="text-xs text-muted">
              ວັນຄືນມາກ່ອນວັນຢືມ — ຂໍ້ມູນໃນ ERP ຜິດ ຄວນແຈ້ງໃຫ້ຜູ້ດູແລ ERP ແກ້
            </p>
          </header>
          <ul className="divide-y divide-line">
            {dateErrors.map((e) => (
              <li key={`${e.borrow_doc_no}-${e.asset_code}`} className="px-4 py-3 text-sm">
                <span className="font-mono text-xs text-muted">{e.borrow_doc_no}</span>{' '}
                <span className="text-fg">{e.asset_name}</span>
                <span className="block text-xs text-muted">
                  {e.emp_name ?? e.emp_code} · ຢືມ {safeDate(e.borrowed_at)} ແຕ່ຄືນ{' '}
                  {safeDate(e.returned_at)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

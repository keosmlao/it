import Link from 'next/link'
import { requireModuleView } from '@/lib/auth/session'
import { paginateDocuments } from '@/lib/assets/queries'
import Pagination from '@/components/pagination'
import { pageNumber } from '@/lib/pagination'
import { safeDate } from '@/lib/assets/model'
import DocKindBadge from '@/components/doc-badge'

export const metadata = { title: 'ເອກະສານຢືມ–ຄືນ' }

export default async function DocumentsPage({
  searchParams,
}: PageProps<'/assets/documents'>) {
  const params = await searchParams
  await requireModuleView('assets')

  const kind = pick(params.kind) || 'all'
  const q = pick(params.q)
  const docPage = await paginateDocuments({ kind, q }, pageNumber(params.page))

  return (
    <div className="w-full">
      <div className="o-page-actions">
        <p className="text-sm text-muted">ພົບ {docPage.total} ໃບ</p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/assets/lend"
            className="btn-primary rounded px-3 py-1.5 text-[13px] font-medium"
          >
            + ອອກໃບຢືມ
          </Link>
          <Link href="/assets" className="btn-secondary rounded px-3 py-1.5 text-[13px]">
            ← ທະບຽນອຸປະກອນ
          </Link>
        </div>
      </div>

      <nav className="mt-4 flex flex-wrap gap-1.5">
        {[
          { label: 'ທັງໝົດ', href: '/assets/documents', on: kind === 'all' },
          {
            label: 'ໃບຢືມ',
            href: '/assets/documents?kind=borrow',
            on: kind === 'borrow',
          },
          {
            label: 'ໃບຄືນ',
            href: '/assets/documents?kind=return',
            on: kind === 'return',
          },
        ].map((tab) => (
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
        {kind !== 'all' && <input type="hidden" name="kind" value={kind} />}
        <label className="flex flex-col gap-1 text-xs text-muted">
          ຄົ້ນຫາ
          <input
            name="q"
            defaultValue={q}
            placeholder="ເລກໃບ, ຊື່ຜູ້ຢືມ, ພະແນກ, ເຫດຜົນ, ໝາຍເຫດ"
            className="input w-72 rounded px-2 py-1 text-[13px]"
          />
        </label>
        <button type="submit" className="btn-secondary rounded px-3 py-1.5 text-[13px]">
          ຄົ້ນຫາ
        </button>
      </form>

      <div className="o-list-wrap mt-3 overflow-x-auto">
        <table className="o-list w-full text-[13px]">
          <thead className="border-b border-line text-left text-muted">
            <tr>
              <th className="px-3 py-1.5 font-medium">ເລກໃບ</th>
              <th className="px-3 py-1.5 font-medium">ປະເພດ</th>
              <th className="hidden px-3 py-1.5 font-medium sm:table-cell">ວັນທີ</th>
              <th className="hidden px-3 py-1.5 font-medium md:table-cell">ຜູ້ຢືມ</th>
              <th className="hidden px-3 py-1.5 font-medium lg:table-cell">
                ເຫດຜົນ / ໝາຍເຫດ
              </th>
              <th className="px-3 py-1.5 text-right font-medium">ລາຍການ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {docPage.items.map((doc) => (
              <tr key={doc.doc_no} className="hover-surface transition">
                <td className="px-3 py-1.5 whitespace-nowrap">
                  <Link
                    href={`/assets/documents/${encodeURIComponent(doc.doc_no)}`}
                    className="font-mono text-xs font-medium text-fg underline-offset-2 hover:underline"
                  >
                    {doc.doc_no}
                  </Link>
                  {doc.source === 'it' && (
                    <span className="ml-1.5 rounded-full bg-brand-blue/10 px-1.5 text-[10px] text-brand-blue dark:text-brand-sky">
                      IT
                    </span>
                  )}
                  {/* ຖັນທີ່ເຊື່ອງຢູ່ຈໍນ້ອຍ — ຍ້າຍລົງມາຢູ່ນີ້ແທນ */}
                  <div className="text-xs text-muted md:hidden">
                    <span className="sm:hidden">{safeDate(doc.doc_date)} · </span>
                    {doc.emp_name ?? doc.emp_code}
                  </div>
                </td>
                <td className="px-3 py-1.5 whitespace-nowrap">
                  <DocKindBadge kind={doc.doc_kind} />
                </td>
                <td className="hidden px-3 py-1.5 text-xs whitespace-nowrap text-muted sm:table-cell">
                  {safeDate(doc.doc_date)}
                </td>
                <td className="hidden px-3 py-1.5 md:table-cell">
                  <span className="text-body">{doc.emp_name ?? doc.emp_code}</span>
                  <div className="text-xs text-muted">
                    {doc.department_name ?? '—'}
                  </div>
                </td>
                <td className="hidden max-w-md px-3 py-1.5 lg:table-cell">
                  {doc.reason && (
                    <span className="block truncate text-body">{doc.reason}</span>
                  )}
                  {doc.remark && (
                    <span className="block truncate text-xs text-muted">
                      {doc.remark}
                    </span>
                  )}
                  {!doc.reason && !doc.remark && (
                    <span className="text-faint">—</span>
                  )}
                </td>
                <td className="px-3 py-1.5 text-right text-muted">
                  {doc.item_count}
                </td>
              </tr>
            ))}

            {docPage.items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  ບໍ່ພົບເອກະສານ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination {...docPage} query={params} />
    </div>
  )
}

function pick(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

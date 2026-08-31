import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireMenuView } from '@/lib/auth/session'
import { getDocument, getDocumentItems } from '@/lib/assets/queries'
import { safeDate } from '@/lib/assets/model'
import DocKindBadge from '@/components/doc-badge'
import PrintButton from './print-button'

/** ອຸປະກອນເສີມທີ່ໃຫ້ໄປພ້ອມ — ຕິກໄວ້ໃນເອກະສານ ERP */
const ACCESSORIES = [
  { key: 'has_power', label: 'ສາຍສາກ' },
  { key: 'has_mouse', label: 'ເມົ້າ' },
  { key: 'has_keyboard', label: 'ແປ້ນພິມ' },
  { key: 'has_headphone', label: 'ຫູຟັງ' },
  { key: 'has_bag', label: 'ກະເປົາ' },
  { key: 'has_phone_number', label: 'ເບີໂທ' },
  { key: 'has_email', label: 'ອີເມວ' },
] as const

export default async function DocumentPage({
  params,
}: PageProps<'/assets/documents/[docNo]'>) {
  const { docNo } = await params
  await requireMenuView('/assets/documents')

  const decoded = decodeURIComponent(docNo)
  const [doc, items] = await Promise.all([
    getDocument(decoded),
    getDocumentItems(decoded),
  ])
  if (!doc) notFound()

  const isBorrow = doc.doc_kind === 'borrow'

  return (
    <div className="w-full">
      <div className="o-page-actions print:hidden">
        <Link
          href="/assets/documents"
          className="text-sm text-muted underline-offset-2 hover:underline"
        >
          ← ກັບໄປລາຍການເອກະສານ
        </Link>
        <PrintButton />
      </div>

      <article className="glass-card mt-4 rounded-xl p-6 print:border-0 print:shadow-none">
        {/* ---- ຫົວເອກະສານ ---- */}
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
          <div>
            <p className="text-xs font-semibold tracking-wider text-muted uppercase">
              ODIEN Group · ພະແນກໄອທີ
            </p>
            <h2 className="mt-1 text-2xl font-bold text-fg">
              {isBorrow ? 'ໃບຢືມອຸປະກອນ' : 'ໃບຄືນອຸປະກອນ'}
            </h2>
            <p className="mt-1 flex items-center gap-2">
              <span className="font-mono text-sm text-body">{doc.doc_no}</span>
              <DocKindBadge kind={doc.doc_kind} />
              {doc.source === 'it' && (
                <span className="rounded-full bg-brand-blue/10 px-2 py-0.5 text-[11px] text-brand-blue dark:text-brand-sky">
                  ອອກຈາກລະບົບນີ້
                </span>
              )}
            </p>
          </div>

          <dl className="text-right text-sm">
            <div>
              <dt className="text-xs text-muted">ວັນທີເອກະສານ</dt>
              <dd className="text-fg">{safeDate(doc.doc_date)}</dd>
            </div>
          </dl>
        </header>

        {/* ---- ຂໍ້ມູນຜູ້ຢືມ ---- */}
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="ຜູ້ຢືມ" value={doc.emp_name ?? doc.emp_code} />
          <Field label="ລະຫັດພະນັກງານ" value={doc.emp_code} mono />
          <Field label="ພະແນກ" value={doc.department_name} />
          <Field
            label={isBorrow ? 'ວັນທີຢືມ' : 'ວັນທີຄືນ'}
            value={safeDate(isBorrow ? doc.from_date : doc.to_date)}
          />
          {doc.anticipate_return && (
            <Field label="ຄາດວ່າຈະຄືນ" value={safeDate(doc.anticipate_return)} />
          )}
          <Field label="ຜູ້ອອກເອກະສານ" value={doc.creator_name ?? doc.creator_code} />
          {doc.approver_name && (
            <Field label="ຜູ້ອະນຸມັດ" value={doc.approver_name} />
          )}
        </dl>

        {(doc.reason || doc.remark) && (
          <div className="mt-5 space-y-3 border-t border-line pt-4">
            {doc.reason && (
              <div>
                <p className="text-xs text-muted">ເຫດຜົນ</p>
                <p className="mt-0.5 text-sm whitespace-pre-wrap text-body">
                  {doc.reason}
                </p>
              </div>
            )}
            {doc.remark && (
              <div>
                <p className="text-xs text-muted">ໝາຍເຫດ / ອຸປະກອນທີ່ໃຫ້ໄປພ້ອມ</p>
                <p className="mt-0.5 text-sm whitespace-pre-wrap text-body">
                  {doc.remark}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ---- ລາຍການເຄື່ອງ ---- */}
        <h3 className="mt-6 mb-2 text-sm font-semibold text-fg">
          ລາຍການອຸປະກອນ ({items.length})
        </h3>

        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="o-list w-full text-[13px]">
            <thead className="border-b border-line text-left text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">ລະຫັດ</th>
                <th className="px-3 py-2 font-medium">ອຸປະກອນ</th>
                <th className="hidden px-3 py-2 font-medium md:table-cell">Serial</th>
                <th className="hidden px-3 py-2 font-medium sm:table-cell">
                  ອຸປະກອນເສີມ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((item) => {
                const extras = ACCESSORIES.filter((a) => item[a.key])

                return (
                  <tr key={`${item.doc_no}-${item.asset_code}`}>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <Link
                        href={`/assets/${encodeURIComponent(item.asset_code)}`}
                        className="font-mono text-xs text-fg underline-offset-2 hover:underline"
                      >
                        {item.asset_code}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-fg">
                      {item.asset_name}
                      <div className="text-xs text-muted">
                        {[item.category_name, item.brand, item.model]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </div>
                      {item.ref_doc_no && (
                        <div className="text-xs text-muted">
                          ອ້າງອີງໃບຢືມ{' '}
                          <Link
                            href={`/assets/documents/${encodeURIComponent(item.ref_doc_no)}`}
                            className="font-mono underline-offset-2 hover:underline"
                          >
                            {item.ref_doc_no}
                          </Link>
                        </div>
                      )}
                    </td>
                    <td className="hidden px-3 py-2 font-mono text-xs text-muted md:table-cell">
                      {item.serial_no ?? '—'}
                    </td>
                    <td className="hidden px-3 py-2 sm:table-cell">
                      {extras.length > 0 ? (
                        <span className="flex flex-wrap gap-1">
                          {extras.map((a) => (
                            <span
                              key={a.key}
                              className="rounded-full bg-brand-blue/10 px-2 py-0.5 text-xs text-brand-blue dark:text-brand-sky"
                            >
                              {a.label}
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span className="text-xs text-faint">—</span>
                      )}
                      {item.remark && (
                        <div className="mt-1 text-xs text-muted">{item.remark}</div>
                      )}
                    </td>
                  </tr>
                )
              })}

              {items.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-muted">
                    ບໍ່ມີລາຍການໃນເອກະສານນີ້
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ---- ບ່ອນເຊັນ ---- */}
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          {['ຜູ້ຢືມ', 'ຜູ້ອອກເອກະສານ', 'ຜູ້ອະນຸມັດ'].map((role) => (
            <div key={role} className="text-center">
              <div className="mx-auto h-12 border-b border-line" />
              <p className="mt-2 text-xs text-muted">{role}</p>
              <p className="text-xs text-faint">ວັນທີ ........./........./.........</p>
            </div>
          ))}
        </div>
      </article>
    </div>
  )
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string | null
  mono?: boolean
}) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`mt-0.5 text-sm text-fg ${mono ? 'font-mono' : ''}`}>
        {value || '—'}
      </dd>
    </div>
  )
}

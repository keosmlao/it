import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth/session'
import { getAsset, getAssetHistory, getAssetRepairs } from '@/lib/assets/queries'
import {
  DATE_SOURCE_NOTE,
  REPAIR_STATUS_LABEL_LO,
  WARRANTY_LABEL_LO,
  WARRANTY_STYLE,
  formatMoney,
  safeDate,
} from '@/lib/assets/model'
import { getAllEmployees } from '@/lib/tickets/queries'
import SpecForm from './spec-form'
import { LendForm, ReturnForm } from './loan-form'
import RepairForm from './repair-form'

export default async function AssetDetailPage({ params }: PageProps<'/assets/[id]'>) {
  const { id } = await params
  await requireUser()

  const asset = await getAsset(decodeURIComponent(id))
  if (!asset) notFound()

  const [history, repairs, employees] = await Promise.all([
    getAssetHistory(asset.asset_code),
    getAssetRepairs(asset.asset_code),
    getAllEmployees(),
  ])

  const info = [
    ['ປະເພດ', asset.category_name],
    ['ຍີ່ຫໍ້/ຮຸ່ນ', [asset.brand, asset.model].filter(Boolean).join(' · ')],
    ['Serial', asset.serial_no],
    ['MAC', asset.mac_address],
    ['ຜູ້ຖື', asset.holder_name],
    ['ພະແນກ', asset.holder_department],
    ['ສະຖານທີ່', asset.location_name],
    ['ລົງທະບຽນ', safeDate(asset.registered_at)],
  ]

  const spec = [
    ['CPU', asset.cpu],
    ['RAM', asset.ram],
    ['ດິສກ໌', asset.storage],
    ['ກາດຈໍ', asset.gpu],
    ['ລະບົບປະຕິບັດການ', asset.os],
    ['ໜ້າຈໍ', asset.screen],
  ]

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
      <div className="min-w-0 space-y-5">
        <section className="glass-card rounded-xl p-5">
          <p className="font-mono text-xs text-muted">{asset.asset_code}</p>
          <h2 className="mt-1 text-xl font-bold text-fg">{asset.name}</h2>

          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            {info.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted">{label}</dt>
                <dd className="mt-1 text-sm text-fg">{value || '—'}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="glass-card rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-fg">Spec ເຄື່ອງ</h2>
            {!asset.has_spec && (
              <span className="text-xs text-faint">ຍັງບໍ່ໄດ້ປ້ອນ</span>
            )}
          </div>

          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {spec.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted">{label}</dt>
                <dd className="mt-1 text-sm text-fg">{value || '—'}</dd>
              </div>
            ))}
          </dl>

          {asset.spec_note && (
            <p className="mt-4 border-t border-line pt-3 text-sm whitespace-pre-wrap text-body">
              {asset.spec_note}
            </p>
          )}

          <SpecForm asset={asset} />
        </section>

        <section className="glass-card rounded-xl p-5">
          <h2 className="font-semibold text-fg">
            ປະຫວັດການສ້ອມ ({repairs.length})
          </h2>

          {repairs.length === 0 ? (
            <p className="mt-4 text-sm text-muted">ເຄື່ອງນີ້ຍັງບໍ່ເຄີຍສົ່ງສ້ອມ</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {repairs.map((r) => (
                <li
                  key={`${r.source}-${r.ref_no}`}
                  className="border-l-2 border-brand-orange/40 pl-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-fg">{r.issue}</span>
                    <span className="rounded-full bg-brand-blue/10 px-2 py-0.5 text-[11px] text-muted">
                      {r.source === 'erp' ? 'ERP' : 'IT'}
                    </span>
                    {r.status !== 'done' && (
                      <span className="rounded-full bg-brand-orange/20 px-2 py-0.5 text-[11px] font-medium text-brand-orange">
                        {REPAIR_STATUS_LABEL_LO[r.status]}
                      </span>
                    )}
                  </div>
                  {r.action && (
                    <p className="text-xs text-body">ດຳເນີນການ: {r.action}</p>
                  )}
                  <p className="font-mono text-xs text-muted">
                    {r.ref_no} · {safeDate(r.repair_date)}
                    {r.cost && ` · ${formatMoney(r.cost)}`}
                    {r.vendor && ` · ${r.vendor}`}
                  </p>
                  {r.created_by_name && (
                    <p className="text-xs text-faint">ບັນທຶກໂດຍ {r.created_by_name}</p>
                  )}
                </li>
              ))}
            </ol>
          )}

          <RepairForm assetCode={asset.asset_code} />
        </section>
      </div>

      <div className="space-y-5">
        <section className="glass-card rounded-xl p-5">
          <h2 className="font-semibold text-fg">ຜູ້ຖືຄອງປັດຈຸບັນ</h2>

          {asset.holder_name ? (
            <div className="mt-3 flex items-center gap-3">
              <span className="brand-gradient-warm flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white">
                {asset.holder_name.slice(0, 1)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-fg">
                  {asset.holder_name}
                </span>
                <span className="block truncate text-xs text-muted">
                  {asset.holder_department ?? '—'} · ຢືມ{' '}
                  {safeDate(asset.borrowed_at)}
                </span>
                <span className="block font-mono text-xs text-faint">
                  {asset.borrow_doc_no}
                </span>
              </span>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">ຫວ່າງ — ບໍ່ມີໃບຢືມຄ້າງ</p>
          )}

          {!asset.is_assigned && (
            <LendForm assetCode={asset.asset_code} employees={employees} />
          )}

          {asset.is_assigned && asset.holder_source === 'it' && (
            <ReturnForm assetCode={asset.asset_code} />
          )}

          {asset.is_assigned && asset.holder_source === 'erp' && (
            <p className="mt-3 rounded-lg bg-brand-blue/5 px-3 py-2 text-xs text-muted">
              ໃບຢືມນີ້ອອກຈາກລະບົບ ERP — ການຄືນຕ້ອງເຮັດຢູ່ ERP ຕົ້ນທາງ
            </p>
          )}
        </section>

        <section className="glass-card rounded-xl p-5">
          <h2 className="font-semibold text-fg">ການຊື້ ແລະ ປະກັນ</h2>

          <span
            className={`mt-3 inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
              WARRANTY_STYLE[asset.warranty_status]
            }`}
          >
            {WARRANTY_LABEL_LO[asset.warranty_status]}
          </span>

          <dl className="mt-4 space-y-3">
            <Row
              label="ວັນທີຊື້"
              value={safeDate(asset.purchase_date)}
              note={DATE_SOURCE_NOTE[asset.purchase_date_source]}
            />
            <Row label="ປີທີ່ຊື້" value={asset.buy_year?.toString() ?? '—'} />
            <Row label="ລາຄາຊື້" value={formatMoney(asset.purchase_price)} />
            <Row
              label="ປະກັນເຖິງ"
              value={safeDate(asset.warranty_until)}
              note={DATE_SOURCE_NOTE[asset.warranty_source]}
            />
            {asset.warranty_note && (
              <Row label="ໝາຍເຫດ" value={asset.warranty_note} />
            )}
          </dl>

          {asset.type_mismatch && (
            <p className="mt-4 rounded-lg bg-brand-orange/10 px-3 py-2 text-xs text-brand-orange">
              ໝາຍເຫດ: ໃນ ERP ເຄື່ອງນີ້ຖືກຈັດເປັນປະເພດ {asset.type_code}
              ({asset.type_name}) ແຕ່ລະຫັດເປັນອຸປະກອນໄອທີ — ຄວນແກ້ໃນ ERP
            </p>
          )}
        </section>

        <section className="glass-card rounded-xl p-5">
          <h2 className="font-semibold text-fg">ປະຫວັດຢືມ–ຄືນ ({history.length})</h2>

          {history.length === 0 ? (
            <div className="mt-4 rounded-xl bg-brand-blue/5 px-4 py-6 text-center">
              <p className="text-sm text-muted">ເຄື່ອງນີ້ຍັງບໍ່ເຄີຍມີໃບຢືມ–ຄືນ</p>
              <p className="mt-1 text-xs text-faint">
                ໃບຢືມ (BRIT…) ແລະ ໃບຄືນ (RTIT…) ອອກຈາກລະບົບ ERP
              </p>
              <Link
                href="/assets/movements"
                className="btn-secondary mt-3 inline-block rounded-lg px-4 py-2 text-sm"
              >
                ເບິ່ງປະຫວັດຂອງເຄື່ອງອື່ນ →
              </Link>
            </div>
          ) : (
            <ol className="mt-4 space-y-4">
              {history.map((h, i) => (
                <li
                  key={`${h.borrow_doc_no}-${i}`}
                  className={`border-l-2 pl-3 text-sm ${
                    h.is_returned ? 'border-brand-blue/30' : 'border-brand-orange'
                  }`}
                >
                  <p className="text-fg">
                    {h.emp_code ? (
                      <Link
                        href={`/assets/holders/${encodeURIComponent(h.emp_code)}`}
                        className="underline-offset-2 hover:underline"
                      >
                        {h.emp_name ?? '—'}
                      </Link>
                    ) : (
                      (h.emp_name ?? '—')
                    )}
                    {h.department_name && (
                      <span className="text-muted"> · {h.department_name}</span>
                    )}
                  </p>
                  <p className="font-mono text-xs text-muted">
                    {h.borrow_doc_no ?? '—'} · {safeDate(h.borrowed_at)}
                  </p>
                  <p className="text-xs text-faint">
                    {h.is_returned
                      ? `ຄືນແລ້ວ ${safeDate(h.returned_at)}`
                      : 'ກຳລັງຖືຄອງ'}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  note,
}: {
  label: string
  value: string
  note?: string
}) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="text-right">
        <span className="text-body">{value}</span>
        {note && <span className="block text-xs text-faint">{note}</span>}
      </dd>
    </div>
  )
}

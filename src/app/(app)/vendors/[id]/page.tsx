import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import {
  getErpSupplierOptions,
  getVendor,
  getVendorRepairs,
  getVendorSpend,
  getVendorSubscriptions,
} from '@/lib/vendors/queries'
import { formatAmount } from '@/lib/subscriptions/model'
import { formatMoney, safeDate } from '@/lib/assets/model'
import VendorForm from '../vendor-form'
import DocumentPanel from '@/components/document-panel'
import { listDocuments } from '@/lib/attachments/documents'
import VendorActiveToggle from './active-toggle'

export default async function VendorPage({ params }: PageProps<'/vendors/[id]'>) {
  const { id } = await params
  const user = await requireUser()

  const vendor = await getVendor(id)
  if (!vendor) notFound()

  const editable = can.manageSubscriptions(user)
  const [spend, subs, repairs, suppliers, documents] = await Promise.all([
    getVendorSpend(id),
    getVendorSubscriptions(id),
    getVendorRepairs(id),
    editable ? getErpSupplierOptions() : Promise.resolve([]),
    listDocuments('vendor', id),
  ])

  return (
    <div className="w-full">
      <h1 className="text-xl font-semibold text-fg">{vendor.name}</h1>
      <p className="mt-1 text-sm text-muted">
        {vendor.contact_name && `${vendor.contact_name} · `}
        {vendor.phone ?? '—'}
        {vendor.email && ` · ${vendor.email}`}
        {vendor.erp_supplier_name && ` · ERP: ${vendor.erp_supplier_name}`}
      </p>

      <div className="glass-card mt-5 grid gap-4 rounded-xl p-5 sm:grid-cols-2 lg:grid-cols-4">
        <Info label="ເບີແຈ້ງບັນຫາ" value={vendor.support_phone ?? '—'} />
        <Info label="ອີເມວແຈ້ງບັນຫາ" value={vendor.support_email ?? '—'} />
        <Info label="ເວລາໃຫ້ບໍລິການ" value={vendor.support_hours ?? '—'} />
        <Info label="ເງື່ອນໄຂຮັບປະກັນ" value={vendor.sla_note ?? '—'} />
        {vendor.website && (
          <div className="sm:col-span-2">
            <p className="text-xs text-muted">ເວັບໄຊ</p>
            <a
              href={vendor.website}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-brand-blue underline"
            >
              {vendor.website}
            </a>
          </div>
        )}
        {vendor.address && (
          <div className="sm:col-span-2">
            <Info label="ທີ່ຢູ່" value={vendor.address} />
          </div>
        )}
        {vendor.note && (
          <div className="sm:col-span-2 lg:col-span-4">
            <p className="text-xs text-muted">ໝາຍເຫດ</p>
            <p className="mt-0.5 whitespace-pre-wrap text-sm text-body">{vendor.note}</p>
          </div>
        )}
      </div>

      {spend.length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {spend.map((s) => (
            <div key={s.currency} className="glass-card rounded-xl p-4">
              <p className="text-xs text-muted">ຈ່າຍໃຫ້ເຈົ້ານີ້ຕໍ່ປີ ({s.currency})</p>
              <p className="mt-1 text-lg font-semibold text-fg">
                {formatAmount(s.yearly_amount, s.currency)}
              </p>
              <p className="mt-0.5 text-xs text-faint">{s.subscription_count} ສັນຍາ</p>
            </div>
          ))}
        </div>
      )}

      {subs.length > 0 && (
        <div className="glass-card mt-4 rounded-xl">
          <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-fg">
            ສັນຍາເຊົ່າ ({subs.length})
          </h2>
          <div className="divide-line divide-y">
            {subs.map((s) => (
              <Link
                key={s.id}
                href={`/subscriptions/${s.id}`}
                className="hover-surface flex flex-wrap items-center gap-3 px-4 py-2.5 transition"
              >
                <span className="font-mono text-xs text-muted">{s.code}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-fg">
                  {s.service_name}
                </span>
                <span className="text-xs text-muted">
                  ກຳນົດ {safeDate(s.next_due_date)}
                </span>
                <span className="text-sm text-body">
                  {formatAmount(s.amount, s.currency)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {repairs.length > 0 && (
        <div className="glass-card mt-4 rounded-xl">
          <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-fg">
            ໃບສ້ອມ ({repairs.length}) · ລວມ {formatMoney(vendor.repair_cost)} ກີບ
          </h2>
          <div className="divide-line divide-y">
            {repairs.map((r) => (
              <Link
                key={r.id}
                href={`/assets/${r.asset_code}`}
                className="hover-surface flex flex-wrap items-center gap-3 px-4 py-2.5 transition"
              >
                <span className="font-mono text-xs text-muted">{r.asset_code}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-fg">{r.issue}</span>
                <span className="text-xs text-muted">{safeDate(r.repair_date)}</span>
                <span className="text-sm text-body">{formatMoney(r.cost)} ກີບ</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <DocumentPanel
        entityType="vendor"
        entityId={vendor.id}
        documents={documents}
        editable={editable}
        hint="ໃບສະເໜີລາຄາ · ສັນຍາບໍລິການ · ນາມບັດ"
      />

      {editable && (
        <>
          <h2 className="mt-6 text-sm font-semibold text-fg">ແກ້ຂໍ້ມູນຜູ້ຂາຍ</h2>
          <VendorForm suppliers={suppliers} vendor={vendor} />
          <VendorActiveToggle id={vendor.id} isActive={vendor.is_active} />
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

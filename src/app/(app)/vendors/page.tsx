import Link from 'next/link'
import { requireUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { listVendors } from '@/lib/vendors/queries'
import EmptyState from '@/components/empty-state'
import ExportMenu from '@/components/export-menu'
import { formatMoney } from '@/lib/assets/model'

export const metadata = { title: 'ທະບຽນຜູ້ຂາຍ' }

export default async function VendorsPage({ searchParams }: PageProps<'/vendors'>) {
  const params = await searchParams
  const user = await requireUser()

  const q = pick(params.q)
  const showAll = pick(params.all) === '1'
  const vendors = await listVendors({ q, active: showAll ? false : true })
  const editable = can.manageSubscriptions(user)

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {vendors.length} ລາຍ · ເບີແຈ້ງບັນຫາ ແລະ ເງື່ອນໄຂການຮັບປະກັນຢູ່ບ່ອນດຽວ
          ຈຶ່ງບໍ່ຕ້ອງຫາຕອນລະບົບລົ້ມ
        </p>
        <div className="flex flex-wrap gap-2">
          {editable && (
            <Link
              href="/vendors/new"
              className="btn-primary rounded-lg px-4 py-2 text-sm font-medium"
            >
              + ເພີ່ມຜູ້ຂາຍ
            </Link>
          )}
          <ExportMenu dataset="vendors" query={{ q }} />
        </div>
      </div>

      <form className="o-filter-bar mt-3">
        <label className="flex flex-col gap-1 text-xs text-muted">
          ຄົ້ນຫາ
          <input
            name="q"
            defaultValue={q}
            placeholder="ຊື່, ຜູ້ຕິດຕໍ່, ເບີໂທ, ອີເມວ"
            className="input w-64 rounded-lg px-3 py-1.5 text-sm"
          />
        </label>
        <label className="flex items-center gap-2 pb-1.5 text-sm text-body">
          <input
            type="checkbox"
            name="all"
            value="1"
            defaultChecked={showAll}
            className="size-4"
          />
          ລວມທີ່ປິດໃຊ້ງານ
        </label>
        <button type="submit" className="btn-secondary rounded-lg px-4 py-1.5 text-sm">
          ກັ່ນຕອງ
        </button>
      </form>

      {vendors.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            title="ຍັງບໍ່ມີຜູ້ຂາຍໃນທະບຽນ"
            description="ເພີ່ມຜູ້ໃຫ້ບໍລິການອິນເຕີເນັດ, ຮ້ານສ້ອມ, ຕົວແທນຈຳໜ່າຍ ພ້ອມເບີແຈ້ງບັນຫາ"
            action={editable ? 'ເພີ່ມຜູ້ຂາຍ' : undefined}
            href={editable ? '/vendors/new' : undefined}
          />
        </div>
      ) : (
        <div className="glass-card divide-line mt-5 divide-y rounded-xl">
          {vendors.map((v) => (
            <Link
              key={v.id}
              href={`/vendors/${v.id}`}
              className="hover-surface flex flex-wrap items-center gap-3 px-4 py-3 transition"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-fg">
                  {v.name}
                  {v.short_name && <span className="text-muted"> ({v.short_name})</span>}
                  {!v.is_active && (
                    <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-muted dark:bg-white/5">
                      ປິດໃຊ້ງານ
                    </span>
                  )}
                </span>
                <span className="text-xs text-muted">
                  {v.contact_name && `${v.contact_name} · `}
                  {v.support_phone ?? v.phone ?? 'ບໍ່ມີເບີ'}
                  {v.support_hours && ` · ${v.support_hours}`}
                </span>
              </span>
              <span className="text-right text-xs text-muted">
                {Number(v.subscription_count) > 0 && (
                  <span className="block">{v.subscription_count} ສັນຍາເຊົ່າ</span>
                )}
                {Number(v.repair_count) > 0 && (
                  <span className="block">
                    {v.repair_count} ໃບສ້ອມ · {formatMoney(v.repair_cost)} ກີບ
                  </span>
                )}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function pick(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

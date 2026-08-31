import Link from 'next/link'
import { requireMenuView } from '@/lib/auth/session'
import {
  getAssetBrands,
  getAssetCategories,
  getAssetStats,
  paginateAssets,
} from '@/lib/assets/queries'
import Pagination from '@/components/pagination'
import ExportMenu from '@/components/export-menu'
import { pageNumber } from '@/lib/pagination'
import {
  WARRANTY_LABEL_LO,
  WARRANTY_STYLE,
  safeDate,
} from '@/lib/assets/model'

export const metadata = { title: 'ອຸປະກອນ' }

export default async function AssetsPage({ searchParams }: PageProps<'/assets'>) {
  const params = await searchParams
  await requireMenuView('/assets')

  const filters = {
    holding: pick(params.holding),
    category: pick(params.category),
    brand: pick(params.brand),
    source: pick(params.source),
    q: pick(params.q),
  }

  const [assetPage, categories, brands, stats] = await Promise.all([
    paginateAssets(filters, pageNumber(params.page)),
    getAssetCategories(),
    getAssetBrands(),
    getAssetStats(),
  ])
  const assets = assetPage.items

  const tabs = [
    { label: 'ທັງໝົດ', href: '/assets', count: stats?.total, on: !filters.holding },
    {
      label: 'ມີຜູ້ຖືຄອງ',
      href: '/assets?holding=assigned',
      count: stats?.assigned,
      on: filters.holding === 'assigned',
    },
    {
      label: 'ຫວ່າງ',
      href: '/assets?holding=spare',
      count: stats?.spare,
      on: filters.holding === 'spare',
    },
    {
      label: 'ຂອງພະແນກ IT',
      href: '/assets?holding=it',
      count: stats?.owned_by_it,
      on: filters.holding === 'it',
    },
  ]

  return (
    <div className="w-full">
      <div className="o-page-actions">
        <p className="text-sm text-muted">
          ອຸປະກອນໄອທີ {stats?.total ?? 0} ເຄື່ອງ · ກະຈາຍຢູ່ {stats?.departments ?? 0} ພະແນກ
          {' · '}ມີ spec {stats?.with_spec ?? 0}
          {Number(stats?.warranty_expiring ?? 0) > 0 && (
            <span className="text-brand-orange">
              {' · '}ປະກັນໃກ້ໝົດ {stats?.warranty_expiring}
            </span>
          )}
        </p>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/assets/lend"
            className="btn-primary rounded px-3 py-1.5 text-[13px] font-medium"
          >
            + ອອກໃບຢືມ
          </Link>
          <Link
            href="/assets/new"
            className="btn-secondary rounded px-3 py-1.5 text-[13px]"
          >
            + ລົງທະບຽນຊັບສິນ
          </Link>
          <Link
            href="/assets/holders"
            className="btn-secondary rounded px-3 py-1.5 text-[13px]"
          >
            ຜູ້ຖືຄອງ →
          </Link>
          <Link
            href="/assets/movements"
            className="btn-secondary rounded px-3 py-1.5 text-[13px]"
          >
            ປະຫວັດຢືມ–ຄືນ →
          </Link>
          <ExportMenu dataset="assets" query={{ q: filters.q }} />
        </div>
      </div>

      <nav className="mt-4 flex flex-wrap gap-1.5">
        {tabs.map((tab) => (
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

      <form className="o-filter-bar mt-3">
        {filters.holding && (
          <input type="hidden" name="holding" value={filters.holding} />
        )}
        <label className="flex flex-col gap-1 text-xs text-muted">
          ຄົ້ນຫາ
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="ລະຫັດ, ຊື່, S/N, ລຸ້ນ, ຜູ້ຖື"
            className="input w-56 rounded px-2 py-1 text-[13px]"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          ປະເພດ
          <select
            name="category"
            defaultValue={filters.category}
            className="input rounded px-2 py-1 text-[13px]"
          >
            <option value="">ທັງໝົດ</option>
            {categories.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name_lo} ({c.total})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          ຍີ່ຫໍ້
          <select
            name="brand"
            defaultValue={filters.brand}
            className="input rounded px-2 py-1 text-[13px]"
          >
            <option value="">ທັງໝົດ</option>
            {brands.map((b) => (
              <option key={b.brand} value={b.brand}>
                {b.brand} ({b.total})
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn-secondary rounded px-3 py-1.5 text-[13px]">
          ກັ່ນຕອງ
        </button>
      </form>

      <div className="o-list-wrap mt-3 overflow-x-auto">
        <table className="o-list w-full text-[13px]">
          <thead className="border-b border-line text-left text-muted">
            <tr>
              <th className="px-3 py-1.5 font-medium">ລະຫັດ</th>
              <th className="px-3 py-1.5 font-medium">ອຸປະກອນ</th>
              <th className="hidden px-3 py-1.5 font-medium lg:table-cell">ປະເພດ</th>
              <th className="hidden px-3 py-1.5 font-medium xl:table-cell">Serial</th>
              <th className="hidden px-3 py-1.5 font-medium md:table-cell">ຜູ້ຖືຄອງ</th>
              <th className="hidden px-3 py-1.5 font-medium xl:table-cell">ຢືມເມື່ອ</th>
              <th className="hidden px-3 py-1.5 font-medium lg:table-cell">ວັນທີຊື້</th>
              <th className="px-3 py-1.5 font-medium">ປະກັນ</th>
              <th className="hidden px-3 py-1.5 font-medium sm:table-cell">ປະຫວັດ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {assets.map((a) => (
              <tr key={a.asset_code} className="hover-surface transition">
                <td className="px-3 py-1.5 whitespace-nowrap">
                  <Link
                    href={`/assets/${encodeURIComponent(a.asset_code)}`}
                    className="font-mono text-xs font-medium text-fg underline-offset-2 hover:underline"
                  >
                    {a.asset_code}
                  </Link>
                </td>
                <td className="max-w-[16rem] px-3 py-1.5 text-fg">
                  <span className="block truncate">{a.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {[a.brand, a.model].filter(Boolean).join(' · ') || '—'}
                  </span>
                  {/* ຖັນທີ່ເຊື່ອງຢູ່ຈໍນ້ອຍ — ຍ້າຍລົງມາຢູ່ນີ້ແທນ */}
                  <div className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-muted lg:hidden">
                    <span className="text-brand-blue dark:text-brand-sky">
                      {a.category_name}
                    </span>
                    <span className="md:hidden">
                      ·{' '}
                      {a.holder_name
                        ? `${a.holder_name}${
                            a.holder_department ? ` (${a.holder_department})` : ''
                          }`
                        : 'ຢູ່ໃນສາງ'}
                    </span>
                    {a.serial_no && (
                      <span className="font-mono xl:hidden">· {a.serial_no}</span>
                    )}
                  </div>
                </td>
                <td className="hidden px-3 py-1.5 whitespace-nowrap lg:table-cell">
                  <span className="rounded-full bg-brand-blue/10 px-2 py-0.5 text-xs text-brand-blue dark:text-brand-sky">
                    {a.category_name}
                  </span>
                  {a.category_guessed && (
                    <span
                      title="ທະບຽນບໍ່ໄດ້ລະບຸປະເພດ — ຄິດຈາກຊື່ອຸປະກອນ"
                      className="ml-1 text-xs text-faint"
                    >
                      ~
                    </span>
                  )}
                </td>
                <td className="hidden px-3 py-1.5 font-mono text-xs text-muted xl:table-cell">
                  {a.serial_no ?? '—'}
                </td>
                <td className="hidden max-w-[11rem] px-3 py-1.5 md:table-cell">
                  {a.holder_name ? (
                    <>
                      <span className="block truncate text-body">{a.holder_name}</span>
                      <span className="block truncate text-xs text-muted">
                        {a.holder_department}
                      </span>
                    </>
                  ) : (
                    <span className="rounded-full bg-brand-sky/20 px-2 py-0.5 text-xs text-brand-navy dark:text-brand-sky">
                      ຢູ່ໃນສາງ
                    </span>
                  )}
                </td>
                <td className="hidden px-3 py-1.5 text-xs whitespace-nowrap text-muted xl:table-cell">
                  {safeDate(a.borrowed_at)}
                </td>
                <td className="hidden px-3 py-1.5 text-xs whitespace-nowrap text-muted lg:table-cell">
                  {safeDate(a.purchase_date)}
                  {a.purchase_date_source === 'registered' && (
                    <span
                      title="ບໍ່ມີວັນທີຊື້ — ໃຊ້ວັນລົງທະບຽນແທນ"
                      className="ml-1 text-faint"
                    >
                      ~
                    </span>
                  )}
                </td>
                <td className="px-3 py-1.5 whitespace-nowrap">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      WARRANTY_STYLE[a.warranty_status]
                    }`}
                    title={`ປະກັນເຖິງ ${safeDate(a.warranty_until)}${
                      a.warranty_source === 'auto' ? ' (ຄິດ 12 ເດືອນ)' : ''
                    }`}
                  >
                    {WARRANTY_LABEL_LO[a.warranty_status]}
                  </span>
                </td>
                <td className="hidden px-3 py-1.5 whitespace-nowrap sm:table-cell">
                  <Link
                    href={`/assets/${encodeURIComponent(a.asset_code)}`}
                    className="btn-secondary inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs"
                  >
                    ເບິ່ງລາຍລະອຽດ →
                  </Link>
                </td>
              </tr>
            ))}

            {assets.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-muted">
                  ບໍ່ພົບອຸປະກອນຕາມເງື່ອນໄຂທີ່ເລືອກ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination {...assetPage} query={params} />

      <p className="mt-4 text-xs text-faint">
        ຂໍ້ມູນມາຈາກທະບຽນຊັບສິນຂອງບໍລິສັດ (ERP) — ອ່ານຢ່າງດຽວ.
        ການເພີ່ມຊັບສິນ ແລະ ອອກໃບຢືມ–ຄືນ ເຮັດຢູ່ລະບົບ ERP ຕົ້ນທາງ.
      </p>
    </div>
  )
}

function pick(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

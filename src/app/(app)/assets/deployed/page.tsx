import Link from 'next/link'
import { requireModuleView } from '@/lib/auth/session'
import {
  getDeploymentPlaces,
  getDeploymentStats,
  listDeployments,
} from '@/lib/assets/deployment'
import { getLendableAssets } from '@/lib/assets/queries'
import { getAllEmployees } from '@/lib/tickets/queries'
import { getAssetLocations } from '@/lib/assets/deployment'
import { formatMoney, safeDate } from '@/lib/assets/model'
import ExportMenu from '@/components/export-menu'
import DeployPanel from './deploy-panel'
import UndeployButton from './undeploy-button'

export const metadata = { title: 'ອຸປະກອນສ່ວນກາງ' }

export default async function DeployedPage({
  searchParams,
}: PageProps<'/assets/deployed'>) {
  const params = await searchParams
  await requireModuleView('assets')

  const filters = {
    state: pick(params.state) || 'active',
    q: pick(params.q),
    place: pick(params.place),
  }

  const [rows, stats, places, spare, employees, locations] = await Promise.all([
    listDeployments(filters),
    getDeploymentStats(),
    getDeploymentPlaces(),
    getLendableAssets(),
    getAllEmployees(),
    getAssetLocations(),
  ])

  // ຈັດເປັນກຸ່ມຕາມບ່ອນຕິດຕັ້ງ — ເບິ່ງງ່າຍກວ່າຕາຕະລາງຍາວ
  const byPlace = new Map<string, typeof rows>()
  for (const row of rows) {
    const list = byPlace.get(row.place) ?? []
    list.push(row)
    byPlace.set(row.place, list)
  }

  return (
    <div className="w-full">
      <div className="o-page-actions">
        <p className="text-sm text-muted">
          ຕິດຕັ້ງໃຊ້ງານຢູ່ <span className="font-medium text-fg">{stats?.active ?? 0}</span>{' '}
          ເຄື່ອງ ໃນ {stats?.places ?? 0} ບ່ອນ · ມູນຄ່າ{' '}
          {formatMoney(stats?.value ?? null)} ກີບ
          {Number(stats?.no_owner ?? 0) > 0 && (
            <span className="text-brand-orange">
              {' · '}ຍັງບໍ່ມີຜູ້ຮັບຜິດຊອບ {stats?.no_owner}
            </span>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/assets" className="btn-secondary rounded px-3 py-1.5 text-[13px]">
            ← ທະບຽນອຸປະກອນ
          </Link>
          <ExportMenu dataset="deployed" label="ດຶງລາຍການ" />
        </div>
      </div>

      <nav className="mt-4 flex flex-wrap gap-1.5">
        {[
          {
            label: 'ຕິດຕັ້ງຢູ່',
            href: '/assets/deployed',
            count: stats?.active,
            on: filters.state === 'active',
          },
          {
            label: 'ຖອດອອກແລ້ວ',
            href: '/assets/deployed?state=removed',
            count: stats?.removed,
            on: filters.state === 'removed',
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

      <DeployPanel assets={spare} employees={employees} locations={locations} places={places} />

      <form className="o-filter-bar mt-3">
        {filters.state !== 'active' && (
          <input type="hidden" name="state" value={filters.state} />
        )}
        <label className="flex flex-col gap-1 text-xs text-muted">
          ບ່ອນຕິດຕັ້ງ
          <select
            name="place"
            defaultValue={filters.place}
            className="input w-56 rounded px-2 py-1 text-[13px]"
          >
            <option value="">ທຸກບ່ອນ</option>
            {places.map((p) => (
              <option key={p.place} value={p.place}>
                {p.place} ({p.total})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          ຄົ້ນຫາ
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="ລະຫັດ, ຊື່, ບ່ອນ, ຜູ້ຮັບຜິດຊອບ"
            className="input w-64 rounded px-2 py-1 text-[13px]"
          />
        </label>
        <button type="submit" className="btn-secondary rounded px-3 py-1.5 text-[13px]">
          ກັ່ນຕອງ
        </button>
      </form>

      <div className="mt-5 space-y-4">
        {[...byPlace.entries()].map(([place, items]) => (
          <section key={place} className="glass-card overflow-hidden rounded-xl">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
              <h2 className="font-medium text-fg">📍 {place}</h2>
              <span className="text-xs text-muted">{items.length} ເຄື່ອງ</span>
            </header>

            <ul className="divide-y divide-line">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center gap-3 px-4 py-3"
                >
                  <span className="min-w-0 flex-1">
                    <Link
                      href={`/assets/${encodeURIComponent(item.asset_code)}`}
                      className="text-fg underline-offset-2 hover:underline"
                    >
                      {item.asset_name}
                    </Link>
                    <span className="block font-mono text-xs text-muted">
                      {item.asset_code}
                      {item.serial_no && ` · ${item.serial_no}`}
                      {item.mac_address && ` · MAC ${item.mac_address}`}
                    </span>
                    {item.purpose && (
                      <span className="block text-xs text-muted">{item.purpose}</span>
                    )}
                  </span>

                  <span className="text-xs text-muted">
                    {item.responsible_name ? (
                      <>
                        ຜູ້ຮັບຜິດຊອບ
                        <span className="block text-body">{item.responsible_name}</span>
                      </>
                    ) : (
                      <span className="text-brand-orange">ຍັງບໍ່ມີຜູ້ຮັບຜິດຊອບ</span>
                    )}
                  </span>

                  <span className="text-xs whitespace-nowrap text-muted">
                    ຕິດຕັ້ງ {safeDate(item.installed_at)}
                    <span className="block text-[11px] text-faint">
                      {item.days_installed} ມື້
                    </span>
                  </span>

                  {item.removed_at ? (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] text-body dark:bg-slate-700">
                      ຖອດອອກ {safeDate(item.removed_at)}
                    </span>
                  ) : (
                    <UndeployButton assetCode={item.asset_code} place={item.place} />
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}

        {byPlace.size === 0 && (
          <p className="glass-card rounded-xl px-4 py-10 text-center text-muted">
            {filters.state === 'removed'
              ? 'ຍັງບໍ່ມີອຸປະກອນທີ່ຖອດອອກ'
              : 'ຍັງບໍ່ໄດ້ບັນທຶກອຸປະກອນສ່ວນກາງ — ກົດ "+ ຕິດຕັ້ງອຸປະກອນ" ຂ້າງເທິງ'}
          </p>
        )}
      </div>

      <p className="mt-4 text-xs text-faint">
        ອຸປະກອນສ່ວນກາງ (switch, hub, access point, ອຸປະກອນຫ້ອງປະຊຸມ) ບໍ່ມີຜູ້ຢືມເປັນຄົນ
        ແຕ່ຜູກກັບບ່ອນຕິດຕັ້ງ · ເຄື່ອງທີ່ຕິດຕັ້ງຢູ່ຈະບໍ່ປະກົດໃນລາຍການທີ່ໃຫ້ຢືມໄດ້
      </p>
    </div>
  )
}

function pick(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

import Link from 'next/link'
import { requireUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { getSwitchOptions, listSwitchPorts } from '@/lib/network/queries'
import { getAssetOptions } from '@/lib/maintenance/queries'
import EmptyState from '@/components/empty-state'
import PortForm from './port-form'
import PortRow from './port-row'

export const metadata = { title: 'ຜັງພອດສະວິດ' }

export default async function SwitchPortsPage({
  searchParams,
}: PageProps<'/network/ports'>) {
  const params = await searchParams
  const user = await requireUser()
  const editable = can.manageAssets(user)

  const switchCode = pick(params.switch) || 'all'
  const q = pick(params.q)

  const [ports, switches, assets] = await Promise.all([
    listSwitchPorts({ switchCode, q }),
    getSwitchOptions(),
    editable ? getAssetOptions() : Promise.resolve([]),
  ])

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          ສາຍໃດໄປຫ້ອງໃດ — ບັນທຶກໄວ້ແລ້ວບໍ່ຕ້ອງໄລ່ສາຍຕອນມີບັນຫາ
        </p>
        <Link href="/network" className="btn-secondary rounded-lg px-4 py-2 text-sm">
          ← ວົງເນັດ & IP
        </Link>
      </div>

      <form className="o-filter-bar mt-3">
        <label className="flex flex-col gap-1 text-xs text-muted">
          ສະວິດ
          <select
            name="switch"
            defaultValue={switchCode}
            className="input rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="all">ທັງໝົດ</option>
            {switches.map((s) => (
              <option key={s.switch_asset_code} value={s.switch_asset_code}>
                {s.switch_name ?? s.switch_asset_code} ({s.ports} ພອດ)
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          ຄົ້ນຫາ
          <input
            name="q"
            defaultValue={q}
            placeholder="ເລກພອດ, ຫ້ອງ, patch panel"
            className="input w-56 rounded-lg px-3 py-1.5 text-sm"
          />
        </label>
        <button type="submit" className="btn-secondary rounded-lg px-4 py-1.5 text-sm">
          ກັ່ນຕອງ
        </button>
      </form>

      {ports.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            title="ຍັງບໍ່ໄດ້ບັນທຶກຜັງພອດ"
            description="ບັນທຶກວ່າພອດໃດຂອງສະວິດໄປຫ້ອງໃດ ຜ່ານ patch panel ໃດ"
          />
        </div>
      ) : (
        <div className="glass-card divide-line mt-5 divide-y rounded-xl">
          {ports.map((p) => (
            <PortRow key={p.id} port={p} editable={editable} />
          ))}
        </div>
      )}

      {editable && (
        <>
          <h2 className="mt-6 text-sm font-semibold text-fg">ເພີ່ມພອດ</h2>
          <PortForm assets={assets} />
        </>
      )}
    </div>
  )
}

function pick(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

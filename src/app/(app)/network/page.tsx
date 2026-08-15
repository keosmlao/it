import Link from 'next/link'
import { requireUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { getNetworkStats, listSegments } from '@/lib/network/queries'
import { getLocationOptions } from '@/lib/assets/local'
import EmptyState from '@/components/empty-state'
import ExportMenu from '@/components/export-menu'
import SegmentForm from './segment-form'

export const metadata = { title: 'ເຄືອຂ່າຍ & IP' }

export default async function NetworkPage() {
  const user = await requireUser()
  const editable = can.manageAssets(user)

  const [segments, stats, locations] = await Promise.all([
    listSegments(true),
    getNetworkStats(),
    editable ? getLocationOptions() : Promise.resolve([]),
  ])

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {stats?.segments ?? 0} ວົງເນັດ · {stats?.ips ?? 0} IP ໃນທະບຽນ ·{' '}
          {stats?.ports ?? 0} ພອດສະວິດ
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/network/ports"
            className="btn-secondary rounded-lg px-4 py-2 text-sm"
          >
            ຜັງພອດສະວິດ
          </Link>
          <ExportMenu dataset="ip-plan" />
        </div>
      </div>

      {segments.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            title="ຍັງບໍ່ໄດ້ບັນທຶກວົງເນັດ"
            description="ບັນທຶກ VLAN, ຊ່ວງ IP, gateway ແລະ DNS ໄວ້ — ຄົນໃໝ່ເຂົ້າມາ ຫຼື ຄົນເກົ່າລາພັກ ຈະຫາຂໍ້ມູນໄດ້ເອງ"
          />
        </div>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {segments.map((s) => (
            <Link
              key={s.id}
              href={`/network/${s.id}`}
              className="glass-card hover-surface rounded-xl p-5 transition"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-fg">
                  {s.name}
                  {!s.is_active && (
                    <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-muted dark:bg-white/5">
                      ປິດໄວ້
                    </span>
                  )}
                </span>
                <span className="font-mono text-sm text-brand-blue">{s.cidr}</span>
              </div>

              <p className="mt-1 text-xs text-muted">
                {s.vlan_id !== null && `VLAN ${s.vlan_id} · `}
                {s.location_name && `${s.location_name} · `}
                {s.purpose ?? 'ບໍ່ໄດ້ລະບຸການໃຊ້ງານ'}
              </p>

              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <Cell label="Gateway" value={s.gateway ?? '—'} />
                <Cell label="DNS" value={s.dns ?? '—'} />
                <Cell label="DHCP" value={s.dhcp_range ?? '—'} />
              </div>

              <p className="mt-3 text-xs text-muted">
                ລົງທະບຽນ {s.ip_count} IP · ໃຊ້ຢູ່ {s.ip_in_use}
              </p>
            </Link>
          ))}
        </div>
      )}

      {editable && (
        <>
          <h2 className="mt-6 text-sm font-semibold text-fg">ເພີ່ມວົງເນັດ</h2>
          <SegmentForm locations={locations} />
        </>
      )}
    </div>
  )
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-faint">{label}</p>
      <p className="truncate font-mono text-body">{value}</p>
    </div>
  )
}

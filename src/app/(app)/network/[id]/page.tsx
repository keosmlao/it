import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireModuleView } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { getSegment, listIpAssignments } from '@/lib/network/queries'
import { getLocationOptions } from '@/lib/assets/local'
import { getAssetOptions } from '@/lib/maintenance/queries'
import { getEmployeeOptions } from '@/lib/accounts/queries'
import SegmentForm from '../segment-form'
import IpForm from './ip-form'
import IpRow from './ip-row'

export default async function SegmentPage({ params }: PageProps<'/network/[id]'>) {
  const { id } = await params
  const user = await requireModuleView('network')

  const segment = await getSegment(id)
  if (!segment) notFound()

  const editable = can.manageAssets(user)
  const [ips, locations, assets, employees] = await Promise.all([
    listIpAssignments({ segment: id }),
    editable ? getLocationOptions() : Promise.resolve([]),
    editable ? getAssetOptions() : Promise.resolve([]),
    editable ? getEmployeeOptions() : Promise.resolve([]),
  ])

  return (
    <div className="w-full">
      <div className="o-page-actions">
        <div>
          <h1 className="text-xl font-semibold text-fg">{segment.name}</h1>
          <p className="mt-0.5 text-sm text-muted">
            <span className="font-mono text-brand-blue">{segment.cidr}</span>
            {segment.vlan_id !== null && ` · VLAN ${segment.vlan_id}`}
            {segment.location_name && ` · ${segment.location_name}`}
          </p>
        </div>
        <Link href="/network" className="btn-secondary rounded px-3 py-1.5 text-[13px]">
          ← ວົງເນັດທັງໝົດ
        </Link>
      </div>

      <div className="glass-card mt-5 grid gap-4 rounded-xl p-5 sm:grid-cols-2 lg:grid-cols-4">
        <Info label="Gateway" value={segment.gateway ?? '—'} />
        <Info label="DNS" value={segment.dns ?? '—'} />
        <Info label="ຊ່ວງ DHCP" value={segment.dhcp_range ?? '—'} />
        <Info label="ໃຊ້ເຮັດຫຍັງ" value={segment.purpose ?? '—'} />
        {segment.note && (
          <div className="sm:col-span-2 lg:col-span-4">
            <p className="text-xs text-muted">ໝາຍເຫດ</p>
            <p className="mt-0.5 whitespace-pre-wrap text-sm text-body">
              {segment.note}
            </p>
          </div>
        )}
      </div>

      {editable && (
        <IpForm segmentId={segment.id} assets={assets} employees={employees} />
      )}

      <div className="glass-card mt-4 rounded-xl">
        <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-fg">
          ທະບຽນ IP ({ips.length}) · ໃຊ້ຢູ່ {segment.ip_in_use}
        </h2>
        <div className="divide-line divide-y">
          {ips.map((ip) => (
            <IpRow key={ip.id} ip={ip} editable={editable} />
          ))}
          {ips.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted">
              ຍັງບໍ່ໄດ້ລົງທະບຽນ IP ໃນວົງນີ້
            </p>
          )}
        </div>
      </div>

      {editable && (
        <>
          <h2 className="mt-6 text-sm font-semibold text-fg">ແກ້ຂໍ້ມູນວົງເນັດ</h2>
          <SegmentForm locations={locations} segment={segment} />
        </>
      )}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 break-words font-mono text-sm text-body">{value}</p>
    </div>
  )
}

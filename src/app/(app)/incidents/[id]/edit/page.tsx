import { notFound } from 'next/navigation'
import { requireMenuView } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { getIncident, getSubscriptionOptions } from '@/lib/incidents/queries'
import { getAssetOptions } from '@/lib/maintenance/queries'
import IncidentForm from '../../incident-form'

export const metadata = { title: 'ແກ້ເຫດຂັດຂ້ອງ' }

export default async function EditIncidentPage({
  params,
}: PageProps<'/incidents/[id]/edit'>) {
  const { id } = await params
  const user = await requireMenuView('/incidents')
  if (!can.manageAssets(user)) notFound()

  const [incident, subscriptions, assets] = await Promise.all([
    getIncident(id),
    getSubscriptionOptions(),
    getAssetOptions(),
  ])
  if (!incident) notFound()

  return (
    <div className="w-full">
      <p className="font-mono text-xs text-muted">{incident.code}</p>
      <p className="mt-1 text-sm text-muted">
        ຕື່ມສາເຫດ ແລະ ວິທີກັນເກີດຄືນຢູ່ນີ້ໄດ້ຫຼັງຈາກເຫດການຈົບແລ້ວ
      </p>

      <IncidentForm
        subscriptions={subscriptions}
        assets={assets}
        incident={incident}
      />
    </div>
  )
}

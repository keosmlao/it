import { notFound } from 'next/navigation'
import { requireMenuView } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { getAssetOptions, getMaintenancePlan } from '@/lib/maintenance/queries'
import { getOwnerOptions } from '@/lib/subscriptions/queries'
import { getLocationOptions } from '@/lib/assets/local'
import PlanForm from '../../plan-form'

export const metadata = { title: 'ແກ້ແຜນບຳລຸງຮັກສາ' }

export default async function EditMaintenancePage({
  params,
}: PageProps<'/maintenance/[id]/edit'>) {
  const { id } = await params
  const user = await requireMenuView('/maintenance')
  if (!can.manageAssets(user)) notFound()

  const [plan, owners, assets, locations] = await Promise.all([
    getMaintenancePlan(id),
    getOwnerOptions(),
    getAssetOptions(),
    getLocationOptions(),
  ])
  if (!plan) notFound()

  return (
    <div className="w-full">
      <p className="font-mono text-xs text-muted">{plan.code}</p>
      <p className="mt-1 text-sm text-muted">
        ປ່ຽນຮອບຢູ່ນີ້ມີຜົນກັບການຄິດກຳນົດຄັ້ງຕໍ່ໄປ ຫຼັງຈາກບັນທຶກວ່າເຮັດແລ້ວເທື່ອໜ້າ
      </p>

      <PlanForm owners={owners} assets={assets} locations={locations} plan={plan} />
    </div>
  )
}

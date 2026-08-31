import { notFound } from 'next/navigation'
import { requireModuleView } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { getAssetOptions } from '@/lib/maintenance/queries'
import { getOwnerOptions } from '@/lib/subscriptions/queries'
import { getLocationOptions } from '@/lib/assets/local'
import PlanForm from '../plan-form'

export const metadata = { title: 'ຕັ້ງແຜນບຳລຸງຮັກສາ' }

export default async function NewMaintenancePage() {
  const user = await requireModuleView('maintenance')
  if (!can.manageAssets(user)) notFound()

  const [owners, assets, locations] = await Promise.all([
    getOwnerOptions(),
    getAssetOptions(),
    getLocationOptions(),
  ])

  return (
    <div className="w-full">
      <p className="text-sm text-muted">
        ວຽກທີ່ຕ້ອງເຮັດຊໍ້າຕາມຮອບ — ລະບົບຈະເຕືອນຜູ້ຮັບຜິດຊອບກ່ອນ 7 ແລະ 1 ມື້
        ແລ້ວເລື່ອນກຳນົດໃຫ້ເອງທຸກຄັ້ງທີ່ບັນທຶກວ່າເຮັດແລ້ວ
      </p>

      <PlanForm owners={owners} assets={assets} locations={locations} />
    </div>
  )
}

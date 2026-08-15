import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { getSubscriptionOptions } from '@/lib/incidents/queries'
import { getAssetOptions } from '@/lib/maintenance/queries'
import IncidentForm from '../incident-form'

export const metadata = { title: 'ບັນທຶກເຫດຂັດຂ້ອງ' }

export default async function NewIncidentPage() {
  const user = await requireUser()
  if (!can.manageAssets(user)) notFound()

  const [subscriptions, assets] = await Promise.all([
    getSubscriptionOptions(),
    getAssetOptions(),
  ])

  return (
    <div className="w-full">
      <p className="text-sm text-muted">
        ບັນທຶກທຸກຄັ້ງທີ່ລະບົບລົ້ມ — ບໍ່ແມ່ນບັນຫາຂອງຄົນດຽວ (ອັນນັ້ນໃຫ້ແຈ້ງເປັນ ticket)
        ແຕ່ເປັນເລື່ອງທີ່ກະທົບຫຼາຍຄົນພ້ອມກັນ
      </p>

      <IncidentForm subscriptions={subscriptions} assets={assets} />
    </div>
  )
}

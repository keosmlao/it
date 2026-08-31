import { notFound } from 'next/navigation'
import { requireMenuView } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { getDepartmentOptions, getOwnerOptions } from '@/lib/subscriptions/queries'
import { getVendorOptions } from '@/lib/vendors/queries'
import SubscriptionForm from '../subscription-form'

export const metadata = { title: 'ລົງທະບຽນການເຊົ່າ' }

export default async function NewSubscriptionPage() {
  const user = await requireMenuView('/subscriptions/new')
  if (!can.manageSubscriptions(user)) notFound()

  const [owners, departments, vendors] = await Promise.all([
    getOwnerOptions(),
    getDepartmentOptions(),
    getVendorOptions(),
  ])

  return (
    <div className="w-full">
      <p className="text-sm text-muted">
        ສຳລັບບໍລິການທີ່ຈ່າຍເປັນງວດ — ອິນເຕີເນັດ, cloud, mail server, AI, ຊື່ໂດເມນ,
        ໃບຮັບຮອງ SSL ແລະ ໃບອະນຸຍາດຊອບແວ. ລະບົບຈະເຕືອນລ່ວງໜ້າ 30, 7 ແລະ 1 ມື້
        ກ່ອນຮອດກຳນົດຈ່າຍ
      </p>

      <SubscriptionForm owners={owners} departments={departments} vendors={vendors} />
    </div>
  )
}

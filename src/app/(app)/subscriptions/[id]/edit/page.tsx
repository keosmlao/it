import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import {
  getDepartmentOptions,
  getOwnerOptions,
  getSubscription,
} from '@/lib/subscriptions/queries'
import { getVendorOptions } from '@/lib/vendors/queries'
import SubscriptionForm from '../../subscription-form'

export const metadata = { title: 'ແກ້ໄຂສັນຍາເຊົ່າ' }

export default async function EditSubscriptionPage({
  params,
}: PageProps<'/subscriptions/[id]/edit'>) {
  const { id } = await params
  const user = await requireUser()
  if (!can.manageSubscriptions(user)) notFound()

  const [subscription, owners, departments, vendors] = await Promise.all([
    getSubscription(id),
    getOwnerOptions(),
    getDepartmentOptions(),
    getVendorOptions(),
  ])
  if (!subscription) notFound()

  return (
    <div className="w-full">
      <p className="font-mono text-xs text-muted">{subscription.code}</p>
      <p className="mt-1 text-sm text-muted">
        ແກ້ຂໍ້ມູນສັນຍາ — ການປ່ຽນລາຄາຢູ່ນີ້ມີຜົນກັບງວດຕໍ່ໄປເທົ່ານັ້ນ
        ງວດທີ່ບັນທຶກໄວ້ແລ້ວຄົງເດີມ
      </p>

      <SubscriptionForm
        owners={owners}
        departments={departments}
        vendors={vendors}
        subscription={subscription}
      />
    </div>
  )
}

import Link from 'next/link'
import { requireUser } from '@/lib/auth/session'
import { getStepsForAmount, getSuppliers } from '@/lib/purchase/queries'
import PurchaseRequestForm from './pr-form'

export const metadata = { title: 'ສ້າງໃບສະເໜີຊື້' }

export default async function NewPurchasePage() {
  const user = await requireUser()
  const [steps, suppliers] = await Promise.all([getStepsForAmount(0), getSuppliers()])

  return (
    <div className="w-full">
      <Link
        href="/purchase"
        className="text-sm text-muted underline-offset-2 hover:underline"
      >
        ← ກັບໄປລາຍການໃບສະເໜີຊື້
      </Link>

      <div className="mt-3">
        <PurchaseRequestForm
          requester={user.fullname_lo}
          department={
            [user.department_name, user.unit_name_lo].filter(Boolean).join(' · ') ||
            'ບໍ່ລະບຸພະແນກ'
          }
          steps={steps.map((s) => s.name_lo)}
          suppliers={suppliers}
        />
      </div>
    </div>
  )
}

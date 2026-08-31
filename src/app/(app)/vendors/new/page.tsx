import { notFound } from 'next/navigation'
import { requireMenuView } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { getErpSupplierOptions } from '@/lib/vendors/queries'
import VendorForm from '../vendor-form'

export const metadata = { title: 'ເພີ່ມຜູ້ຂາຍ' }

export default async function NewVendorPage() {
  const user = await requireMenuView('/vendors')
  if (!can.manageSubscriptions(user)) notFound()

  const suppliers = await getErpSupplierOptions()

  return (
    <div className="w-full">
      <p className="text-sm text-muted">
        ສະໝຸດຜູ້ຕິດຕໍ່ຂອງພະແນກ IT — ບໍ່ແມ່ນທະບຽນເຈົ້າໜີ້ຂອງ ERP
        ແຕ່ຜູກຫາກັນໄດ້ຖ້າເປັນເຈົ້າດຽວກັນ
      </p>

      <VendorForm suppliers={suppliers} />
    </div>
  )
}

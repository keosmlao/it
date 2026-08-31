import { notFound } from 'next/navigation'
import { requireMenuView } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { getVendorOptions } from '@/lib/vendors/queries'
import ConsumableForm from '../consumable-form'

export const metadata = { title: 'ເພີ່ມອຸປະກອນສິ້ນເປືອງ' }

export default async function NewConsumablePage() {
  const user = await requireMenuView('/consumables/new')
  if (!can.manageAssets(user)) notFound()

  const vendors = await getVendorOptions()

  return (
    <div className="w-full">
      <p className="text-sm text-muted">
        ຂອງທີ່ບໍ່ມີ serial ແລະ ບໍ່ໄດ້ຢືມ–ຄືນ ແຕ່ຕ້ອງຮູ້ວ່າຍັງເຫຼືອເທົ່າໃດ —
        ຍອດຄົງເຫຼືອຄິດຈາກການຮັບເຂົ້າ/ເບີກອອກ ບໍ່ໄດ້ປ້ອນເອງ
      </p>

      <ConsumableForm vendors={vendors} />
    </div>
  )
}

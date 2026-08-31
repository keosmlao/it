import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireModuleView } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import {
  getCategoryOptions,
  getDepartmentOptions,
  getLocalAssetCount,
  getLocationOptions,
} from '@/lib/assets/local'
import AssetForm from './asset-form'

export const metadata = { title: 'ລົງທະບຽນຊັບສິນ' }

export default async function NewAssetPage() {
  const user = await requireModuleView('assets')
  if (!can.manageAssets(user)) notFound()

  const [categories, locations, departments, counts] = await Promise.all([
    getCategoryOptions(),
    getLocationOptions(),
    getDepartmentOptions(),
    getLocalAssetCount(),
  ])

  return (
    <div className="w-full">
      <div className="o-page-actions">
        <div>
          <h1 className="text-lg font-semibold text-fg">ລົງທະບຽນຊັບສິນ</h1>
          <p className="mt-0.5 text-sm text-muted">
            ສຳລັບອຸປະກອນທີ່ບໍ່ໄດ້ຂຶ້ນທະບຽນໃນ ERP — ຮັບບໍລິຈາກ, ຊື້ດ່ວນ,
            ຢືມມາທົດລອງ ຫຼື ອຸປະກອນນ້ອຍ
          </p>
        </div>
        <Link
          href="/assets?source=local"
          className="btn-secondary rounded px-3 py-1.5 text-[13px]"
        >
          ທະບຽນຂອງລະບົບນີ້ ({counts?.total ?? 0}) →
        </Link>
      </div>

      <p className="mt-4 rounded-lg bg-brand-blue/5 px-4 py-3 text-sm text-body">
        ອຸປະກອນທີ່ລົງທະບຽນຢູ່ນີ້ໃຊ້ໄດ້ຄືກັນກັບຂອງ ERP ທຸກຢ່າງ — ຢືມ–ຄືນ,
        ໂອນຜູ້ຖືຄອງ, ບັນທຶກສ້ອມ, ໝາຍວ່າເພ ແລະ ອອກລາຍງານ.
        ຂໍ້ມູນນີ້ບໍ່ຖືກສົ່ງກັບເຂົ້າ ERP.
      </p>

      <AssetForm
        categories={categories}
        locations={locations}
        departments={departments}
      />
    </div>
  )
}

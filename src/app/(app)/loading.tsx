import {
  FilterSkeleton,
  HeaderSkeleton,
  TableSkeleton,
  TabsSkeleton,
} from '@/components/skeleton'

/**
 * ໂຄງຮ່າງພື້ນຖານສຳລັບທຸກໜ້າໃນກຸ່ມ (app) ທີ່ບໍ່ໄດ້ກຳນົດ loading ຂອງຕົນເອງ.
 * Next.js ສະແດງອັນນີ້ທັນທີທີ່ກົດລິ້ງ ແລ້ວຄ່ອຍສະຫຼັບເປັນເນື້ອຫາຈິງ.
 */
export default function Loading() {
  return (
    <div className="w-full" aria-busy="true" aria-label="ກຳລັງໂຫຼດ">
      <HeaderSkeleton />
      <TabsSkeleton />
      <FilterSkeleton />
      <TableSkeleton />
    </div>
  )
}

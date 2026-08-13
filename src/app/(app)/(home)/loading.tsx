import { HeroSkeleton, ListSkeleton, StatsSkeleton } from '@/components/skeleton'

/** ໜ້າພາບລວມ: ກາດໄລ່ສີເທິງສຸດ + ຕົວເລກສະຫຼຸບ + ວຽກດ່ວນ */
export default function Loading() {
  return (
    <div className="w-full" aria-busy="true" aria-label="ກຳລັງໂຫຼດ">
      <HeroSkeleton />
      <StatsSkeleton />
      <ListSkeleton rows={6} />
    </div>
  )
}

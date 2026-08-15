import { FilterSkeleton, HeaderSkeleton, ListSkeleton, StatsSkeleton } from '@/components/skeleton'

export default function Loading() {
  return (
    <div className="w-full" aria-busy="true" aria-label="ກຳລັງໂຫຼດ">
      <HeaderSkeleton />
      <StatsSkeleton count={3} />
      <FilterSkeleton fields={4} />
      <ListSkeleton rows={8} />
    </div>
  )
}

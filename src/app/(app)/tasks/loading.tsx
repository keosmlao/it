import { FilterSkeleton, HeaderSkeleton, ListSkeleton, TabsSkeleton } from '@/components/skeleton'

export default function Loading() {
  return (
    <div className="w-full" aria-busy="true" aria-label="ກຳລັງໂຫຼດ">
      <HeaderSkeleton />
      <TabsSkeleton count={4} />
      <FilterSkeleton fields={2} />
      <ListSkeleton rows={8} />
    </div>
  )
}

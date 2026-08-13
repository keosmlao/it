import { FilterSkeleton, HeaderSkeleton, TableSkeleton, TabsSkeleton } from '@/components/skeleton'

export default function Loading() {
  return (
    <div className="w-full" aria-busy="true" aria-label="ກຳລັງໂຫຼດ">
      <HeaderSkeleton />
      <TabsSkeleton count={4} />
      <FilterSkeleton fields={1} />
      <TableSkeleton rows={10} columns={6} />
    </div>
  )
}

import { FilterSkeleton, HeaderSkeleton, StatsSkeleton, TableSkeleton } from '@/components/skeleton'

export default function Loading() {
  return (
    <div className="w-full" aria-busy="true" aria-label="ກຳລັງໂຫຼດ">
      <HeaderSkeleton />
      <StatsSkeleton count={3} />
      <FilterSkeleton fields={3} />
      <TableSkeleton rows={8} columns={5} />
    </div>
  )
}

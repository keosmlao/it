import { HeaderSkeleton, StatsSkeleton, TableSkeleton } from '@/components/skeleton'

export default function Loading() {
  return (
    <div className="w-full" aria-busy="true" aria-label="ກຳລັງໂຫຼດ">
      <HeaderSkeleton />
      <StatsSkeleton count={3} />
      <TableSkeleton rows={5} columns={4} />
    </div>
  )
}

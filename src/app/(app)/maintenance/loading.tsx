import { FilterSkeleton, HeaderSkeleton, ListSkeleton } from '@/components/skeleton'

export default function Loading() {
  return (
    <div className="w-full" aria-busy="true" aria-label="ກຳລັງໂຫຼດ">
      <HeaderSkeleton />
      <FilterSkeleton fields={4} />
      <ListSkeleton rows={8} />
    </div>
  )
}

import { FilterSkeleton, ListSkeleton } from '@/components/skeleton'

export default function Loading() {
  return (
    <div className="w-full" aria-busy="true" aria-label="ກຳລັງຄົ້ນຫາ">
      <FilterSkeleton fields={1} />
      <ListSkeleton rows={6} />
    </div>
  )
}

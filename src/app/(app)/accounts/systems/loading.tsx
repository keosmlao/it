import { HeaderSkeleton, ListSkeleton } from '@/components/skeleton'

export default function Loading() {
  return (
    <div className="w-full" aria-busy="true" aria-label="ກຳລັງໂຫຼດ">
      <HeaderSkeleton />
      <ListSkeleton rows={6} />
    </div>
  )
}

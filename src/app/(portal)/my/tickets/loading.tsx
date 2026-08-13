import { Bar, ListSkeleton, TabsSkeleton } from '@/components/skeleton'

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="ກຳລັງໂຫຼດ">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Bar className="h-6 w-48" />
        <Bar className="h-9 w-32 rounded-lg" />
      </div>
      <TabsSkeleton count={3} />
      <ListSkeleton rows={6} />
    </div>
  )
}

import { Bar, CardsSkeleton } from '@/components/skeleton'

export default function Loading() {
  return (
    <div className="w-full" aria-busy="true" aria-label="ກຳລັງໂຫຼດ">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bar className="h-8 w-10 rounded-lg" />
          <span>
            <Bar className="h-4 w-28" />
            <Bar className="mt-1 h-3 w-56" />
          </span>
          <Bar className="h-8 w-10 rounded-lg" />
        </div>
        <Bar className="h-9 w-40 rounded-lg" />
      </div>
      <CardsSkeleton count={6} />
    </div>
  )
}

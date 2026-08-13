import { Bar, HeaderSkeleton } from '@/components/skeleton'

export default function Loading() {
  return (
    <div className="w-full" aria-busy="true" aria-label="ກຳລັງໂຫຼດ">
      <HeaderSkeleton />
      <Bar className="mt-4 h-14 rounded-lg" />

      <div className="mt-5 space-y-4">
        {Array.from({ length: 5 }).map((_, card) => (
          <div key={card} className="glass-card rounded-xl">
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
              <span>
                <Bar className="h-4 w-56" />
                <Bar className="mt-1.5 h-3 w-32" />
              </span>
              <Bar className="h-6 w-28 rounded-full" />
            </div>
            <div className="divide-line divide-y">
              {Array.from({ length: 2 }).map((_, row) => (
                <div key={row} className="flex items-center gap-3 px-4 py-3">
                  <Bar className="size-6 rounded-full" />
                  <span className="flex-1">
                    <Bar className="h-4 w-40" />
                    <Bar className="mt-1.5 h-3 w-28" />
                  </span>
                  <Bar className="h-8 w-32" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

import { Bar, ListSkeleton } from '@/components/skeleton'

/** ແຜນວຽກປະຈຳວັນ: ແຖບເລືອກວັນ + ສະຫຼຸບ 7 ມື້ + ເປົ້າໝາຍ + ລາຍການວຽກ */
export default function Loading() {
  return (
    <div className="w-full" aria-busy="true" aria-label="ກຳລັງໂຫຼດ">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bar className="h-8 w-10 rounded-lg" />
          <span>
            <Bar className="h-4 w-28" />
            <Bar className="mt-1 h-3 w-20" />
          </span>
          <Bar className="h-8 w-10 rounded-lg" />
        </div>
        <Bar className="h-9 w-36 rounded-lg" />
      </div>

      <div className="glass-card mt-4 flex flex-wrap gap-2 rounded-xl p-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <Bar key={i} className="h-7 w-20 rounded-lg" />
        ))}
      </div>

      <div className="glass-card mt-4 rounded-xl p-4">
        <Bar className="h-3 w-36" />
        <Bar className="mt-3 h-10 rounded-lg" />
        <Bar className="mt-3 h-16 rounded-lg" />
      </div>

      <ListSkeleton rows={4} />
    </div>
  )
}

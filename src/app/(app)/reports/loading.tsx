import {
  Bar,
  FilterSkeleton,
  StatsSkeleton,
  TableSkeleton,
} from '@/components/skeleton'

/** ໜ້າລາຍງານມີກາດຕົວເລກ ແລະ ກຣາຟ — ໂຄງຮ່າງຈຶ່ງຕ່າງຈາກໜ້າຕາຕະລາງ */
export default function Loading() {
  return (
    <div className="w-full" aria-busy="true" aria-label="ກຳລັງໂຫຼດລາຍງານ">
      <Bar className="h-4 w-48" />
      <FilterSkeleton fields={2} />
      <StatsSkeleton />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {[0, 1].map((panel) => (
          <div key={panel} className="glass-card rounded-xl p-4">
            <Bar className="h-4 w-52" />
            <div className="mt-4 space-y-2.5">
              {Array.from({ length: 6 }).map((_, row) => (
                <Bar key={row} className="h-4 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>

      <TableSkeleton rows={5} columns={6} />
    </div>
  )
}

import { Bar, FilterSkeleton, HeaderSkeleton } from '@/components/skeleton'

/** ໜ້າໂປຣເຈັກເປັນກາດ 2 ຖັນ ບໍ່ແມ່ນຕາຕະລາງ */
export default function Loading() {
  return (
    <div className="w-full" aria-busy="true" aria-label="ກຳລັງໂຫຼດ">
      <HeaderSkeleton />
      <FilterSkeleton fields={2} />

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, card) => (
          <div key={card} className="glass-card rounded-xl p-4">
            <Bar className="h-3 w-28" />
            <Bar className="mt-1.5 h-5 w-52" />
            <div className="mt-3 flex gap-2">
              <Bar className="h-5 w-16 rounded-full" />
              <Bar className="h-5 w-20 rounded-full" />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <Bar className="h-4 w-32" />
              <Bar className="h-2 w-24 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

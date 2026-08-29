import { Bar, ListSkeleton } from '@/components/skeleton'

/** ໜ້າຫຼັກຂອງພະນັກງານ: ກາດຕ້ອນຮັບ + ຕົວເລກ 3 ຊ່ອງ + ເລື່ອງລ່າສຸດ */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="ກຳລັງໂຫຼດ">
      <div className="brand-gradient-cool rounded p-5">
        <Bar className="h-6 w-56 bg-white/25" />
        <Bar className="mt-2 h-4 w-full max-w-md bg-white/20" />
        <div className="mt-4 flex flex-wrap gap-2">
          <Bar className="h-10 w-32 rounded-lg bg-white/20" />
          <Bar className="h-10 w-36 rounded-lg bg-white/15" />
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="glass-card rounded-xl p-4">
            <Bar className="h-3 w-24" />
            <Bar className="mt-2 h-8 w-12" />
          </div>
        ))}
      </div>

      <ListSkeleton rows={5} />
    </div>
  )
}

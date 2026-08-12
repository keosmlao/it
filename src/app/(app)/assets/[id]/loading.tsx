import { Bar } from '@/components/skeleton'

/** ໜ້າລາຍລະອຽດອຸປະກອນ: 2 ຖັນ (ຂໍ້ມູນ + ປະຫວັດ) */
export default function Loading() {
  return (
    <div
      className="grid gap-5 lg:grid-cols-[1fr_380px]"
      aria-busy="true"
      aria-label="ກຳລັງໂຫຼດ"
    >
      <div className="space-y-5">
        {[8, 6].map((fields, panel) => (
          <div key={panel} className="glass-card rounded-xl p-5">
            <Bar className="h-3 w-32" />
            <Bar className="mt-2 h-6 w-64" />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {Array.from({ length: fields }).map((_, i) => (
                <span key={i}>
                  <Bar className="h-3 w-20" />
                  <Bar className="mt-1.5 h-4 w-36" />
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-5">
        {[0, 1].map((panel) => (
          <div key={panel} className="glass-card rounded-xl p-5">
            <Bar className="h-4 w-40" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((_, row) => (
                <span key={row} className="block">
                  <Bar className="h-4 w-full" />
                  <Bar className="mt-1.5 h-3 w-2/3" />
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

import { Bar } from '@/components/skeleton'

/** ໜ້າລາຍລະອຽດ ticket: ເນື້ອຫາ + ແຖບຂ້າງ */
export default function Loading() {
  return (
    <div className="w-full" aria-busy="true" aria-label="ກຳລັງໂຫຼດ">
      <Bar className="h-3 w-40" />
      <Bar className="mt-3 h-3 w-28" />
      <Bar className="mt-2 h-7 w-80" />
      <div className="mt-3 flex gap-2">
        <Bar className="h-5 w-20 rounded-full" />
        <Bar className="h-5 w-16 rounded-full" />
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_18rem]">
        <div className="space-y-4">
          {[3, 4, 5].map((lines, panel) => (
            <div key={panel} className="glass-card rounded-xl p-4">
              <Bar className="h-4 w-36" />
              <div className="mt-3 space-y-2">
                {Array.from({ length: lines }).map((_, i) => (
                  <Bar key={i} className="h-4 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          {[0, 1, 2].map((panel) => (
            <div key={panel} className="glass-card rounded-xl p-4">
              <Bar className="h-4 w-24" />
              <div className="mt-3 space-y-2">
                <Bar className="h-4 w-full" />
                <Bar className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

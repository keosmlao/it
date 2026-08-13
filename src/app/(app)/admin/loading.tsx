import { Bar } from '@/components/skeleton'

/** ໜ້າຕັ້ງຄ່າເປັນກ່ອງຊ້ອນກັນຫຼາຍກ່ອງ ບໍ່ແມ່ນຕາຕະລາງດຽວ */
export default function Loading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="ກຳລັງໂຫຼດ">
      {Array.from({ length: 4 }).map((_, panel) => (
        <section key={panel} className="glass-card rounded-xl p-5">
          <Bar className="h-5 w-48" />
          <Bar className="mt-2 h-3 w-80" />
          <div className="divide-line mt-4 divide-y">
            {Array.from({ length: 4 }).map((_, row) => (
              <div key={row} className="flex items-center gap-4 py-3">
                <Bar className="h-4 w-32" />
                <Bar className="h-4 flex-1" />
                <Bar className="h-4 w-20" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

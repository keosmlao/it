/**
 * ໂຄງຮ່າງລໍໂຫຼດ — ສະແດງທັນທີຂະນະທີ່ເຊີບເວີກຳລັງດຶງຂໍ້ມູນ
 * ເພື່ອບໍ່ໃຫ້ຜູ້ໃຊ້ຮູ້ສຶກວ່າໜ້າຄ້າງ
 */
export function Bar({ className = '' }: { className?: string }) {
  return (
    <span
      className={`block animate-pulse rounded-md bg-brand-blue/10 ${className}`}
    />
  )
}

/** ຫົວໜ້າ: ຂໍ້ຄວາມສະຫຼຸບ + ປຸ່ມ */
export function HeaderSkeleton() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Bar className="h-4 w-64" />
      <Bar className="h-9 w-36 rounded-lg" />
    </div>
  )
}

/** ແຖບກັ່ນຕອງແບບເມັດ */
export function TabsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="mt-4 flex flex-wrap gap-1.5">
      {Array.from({ length: count }).map((_, i) => (
        <Bar key={i} className="h-8 w-28 rounded-full" />
      ))}
    </div>
  )
}

/** ກ່ອງຟອມກັ່ນຕອງ */
export function FilterSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="glass-card mt-5 flex flex-wrap items-end gap-3 rounded-xl p-4">
      {Array.from({ length: fields }).map((_, i) => (
        <span key={i} className="flex flex-col gap-1">
          <Bar className="h-3 w-16" />
          <Bar className="h-8 w-44 rounded-lg" />
        </span>
      ))}
    </div>
  )
}

/** ຕາຕະລາງ */
export function TableSkeleton({
  rows = 8,
  columns = 5,
}: {
  rows?: number
  columns?: number
}) {
  return (
    <div className="glass-card mt-5 overflow-hidden rounded-xl">
      <div className="border-b border-line px-4 py-3">
        <Bar className="h-3 w-40" />
      </div>
      <div className="divide-line divide-y">
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} className="flex items-center gap-4 px-4 py-3.5">
            {Array.from({ length: columns }).map((_, col) => (
              <Bar
                key={col}
                className={`h-4 ${col === 1 ? 'flex-1' : 'w-24'}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/** ກາດຕົວເລກສະຫຼຸບ */
export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card rounded-xl p-4">
          <Bar className="h-3 w-24" />
          <Bar className="mt-2 h-8 w-16" />
          <Bar className="mt-2 h-3 w-20" />
        </div>
      ))}
    </div>
  )
}

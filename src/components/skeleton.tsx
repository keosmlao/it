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

/** ກາດໃຫຍ່ໄລ່ສີເທິງສຸດ (hero) ຂອງໜ້າພາບລວມ */
export function HeroSkeleton() {
  return (
    <div className="brand-gradient-cool rounded-2xl p-6">
      <Bar className="h-3 w-32 bg-white/25" />
      <Bar className="mt-3 h-7 w-72 bg-white/25" />
      <Bar className="mt-2 h-4 w-56 bg-white/20" />
      <div className="mt-5 flex flex-wrap gap-2">
        <Bar className="h-9 w-32 rounded-lg bg-white/20" />
        <Bar className="h-9 w-28 rounded-lg bg-white/15" />
      </div>
    </div>
  )
}

/** ລາຍການແຖວແບບງ່າຍ (ບໍ່ມີຫົວຕາຕະລາງ) */
export function ListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="glass-card divide-line mt-5 divide-y rounded-xl">
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="flex items-center gap-3 px-4 py-3">
          <Bar className="h-3 w-24" />
          <span className="min-w-0 flex-1">
            <Bar className="h-4 w-2/3" />
            <Bar className="mt-1.5 h-3 w-1/3" />
          </span>
          <Bar className="h-5 w-20 rounded-full" />
        </div>
      ))}
    </div>
  )
}

/** ຟອມປ້ອນຂໍ້ມູນ (ໜ້າສ້າງ/ແກ້ໄຂ) */
export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="w-full max-w-3xl">
      <Bar className="h-4 w-40" />
      <div className="glass-card mt-5 space-y-4 rounded-xl p-5">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i}>
            <Bar className="h-3 w-24" />
            <Bar className={`mt-1.5 rounded-lg ${i % 3 === 2 ? 'h-20' : 'h-10'}`} />
          </div>
        ))}
        <Bar className="h-10 w-36 rounded-lg" />
      </div>
    </div>
  )
}

/** ໜ້າລາຍລະອຽດ: ຫົວເລື່ອງ + ກ່ອງເນື້ອຫາ + ໄທມ໌ໄລນ໌ */
export function DetailSkeleton() {
  return (
    <div className="w-full">
      <Bar className="h-3 w-32" />
      <Bar className="mt-2 h-7 w-2/3 max-w-lg" />
      <div className="mt-3 flex flex-wrap gap-2">
        <Bar className="h-5 w-24 rounded-full" />
        <Bar className="h-4 w-64" />
      </div>

      <div className="glass-card mt-5 rounded-xl p-4">
        <Bar className="h-3 w-28" />
        <Bar className="mt-2 h-4 w-full" />
        <Bar className="mt-1.5 h-4 w-5/6" />
        <Bar className="mt-1.5 h-4 w-3/4" />
      </div>

      <div className="glass-card divide-line mt-4 divide-y rounded-xl">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="px-4 py-3">
            <Bar className="h-3 w-40" />
            <Bar className="mt-1.5 h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** ກາດເປັນຕາຕະລາງ (ເຊັ່ນ ແຜນວຽກທັງທີມ) */
export function CardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card rounded-xl p-4">
          <div className="flex justify-between gap-3">
            <span className="min-w-0 flex-1">
              <Bar className="h-4 w-40" />
              <Bar className="mt-1.5 h-3 w-28" />
            </span>
            <Bar className="h-8 w-20" />
          </div>
          <Bar className="mt-3 h-4 w-3/4" />
        </div>
      ))}
    </div>
  )
}

import { Bar } from '@/components/skeleton'

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="ກຳລັງໂຫຼດ">
      <Bar className="h-4 w-28" />
      <Bar className="mt-2 h-7 w-2/3 max-w-lg" />
      <Bar className="mt-1.5 h-3 w-40" />
      <div className="glass-card mt-4 space-y-2 rounded-xl p-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <Bar key={i} className={`h-4 ${i % 4 === 3 ? 'w-1/2' : 'w-full'}`} />
        ))}
      </div>
    </div>
  )
}

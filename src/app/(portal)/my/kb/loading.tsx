import { Bar, ListSkeleton } from '@/components/skeleton'

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="ກຳລັງໂຫຼດ">
      <Bar className="h-6 w-64" />
      <Bar className="mt-2 h-4 w-80" />
      <div className="glass-card mt-4 rounded-xl p-4">
        <Bar className="h-10 rounded-lg" />
      </div>
      <ListSkeleton rows={8} />
    </div>
  )
}

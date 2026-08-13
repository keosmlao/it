import { DetailSkeleton } from '@/components/skeleton'

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="ກຳລັງໂຫຼດ">
      <DetailSkeleton />
    </div>
  )
}

import { FormSkeleton } from '@/components/skeleton'

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="ກຳລັງໂຫຼດ">
      <FormSkeleton fields={8} />
    </div>
  )
}

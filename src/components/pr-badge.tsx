import { PR_STATUS_LABEL_LO, PR_STATUS_STYLE, type PrStatus } from '@/lib/purchase/model'

export function PrStatusBadge({ status }: { status: PrStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${PR_STATUS_STYLE[status]}`}
    >
      {PR_STATUS_LABEL_LO[status]}
    </span>
  )
}

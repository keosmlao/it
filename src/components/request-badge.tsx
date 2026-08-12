import {
  REQUEST_STATUS_LABEL_LO,
  REQUEST_STATUS_STYLE,
  type RequestStatus,
} from '@/lib/requests/queries'

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${REQUEST_STATUS_STYLE[status]}`}
    >
      {REQUEST_STATUS_LABEL_LO[status]}
    </span>
  )
}

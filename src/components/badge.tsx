import {
  PRIORITY_STYLE,
  STATUS_LABEL_LO,
  STATUS_STYLE,
  type TicketStatus,
} from '@/lib/tickets/model'

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}
    >
      {STATUS_LABEL_LO[status]}
    </span>
  )
}

export function PriorityBadge({
  priority,
  label,
}: {
  priority: string
  label: string
}) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
        PRIORITY_STYLE[priority] ?? PRIORITY_STYLE.low
      }`}
    >
      {label}
    </span>
  )
}

export function OverdueBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-950 dark:text-red-300">
      {children}
    </span>
  )
}

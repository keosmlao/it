import {
  PROJECT_STATUS_LABEL_LO,
  PROJECT_STATUS_STYLE,
  TASK_STATUS_LABEL_LO,
  TASK_STATUS_STYLE,
  type ProjectStatus,
  type TaskStatus,
} from '@/lib/projects/model'

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${PROJECT_STATUS_STYLE[status]}`}
    >
      {PROJECT_STATUS_LABEL_LO[status]}
    </span>
  )
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TASK_STATUS_STYLE[status]}`}
    >
      {TASK_STATUS_LABEL_LO[status]}
    </span>
  )
}

/** ແຖບຄວາມຄືບໜ້າ: ວຽກທີ່ສຳເລັດ / ວຽກທັງໝົດ */
export function ProgressBar({ done, total }: { done: number; total: number }) {
  const percent = total ? Math.round((done / total) * 100) : 0

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-brand-blue/15">
        <div
          className="h-full rounded-full bg-brand-sky"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs text-muted">
        {done}/{total}
      </span>
    </div>
  )
}

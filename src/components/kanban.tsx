import Link from 'next/link'
import ActionForm from '@/components/action-form'
import { moveTask } from '@/app/(app)/projects/actions'
import {
  BOARD_COLUMNS,
  TASK_STATUS_LABEL_LO,
  canEditTask,
  type TaskRow,
} from '@/lib/projects/model'
import type { ItStaff } from '@/lib/auth/roles'
import { PriorityBadge } from '@/components/badge'

/**
 * ກະດານ Kanban — ຍ້າຍວຽກດ້ວຍປຸ່ມ (ບໍ່ໃຊ້ drag & drop) ເພື່ອໃຫ້ໃຊ້ໄດ້ດີ
 * ທັງໃນມືຖື ແລະ ບໍ່ຕ້ອງພຶ່ງ JavaScript.
 */
export function KanbanBoard({
  tasks,
  user,
}: {
  tasks: TaskRow[]
  user: ItStaff
}) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {BOARD_COLUMNS.map((column) => {
        const columnTasks = tasks.filter((t) => t.status === column)

        return (
          <section
            key={column}
            className="flex w-64 shrink-0 flex-col glass-subtle rounded-xl p-2"
          >
            <h3 className="px-2 py-1.5 text-sm font-medium text-body">
              {TASK_STATUS_LABEL_LO[column]}
              <span className="ml-1.5 text-faint">
                {columnTasks.length}
              </span>
            </h3>

            <div className="flex flex-col gap-2">
              {columnTasks.map((task) => (
                <article
                  key={task.id}
                  className="glass-card rounded-lg p-3"
                >
                  <Link
                    href={`/tasks/${task.id}`}
                    className="text-sm font-medium text-fg underline-offset-2 hover:underline"
                  >
                    {task.title}
                  </Link>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <PriorityBadge
                      priority={task.priority}
                      label={task.priority_name_lo}
                    />
                    {task.is_overdue && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800 dark:bg-red-950 dark:text-red-300">
                        ເກີນກຳນົດ
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-xs text-muted">
                    {task.assignee_nickname ?? task.assignee_name ?? 'ຍັງບໍ່ມອບໝາຍ'}
                    {task.due_date && ` · ກຳນົດ ${task.due_date}`}
                  </p>

                  {canEditTask(user, task) && (
                    <ActionForm action={moveTask} className="mt-2 flex gap-1">
                      <input type="hidden" name="task_id" value={task.id} />
                      <select
                        name="status"
                        defaultValue={task.status}
                        className="input min-w-0 flex-1 rounded px-1.5 py-1 text-xs"
                      >
                        {BOARD_COLUMNS.map((s) => (
                          <option key={s} value={s}>
                            {TASK_STATUS_LABEL_LO[s]}
                          </option>
                        ))}
                        <option value="cancelled">
                          {TASK_STATUS_LABEL_LO.cancelled}
                        </option>
                      </select>
                      <button
                        type="submit"
                        className="btn-secondary rounded px-2 py-1 text-xs"
                      >
                        ຍ້າຍ
                      </button>
                    </ActionForm>
                  )}
                </article>
              ))}

              {columnTasks.length === 0 && (
                <p className="px-2 py-4 text-center text-xs text-faint">
                  ວ່າງ
                </p>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}

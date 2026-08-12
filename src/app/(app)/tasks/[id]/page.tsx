import Link from 'next/link'
import ActionForm from '@/components/action-form'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { getTask, getTaskComments } from '@/lib/projects/queries'
import { getAssignableStaff } from '@/lib/tickets/queries'
import {
  BOARD_COLUMNS,
  TASK_STATUS_LABEL_LO,
  canEditTask,
} from '@/lib/projects/model'
import { TaskStatusBadge } from '@/components/project-badge'
import { PriorityBadge } from '@/components/badge'
import { formatDateTime } from '@/lib/format'
import { addTaskComment, assignTask, moveTask } from '../../projects/actions'

export default async function TaskDetailPage({ params }: PageProps<'/tasks/[id]'>) {
  const { id } = await params
  const user = await requireUser()

  const task = await getTask(id)
  if (!task) notFound()

  const [comments, staff] = await Promise.all([
    getTaskComments(id),
    can.assignWork(user) ? getAssignableStaff(user) : Promise.resolve([]),
  ])

  const editable = canEditTask(user, task)

  return (
    <div className="w-full">
      <Link
        href={task.project_id ? `/projects/${task.project_id}` : '/tasks'}
        className="text-sm text-muted underline-offset-2 hover:underline"
      >
        ← {task.project_name ? `ກັບໄປ ${task.project_name}` : 'ກັບໄປລາຍການວຽກ'}
      </Link>

      <header className="mt-3">
        {task.project_no && (
          <p className="font-mono text-sm text-muted">
            {task.project_no}
          </p>
        )}
        <h1 className="text-2xl font-semibold text-fg">
          {task.title}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <TaskStatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} label={task.priority_name_lo} />
          {task.is_overdue && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-950 dark:text-red-300">
              ເກີນກຳນົດ
            </span>
          )}
        </div>
      </header>

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_16rem]">
        <div className="min-w-0 space-y-4">
          <Card title="ລາຍລະອຽດ">
            <p className="whitespace-pre-wrap text-body">
              {task.description || '— ບໍ່ມີລາຍລະອຽດ —'}
            </p>
          </Card>

          <Card title={`ການເຄື່ອນໄຫວ (${comments.length})`}>
            <ol className="space-y-3">
              {comments.map((c) => (
                <li key={c.id}>
                  <p className="text-xs text-muted">
                    {c.author_nickname ?? c.author_name} ·{' '}
                    {formatDateTime(c.created_at)}
                  </p>
                  <p
                    className={`whitespace-pre-wrap ${
                      c.kind === 'comment'
                        ? 'text-body'
                        : 'text-sm text-muted'
                    }`}
                  >
                    {c.body}
                  </p>
                </li>
              ))}
              {comments.length === 0 && (
                <li className="text-sm text-muted">
                  ຍັງບໍ່ມີການເຄື່ອນໄຫວ
                </li>
              )}
            </ol>

            <ActionForm
              action={addTaskComment}
              className="mt-4 border-t border-line pt-4"
            >
              <input type="hidden" name="task_id" value={task.id} />
              <textarea
                name="body"
                rows={3}
                required
                placeholder="ຄວາມຄືບໜ້າ, ບັນຫາທີ່ພົບ…"
                className="input w-full rounded-lg px-3 py-2"
              />
              <button
                type="submit"
                className="mt-2 btn-primary rounded-lg px-4 py-2 text-sm font-medium"
              >
                ບັນທຶກ
              </button>
            </ActionForm>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card title="ຂໍ້ມູນ">
            <Row label="ໂປຣເຈັກ" value={task.project_name ?? 'ວຽກເອກະລາດ'} />
            <Row
              label="ຜູ້ຮັບຜິດຊອບ"
              value={task.assignee_name ?? 'ຍັງບໍ່ມອບໝາຍ'}
            />
            <Row label="ກຳນົດສົ່ງ" value={task.due_date ?? '—'} danger={task.is_overdue} />
            <Row
              label="ຊົ່ວໂມງ"
              value={`${Number(task.logged_hours).toFixed(1)} / ${
                task.estimate_hours ? Number(task.estimate_hours).toFixed(1) : '—'
              }`}
            />
            <Row label="ສ້າງເມື່ອ" value={formatDateTime(task.created_at)} />
          </Card>

          {editable && (
            <Card title="ຍ້າຍສະຖານະ">
              <ActionForm action={moveTask} className="space-y-2">
                <input type="hidden" name="task_id" value={task.id} />
                <select
                  name="status"
                  defaultValue={task.status}
                  className="input w-full rounded-lg px-3 py-1.5 text-sm"
                >
                  {BOARD_COLUMNS.map((s) => (
                    <option key={s} value={s}>
                      {TASK_STATUS_LABEL_LO[s]}
                    </option>
                  ))}
                  <option value="cancelled">{TASK_STATUS_LABEL_LO.cancelled}</option>
                </select>
                <button
                  type="submit"
                  className="btn-primary w-full rounded-lg px-4 py-1.5 text-sm font-medium"
                >
                  ບັນທຶກ
                </button>
              </ActionForm>
            </Card>
          )}

          {can.assignWork(user) && (
            <Card title="ມອບໝາຍ">
              <ActionForm action={assignTask} className="space-y-2">
                <input type="hidden" name="task_id" value={task.id} />
                <select
                  name="assignee_employee_id"
                  defaultValue={task.assignee_employee_id ?? ''}
                  className="input w-full rounded-lg px-3 py-1.5 text-sm"
                >
                  <option value="">— ຍັງບໍ່ມອບໝາຍ —</option>
                  {staff.map((s) => (
                    <option key={s.employee_id} value={s.employee_id}>
                      {s.fullname_lo}
                      {s.nickname ? ` (${s.nickname})` : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="btn-secondary w-full rounded-lg px-4 py-1.5 text-sm"
                >
                  ບັນທຶກ
                </button>
              </ActionForm>
            </Card>
          )}
        </aside>
      </div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass-card rounded-xl p-4">
      <h2 className="mb-3 text-sm font-semibold text-fg">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Row({
  label,
  value,
  danger = false,
}: {
  label: string
  value: string
  danger?: boolean
}) {
  return (
    <div className="flex justify-between gap-3 py-1 text-sm">
      <span className="text-muted">{label}</span>
      <span
        className={`text-right ${
          danger
            ? 'font-medium text-red-600 dark:text-red-400'
            : 'text-body'
        }`}
      >
        {value}
      </span>
    </div>
  )
}

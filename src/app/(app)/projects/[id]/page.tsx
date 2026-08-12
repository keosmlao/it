import Link from 'next/link'
import ActionForm from '@/components/action-form'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { getProject, listTasks } from '@/lib/projects/queries'
import { getAssignableStaff, getPriorities } from '@/lib/tickets/queries'
import {
  PROJECT_STATUSES,
  PROJECT_STATUS_LABEL_LO,
  canEditProject,
} from '@/lib/projects/model'
import { ProgressBar, ProjectStatusBadge } from '@/components/project-badge'
import { PriorityBadge } from '@/components/badge'
import { KanbanBoard } from '@/components/kanban'
import { formatDateTime } from '@/lib/format'
import { updateProjectStatus } from '../actions'
import NewTaskForm from '../new-task-form'

export default async function ProjectDetailPage({
  params,
}: PageProps<'/projects/[id]'>) {
  const { id } = await params
  const user = await requireUser()

  const project = await getProject(id)
  if (!project) notFound()

  const [tasks, staff, priorities] = await Promise.all([
    listTasks({ projectId: id }),
    getAssignableStaff(user),
    getPriorities(),
  ])

  return (
    <div className="w-full">
      <Link
        href="/projects"
        className="text-sm text-muted underline-offset-2 hover:underline"
      >
        ← ກັບໄປລາຍການໂປຣເຈັກ
      </Link>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-sm text-muted">
            {project.project_no}
          </p>
          <h1 className="text-2xl font-semibold text-fg">
            {project.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ProjectStatusBadge status={project.status} />
            <PriorityBadge
              priority={project.priority}
              label={project.priority_name_lo}
            />
            <ProgressBar
              done={Number(project.task_done_count)}
              total={Number(project.task_count)}
            />
          </div>
        </div>

        {canEditProject(user, project) && (
          <ActionForm action={updateProjectStatus} className="flex items-end gap-2">
            <input type="hidden" name="project_id" value={project.id} />
            <select
              name="status"
              defaultValue={project.status}
              className="input rounded-lg px-3 py-1.5 text-sm"
            >
              {PROJECT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PROJECT_STATUS_LABEL_LO[s]}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="btn-secondary rounded-lg px-3 py-1.5 text-sm"
            >
              ປ່ຽນສະຖານະ
            </button>
          </ActionForm>
        )}
      </header>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Info label="ເຈົ້າຂອງ" value={project.owner_name} />
        <Info
          label="ຜູ້ຂໍ"
          value={
            project.requester_name
              ? `${project.requester_name}${
                  project.requester_department_name
                    ? ` · ${project.requester_department_name}`
                    : ''
                }`
              : '—'
          }
        />
        <Info label="ວັນເລີ່ມ" value={project.start_date ?? '—'} />
        <Info
          label="ກຳນົດສຳເລັດ"
          value={project.due_date ?? '—'}
          danger={project.is_overdue}
        />
      </div>

      {project.description && (
        <section className="mt-4 glass-card rounded-xl p-4">
          <h2 className="mb-2 text-sm font-semibold text-fg">
            ຂອບເຂດວຽກ
          </h2>
          <p className="whitespace-pre-wrap text-body">
            {project.description}
          </p>
        </section>
      )}

      <section className="mt-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-fg">
            ກະດານວຽກ ({tasks.length})
          </h2>
          <p className="text-xs text-muted">
            ສ້າງເມື່ອ {formatDateTime(project.created_at)}
          </p>
        </div>

        <KanbanBoard tasks={tasks} user={user} />
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold text-fg">
          ເພີ່ມວຽກເຂົ້າໂປຣເຈັກ
        </h2>
        <NewTaskForm
          projectId={project.id}
          staff={staff}
          priorities={priorities}
          canAssign={can.assignWork(user)}
          currentUserId={user.employee_id}
        />
      </section>
    </div>
  )
}

function Info({
  label,
  value,
  danger = false,
}: {
  label: string
  value: string
  danger?: boolean
}) {
  return (
    <div className="glass-card rounded-xl p-3">
      <p className="text-xs text-muted">{label}</p>
      <p
        className={`mt-0.5 text-sm ${
          danger
            ? 'font-medium text-red-600 dark:text-red-400'
            : 'text-fg'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

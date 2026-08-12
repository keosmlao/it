import { requireUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { listTasks } from '@/lib/projects/queries'
import { getAssignableStaff, getPriorities } from '@/lib/tickets/queries'
import { KanbanBoard } from '@/components/kanban'
import NewTaskForm from '../projects/new-task-form'

export const metadata = { title: 'ວຽກຂອງຂ້ອຍ' }

export default async function TasksPage({ searchParams }: PageProps<'/tasks'>) {
  const params = await searchParams
  const user = await requireUser()

  const scope = pick(params.scope) || 'mine'

  const [tasks, staff, priorities] = await Promise.all([
    listTasks({
      assigneeId: scope === 'mine' ? user.employee_id : undefined,
      status: pick(params.status) || undefined,
    }),
    getAssignableStaff(user),
    getPriorities(),
  ])

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-fg">
            {scope === 'mine' ? 'ວຽກຂອງຂ້ອຍ' : 'ວຽກທັງໝົດ'}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {tasks.length} ວຽກ
          </p>
        </div>

        <nav className="flex gap-1 rounded-lg border border-line p-1">
          <Tab href="/tasks?scope=mine" active={scope === 'mine'}>
            ຂອງຂ້ອຍ
          </Tab>
          <Tab href="/tasks?scope=all" active={scope === 'all'}>
            ທັງໝົດ
          </Tab>
        </nav>
      </div>

      <div className="mt-5">
        <KanbanBoard tasks={tasks} user={user} />
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold text-fg">
          ເພີ່ມວຽກໃໝ່
        </h2>
        <NewTaskForm
          staff={staff}
          priorities={priorities}
          canAssign={can.assignWork(user)}
          currentUserId={user.employee_id}
        />
      </section>
    </div>
  )
}

function Tab({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      className={`rounded-md px-3 py-1.5 text-sm transition ${
        active
          ? 'brand-gradient-cool text-white'
          : 'text-muted'
      }`}
    >
      {children}
    </a>
  )
}

function pick(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

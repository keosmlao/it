import 'server-only'
import { query } from '@/lib/db'
import type { ItStaff } from '@/lib/auth/roles'
import type { ProjectRow, TaskRow } from './model'
import { PAGE_SIZE, type PageResult } from '@/lib/pagination'

/** ໂປຣເຈັກເບິ່ງເຫັນໄດ້ທຸກຄົນໃນພະແນກ — ວຽກພັດທະນາເປັນເລື່ອງຮ່ວມກັນ */
function projectWhere(filters: { status?: string; q?: string }) {
  const params: unknown[] = []
  const where: string[] = ['true']

  // 'open' = ຍັງບໍ່ຈົບ, 'all' = ບໍ່ກັ່ນຕອງ
  if (filters.status === 'open') {
    where.push(`status not in ('done','cancelled')`)
  } else if (filters.status && filters.status !== 'all') {
    params.push(filters.status)
    where.push(`status = $${params.length}`)
  }

  if (filters.q) {
    params.push(`%${filters.q}%`)
    where.push(`(name ilike $${params.length} or project_no ilike $${params.length})`)
  }

  return { params, where }
}

export async function listProjects(filters: { status?: string; q?: string } = {}) {
  const { params, where } = projectWhere(filters)
  return query<ProjectRow>(
    `select * from it.v_projects
      where ${where.join(' and ')}
      order by is_finished, priority_order, coalesce(due_date, '2099-12-31'), created_at desc
      limit 200`,
    params
  )
}

export async function paginateProjects(filters: { status?: string; q?: string }, page: number): Promise<PageResult<ProjectRow>> {
  const { params, where } = projectWhere(filters)
  const count = await query<{ total: string }>(`select count(*) as total from it.v_projects where ${where.join(' and ')}`, params)
  const total = Number(count[0]?.total ?? 0)
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  params.push(PAGE_SIZE, (safePage - 1) * PAGE_SIZE)
  const items = await query<ProjectRow>(`select * from it.v_projects where ${where.join(' and ')} order by is_finished, priority_order, coalesce(due_date, '2099-12-31'), created_at desc limit $${params.length - 1} offset $${params.length}`, params)
  return { items, page: safePage, pageSize: PAGE_SIZE, total, pageCount }
}

export async function getProject(id: string) {
  const rows = await query<ProjectRow>('select * from it.v_projects where id = $1', [id])
  return rows[0] ?? null
}

export async function listTasks(
  filters: { projectId?: string; assigneeId?: number; status?: string; q?: string } = {}
) {
  const params: unknown[] = []
  const where: string[] = ['true']

  if (filters.projectId) {
    params.push(filters.projectId)
    where.push(`project_id = $${params.length}`)
  }

  if (filters.assigneeId) {
    params.push(filters.assigneeId)
    where.push(`assignee_employee_id = $${params.length}`)
  }

  if (filters.status === 'open') {
    where.push(`status not in ('done','cancelled')`)
  } else if (filters.status) {
    params.push(filters.status)
    where.push(`status = $${params.length}`)
  }

  if (filters.q) {
    params.push(`%${filters.q}%`)
    where.push(`title ilike $${params.length}`)
  }

  return query<TaskRow>(
    `select * from it.v_tasks
      where ${where.join(' and ')}
      order by sort_order, priority_order, coalesce(due_date, '2099-12-31'), id
      limit 500`,
    params
  )
}

export async function getTask(id: string) {
  const rows = await query<TaskRow>('select * from it.v_tasks where id = $1', [id])
  return rows[0] ?? null
}

export async function getTaskComments(taskId: string) {
  return query<{
    id: string
    kind: string
    body: string
    author_name: string
    author_nickname: string | null
    created_at: string
  }>(
    `select c.id, c.kind, c.body, e.fullname_lo as author_name,
            e.nickname as author_nickname, c.created_at
       from it.task_comments c
       join public.odg_employee e on e.employee_id = c.author_employee_id
      where c.task_id = $1
      order by c.created_at`,
    [taskId]
  )
}

/** ຕົວເລກສະຫຼຸບວຽກພັດທະນາສຳລັບໜ້າພາບລວມ */
export async function getProjectStats(user: ItStaff) {
  const rows = await query<{
    active_projects: string
    my_tasks: string
    overdue_tasks: string
  }>(
    `select
       (select count(*) from it.v_projects
         where status in ('planning','active','on_hold'))     as active_projects,
       (select count(*) from it.v_tasks
         where assignee_employee_id = $1 and not is_finished) as my_tasks,
       (select count(*) from it.v_tasks where is_overdue)     as overdue_tasks`,
    [user.employee_id]
  )
  return rows[0]
}

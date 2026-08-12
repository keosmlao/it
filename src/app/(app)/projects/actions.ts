'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { query } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { logAudit, notify } from '@/lib/activity'
import { getProject, getTask } from '@/lib/projects/queries'
import {
  PROJECT_STATUS_LABEL_LO,
  TASK_STATUS_LABEL_LO,
  canEditProject,
  canEditTask,
  type ProjectStatus,
  type TaskStatus,
} from '@/lib/projects/model'

import type { FormState } from '@/lib/action-state'

export type ActionState = FormState

export async function createProject(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser()
  if (!can.assignWork(user)) {
    return { error: 'ສະເພາະຫົວໜ້າ ຫຼື ຜູ້ຈັດການ ຈຶ່ງສ້າງໂປຣເຈັກໄດ້' }
  }

  const name = String(formData.get('name') ?? '').trim()
  if (!name) return { error: 'ກະລຸນາປ້ອນຊື່ໂປຣເຈັກ' }

  const rows = await query<{ id: string }>(
    `insert into it.projects
       (name, description, status, priority, owner_employee_id,
        requester_employee_id, start_date, due_date, created_by)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     returning id`,
    [
      name,
      String(formData.get('description') ?? '').trim() || null,
      String(formData.get('status') ?? 'planning'),
      String(formData.get('priority') ?? 'medium'),
      Number(formData.get('owner_employee_id')) || user.employee_id,
      Number(formData.get('requester_employee_id')) || null,
      String(formData.get('start_date') ?? '') || null,
      String(formData.get('due_date') ?? '') || null,
      user.employee_id,
    ]
  )

  const id = rows[0].id
  await logAudit(user.employee_id, 'project', id, 'create', name)
  await notify(
    Number(formData.get('owner_employee_id')) || null,
    user.employee_id,
    'ທ່ານຖືກມອບໝາຍເປັນເຈົ້າຂອງໂປຣເຈັກ',
    name,
    `/projects/${id}`
  )

  revalidatePath('/projects')
  redirect(`/projects/${id}`)
}

export async function updateProjectStatus(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  const id = String(formData.get('project_id'))
  const status = String(formData.get('status')) as ProjectStatus

  const project = await getProject(id)
  if (!project) return { error: 'ບໍ່ພົບໂປຣເຈັກ' }
  if (!canEditProject(user, project)) return { error: 'ບໍ່ມີສິດແກ້ໄຂໂປຣເຈັກນີ້' }

  await query(
    `update it.projects
        set status = $2::varchar,
            done_date = case when $2::varchar = 'done' then current_date else null end,
            updated_at = now()
      where id = $1::bigint`,
    [id, status]
  )

  await logAudit(
    user.employee_id,
    'project',
    id,
    'status',
    PROJECT_STATUS_LABEL_LO[status]
  )
  revalidatePath(`/projects/${id}`)
  revalidatePath('/projects')

  return { ok: true }
}

export async function createTask(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser()

  const title = String(formData.get('title') ?? '').trim()
  if (!title) return { error: 'ກະລຸນາປ້ອນຫົວຂໍ້ວຽກ' }

  const assigneeRaw = String(formData.get('assignee_employee_id') ?? '')
  const assigneeId = assigneeRaw ? Number(assigneeRaw) : null
  if (assigneeId && assigneeId !== user.employee_id && !can.assignWork(user)) {
    return { error: 'ທ່ານບໍ່ມີສິດມອບໝາຍວຽກໃຫ້ຄົນອື່ນ' }
  }

  const projectId = String(formData.get('project_id') ?? '') || null

  const rows = await query<{ id: string }>(
    `insert into it.tasks
       (project_id, title, description, status, priority,
        assignee_employee_id, unit_code, due_date, estimate_hours, created_by)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     returning id`,
    [
      projectId,
      title,
      String(formData.get('description') ?? '').trim() || null,
      String(formData.get('status') ?? 'todo'),
      String(formData.get('priority') ?? 'medium'),
      assigneeId,
      user.unit_code,
      String(formData.get('due_date') ?? '') || null,
      String(formData.get('estimate_hours') ?? '') || null,
      user.employee_id,
    ]
  )

  const id = rows[0].id
  await logAudit(user.employee_id, 'task', id, 'create', title)
  await notify(
    assigneeId,
    user.employee_id,
    'ທ່ານໄດ້ຮັບມອບໝາຍວຽກໃໝ່',
    title,
    `/tasks/${id}`
  )

  revalidatePath('/tasks')
  if (projectId) revalidatePath(`/projects/${projectId}`)
  return {}
}

export async function moveTask(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  const id = String(formData.get('task_id'))
  const status = String(formData.get('status')) as TaskStatus

  const task = await getTask(id)
  if (!task) return { error: 'ບໍ່ພົບວຽກ' }
  if (!canEditTask(user, task)) return { error: 'ບໍ່ມີສິດແກ້ໄຂວຽກນີ້' }

  await query(
    `update it.tasks
        set status = $2::varchar,
            done_at = case when $2::varchar = 'done' then now() else null end,
            updated_at = now()
      where id = $1::bigint`,
    [id, status]
  )

  await query(
    `insert into it.task_comments (task_id, kind, body, author_employee_id)
     values ($1, 'status_change', $2, $3)`,
    [id, `ຍ້າຍໄປ "${TASK_STATUS_LABEL_LO[status]}"`, user.employee_id]
  )

  await logAudit(user.employee_id, 'task', id, 'status', TASK_STATUS_LABEL_LO[status])

  revalidatePath('/tasks')
  revalidatePath(`/tasks/${id}`)
  if (task.project_id) revalidatePath(`/projects/${task.project_id}`)

  return { ok: true }
}

export async function assignTask(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.assignWork(user)) return { error: 'ບໍ່ມີສິດມອບໝາຍວຽກ' }

  const id = String(formData.get('task_id'))
  const raw = String(formData.get('assignee_employee_id') ?? '')
  const assigneeId = raw ? Number(raw) : null

  const task = await getTask(id)
  if (!task) return { error: 'ບໍ່ພົບວຽກ' }

  await query(
    `update it.tasks set assignee_employee_id = $2, updated_at = now() where id = $1`,
    [id, assigneeId]
  )

  await query(
    `insert into it.task_comments (task_id, kind, body, author_employee_id)
     values ($1, 'assignment', $2, $3)`,
    [id, assigneeId ? 'ມອບໝາຍໃໝ່' : 'ຍົກເລີກການມອບໝາຍ', user.employee_id]
  )

  await notify(
    assigneeId,
    user.employee_id,
    'ທ່ານໄດ້ຮັບມອບໝາຍວຽກ',
    task.title,
    `/tasks/${id}`
  )
  await logAudit(user.employee_id, 'task', id, 'assign')

  revalidatePath(`/tasks/${id}`)
  revalidatePath('/tasks')

  return { ok: true }
}

export async function addTaskComment(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  const id = String(formData.get('task_id'))
  const body = String(formData.get('body') ?? '').trim()
  if (!body) return { error: 'ກະລຸນາຂຽນຂໍ້ຄວາມກ່ອນບັນທຶກ' }

  await query(
    `insert into it.task_comments (task_id, body, author_employee_id)
     values ($1, $2, $3)`,
    [id, body, user.employee_id]
  )

  revalidatePath(`/tasks/${id}`)

  return { ok: true }
}

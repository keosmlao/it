import type { ItStaff } from '@/lib/auth/roles'

export const PROJECT_STATUSES = [
  'planning',
  'active',
  'on_hold',
  'done',
  'cancelled',
] as const

export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export const PROJECT_STATUS_LABEL_LO: Record<ProjectStatus, string> = {
  planning: 'ວາງແຜນ',
  active: 'ກຳລັງດຳເນີນ',
  on_hold: 'ພັກໄວ້',
  done: 'ສຳເລັດ',
  cancelled: 'ຍົກເລີກ',
}

export const PROJECT_STATUS_STYLE: Record<ProjectStatus, string> = {
  planning: 'bg-slate-100 text-body dark:bg-slate-800',
  active: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  on_hold: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  done: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  cancelled: 'bg-slate-100 text-muted',
}

/** ຖັນຂອງກະດານ Kanban ຕາມລຳດັບການເຮັດວຽກ */
export const TASK_STATUSES = [
  'backlog',
  'todo',
  'in_progress',
  'review',
  'testing',
  'done',
  'cancelled',
] as const

export type TaskStatus = (typeof TASK_STATUSES)[number]

export const TASK_STATUS_LABEL_LO: Record<TaskStatus, string> = {
  backlog: 'ລໍຖ້າ',
  todo: 'ຈະເຮັດ',
  in_progress: 'ກຳລັງເຮັດ',
  review: 'ກວດຄືນ',
  testing: 'ທົດສອບ',
  done: 'ສຳເລັດ',
  cancelled: 'ຍົກເລີກ',
}

export const TASK_STATUS_STYLE: Record<TaskStatus, string> = {
  backlog: 'bg-slate-100 text-muted dark:bg-slate-800',
  todo: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
  in_progress: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  review: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300',
  testing: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300',
  done: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  cancelled: 'bg-slate-100 text-muted',
}

/** ຖັນທີ່ສະແດງເທິງກະດານ (ຍົກເວັ້ນ cancelled ທີ່ເອົາອອກຈາກສາຍຕາ) */
export const BOARD_COLUMNS: TaskStatus[] = [
  'backlog',
  'todo',
  'in_progress',
  'review',
  'testing',
  'done',
]

export type ProjectRow = {
  id: string
  project_no: string
  name: string
  description: string | null
  status: ProjectStatus
  priority: string
  priority_name_lo: string
  owner_employee_id: number
  owner_name: string
  owner_nickname: string | null
  requester_employee_id: number | null
  requester_name: string | null
  requester_department_name: string | null
  unit_code: string | null
  unit_name_lo: string | null
  start_date: string | null
  due_date: string | null
  done_date: string | null
  task_count: string
  task_done_count: string
  is_finished: boolean
  is_overdue: boolean
  created_at: string
}

export type TaskRow = {
  id: string
  project_id: string | null
  project_no: string | null
  project_name: string | null
  title: string
  description: string | null
  status: TaskStatus
  priority: string
  priority_name_lo: string
  assignee_employee_id: number | null
  assignee_name: string | null
  assignee_nickname: string | null
  due_date: string | null
  estimate_hours: string | null
  logged_hours: string
  is_finished: boolean
  is_overdue: boolean
  created_at: string
}

/** ຜູ້ຈັດການ/ຫົວໜ້າ ແກ້ໄຂໄດ້ໝົດ; ພະນັກງານແກ້ໄຂໄດ້ສະເພາະວຽກຂອງຕົນ */
export function canEditTask(user: ItStaff, task: TaskRow): boolean {
  if (user.role === 'manager' || user.role === 'head') return true
  return task.assignee_employee_id === user.employee_id
}

export function canEditProject(user: ItStaff, project: ProjectRow): boolean {
  if (user.role === 'manager' || user.role === 'head') return true
  return project.owner_employee_id === user.employee_id
}

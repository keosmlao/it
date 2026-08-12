/** ຄ່າຄົງທີ່ຂອງແຜນວຽກປະຈຳວັນ — ໃຊ້ໄດ້ທັງ server ແລະ client */

export const PLAN_ITEM_STATUSES = [
  'todo',
  'in_progress',
  'done',
  'blocked',
  'carried',
] as const

export type PlanItemStatus = (typeof PLAN_ITEM_STATUSES)[number]

export const PLAN_ITEM_LABEL_LO: Record<PlanItemStatus, string> = {
  todo: 'ຍັງບໍ່ເລີ່ມ',
  in_progress: 'ກຳລັງເຮັດ',
  done: 'ສຳເລັດ',
  blocked: 'ຕິດຂັດ',
  carried: 'ຍົກໄປມື້ອື່ນ',
}

export const PLAN_ITEM_STYLE: Record<PlanItemStatus, string> = {
  todo: 'bg-slate-100 text-muted dark:bg-white/5',
  in_progress: 'bg-brand-sky/20 text-brand-navy dark:text-brand-sky',
  done: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  blocked: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  carried: 'bg-brand-orange/20 text-brand-orange',
}

export const PLAN_STATUSES = ['draft', 'submitted', 'closed'] as const
export type PlanStatus = (typeof PLAN_STATUSES)[number]

export const PLAN_STATUS_LABEL_LO: Record<PlanStatus, string> = {
  draft: 'ຮ່າງ',
  submitted: 'ສົ່ງແຜນແລ້ວ',
  closed: 'ສະຫຼຸບແລ້ວ',
}

export type PlanRow = {
  id: string
  employee_id: number
  employee_name: string
  department_name: string | null
  role: string | null
  unit_code: string | null
  plan_date: string | Date
  status: PlanStatus
  focus: string | null
  blocker: string | null
  submitted_at: string | null
  closed_at: string | null
  item_count: string
  done_count: string
  planned_hours: string
  actual_hours: string
}

export type PlanItem = {
  id: string
  plan_id: string
  sort_order: number
  title: string
  detail: string | null
  planned_hours: string
  actual_hours: string | null
  status: PlanItemStatus
  ticket_id: string | null
  task_id: string | null
  project_id: string | null
  result_note: string | null
  plan_date: string | Date
  ticket_no: string | null
  ticket_title: string | null
  task_title: string | null
  project_name: string | null
}

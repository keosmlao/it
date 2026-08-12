import type { ItStaff } from '@/lib/auth/roles'

export const TICKET_STATUSES = [
  'new',
  'assigned',
  'in_progress',
  'pending',
  'resolved',
  'closed',
  'cancelled',
] as const

export type TicketStatus = (typeof TICKET_STATUSES)[number]

export const STATUS_LABEL_LO: Record<TicketStatus, string> = {
  new: 'ໃໝ່',
  assigned: 'ມອບໝາຍແລ້ວ',
  in_progress: 'ກຳລັງດຳເນີນການ',
  pending: 'ລໍຂໍ້ມູນ',
  resolved: 'ແກ້ໄຂແລ້ວ',
  closed: 'ປິດແລ້ວ',
  cancelled: 'ຍົກເລີກ',
}

/** Tailwind classes per status — used by the badge in list and detail views. */
export const STATUS_STYLE: Record<TicketStatus, string> = {
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  assigned: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300',
  in_progress: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  pending: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300',
  resolved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  closed: 'bg-slate-200 text-body dark:bg-slate-800',
  cancelled: 'bg-slate-100 text-muted',
}

export const PRIORITY_STYLE: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300',
  medium: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
  low: 'bg-slate-100 text-muted dark:bg-slate-800',
}

/**
 * ບັງຄັບໃຫ້ແນບຮູບຫຼັກຖານກ່ອນປ່ຽນເປັນ "ແກ້ໄຂແລ້ວ".
 * ຕັ້ງເປັນ false ຖ້າຢາກໃຫ້ແນບຫຼັກຖານເປັນທາງເລືອກ.
 */
export const REQUIRE_EVIDENCE_ON_RESOLVE = true

/** ສະຖານະທີ່ຍັງບໍ່ທັນຈົບ — ໃຊ້ນັບ "ຄ້າງ" */
export const OPEN_STATUSES: TicketStatus[] = [
  'new',
  'assigned',
  'in_progress',
  'pending',
]

/** ການປ່ຽນສະຖານະທີ່ອະນຸຍາດ — ກັນການຂ້າມຂັ້ນທີ່ບໍ່ມີຄວາມໝາຍ */
export const ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  new: ['assigned', 'in_progress', 'cancelled'],
  assigned: ['in_progress', 'pending', 'resolved', 'cancelled'],
  in_progress: ['pending', 'resolved', 'cancelled'],
  pending: ['in_progress', 'resolved', 'cancelled'],
  resolved: ['closed', 'in_progress'],
  closed: [],
  cancelled: [],
}

export type TicketRow = {
  id: string
  ticket_no: string
  title: string
  description: string | null
  category_code: string
  category_name_lo: string
  priority: string
  priority_name_lo: string
  status: TicketStatus
  requester_employee_id: number
  requester_name: string
  requester_department_name: string | null
  assignee_employee_id: number | null
  assignee_name: string | null
  assignee_nickname: string | null
  unit_code: string | null
  unit_name_lo: string | null
  sla_respond_due_at: string
  sla_resolve_due_at: string
  first_responded_at: string | null
  resolved_at: string | null
  closed_at: string | null
  resolution: string | null
  respond_overdue: boolean
  resolve_overdue: boolean
  is_finished: boolean
  created_at: string
  updated_at: string
}

export type TicketComment = {
  id: string
  kind: 'comment' | 'status_change' | 'assignment' | 'system'
  body: string
  is_internal: boolean
  author_employee_id: number
  author_name: string
  author_nickname: string | null
  created_at: string
}

/** ຜູ້ໃຊ້ແກ້ໄຂ ticket ນີ້ໄດ້ບໍ (ມອບໝາຍ, ປ່ຽນສະຖານະ, ແກ້ໄຂ) */
export function canEditTicket(user: ItStaff, ticket: TicketRow): boolean {
  if (user.role === 'manager' || user.role === 'head') return true
  return ticket.assignee_employee_id === user.employee_id
}

/** ຮັບ ticket ນີ້ມາເຮັດເອງໄດ້ບໍ */
export function canClaimTicket(user: ItStaff, ticket: TicketRow): boolean {
  if (ticket.is_finished) return false
  if (ticket.assignee_employee_id === user.employee_id) return false
  if (user.role === 'manager' || user.role === 'head') return true
  // ພະນັກງານຮັບເອງໄດ້ສະເພາະວຽກຂອງໜ່ວຍງານຕົນ ຫຼື ວຽກທີ່ຍັງບໍ່ມີເຈົ້າພາບ
  return !ticket.unit_code || ticket.unit_code === user.unit_code
}

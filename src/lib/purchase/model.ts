/** ຄ່າຄົງທີ່ຂອງໃບສະເໜີຊື້ (PR) — ໃຊ້ໄດ້ທັງ server ແລະ client */

export const PR_STATUSES = [
  'draft',
  'submitted',
  'head_approved',
  'approved',
  'ordered',
  'received',
  'rejected',
  'cancelled',
] as const

export type PrStatus = (typeof PR_STATUSES)[number]

export const PR_STATUS_LABEL_LO: Record<PrStatus, string> = {
  draft: 'ຮ່າງ',
  submitted: 'ລໍຫົວໜ້າອະນຸມັດ',
  head_approved: 'ລໍຜູ້ຈັດການອະນຸມັດ',
  approved: 'ອະນຸມັດແລ້ວ',
  ordered: 'ສັ່ງຊື້ແລ້ວ',
  received: 'ຮັບເຄື່ອງແລ້ວ',
  rejected: 'ບໍ່ອະນຸມັດ',
  cancelled: 'ຍົກເລີກ',
}

export const PR_STATUS_STYLE: Record<PrStatus, string> = {
  draft: 'bg-slate-100 text-muted dark:bg-white/5',
  submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  head_approved: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  ordered: 'bg-brand-sky/20 text-brand-navy dark:text-brand-sky',
  received: 'bg-slate-200 text-body dark:bg-slate-800',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  cancelled: 'bg-slate-100 text-muted dark:bg-white/5',
}

/** ຂັ້ນຕອນທີ່ຍັງແກ້ໄຂລາຍການໃນໃບໄດ້ */
export const PR_EDITABLE: PrStatus[] = ['draft']

export type PrRow = {
  id: string
  pr_no: string
  doc_date: string
  title: string
  purpose: string | null
  requester_employee_id: number
  requester_name: string
  department_code: string | null
  department_name: string | null
  unit_code: string | null
  unit_name_lo: string | null
  need_date: string | null
  status: PrStatus
  current_level: number
  reject_reason: string | null
  approved_by: number | null
  approved_by_name: string | null
  approved_at: string | null
  po_no: string | null
  received_at: string | null
  is_finished: boolean
  line_count: string
  total_est: string
  approval_count: string
  created_at: string
}

export type PrLine = {
  id: string
  pr_id: string
  line_no: number
  item_code: string | null
  item_name: string
  spec: string | null
  unit: string | null
  qty: string
  est_price: string | null
  note: string | null
}

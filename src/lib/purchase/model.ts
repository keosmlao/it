/** ຄ່າຄົງທີ່ຂອງໃບສະເໜີຊື້ (PR) — ໃຊ້ໄດ້ທັງ server ແລະ client */

export const PR_STATUSES = [
  'draft',
  'submitted',
  'approved',
  'ordered',
  'received',
  'rejected',
  'cancelled',
] as const

export type PrStatus = (typeof PR_STATUSES)[number]

export const PR_STATUS_LABEL_LO: Record<PrStatus, string> = {
  draft: 'ຮ່າງ',
  submitted: 'ລໍອະນຸມັດ',
  approved: 'ອະນຸມັດແລ້ວ',
  ordered: 'ສັ່ງຊື້ແລ້ວ',
  received: 'ຮັບເຄື່ອງແລ້ວ',
  rejected: 'ບໍ່ອະນຸມັດ',
  cancelled: 'ຍົກເລີກ',
}

export const PR_STATUS_STYLE: Record<PrStatus, string> = {
  draft: 'bg-slate-100 text-muted dark:bg-white/5',
  submitted: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  ordered: 'bg-brand-sky/20 text-brand-navy dark:text-brand-sky',
  received: 'bg-slate-200 text-body dark:bg-slate-800',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  cancelled: 'bg-slate-100 text-muted dark:bg-white/5',
}

export const CURRENCIES = ['LAK', 'THB', 'USD', 'CNY'] as const

export type PrRow = {
  id: string
  pr_no: string
  doc_date: string | Date
  title: string
  purpose: string | null
  erp_note: string | null
  supplier_suggestion: string | null
  supplier_code: string | null
  supplier_name: string | null
  doc_ref: string | null
  currency: string
  delivery_place: string | null
  budget_note: string | null
  current_step: number
  requester_code: string
  requester_employee_id: number | null
  requester_name: string | null
  requester_position: string | null
  department_code: string | null
  department_name: string | null
  unit_code: string | null
  unit_name_lo: string | null
  need_date: string | Date | null
  status: PrStatus
  reject_reason: string | null
  approved_by_code: string | null
  approved_by_name: string | null
  approved_at: string | null
  po_no: string | null
  created_by_name: string | null
  created_at: string
  is_finished: boolean
  line_count: string
  /** ຍອດຕາມລຳດັບຂອງເອກະສານ SML */
  total_gross: string
  line_discount: string
  total_before_discount: string
  discount_amount: string
  total_after_discount: string
  vat_rate: string
  vat_amount: string
  total_est: string
  approval_count: string
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
  discount: string
  line_gross: string
  line_total: string
  inventory_name: string | null
  inventory_unit: string | null
  stock_qty: string | null
  stock_cost: string | null
}

export type PrStep = {
  step_no: number
  name_lo: string
  approver_role: 'head' | 'manager' | null
  approver_employee_id: number | null
  approver_name: string | null
  min_amount: string
  is_active: boolean
  note: string | null
}

export type PrApproval = {
  id: string
  step_no: number
  decision: 'approved' | 'rejected'
  note: string | null
  approver_name: string
  decided_at: string
}

/** ຈຳນວນເງິນເປັນຕົວໜັງສືລາວ — ໃຊ້ໃນຟອມທີ່ພິມອອກ */
export function amountInWords(value: number): string {
  const n = Math.floor(Math.abs(value))
  if (n === 0) return 'ສູນ'

  const digits = ['ສູນ', 'ໜຶ່ງ', 'ສອງ', 'ສາມ', 'ສີ່', 'ຫ້າ', 'ຫົກ', 'ເຈັດ', 'ແປດ', 'ເກົ້າ']
  const units = ['', 'ສິບ', 'ຮ້ອຍ', 'ພັນ', 'ໝື່ນ', 'ແສນ']

  const chunk = (num: number): string => {
    // ຮອດລ້ານໃຫ້ຕັດເປັນທ່ອນ ແລ້ວຕໍ່ຄຳວ່າ "ລ້ານ"
    if (num >= 1_000_000) {
      const high = Math.floor(num / 1_000_000)
      const low = num % 1_000_000
      return chunk(high) + 'ລ້ານ' + (low ? chunk(low) : '')
    }

    const s = String(num)
    let out = ''
    for (let i = 0; i < s.length; i++) {
      const d = Number(s[i])
      const pos = s.length - i - 1
      if (d === 0) continue
      if (pos === 1 && d === 1) out += 'ສິບ'
      else if (pos === 1 && d === 2) out += 'ຊາວ'
      else if (pos === 0 && d === 1 && s.length > 1) out += 'ເອັດ'
      else out += digits[d] + units[pos]
    }
    return out
  }

  return chunk(n)
}

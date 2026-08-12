// Client-safe constants for the work-log form.
export const WORK_TYPES = [
  'ປະຊຸມ',
  'ຝຶກອົບຮົມ',
  'ບຳລຸງຮັກສາລະບົບ',
  'ຕິດຕັ້ງ / ຕັ້ງຄ່າ',
  'ເອກະສານ / ລາຍງານ',
  'ອື່ນໆ',
] as const

export type WorkLogRow = {
  id: string
  employee_id: number
  employee_name: string
  log_date: string
  hours: string
  ticket_id: string | null
  ticket_no: string | null
  ticket_title: string | null
  task_id: string | null
  task_title: string | null
  work_type: string | null
  note: string | null
  created_at: string
}

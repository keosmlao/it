import 'server-only'
import { query } from '@/lib/db'
import type {
  AccountSystem,
  ChecklistItem,
  EmployeeChecklist,
  SystemAccount,
} from './model'

// ------------------------------------------------------------- ລະບົບ

export async function listAccountSystems(includeInactive = false) {
  return query<AccountSystem>(
    `select * from it.v_account_systems
      where $1::boolean or is_active
      order by name`,
    [includeInactive]
  )
}

export async function getAccountSystem(code: string) {
  const rows = await query<AccountSystem>(
    'select * from it.v_account_systems where code = $1::varchar',
    [code]
  )
  return rows[0] ?? null
}

// ------------------------------------------------------------ ບັນຊີ

export async function listSystemAccounts(
  filters: { system?: string; status?: string; state?: string; q?: string } = {}
) {
  const params: unknown[] = []
  const where: string[] = ['true']

  if (filters.system && filters.system !== 'all') {
    params.push(filters.system)
    where.push(`system_code = $${params.length}`)
  }

  if (filters.status && filters.status !== 'all') {
    params.push(filters.status)
    where.push(`status = $${params.length}`)
  } else if (!filters.status) {
    where.push(`status <> 'closed'`)
  }

  // ອັນທີ່ຕ້ອງລົງມືປິດ — ນີ້ຄືເຫດຜົນຫຼັກທີ່ໂມດູນນີ້ມີຢູ່
  if (filters.state === 'closable') where.push('should_close')

  if (filters.q) {
    params.push(`%${filters.q}%`)
    const i = params.length
    where.push(
      `(username ilike $${i} or employee_name ilike $${i}
        or employee_code ilike $${i} or system_name ilike $${i})`
    )
  }

  return query<SystemAccount>(
    `select * from it.v_system_accounts
      where ${where.join(' and ')}
      order by should_close desc, system_name, employee_name
      limit 500`,
    params
  )
}

export async function getSystemAccount(id: string) {
  const rows = await query<SystemAccount>(
    'select * from it.v_system_accounts where id = $1::bigint',
    [id]
  )
  return rows[0] ?? null
}

/** ບັນຊີຂອງພະນັກງານຄົນໜຶ່ງ — ໃຊ້ໃນໜ້າຂັ້ນຕອນພະນັກງານອອກ */
export async function getAccountsForEmployee(employeeId: number) {
  return query<SystemAccount>(
    `select * from it.v_system_accounts
      where employee_id = $1::int
      order by status, system_name`,
    [employeeId]
  )
}

export async function getAccountStats() {
  const rows = await query<{
    total: string
    active: string
    closable: string
    systems: string
  }>(
    `select count(*)                                   as total,
            count(*) filter (where status = 'active')  as active,
            count(*) filter (where should_close)       as closable,
            (select count(*) from it.account_systems where is_active) as systems
       from it.v_system_accounts`
  )
  return rows[0]
}

// ------------------------------------------------------- ຂັ້ນຕອນເຂົ້າ/ອອກ

export async function listChecklists(
  filters: { kind?: string; status?: string; q?: string } = {}
) {
  const params: unknown[] = []
  const where: string[] = ['true']

  if (filters.kind && filters.kind !== 'all') {
    params.push(filters.kind)
    where.push(`kind = $${params.length}`)
  }

  if (filters.status && filters.status !== 'all') {
    params.push(filters.status)
    where.push(`status = $${params.length}`)
  } else if (!filters.status) {
    where.push(`status = 'open'`)
  }

  if (filters.q) {
    params.push(`%${filters.q}%`)
    const i = params.length
    where.push(`(employee_name ilike $${i} or employee_code ilike $${i})`)
  }

  return query<EmployeeChecklist>(
    `select * from it.v_employee_checklists
      where ${where.join(' and ')}
      order by status, is_late desc, started_at desc
      limit 200`,
    params
  )
}

export async function getChecklist(id: string) {
  const rows = await query<EmployeeChecklist>(
    'select * from it.v_employee_checklists where id = $1::bigint',
    [id]
  )
  return rows[0] ?? null
}

export async function getChecklistItems(checklistId: string) {
  return query<ChecklistItem>(
    `select id, checklist_id, sort_order, title, hint, is_done, done_by, done_at, note
       from it.checklist_items
      where checklist_id = $1::bigint
      order by sort_order, id`,
    [checklistId]
  )
}

export async function getChecklistStats() {
  const rows = await query<{ open: string; late: string; onboard: string; offboard: string }>(
    `select count(*) filter (where status = 'open')                  as open,
            count(*) filter (where is_late)                          as late,
            count(*) filter (where status = 'open' and kind = 'onboard')  as onboard,
            count(*) filter (where status = 'open' and kind = 'offboard') as offboard
       from it.v_employee_checklists`
  )
  return rows[0]
}

// ------------------------------------------------------------ ຕົວເລືອກ

/**
 * ພະນັກງານທັງບໍລິສັດ — ບໍ່ແມ່ນສະເພາະ IT ເພາະບັນຊີ ແລະ ຂັ້ນຕອນເຂົ້າ/ອອກ
 * ເປັນຂອງທຸກພະແນກ
 */
export async function getEmployeeOptions(includeInactive = false) {
  return query<{
    employee_id: number
    employee_code: string
    fullname_lo: string
    department_name: string | null
    employment_status: string | null
  }>(
    `select e.employee_id, e.employee_code, e.fullname_lo,
            d.department_name_lo as department_name, e.employment_status
       from public.odg_employee e
       left join public.odg_department d
              on d.department_code::text = e.department_code::text
      where $1::boolean or e.employment_status = 'ACTIVE'
      order by e.fullname_lo
      limit 1000`,
    [includeInactive]
  )
}

export async function getChecklistTemplates(kind: string) {
  return query<{ sort_order: number; title: string; hint: string | null }>(
    `select sort_order, title, hint
       from it.checklist_templates
      where kind = $1::varchar and is_active
      order by sort_order`,
    [kind]
  )
}

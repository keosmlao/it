import 'server-only'
import { query } from '@/lib/db'
import type { ItStaff } from '@/lib/auth/roles'
import { can } from '@/lib/auth/roles'
import type { Column, Dataset } from './builders'
import { safeDate } from '@/lib/assets/model'
import { STATUS_LABEL_LO, type TicketStatus } from '@/lib/tickets/model'
import { PR_STATUS_LABEL_LO, type PrStatus } from '@/lib/purchase/model'
import { PLAN_ITEM_LABEL_LO, type PlanItemStatus } from '@/lib/plans/model'
import {
  RECOVERY_LABEL_LO,
  STOCK_LABEL_LO,
  WRITEOFF_REASON_LO,
  type RecoveryState,
  type StockState,
  type WriteoffReason,
} from '@/lib/assets/stock-model'

// ທຸກ query ຂ້າງລຸ່ມນີ້ຈຳກັດໄວ້ `limit 5000` ຕໍ່ໄຟລ໌ ເພື່ອບໍ່ໃຫ້ດຶງທັງຖານຂໍ້ມູນ
// ອອກມາເທື່ອດຽວ. ຂຽນເປັນຕົວເລກຈິງ ບໍ່ແມ່ນ ${ຕົວແປ} ເພາະ npm run db:check-sql
// ຂ້າມຄຳສັ່ງທີ່ມີການແຊກຄ່າ ແລ້ວຈະບໍ່ໄດ້ກວດ query ເຫຼົ່ານີ້ເລີຍ

export const DATASETS = [
  'assets',
  'movements',
  'holders',
  'recovery',
  'loans',
  'conflicts',
  'damaged',
  'deployed',
  'tickets',
  'purchase',
  'plans',
] as const

export type DatasetName = (typeof DATASETS)[number]

export const DATASET_LABEL_LO: Record<DatasetName, string> = {
  assets: 'ທະບຽນອຸປະກອນ',
  movements: 'ປະຫວັດຢືມ–ຄືນ',
  holders: 'ຜູ້ຖືຄອງອຸປະກອນ',
  recovery: 'ລາຍການທວງຄືນ',
  loans: 'ໃບຢືມທີ່ຍັງຄ້າງ',
  conflicts: 'ໃບຢືມທີ່ຂັດກັນ',
  damaged: 'ອຸປະກອນເພ / ຕັດຈຳໜ່າຍ',
  deployed: 'ອຸປະກອນສ່ວນກາງ',
  tickets: 'Ticket ແຈ້ງບັນຫາ',
  purchase: 'ໃບສະເໜີຊື້',
  plans: 'ແຜນວຽກປະຈຳວັນ',
}

export function isDataset(value: string): value is DatasetName {
  return (DATASETS as readonly string[]).includes(value)
}

/** ຜູ້ໃຊ້ຄົນນີ້ດຶງຊຸດຂໍ້ມູນນີ້ອອກໄດ້ບໍ */
export function canExport(user: ItStaff, name: DatasetName): boolean {
  if (!can.useStaffArea(user)) return false
  if (name === 'plans') return can.viewReports(user)
  return true
}

type Params = { from?: string; to?: string; q?: string; state?: string }

export async function buildDataset(
  name: DatasetName,
  user: ItStaff,
  params: Params
): Promise<Dataset> {
  const stamp = new Date().toISOString().slice(0, 10)
  const base = { fileName: `odg-it-${name}-${stamp}`, title: DATASET_LABEL_LO[name] }

  switch (name) {
    case 'assets':
      return { ...base, ...(await assets(params)) }
    case 'movements':
      return { ...base, ...(await movements(params)) }
    case 'holders':
      return { ...base, ...(await holders()) }
    case 'recovery':
      return { ...base, ...(await recovery()) }
    case 'loans':
      return { ...base, ...(await loans()) }
    case 'conflicts':
      return { ...base, ...(await conflicts()) }
    case 'damaged':
      return { ...base, ...(await damaged()) }
    case 'deployed':
      return { ...base, ...(await deployed()) }
    case 'tickets':
      return { ...base, ...(await tickets(user, params)) }
    case 'purchase':
      return { ...base, ...(await purchase(params)) }
    case 'plans':
      return { ...base, ...(await plans(params)) }
  }
}

// ---------------------------------------------------------------- assets

async function assets(params: Params) {
  const rows = await query(
    `select asset_code, name, category_name, brand, model, serial_no,
            location_name, department_name, holder_name, holder_department,
            borrowed_at, registered_at, purchase_date, purchase_price,
            warranty_until, warranty_status, is_assigned, is_active,
            movement_count, repair_count
       from it.v_it_assets
      where ($1::text is null
             or asset_code ilike $1::text or name ilike $1::text
             or serial_no ilike $1::text or holder_name ilike $1::text)
      order by asset_code desc
      limit 5000`,
    [params.q ? `%${params.q}%` : null]
  )

  const columns: Column[] = [
    { key: 'asset_code', label: 'ລະຫັດ', width: 16 },
    { key: 'name', label: 'ຊື່ອຸປະກອນ', width: 30 },
    { key: 'category_name', label: 'ປະເພດ', width: 14 },
    { key: 'brand', label: 'ຍີ່ຫໍ້', width: 12 },
    { key: 'model', label: 'ລຸ້ນ', width: 16 },
    { key: 'serial_no', label: 'S/N', width: 16 },
    { key: 'location_name', label: 'ສະຖານທີ່', width: 18 },
    { key: 'holder_name', label: 'ຜູ້ຖືຄອງ', width: 20 },
    { key: 'holder_department', label: 'ພະແນກຜູ້ຖື', width: 20 },
    { key: 'borrowed_at_lo', label: 'ຢືມເມື່ອ', width: 12 },
    { key: 'purchase_date_lo', label: 'ວັນທີຊື້', width: 12 },
    { key: 'purchase_price', label: 'ລາຄາຊື້', width: 14, numFmt: '#,##0', align: 'right' },
    { key: 'warranty_until_lo', label: 'ປະກັນຮອດ', width: 12 },
    { key: 'warranty_status_lo', label: 'ສະຖານະປະກັນ', width: 14 },
    { key: 'holding_lo', label: 'ການຖືຄອງ', width: 12 },
    { key: 'movement_count', label: 'ຄັ້ງທີ່ຢືມ', width: 10, align: 'right' },
    { key: 'repair_count', label: 'ຄັ້ງທີ່ສ້ອມ', width: 10, align: 'right' },
  ]

  const WARRANTY_LO: Record<string, string> = {
    valid: 'ຍັງມີປະກັນ',
    expiring: 'ໃກ້ໝົດ',
    expired: 'ໝົດແລ້ວ',
    unknown: 'ບໍ່ຮູ້',
  }

  return {
    subtitle: `${rows.length} ລາຍການ · ດຶງເມື່ອ ${safeDate(new Date().toISOString())}`,
    columns,
    rows: rows.map((r) => ({
      ...r,
      borrowed_at_lo: safeDate(r.borrowed_at as string),
      purchase_date_lo: safeDate(r.purchase_date as string),
      warranty_until_lo: safeDate(r.warranty_until as string),
      warranty_status_lo: WARRANTY_LO[String(r.warranty_status)] ?? r.warranty_status,
      holding_lo: r.is_assigned ? 'ຢູ່ກັບຜູ້ໃຊ້' : 'ຢູ່ໃນສາງ',
    })),
  }
}

// ------------------------------------------------------------- movements

async function movements(params: Params) {
  const rows = await query(
    `select source, borrow_doc_no, asset_code, asset_name, emp_code, emp_name,
            org_department, unit_name, division_name, borrowed_at, returned_at,
            return_doc_no, is_returned, is_former_employee
       from it.v_asset_movements
      where ($1::text is null or not is_returned)
      order by borrowed_at desc nulls last, borrow_doc_no desc nulls last
      limit 5000`,
    [params.state === 'holding' ? 'x' : null]
  )

  return {
    subtitle: `${rows.length} ລາຍການ${params.state === 'holding' ? ' (ສະເພາະທີ່ຍັງບໍ່ຄືນ)' : ''}`,
    columns: [
      { key: 'borrow_doc_no', label: 'ເລກໃບຢືມ', width: 16 },
      { key: 'source_lo', label: 'ແຫຼ່ງ', width: 10 },
      { key: 'asset_code', label: 'ລະຫັດ', width: 16 },
      { key: 'asset_name', label: 'ອຸປະກອນ', width: 28 },
      { key: 'emp_name', label: 'ຜູ້ຢືມ', width: 22 },
      { key: 'org_department', label: 'ພະແນກ', width: 22 },
      { key: 'division_name', label: 'ຝ່າຍ', width: 18 },
      { key: 'borrowed_at_lo', label: 'ຢືມເມື່ອ', width: 12 },
      { key: 'returned_at_lo', label: 'ຄືນເມື່ອ', width: 12 },
      { key: 'return_doc_no', label: 'ເລກໃບຄືນ', width: 16 },
      { key: 'status_lo', label: 'ສະຖານະ', width: 12 },
    ] satisfies Column[],
    rows: rows.map((r) => ({
      ...r,
      source_lo: r.source === 'erp' ? 'ERP' : 'ລະບົບນີ້',
      borrowed_at_lo: safeDate(r.borrowed_at as string),
      returned_at_lo: safeDate(r.returned_at as string),
      status_lo: r.is_returned ? 'ຄືນແລ້ວ' : 'ຍັງບໍ່ຄືນ',
    })),
  }
}

// --------------------------------------------------------------- holders

async function holders() {
  const rows = await query(
    `select emp_code, emp_name, org_department, division_name, unit_name,
            is_former_employee,
            count(*)                                        as asset_count,
            min(borrowed_at)                                as first_borrowed,
            max(borrowed_at)                                as last_borrowed,
            string_agg(asset_name, ', ' order by borrowed_at desc) as assets
       from it.v_asset_movements
      where not is_returned
      group by 1, 2, 3, 4, 5, 6
      order by is_former_employee desc, count(*) desc, emp_name
      limit 5000`
  )

  return {
    subtitle: `${rows.length} ຄົນທີ່ຍັງຖືອຸປະກອນຢູ່`,
    columns: [
      { key: 'emp_code', label: 'ລະຫັດພະນັກງານ', width: 14 },
      { key: 'emp_name', label: 'ຊື່', width: 24 },
      { key: 'org_department', label: 'ພະແນກ', width: 22 },
      { key: 'division_name', label: 'ຝ່າຍ', width: 18 },
      { key: 'status_lo', label: 'ສະຖານະ', width: 12 },
      { key: 'asset_count', label: 'ຈຳນວນເຄື່ອງ', width: 10, align: 'right' },
      { key: 'last_borrowed_lo', label: 'ຢືມລ່າສຸດ', width: 12 },
      { key: 'assets', label: 'ລາຍການເຄື່ອງ', width: 46 },
    ] satisfies Column[],
    rows: rows.map((r) => ({
      ...r,
      status_lo: r.is_former_employee ? 'ອອກແລ້ວ' : 'ຍັງເຮັດວຽກ',
      last_borrowed_lo: safeDate(r.last_borrowed as string),
    })),
  }
}

// -------------------------------------------------------------- recovery

async function recovery() {
  const rows = await query(
    `select asset_code, asset_name, emp_code, emp_name, org_department,
            borrow_doc_no, borrowed_at, days_held, reason, recovery_status,
            contacted_at, promised_date, recovery_note
       from it.v_recovery_targets
      order by is_former_employee desc, days_held desc
      limit 5000`
  )

  return {
    subtitle: `${rows.length} ລາຍການທີ່ຕ້ອງທວງຄືນ`,
    columns: [
      { key: 'emp_name', label: 'ຜູ້ຖືຄອງ', width: 22 },
      { key: 'org_department', label: 'ພະແນກ', width: 22 },
      { key: 'reason_lo', label: 'ເຫດຜົນ', width: 16 },
      { key: 'asset_code', label: 'ລະຫັດ', width: 16 },
      { key: 'asset_name', label: 'ອຸປະກອນ', width: 28 },
      { key: 'borrow_doc_no', label: 'ເລກໃບຢືມ', width: 16 },
      { key: 'borrowed_at_lo', label: 'ຢືມເມື່ອ', width: 12 },
      { key: 'days_held', label: 'ຖືມາ (ມື້)', width: 10, align: 'right' },
      { key: 'status_lo', label: 'ສະຖານະທວງ', width: 16 },
      { key: 'promised_date_lo', label: 'ຮັບປາກຄືນ', width: 12 },
      { key: 'recovery_note', label: 'ບັນທຶກ', width: 30 },
    ] satisfies Column[],
    rows: rows.map((r) => ({
      ...r,
      reason_lo: r.reason === 'former' ? 'ພະນັກງານອອກແລ້ວ' : 'ຖືເກີນ 1 ປີ',
      borrowed_at_lo: safeDate(r.borrowed_at as string),
      promised_date_lo: safeDate(r.promised_date as string),
      status_lo:
        RECOVERY_LABEL_LO[(r.recovery_status as RecoveryState) ?? 'open'] ??
        'ຍັງບໍ່ໄດ້ຕິດຕໍ່',
    })),
  }
}

// ----------------------------------------------------------------- loans

async function loans() {
  const rows = await query(
    `select source, borrow_doc_no, asset_code, asset_name, emp_code, emp_name,
            org_department, borrowed_at, expected_return, is_former_employee,
            (current_date - borrowed_at::date) as days_held
       from it.v_asset_movements
      where not is_returned
      order by borrowed_at desc nulls last
      limit 5000`
  )

  return {
    subtitle: `${rows.length} ໃບຢືມທີ່ຍັງບໍ່ຄືນ`,
    columns: [
      { key: 'borrow_doc_no', label: 'ເລກໃບຢືມ', width: 16 },
      { key: 'source_lo', label: 'ແຫຼ່ງ', width: 10 },
      { key: 'asset_code', label: 'ລະຫັດ', width: 16 },
      { key: 'asset_name', label: 'ອຸປະກອນ', width: 28 },
      { key: 'emp_name', label: 'ຜູ້ຢືມ', width: 22 },
      { key: 'org_department', label: 'ພະແນກ', width: 22 },
      { key: 'borrowed_at_lo', label: 'ຢືມເມື່ອ', width: 12 },
      { key: 'expected_return_lo', label: 'ຄາດຄືນ', width: 12 },
      { key: 'days_held', label: 'ຖືມາ (ມື້)', width: 10, align: 'right' },
      { key: 'former_lo', label: 'ຍັງເຮັດວຽກ', width: 12 },
    ] satisfies Column[],
    rows: rows.map((r) => ({
      ...r,
      source_lo: r.source === 'erp' ? 'ERP' : 'ລະບົບນີ້',
      borrowed_at_lo: safeDate(r.borrowed_at as string),
      expected_return_lo: safeDate(r.expected_return as string),
      former_lo: r.is_former_employee ? 'ອອກແລ້ວ' : 'ຍັງຢູ່',
    })),
  }
}

// ------------------------------------------------------------- conflicts

async function conflicts() {
  const rows = await query(
    `select asset_code, asset_name, serial_no, open_count, seq, emp_code, emp_name,
            org_department, division_name, is_former_employee, source,
            borrow_doc_no, borrowed_at, days_held, is_shown_as_holder
       from it.v_loan_conflicts
      order by open_count desc, asset_code, seq
      limit 5000`
  )

  return {
    subtitle: `${new Set(rows.map((r) => r.asset_code)).size} ເຄື່ອງ · ໃບຢືມຄ້າງ ${rows.length} ໃບ`,
    columns: [
      { key: 'asset_code', label: 'ລະຫັດ', width: 16 },
      { key: 'asset_name', label: 'ອຸປະກອນ', width: 28 },
      { key: 'open_count', label: 'ໃບຄ້າງ', width: 8, align: 'right' },
      { key: 'seq', label: 'ລຳດັບ', width: 8, align: 'right' },
      { key: 'emp_name', label: 'ຜູ້ຢືມ', width: 22 },
      { key: 'org_department', label: 'ພະແນກ', width: 22 },
      { key: 'former_lo', label: 'ຍັງເຮັດວຽກ', width: 12 },
      { key: 'borrow_doc_no', label: 'ເລກໃບຢືມ', width: 16 },
      { key: 'borrowed_at_lo', label: 'ຢືມເມື່ອ', width: 12 },
      { key: 'days_held', label: 'ຖືມາ (ມື້)', width: 10, align: 'right' },
      { key: 'shown_lo', label: 'ສະຖານະທີ່ໜ້າຈໍ', width: 16 },
    ] satisfies Column[],
    rows: rows.map((r) => ({
      ...r,
      former_lo: r.is_former_employee ? 'ອອກແລ້ວ' : 'ຍັງຢູ່',
      borrowed_at_lo: safeDate(r.borrowed_at as string),
      shown_lo: r.is_shown_as_holder ? 'ສະແດງຢູ່' : 'ຖືກເຊື່ອງ',
    })),
  }
}

// --------------------------------------------------------------- damaged

async function damaged() {
  const rows = await query(
    `select asset_code, asset_name, category_name, serial_no, stock_state,
            damaged_at, damage_detail, checked_by_name, repair_count,
            repair_cost_total, purchase_price, writeoff_reason, written_off_at,
            decided_by_name, book_value
       from it.v_damaged_assets
      order by stock_state, damaged_at desc nulls last, asset_code
      limit 5000`
  )

  return {
    subtitle: `${rows.length} ເຄື່ອງທີ່ມີບັນຫາ`,
    columns: [
      { key: 'asset_code', label: 'ລະຫັດ', width: 16 },
      { key: 'asset_name', label: 'ອຸປະກອນ', width: 30 },
      { key: 'category_name', label: 'ປະເພດ', width: 14 },
      { key: 'serial_no', label: 'S/N', width: 16 },
      { key: 'state_lo', label: 'ສະຖານະ', width: 16 },
      { key: 'damaged_at_lo', label: 'ພົບເມື່ອ', width: 12 },
      { key: 'damage_detail', label: 'ອາການ', width: 34 },
      { key: 'repair_count', label: 'ສ້ອມ (ຄັ້ງ)', width: 10, align: 'right' },
      { key: 'repair_cost_total', label: 'ຄ່າສ້ອມລວມ', width: 14, numFmt: '#,##0', align: 'right' },
      { key: 'purchase_price', label: 'ລາຄາຊື້', width: 14, numFmt: '#,##0', align: 'right' },
      { key: 'writeoff_reason_lo', label: 'ເຫດຜົນຕັດຈຳໜ່າຍ', width: 22 },
      { key: 'written_off_at_lo', label: 'ຕັດຈຳໜ່າຍເມື່ອ', width: 12 },
      { key: 'decided_by_name', label: 'ຜູ້ຕັດສິນ', width: 20 },
    ] satisfies Column[],
    rows: rows.map((r) => ({
      ...r,
      state_lo: STOCK_LABEL_LO[r.stock_state as StockState] ?? r.stock_state,
      damaged_at_lo: safeDate(r.damaged_at as string),
      written_off_at_lo: safeDate(r.written_off_at as string),
      writeoff_reason_lo: r.writeoff_reason
        ? (WRITEOFF_REASON_LO[r.writeoff_reason as WriteoffReason] ?? r.writeoff_reason)
        : '',
    })),
  }
}

// -------------------------------------------------------------- deployed

async function deployed() {
  const rows = await query(
    `select asset_code, asset_name, category_name, serial_no, mac_address,
            place, purpose, location_name, responsible_name,
            responsible_department, installed_at, days_installed, removed_at,
            note
       from it.v_asset_deployments
      order by removed_at nulls first, place, asset_name
      limit 5000`
  )

  return {
    subtitle: `${rows.filter((r) => !r.removed_at).length} ເຄື່ອງຕິດຕັ້ງຢູ່`,
    columns: [
      { key: 'place', label: 'ບ່ອນຕິດຕັ້ງ', width: 26 },
      { key: 'asset_code', label: 'ລະຫັດ', width: 16 },
      { key: 'asset_name', label: 'ອຸປະກອນ', width: 28 },
      { key: 'category_name', label: 'ປະເພດ', width: 14 },
      { key: 'serial_no', label: 'S/N', width: 16 },
      { key: 'mac_address', label: 'MAC', width: 18 },
      { key: 'purpose', label: 'ໃຊ້ເຮັດຫຍັງ', width: 26 },
      { key: 'responsible_name', label: 'ຜູ້ຮັບຜິດຊອບ', width: 22 },
      { key: 'responsible_department', label: 'ພະແນກ', width: 20 },
      { key: 'installed_at_lo', label: 'ຕິດຕັ້ງເມື່ອ', width: 12 },
      { key: 'days_installed', label: 'ຕິດຕັ້ງມາ (ມື້)', width: 12, align: 'right' },
      { key: 'status_lo', label: 'ສະຖານະ', width: 14 },
    ] satisfies Column[],
    rows: rows.map((r) => ({
      ...r,
      installed_at_lo: safeDate(r.installed_at as string),
      status_lo: r.removed_at ? `ຖອດອອກ ${safeDate(r.removed_at as string)}` : 'ຕິດຕັ້ງຢູ່',
    })),
  }
}

// --------------------------------------------------------------- tickets

async function tickets(user: ItStaff, params: Params) {
  // ໃຊ້ຂອບເຂດການເບິ່ງເຫັນອັນດຽວກັນກັບໜ້າຈໍ
  const units = can.visibleUnits(user)
  const rows = await query(
    `select ticket_no, title, category_name_lo, priority_name_lo, status,
            requester_name, requester_department_name, assignee_name,
            unit_name_lo, created_at, resolved_at, closed_at,
            respond_overdue, resolve_overdue, resolution
       from it.v_tickets
      where ($1::text[] is null
             or unit_code = any($1::text[]) or unit_code is null
             or assignee_employee_id = $2::int)
        and ($3::date is null or created_at::date >= $3::date)
        and ($4::date is null or created_at::date <= $4::date)
      order by created_at desc
      limit 5000`,
    [units, user.employee_id, params.from ?? null, params.to ?? null]
  )

  return {
    subtitle: rangeLabel(params, `${rows.length} ລາຍການ`),
    columns: [
      { key: 'ticket_no', label: 'ເລກ Ticket', width: 14 },
      { key: 'title', label: 'ຫົວຂໍ້', width: 34 },
      { key: 'category_name_lo', label: 'ປະເພດ', width: 18 },
      { key: 'priority_name_lo', label: 'ຄວາມດ່ວນ', width: 12 },
      { key: 'status_lo', label: 'ສະຖານະ', width: 14 },
      { key: 'requester_name', label: 'ຜູ້ແຈ້ງ', width: 22 },
      { key: 'requester_department_name', label: 'ພະແນກຜູ້ແຈ້ງ', width: 22 },
      { key: 'assignee_name', label: 'ຜູ້ຮັບຜິດຊອບ', width: 22 },
      { key: 'created_at_lo', label: 'ແຈ້ງເມື່ອ', width: 12 },
      { key: 'resolved_at_lo', label: 'ແກ້ໄຂເມື່ອ', width: 12 },
      { key: 'sla_lo', label: 'SLA', width: 14 },
    ] satisfies Column[],
    rows: rows.map((r) => ({
      ...r,
      status_lo: STATUS_LABEL_LO[r.status as TicketStatus] ?? r.status,
      created_at_lo: safeDate(r.created_at as string),
      resolved_at_lo: safeDate(r.resolved_at as string),
      sla_lo: r.respond_overdue
        ? 'ຕອບຊ້າ'
        : r.resolve_overdue
          ? 'ແກ້ຊ້າ'
          : 'ຕາມກຳນົດ',
    })),
  }
}

// -------------------------------------------------------------- purchase

async function purchase(params: Params) {
  const rows = await query(
    `select pr_no, doc_date, title, requester_name, department_name,
            need_date, status, currency, line_count, total_est, po_no,
            supplier_suggestion, budget_note, approved_by_name, approved_at
       from it.v_pr
      where ($1::date is null or doc_date >= $1::date)
        and ($2::date is null or doc_date <= $2::date)
      order by doc_date desc, id desc
      limit 5000`,
    [params.from ?? null, params.to ?? null]
  )

  return {
    subtitle: rangeLabel(params, `${rows.length} ໃບ`),
    columns: [
      { key: 'pr_no', label: 'ເລກໃບ', width: 14 },
      { key: 'doc_date_lo', label: 'ວັນທີ', width: 12 },
      { key: 'title', label: 'ຫົວຂໍ້', width: 34 },
      { key: 'requester_name', label: 'ຜູ້ສະເໜີ', width: 22 },
      { key: 'department_name', label: 'ພະແນກ', width: 22 },
      { key: 'need_date_lo', label: 'ຕ້ອງການພາຍໃນ', width: 12 },
      { key: 'status_lo', label: 'ສະຖານະ', width: 16 },
      { key: 'line_count', label: 'ລາຍການ', width: 10, align: 'right' },
      { key: 'total_est', label: 'ມູນຄ່າປະມານ', width: 16, numFmt: '#,##0', align: 'right' },
      { key: 'currency', label: 'ສະກຸນເງິນ', width: 10 },
      { key: 'supplier_suggestion', label: 'ຜູ້ຂາຍທີ່ສະເໜີ', width: 22 },
      { key: 'budget_note', label: 'ງົບປະມານ', width: 18 },
      { key: 'po_no', label: 'ເລກ PO', width: 14 },
      { key: 'approved_by_name', label: 'ຜູ້ອະນຸມັດ', width: 20 },
    ] satisfies Column[],
    rows: rows.map((r) => ({
      ...r,
      doc_date_lo: safeDate(r.doc_date as string),
      need_date_lo: safeDate(r.need_date as string),
      status_lo: PR_STATUS_LABEL_LO[r.status as PrStatus] ?? r.status,
    })),
  }
}

// ----------------------------------------------------------------- plans

async function plans(params: Params) {
  const rows = await query(
    `select p.plan_date, p.employee_name, p.department_name, p.status,
            p.focus, p.blocker, i.title, i.planned_hours, i.actual_hours,
            i.status as item_status, i.result_note, t.ticket_no
       from it.v_daily_plans p
       left join it.daily_plan_items i on i.plan_id = p.id
       left join it.tickets t on t.id = i.ticket_id
      where ($1::date is null or p.plan_date >= $1::date)
        and ($2::date is null or p.plan_date <= $2::date)
      order by p.plan_date desc, p.employee_name, i.sort_order
      limit 5000`,
    [params.from ?? null, params.to ?? null]
  )

  return {
    subtitle: rangeLabel(params, `${rows.length} ແຖວ`),
    columns: [
      { key: 'plan_date_lo', label: 'ວັນທີ', width: 12 },
      { key: 'employee_name', label: 'ພະນັກງານ', width: 22 },
      { key: 'department_name', label: 'ພະແນກ', width: 20 },
      { key: 'focus', label: 'ເປົ້າໝາຍຂອງມື້', width: 30 },
      { key: 'title', label: 'ວຽກ', width: 34 },
      { key: 'ticket_no', label: 'Ticket', width: 14 },
      { key: 'planned_hours', label: 'ຊມ ວາງແຜນ', width: 10, align: 'right' },
      { key: 'actual_hours', label: 'ຊມ ຈິງ', width: 10, align: 'right' },
      { key: 'item_status_lo', label: 'ຜົນ', width: 14 },
      { key: 'result_note', label: 'ບັນທຶກ', width: 30 },
      { key: 'blocker', label: 'ຕິດຂັດ', width: 24 },
    ] satisfies Column[],
    rows: rows.map((r) => ({
      ...r,
      plan_date_lo: safeDate(r.plan_date as string),
      item_status_lo: r.item_status
        ? (PLAN_ITEM_LABEL_LO[r.item_status as PlanItemStatus] ?? r.item_status)
        : '',
    })),
  }
}

function rangeLabel(params: Params, suffix: string) {
  if (params.from || params.to) {
    return `${safeDate(params.from ?? null)} — ${safeDate(params.to ?? null)} · ${suffix}`
  }
  return `ດຶງເມື່ອ ${safeDate(new Date().toISOString())} · ${suffix}`
}

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
  BILLING_CYCLE_LABEL_LO,
  PERIOD_STATUS_LABEL_LO,
  SUB_CATEGORY_LABEL_LO,
  SUB_STATUS_LABEL_LO,
  type BillingCycle,
  type PeriodStatus,
  type SubCategory,
  type SubStatus,
} from '@/lib/subscriptions/model'
import {
  PM_CATEGORY_LABEL_LO,
  type PmCategory,
} from '@/lib/maintenance/model'
import {
  INCIDENT_SERVICE_LABEL_LO,
  SEVERITY_SHORT_LO,
  type IncidentService,
  type IncidentSeverity,
} from '@/lib/incidents/model'
import {
  CONSUMABLE_CATEGORY_LABEL_LO,
  type ConsumableCategory,
} from '@/lib/consumables/model'
import {
  RECOVERY_LABEL_LO,
  STOCK_LABEL_LO,
  WRITEOFF_REASON_LO,
  type RecoveryState,
  type StockState,
  type WriteoffReason,
} from '@/lib/assets/stock-model'
import { todayISO } from '@/lib/format'

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
  'subscriptions',
  'subscription-periods',
  'vendors',
  'maintenance',
  'incidents',
  'accounts',
  'consumables',
  'ip-plan',
  'replacement',
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
  subscriptions: 'ສັນຍາເຊົ່າບໍລິການ',
  'subscription-periods': 'ງວດການຈ່າຍຄ່າເຊົ່າ',
  vendors: 'ທະບຽນຜູ້ຂາຍ',
  maintenance: 'ແຜນບຳລຸງຮັກສາ',
  incidents: 'ເຫດຂັດຂ້ອງລະບົບ',
  accounts: 'ບັນຊີຜູ້ໃຊ້',
  consumables: 'ອຸປະກອນສິ້ນເປືອງ',
  'ip-plan': 'ທະບຽນ IP',
  replacement: 'ແຜນປ່ຽນເຄື່ອງ',
}

export function isDataset(value: string): value is DatasetName {
  return (DATASETS as readonly string[]).includes(value)
}

/** ຜູ້ໃຊ້ຄົນນີ້ດຶງຊຸດຂໍ້ມູນນີ້ອອກໄດ້ບໍ */
export function canExport(user: ItStaff, name: DatasetName): boolean {
  if (!can.useStaffArea(user)) return false
  if (name === 'plans') return can.viewReports(user)
  // ລາຍຊື່ບັນຊີຜູ້ໃຊ້ທັງບໍລິສັດເປັນຂໍ້ມູນອ່ອນໄຫວ — ໃຫ້ສະເພາະຄົນທີ່ຮັບຜິດຊອບ
  if (name === 'accounts') return can.manageAccounts(user)
  return true
}

type Params = { from?: string; to?: string; q?: string; state?: string }

export async function buildDataset(
  name: DatasetName,
  user: ItStaff,
  params: Params
): Promise<Dataset> {
  const stamp = todayISO()
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
    case 'subscriptions':
      return { ...base, ...(await subscriptions(params)) }
    case 'subscription-periods':
      return { ...base, ...(await subscriptionPeriods(params)) }
    case 'vendors':
      return { ...base, ...(await vendors(params)) }
    case 'maintenance':
      return { ...base, ...(await maintenance(params)) }
    case 'incidents':
      return { ...base, ...(await incidents(params)) }
    case 'accounts':
      return { ...base, ...(await accounts(params)) }
    case 'consumables':
      return { ...base, ...(await consumables(params)) }
    case 'ip-plan':
      return { ...base, ...(await ipPlan()) }
    case 'replacement':
      return { ...base, ...(await replacement(params)) }
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

// --------------------------------------------------------- subscriptions

async function subscriptions(params: Params) {
  const rows = await query(
    `select code, service_name, category, vendor, plan_name, account_ref,
            billing_cycle, amount, currency, monthly_amount, yearly_amount,
            start_date, end_date, next_due_date, due_status, auto_renew,
            owner_name, department_name, status, period_count, unpaid_count,
            paid_total
       from it.v_subscriptions
      where ($1::text is null
             or code ilike $1::text or service_name ilike $1::text
             or vendor ilike $1::text or account_ref ilike $1::text)
      order by status, next_due_date nulls last, service_name
      limit 5000`,
    [params.q ? `%${params.q}%` : null]
  )

  const DUE_LO: Record<string, string> = {
    overdue: 'ເລີຍກຳນົດ',
    due_soon: 'ໃກ້ຮອດກຳນົດ',
    ok: 'ຍັງບໍ່ຮອດ',
    unknown: 'ບໍ່ໄດ້ລະບຸ',
    inactive: 'ບໍ່ໄດ້ໃຊ້ງານ',
  }

  return {
    subtitle: `${rows.length} ສັນຍາ · ດຶງເມື່ອ ${safeDate(new Date().toISOString())}`,
    columns: [
      { key: 'code', label: 'ລະຫັດ', width: 14 },
      { key: 'service_name', label: 'ບໍລິການ', width: 32 },
      { key: 'category_lo', label: 'ປະເພດ', width: 18 },
      { key: 'vendor', label: 'ຜູ້ໃຫ້ບໍລິການ', width: 20 },
      { key: 'plan_name', label: 'ແພັກເກັດ', width: 20 },
      { key: 'account_ref', label: 'ບັນຊີ/ເລກສັນຍາ', width: 20 },
      { key: 'cycle_lo', label: 'ຮອບຈ່າຍ', width: 14 },
      { key: 'amount', label: 'ຄ່າຕໍ່ງວດ', width: 14, numFmt: '#,##0.00', align: 'right' },
      { key: 'currency', label: 'ສະກຸນ', width: 8 },
      { key: 'monthly_amount', label: 'ຕໍ່ເດືອນ', width: 14, numFmt: '#,##0.00', align: 'right' },
      { key: 'yearly_amount', label: 'ຕໍ່ປີ', width: 14, numFmt: '#,##0.00', align: 'right' },
      { key: 'start_date_lo', label: 'ວັນເລີ່ມ', width: 12 },
      { key: 'end_date_lo', label: 'ວັນສິ້ນສຸດ', width: 12 },
      { key: 'next_due_date_lo', label: 'ກຳນົດຕໍ່ໄປ', width: 12 },
      { key: 'due_status_lo', label: 'ສະຖານະກຳນົດ', width: 14 },
      { key: 'owner_name', label: 'ຜູ້ຮັບຜິດຊອບ', width: 20 },
      { key: 'department_name', label: 'ພະແນກທີ່ຮັບພາລະ', width: 22 },
      { key: 'status_lo', label: 'ສະຖານະສັນຍາ', width: 14 },
      { key: 'unpaid_count', label: 'ງວດຄ້າງ', width: 10, align: 'right' },
      { key: 'paid_total', label: 'ຈ່າຍໄປແລ້ວ', width: 16, numFmt: '#,##0.00', align: 'right' },
    ] satisfies Column[],
    rows: rows.map((r) => ({
      ...r,
      category_lo:
        SUB_CATEGORY_LABEL_LO[r.category as SubCategory] ?? String(r.category),
      cycle_lo:
        BILLING_CYCLE_LABEL_LO[r.billing_cycle as BillingCycle] ??
        String(r.billing_cycle),
      status_lo: SUB_STATUS_LABEL_LO[r.status as SubStatus] ?? String(r.status),
      due_status_lo: DUE_LO[String(r.due_status)] ?? String(r.due_status),
      start_date_lo: safeDate(r.start_date as string),
      end_date_lo: safeDate(r.end_date as string),
      next_due_date_lo: safeDate(r.next_due_date as string),
    })),
  }
}

async function subscriptionPeriods(params: Params) {
  const rows = await query(
    `select subscription_code, service_name, category, vendor, period_start,
            period_end, due_date, amount, currency, status, paid_at,
            invoice_no, note, created_by_name
       from it.v_subscription_periods
      where ($1::date is null or period_start >= $1::date)
        and ($2::date is null or period_start <= $2::date)
      order by period_start desc, subscription_code
      limit 5000`,
    [params.from ?? null, params.to ?? null]
  )

  return {
    subtitle: rangeLabel(params, `${rows.length} ງວດ`),
    columns: [
      { key: 'subscription_code', label: 'ລະຫັດສັນຍາ', width: 14 },
      { key: 'service_name', label: 'ບໍລິການ', width: 32 },
      { key: 'category_lo', label: 'ປະເພດ', width: 18 },
      { key: 'vendor', label: 'ຜູ້ໃຫ້ບໍລິການ', width: 20 },
      { key: 'period_start_lo', label: 'ງວດເລີ່ມ', width: 12 },
      { key: 'period_end_lo', label: 'ງວດຮອດ', width: 12 },
      { key: 'due_date_lo', label: 'ກຳນົດຈ່າຍ', width: 12 },
      { key: 'amount', label: 'ຈຳນວນເງິນ', width: 16, numFmt: '#,##0.00', align: 'right' },
      { key: 'currency', label: 'ສະກຸນ', width: 8 },
      { key: 'status_lo', label: 'ສະຖານະ', width: 14 },
      { key: 'paid_at_lo', label: 'ວັນທີຈ່າຍ', width: 12 },
      { key: 'invoice_no', label: 'ເລກໃບບິນ', width: 16 },
      { key: 'created_by_name', label: 'ຜູ້ບັນທຶກ', width: 20 },
      { key: 'note', label: 'ໝາຍເຫດ', width: 30 },
    ] satisfies Column[],
    rows: rows.map((r) => ({
      ...r,
      category_lo:
        SUB_CATEGORY_LABEL_LO[r.category as SubCategory] ?? String(r.category),
      status_lo:
        PERIOD_STATUS_LABEL_LO[r.status as PeriodStatus] ?? String(r.status),
      period_start_lo: safeDate(r.period_start as string),
      period_end_lo: safeDate(r.period_end as string),
      due_date_lo: safeDate(r.due_date as string),
      paid_at_lo: safeDate(r.paid_at as string),
    })),
  }
}

// ------------------------------------------------------- ໂມດູນໂຄງລ່າງ IT

async function vendors(params: Params) {
  const rows = await query(
    `select name, short_name, contact_name, phone, email, support_phone,
            support_email, support_hours, sla_note, subscription_count,
            repair_count, repair_cost, is_active
       from it.v_vendors
      where ($1::text is null or name ilike $1::text or contact_name ilike $1::text)
      order by name
      limit 5000`,
    [params.q ? `%${params.q}%` : null]
  )

  return {
    subtitle: `${rows.length} ລາຍ`,
    columns: [
      { key: 'name', label: 'ຜູ້ຂາຍ', width: 30 },
      { key: 'short_name', label: 'ຊື່ຫຍໍ້', width: 12 },
      { key: 'contact_name', label: 'ຜູ້ຕິດຕໍ່', width: 20 },
      { key: 'phone', label: 'ເບີໂທ', width: 16 },
      { key: 'email', label: 'ອີເມວ', width: 24 },
      { key: 'support_phone', label: 'ເບີແຈ້ງບັນຫາ', width: 16 },
      { key: 'support_hours', label: 'ເວລາບໍລິການ', width: 18 },
      { key: 'sla_note', label: 'ເງື່ອນໄຂຮັບປະກັນ', width: 30 },
      { key: 'subscription_count', label: 'ສັນຍາເຊົ່າ', width: 10, align: 'right' },
      { key: 'repair_count', label: 'ໃບສ້ອມ', width: 10, align: 'right' },
      { key: 'repair_cost', label: 'ຄ່າສ້ອມລວມ', width: 14, numFmt: '#,##0', align: 'right' },
      { key: 'active_lo', label: 'ສະຖານະ', width: 12 },
    ] satisfies Column[],
    rows: rows.map((r) => ({ ...r, active_lo: r.is_active ? 'ໃຊ້ຢູ່' : 'ປິດໄວ້' })),
  }
}

async function maintenance(params: Params) {
  const rows = await query(
    `select code, title, category, asset_code, asset_name, location_name,
            interval_days, next_due_date, last_done_at, owner_name, due_status,
            log_count, issue_count, is_active
       from it.v_maintenance_plans
      where ($1::text is null or title ilike $1::text or code ilike $1::text)
      order by next_due_date
      limit 5000`,
    [params.q ? `%${params.q}%` : null]
  )

  const DUE_LO: Record<string, string> = {
    overdue: 'ເລີຍກຳນົດ',
    due_soon: 'ຮອດກຳນົດໄວໆນີ້',
    ok: 'ຍັງບໍ່ຮອດ',
    inactive: 'ປິດໄວ້',
  }

  return {
    subtitle: `${rows.length} ແຜນ`,
    columns: [
      { key: 'code', label: 'ລະຫັດ', width: 14 },
      { key: 'title', label: 'ຊື່ວຽກ', width: 34 },
      { key: 'category_lo', label: 'ປະເພດ', width: 16 },
      { key: 'interval_days', label: 'ຮອບ (ວັນ)', width: 10, align: 'right' },
      { key: 'next_due_date_lo', label: 'ກຳນົດຕໍ່ໄປ', width: 12 },
      { key: 'last_done_at_lo', label: 'ເຮັດຫຼ້າສຸດ', width: 12 },
      { key: 'due_status_lo', label: 'ສະຖານະ', width: 16 },
      { key: 'owner_name', label: 'ຜູ້ຮັບຜິດຊອບ', width: 20 },
      { key: 'asset_name', label: 'ອຸປະກອນ', width: 24 },
      { key: 'location_name', label: 'ສະຖານທີ່', width: 18 },
      { key: 'log_count', label: 'ບັນທຶກ', width: 10, align: 'right' },
      { key: 'issue_count', label: 'ພົບບັນຫາ', width: 10, align: 'right' },
    ] satisfies Column[],
    rows: rows.map((r) => ({
      ...r,
      category_lo:
        PM_CATEGORY_LABEL_LO[r.category as PmCategory] ?? String(r.category),
      due_status_lo: DUE_LO[String(r.due_status)] ?? String(r.due_status),
      next_due_date_lo: safeDate(r.next_due_date as string),
      last_done_at_lo: safeDate(r.last_done_at as string),
    })),
  }
}

async function incidents(params: Params) {
  const rows = await query(
    `select code, title, service, severity, impact, started_at, resolved_at,
            minutes, status, cause, action, prevention, subscription_name,
            asset_code, reported_by
       from it.v_incidents
      where ($1::date is null or started_at >= $1::date)
        and ($2::date is null or started_at < $2::date + 1)
      order by started_at desc
      limit 5000`,
    [params.from ?? null, params.to ?? null]
  )

  return {
    subtitle: rangeLabel(params, `${rows.length} ຄັ້ງ`),
    columns: [
      { key: 'code', label: 'ລະຫັດ', width: 14 },
      { key: 'title', label: 'ເກີດຫຍັງ', width: 34 },
      { key: 'service_lo', label: 'ບໍລິການ', width: 16 },
      { key: 'severity_lo', label: 'ຄວາມຮ້າຍແຮງ', width: 12 },
      { key: 'started_at_lo', label: 'ເລີ່ມລົ້ມ', width: 12 },
      { key: 'resolved_at_lo', label: 'ກັບມາໃຊ້ໄດ້', width: 12 },
      { key: 'minutes', label: 'ນາທີທີ່ລົ້ມ', width: 12, align: 'right' },
      { key: 'status_lo', label: 'ສະຖານະ', width: 12 },
      { key: 'impact', label: 'ຜົນກະທົບ', width: 30 },
      { key: 'cause', label: 'ສາເຫດ', width: 30 },
      { key: 'action', label: 'ການແກ້ໄຂ', width: 30 },
      { key: 'prevention', label: 'ກັນເກີດຄືນ', width: 30 },
    ] satisfies Column[],
    rows: rows.map((r) => ({
      ...r,
      service_lo:
        INCIDENT_SERVICE_LABEL_LO[r.service as IncidentService] ?? String(r.service),
      severity_lo:
        SEVERITY_SHORT_LO[r.severity as IncidentSeverity] ?? String(r.severity),
      status_lo: r.status === 'open' ? 'ຍັງບໍ່ຈົບ' : 'ແກ້ໄຂແລ້ວ',
      started_at_lo: safeDate(r.started_at as string),
      resolved_at_lo: safeDate(r.resolved_at as string),
    })),
  }
}

async function accounts(params: Params) {
  const rows = await query(
    `select system_name, kind, username, employee_code, employee_name,
            department_name, status, granted_at, closed_at, hr_state,
            should_close, note
       from it.v_system_accounts
      where ($1::text is null or username ilike $1::text
             or employee_name ilike $1::text or system_name ilike $1::text)
      order by should_close desc, system_name, employee_name
      limit 5000`,
    [params.q ? `%${params.q}%` : null]
  )

  const HR_LO: Record<string, string> = {
    active: 'ຍັງເຮັດວຽກຢູ່',
    resigned: 'ລາອອກແລ້ວ',
    not_in_hr: 'ບໍ່ພົບໃນ HR',
  }
  const STATUS_LO: Record<string, string> = {
    active: 'ໃຊ້ງານຢູ່',
    suspended: 'ພັກໄວ້',
    closed: 'ປິດແລ້ວ',
  }

  return {
    subtitle: `${rows.length} ບັນຊີ`,
    columns: [
      { key: 'system_name', label: 'ລະບົບ', width: 22 },
      { key: 'username', label: 'ຊື່ບັນຊີ', width: 28 },
      { key: 'employee_code', label: 'ລະຫັດພະນັກງານ', width: 14 },
      { key: 'employee_name', label: 'ພະນັກງານ', width: 24 },
      { key: 'department_name', label: 'ພະແນກ', width: 22 },
      { key: 'status_lo', label: 'ສະຖານະບັນຊີ', width: 14 },
      { key: 'hr_state_lo', label: 'ສະຖານະຄົນ', width: 16 },
      { key: 'should_close_lo', label: 'ຄວນປິດ', width: 10 },
      { key: 'granted_at_lo', label: 'ເປີດເມື່ອ', width: 12 },
      { key: 'closed_at_lo', label: 'ປິດເມື່ອ', width: 12 },
      { key: 'note', label: 'ໝາຍເຫດ', width: 26 },
    ] satisfies Column[],
    rows: rows.map((r) => ({
      ...r,
      status_lo: STATUS_LO[String(r.status)] ?? String(r.status),
      hr_state_lo: HR_LO[String(r.hr_state)] ?? String(r.hr_state),
      should_close_lo: r.should_close ? 'ແມ່ນ' : '',
      granted_at_lo: safeDate(r.granted_at as string),
      closed_at_lo: safeDate(r.closed_at as string),
    })),
  }
}

async function consumables(params: Params) {
  const rows = await query(
    `select code, name, category, unit, on_hand, min_qty, location, vendor_name,
            unit_price, stock_value, stock_state, in_qty, out_qty, last_move_at
       from it.v_consumables
      where ($1::text is null or name ilike $1::text or code ilike $1::text)
      order by name
      limit 5000`,
    [params.q ? `%${params.q}%` : null]
  )

  const STATE_LO: Record<string, string> = {
    ok: 'ພຽງພໍ',
    low: 'ໃກ້ໝົດ',
    empty: 'ໝົດແລ້ວ',
    inactive: 'ບໍ່ໃຊ້ແລ້ວ',
  }

  return {
    subtitle: `${rows.length} ລາຍການ`,
    columns: [
      { key: 'code', label: 'ລະຫັດ', width: 14 },
      { key: 'name', label: 'ຊື່ລາຍການ', width: 32 },
      { key: 'category_lo', label: 'ໝວດ', width: 16 },
      { key: 'on_hand', label: 'ຄົງເຫຼືອ', width: 12, numFmt: '#,##0.##', align: 'right' },
      { key: 'unit', label: 'ຫົວໜ່ວຍ', width: 10 },
      { key: 'min_qty', label: 'ຈຸດສັ່ງຊື້', width: 10, numFmt: '#,##0.##', align: 'right' },
      { key: 'state_lo', label: 'ສະຖານະ', width: 12 },
      { key: 'location', label: 'ບ່ອນເກັບ', width: 20 },
      { key: 'vendor_name', label: 'ຜູ້ຂາຍ', width: 22 },
      { key: 'unit_price', label: 'ລາຄາ/ຫົວໜ່ວຍ', width: 14, numFmt: '#,##0', align: 'right' },
      { key: 'stock_value', label: 'ມູນຄ່າໃນສາງ', width: 14, numFmt: '#,##0', align: 'right' },
      { key: 'last_move_at_lo', label: 'ເຄື່ອນໄຫວຫຼ້າສຸດ', width: 14 },
    ] satisfies Column[],
    rows: rows.map((r) => ({
      ...r,
      category_lo:
        CONSUMABLE_CATEGORY_LABEL_LO[r.category as ConsumableCategory] ??
        String(r.category),
      state_lo: STATE_LO[String(r.stock_state)] ?? String(r.stock_state),
      last_move_at_lo: safeDate(r.last_move_at as string),
    })),
  }
}

async function ipPlan() {
  const rows = await query(
    `select segment_name, vlan_id, cidr, host(ip_address) as ip, hostname,
            asset_code, asset_name, mac_address, employee_name, kind, status, note
       from it.v_ip_assignments
      order by segment_name, ip_address
      limit 5000`
  )

  const KIND_LO: Record<string, string> = {
    static: 'ຕັ້ງຄົງທີ່',
    reservation: 'ຈອງໃນ DHCP',
    reserved: 'ກັນໄວ້',
    dhcp: 'ແຈກຈາກ DHCP',
  }
  const STATUS_LO: Record<string, string> = {
    in_use: 'ໃຊ້ຢູ່',
    free: 'ຫວ່າງ',
    blocked: 'ຫ້າມໃຊ້',
  }

  return {
    subtitle: `${rows.length} IP · ດຶງເມື່ອ ${safeDate(new Date().toISOString())}`,
    columns: [
      { key: 'segment_name', label: 'ວົງເນັດ', width: 24 },
      { key: 'vlan_id', label: 'VLAN', width: 8, align: 'right' },
      { key: 'cidr', label: 'CIDR', width: 18 },
      { key: 'ip', label: 'IP', width: 16 },
      { key: 'hostname', label: 'Hostname', width: 22 },
      { key: 'asset_code', label: 'ລະຫັດເຄື່ອງ', width: 16 },
      { key: 'asset_name', label: 'ຊື່ເຄື່ອງ', width: 26 },
      { key: 'mac_address', label: 'MAC', width: 20 },
      { key: 'employee_name', label: 'ຜູ້ໃຊ້', width: 22 },
      { key: 'kind_lo', label: 'ປະເພດ', width: 14 },
      { key: 'status_lo', label: 'ສະຖານະ', width: 12 },
      { key: 'note', label: 'ໝາຍເຫດ', width: 26 },
    ] satisfies Column[],
    rows: rows.map((r) => ({
      ...r,
      kind_lo: KIND_LO[String(r.kind)] ?? String(r.kind),
      status_lo: STATUS_LO[String(r.status)] ?? String(r.status),
    })),
  }
}

async function replacement(params: Params) {
  const rows = await query(
    `select asset_code, name, category_name, brand, model, location_name,
            department_name, holder_name, purchase_date, purchase_price,
            age_years, warranty_until, repair_count, repair_cost, stock_state,
            reason_count, priority, estimated_cost, reason_age, reason_warranty,
            reason_cost, reason_repairs, reason_condition
       from it.v_replacement_candidates
      where ($1::text is null or asset_code ilike $1::text or name ilike $1::text)
      order by case priority when 'high' then 0 when 'medium' then 1 else 2 end,
               reason_count desc, age_years desc nulls last
      limit 5000`,
    [params.q ? `%${params.q}%` : null]
  )

  const PRIORITY_LO: Record<string, string> = {
    high: 'ດ່ວນ',
    medium: 'ຄວນວາງແຜນ',
    low: 'ເຝົ້າເບິ່ງ',
  }

  return {
    subtitle: `${rows.length} ເຄື່ອງ · ດຶງເມື່ອ ${safeDate(new Date().toISOString())}`,
    columns: [
      { key: 'asset_code', label: 'ລະຫັດ', width: 16 },
      { key: 'name', label: 'ຊື່ອຸປະກອນ', width: 30 },
      { key: 'category_name', label: 'ປະເພດ', width: 14 },
      { key: 'priority_lo', label: 'ຄວາມດ່ວນ', width: 14 },
      { key: 'reason_lo', label: 'ເຫດຜົນ', width: 40 },
      { key: 'age_years', label: 'ອາຍຸ (ປີ)', width: 10, align: 'right' },
      { key: 'purchase_date_lo', label: 'ວັນທີຊື້', width: 12 },
      { key: 'purchase_price', label: 'ລາຄາຊື້', width: 14, numFmt: '#,##0', align: 'right' },
      { key: 'repair_count', label: 'ຄັ້ງທີ່ສ້ອມ', width: 10, align: 'right' },
      { key: 'repair_cost', label: 'ຄ່າສ້ອມລວມ', width: 14, numFmt: '#,##0', align: 'right' },
      { key: 'estimated_cost', label: 'ງົບປະມານ', width: 14, numFmt: '#,##0', align: 'right' },
      { key: 'holder_name', label: 'ຜູ້ຖືຄອງ', width: 20 },
      { key: 'department_name', label: 'ພະແນກ', width: 20 },
      { key: 'location_name', label: 'ສະຖານທີ່', width: 18 },
    ] satisfies Column[],
    rows: rows.map((r) => ({
      ...r,
      priority_lo: PRIORITY_LO[String(r.priority)] ?? String(r.priority),
      purchase_date_lo: safeDate(r.purchase_date as string),
      reason_lo: [
        r.reason_condition ? 'ສະພາບເພ' : null,
        r.reason_age ? 'ອາຍຸເກີນ 5 ປີ' : null,
        r.reason_repairs ? 'ສ້ອມຫຼາຍຄັ້ງ' : null,
        r.reason_cost ? 'ຄ່າສ້ອມສູງ' : null,
        r.reason_warranty ? 'ໝົດປະກັນ' : null,
      ]
        .filter(Boolean)
        .join(' · '),
    })),
  }
}

function rangeLabel(params: Params, suffix: string) {
  if (params.from || params.to) {
    return `${safeDate(params.from ?? null)} — ${safeDate(params.to ?? null)} · ${suffix}`
  }
  return `ດຶງເມື່ອ ${safeDate(new Date().toISOString())} · ${suffix}`
}

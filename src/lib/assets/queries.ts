import 'server-only'
import { query } from '@/lib/db'
import { PAGE_SIZE, type PageResult } from '@/lib/pagination'
import { cached } from '@/lib/cache'
import type { AssetMovement, AssetRepair, AssetRow } from './model'

export type AssetFilters = {
  holding?: string // 'assigned' | 'spare' | 'it' | ອື່ນ = ທັງໝົດ
  category?: string
  brand?: string
  q?: string
}

function assetWhere(filters: AssetFilters) {
  const params: unknown[] = []
  const where: string[] = ['true']

  if (filters.holding === 'assigned') where.push('is_assigned')
  else if (filters.holding === 'spare') where.push('not is_assigned')
  else if (filters.holding === 'it') where.push('owned_by_it')

  // ກັ່ນຕອງດ້ວຍຊື່ປະເພດ ບໍ່ແມ່ນລະຫັດ ເພາະເຄື່ອງທີ່ບໍ່ມີລະຫັດ
  // ຖືກຄິດປະເພດຈາກຊື່ໃຫ້ແລ້ວໃນ view
  if (filters.category) {
    params.push(filters.category)
    where.push(`category_name = $${params.length}`)
  }

  if (filters.brand) {
    params.push(filters.brand)
    where.push(`brand = $${params.length}`)
  }

  if (filters.q) {
    params.push(`%${filters.q}%`)
    const i = params.length
    where.push(
      `(asset_code ilike $${i} or name ilike $${i} or serial_no ilike $${i}
        or model ilike $${i} or holder_name ilike $${i})`
    )
  }

  return { params, where }
}

export async function paginateAssets(
  filters: AssetFilters,
  page: number
): Promise<PageResult<AssetRow>> {
  const { params, where } = assetWhere(filters)

  // ນັບ ແລະ ດຶງໜ້າໃນ query ດຽວ — view ນີ້ join ຫຼາຍຕາຕະລາງ
  // ການເອີ້ນ 2 ເທື່ອຈຶ່ງເສຍເວລາເປັນສອງເທົ່າໂດຍບໍ່ຈຳເປັນ
  params.push(PAGE_SIZE, (page - 1) * PAGE_SIZE)
  const rows = await query<AssetRow & { total_count: string }>(
    `select asset_code, name, category_name, category_guessed,
            brand, model, serial_no, holder_name, holder_department,
            borrowed_at, purchase_date, purchase_date_source,
            warranty_until, warranty_source, warranty_status,
            count(*) over () as total_count
       from it.v_it_assets
      where ${where.join(' and ')}
      order by asset_code desc
      limit $${params.length - 1} offset $${params.length}`,
    params
  )

  const total = Number(rows[0]?.total_count ?? 0)
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return {
    items: rows as AssetRow[],
    page: Math.min(page, pageCount),
    pageSize: PAGE_SIZE,
    total,
    pageCount,
  }
}

export type AssetDocument = {
  doc_no: string
  doc_kind: 'borrow' | 'return'
  source: 'erp' | 'it'
  doc_date: string | null
  emp_code: string | null
  emp_name: string | null
  department_code: string | null
  department_name: string | null
  from_date: string | null
  to_date: string | null
  anticipate_return: string | null
  reason: string | null
  remark: string | null
  creator_code: string | null
  creator_name: string | null
  approve_code: string | null
  approver_name: string | null
  item_count: string
}

export type DocumentItem = {
  doc_no: string
  asset_code: string
  asset_name: string
  ref_doc_no: string | null
  from_date: string | null
  to_date: string | null
  remark: string | null
  brand: string | null
  model: string | null
  serial_no: string | null
  category_name: string | null
  has_mouse: boolean
  has_keyboard: boolean
  has_power: boolean
  has_headphone: boolean
  has_bag: boolean
  has_phone_number: boolean
  has_email: boolean
}

/** ລາຍການເອກະສານໃບຢືມ–ໃບຄືນ (ຂອງ ERP ແລະ ຂອງລະບົບນີ້) */
export async function paginateDocuments(
  filters: { kind?: string; q?: string },
  page: number
): Promise<PageResult<AssetDocument>> {
  const params: unknown[] = []
  const where: string[] = ['doc_no is not null']

  if (filters.kind === 'borrow' || filters.kind === 'return') {
    params.push(filters.kind)
    where.push(`doc_kind = $${params.length}`)
  }

  if (filters.q) {
    params.push(`%${filters.q}%`)
    const i = params.length
    where.push(
      `(doc_no ilike $${i} or emp_name ilike $${i} or department_name ilike $${i}
        or reason ilike $${i} or remark ilike $${i})`
    )
  }

  params.push(PAGE_SIZE, (page - 1) * PAGE_SIZE)
  const rows = await query<AssetDocument & { total_count: string }>(
    `select *, count(*) over () as total_count
       from it.v_asset_documents
      where ${where.join(' and ')}
      order by doc_date desc nulls last, doc_no desc
      limit $${params.length - 1} offset $${params.length}`,
    params
  )

  const total = Number(rows[0]?.total_count ?? 0)
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return {
    items: rows as AssetDocument[],
    page: Math.min(page, pageCount),
    pageSize: PAGE_SIZE,
    total,
    pageCount,
  }
}

export async function getDocument(docNo: string) {
  const rows = await query<AssetDocument>(
    'select * from it.v_asset_documents where doc_no = $1',
    [docNo]
  )
  return rows[0] ?? null
}

export async function getDocumentItems(docNo: string) {
  return query<DocumentItem>(
    'select * from it.v_asset_document_items where doc_no = $1 order by asset_code',
    [docNo]
  )
}

/** ເອກະສານທັງໝົດຂອງອຸປະກອນເຄື່ອງໜຶ່ງ */
export async function getAssetDocuments(assetCode: string) {
  return query<AssetDocument & { ref_doc_no: string | null }>(
    `select d.*, i.ref_doc_no
       from it.v_asset_document_items i
       join it.v_asset_documents d on d.doc_no = i.doc_no
      where i.asset_code = $1
      order by d.doc_date desc nulls last, d.doc_no desc`,
    [assetCode]
  )
}

export type LendableAsset = {
  asset_code: string
  name: string
  category_name: string
  brand: string | null
  serial_no: string | null
  location_code: string | null
  location_name: string | null
  movement_count: number
}

/**
 * ອຸປະກອນທີ່ຢືມໄດ້ = ບໍ່ມີໃບຢືມຄ້າງ ແລະ ຍັງໃຊ້ງານຢູ່ (ບໍ່ຖືກປົດລະວາງ).
 *
 * ໝາຍເຫດ: ທະບຽນ ERP ບໍ່ມີຊ່ອງ "ຢູ່ໃນສາງ" ໂດຍກົງ — ບອກໄດ້ພຽງ
 * ສະຖານທີ່ຕັ້ງ (as_location) ແລະ ວ່າມີໃບຢືມຄ້າງບໍ່ ຈຶ່ງສົ່ງທັງສອງອັນ
 * ໄປໃຫ້ໜ້າຈໍກັ່ນຕອງເອງ
 */
export async function getLendableAssets() {
  return query<LendableAsset>(
    `select a.asset_code, a.name, a.category_name, a.brand, a.serial_no,
            a.location_code, a.location_name, a.movement_count
       from it.v_it_assets a
       left join it.asset_stock_status s on s.asset_code = a.asset_code
       left join it.asset_deployments d
              on d.asset_code = a.asset_code and d.removed_at is null
      where not a.is_assigned
        and a.is_active
        -- ເພ, ສົ່ງສ້ອມ, ຫາຍ, ຕັດຈຳໜ່າຍ ຫຼື ຕິດຕັ້ງໃຊ້ສ່ວນກາງ = ໃຫ້ຢືມບໍ່ໄດ້
        and coalesce(s.stock_state, 'in_stock') not in
            ('repair', 'damaged', 'missing', 'scrapped', 'retired')
        and d.id is null
      order by a.category_name, a.asset_code desc`
  )
}

/** ສະຖານທີ່ຕັ້ງຂອງອຸປະກອນທີ່ຢືມໄດ້ — ສຳລັບຕົວກັ່ນຕອງ */
export async function getLendableLocations() {
  return query<{ code: string; name: string; total: string }>(
    `select coalesce(a.location_code, '') as code,
            coalesce(a.location_name, 'ບໍ່ລະບຸສະຖານທີ່') as name,
            count(*) as total
       from it.v_it_assets a
       left join it.asset_stock_status s on s.asset_code = a.asset_code
       left join it.asset_deployments d
              on d.asset_code = a.asset_code and d.removed_at is null
      where not a.is_assigned
        and a.is_active
        and coalesce(s.stock_state, 'in_stock') not in
            ('repair', 'damaged', 'missing', 'scrapped', 'retired')
        and d.id is null
      group by 1, 2
      order by count(*) desc`
  )
}

export type OpenLoan = {
  source: 'erp' | 'it'
  borrow_doc_no: string
  asset_code: string
  asset_name: string
  emp_code: string
  emp_name: string | null
  org_department: string | null
  borrowed_at: string
  expected_return: string | null
  is_former_employee: boolean
  days_held: number
}

/**
 * ໃບຢືມທີ່ຍັງບໍ່ຄືນ — ທັງທີ່ອອກຈາກລະບົບນີ້ ແລະ ຈາກ ERP.
 *
 * ໃບຂອງ ERP ປິດໄດ້ໂດຍບັນທຶກໃບຄືນຂອງ IT ທັບໄວ້ (it.erp_loan_returns)
 * ໂດຍບໍ່ແຕະຕາຕະລາງ asset_trans ຂອງລະບົບບັນຊີ
 */
export async function getOpenLoans(filters: { source?: string; q?: string } = {}) {
  const params: unknown[] = []
  const where: string[] = ['not is_returned']

  if (filters.source === 'erp' || filters.source === 'it') {
    params.push(filters.source)
    where.push(`source = $${params.length}`)
  }

  if (filters.q) {
    params.push(`%${filters.q}%`)
    const i = params.length
    where.push(
      `(asset_code ilike $${i} or asset_name ilike $${i} or emp_name ilike $${i}
        or borrow_doc_no ilike $${i} or org_department ilike $${i})`
    )
  }

  return query<OpenLoan>(
    `select source, borrow_doc_no, asset_code, asset_name, emp_code, emp_name,
            org_department, borrowed_at, expected_return, is_former_employee,
            (current_date - borrowed_at::date) as days_held
       from it.v_asset_movements
      where ${where.join(' and ')}
      order by borrowed_at desc nulls last, borrow_doc_no desc nulls last`,
    params
  )
}

/** ນັບໃບຢືມທີ່ຍັງຄ້າງ ແຍກຕາມແຫຼ່ງທີ່ມາ */
export async function getOpenLoanStats() {
  const rows = await query<{ total: string; erp: string; it: string }>(
    `select count(*)                              as total,
            count(*) filter (where source = 'erp') as erp,
            count(*) filter (where source = 'it')  as it
       from it.v_asset_movements
      where not is_returned`
  )
  return rows[0]
}

export async function getAsset(assetCode: string) {
  const rows = await query<AssetRow>(
    'select * from it.v_it_assets where asset_code = $1',
    [assetCode]
  )
  return rows[0] ?? null
}

/**
 * ປະຫວັດຢືມ–ຄືນຂອງອຸປະກອນເຄື່ອງໜຶ່ງ.
 *
 * ຮຽງ: ໃບທີ່ຍັງບໍ່ຄືນຂຶ້ນກ່ອນ → ວັນຢືມໃໝ່ສຸດ → ເລກໃບຢືມໃໝ່ສຸດ
 * (ຕ້ອງມີເລກໃບເປັນຕົວຕັດສິນ ເພາະຫຼາຍໃບອອກວັນດຽວກັນ ແລ້ວລຳດັບຈະສະຫຼັບໄປມາ)
 */
export async function getAssetHistory(assetCode: string) {
  return query<AssetMovement>(
    `select * from it.v_asset_movements
      where asset_code = $1
      order by is_returned,
               borrowed_at desc nulls last,
               borrow_doc_no desc nulls last`,
    [assetCode]
  )
}

export async function paginateMovements(
  filters: {
    state?: string
    q?: string
    division?: string
    department?: string
    unit?: string
  },
  page: number
): Promise<PageResult<AssetMovement>> {
  const params: unknown[] = []
  const where: string[] = ['true']

  if (filters.state === 'holding') where.push('not is_returned')
  else if (filters.state === 'returned') where.push('is_returned')

  if (filters.division) {
    params.push(filters.division)
    where.push(`division_name = $${params.length}`)
  }

  if (filters.department) {
    params.push(filters.department)
    where.push(`org_department = $${params.length}`)
  }

  if (filters.unit) {
    params.push(filters.unit)
    where.push(`unit_name = $${params.length}`)
  }

  if (filters.q) {
    params.push(`%${filters.q}%`)
    const i = params.length
    where.push(
      `(asset_code ilike $${i} or asset_name ilike $${i} or emp_name ilike $${i}
        or division_name ilike $${i} or org_department ilike $${i}
        or unit_name ilike $${i} or borrow_doc_no ilike $${i})`
    )
  }

  params.push(PAGE_SIZE, (page - 1) * PAGE_SIZE)
  const rows = await query<AssetMovement & { total_count: string }>(
    `select *, count(*) over () as total_count
       from it.v_asset_movements
      where ${where.join(' and ')}
      order by borrowed_at desc nulls last,
               borrow_doc_no desc nulls last
      limit $${params.length - 1} offset $${params.length}`,
    params
  )

  const total = Number(rows[0]?.total_count ?? 0)
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return {
    items: rows as AssetMovement[],
    page: Math.min(page, pageCount),
    pageSize: PAGE_SIZE,
    total,
    pageCount,
  }
}

export async function getAssetCategories() {
  return cached('asset:categories', 300, () =>
    query<{ code: string; name_lo: string; total: string }>(
    `select category_name as code, category_name as name_lo, count(*) as total
       from it.v_it_assets
      group by 1, 2
      order by count(*) desc`
    )
  )
}

export async function getAssetBrands() {
  return cached('asset:brands', 300, () =>
    query<{ brand: string; total: string }>(
    `select brand, count(*) as total
       from it.v_it_assets
      where brand is not null
      group by 1
      order by count(*) desc`
    )
  )
}

export async function getAssetStats() {
  return cached('asset:stats', 30, async () => {
    const rows = await query<{
    total: string
    assigned: string
    spare: string
    owned_by_it: string
    warranty_expiring: string
    warranty_valid: string
    with_spec: string
    departments: string
  }>(
    `select count(*)                                        as total,
            count(*) filter (where is_assigned)             as assigned,
            count(*) filter (where not is_assigned)         as spare,
            count(*) filter (where owned_by_it)             as owned_by_it,
            count(*) filter (where warranty_status = 'expiring') as warranty_expiring,
            count(*) filter (where warranty_status = 'valid')    as warranty_valid,
            count(*) filter (where has_spec)                as with_spec,
            count(distinct holder_department)               as departments
       from it.v_it_assets`
  )
    return rows[0]
  })
}

/** ປະຫວັດການສ້ອມ: ລວມຂອງ ERP ແລະ ຂອງພະແນກ IT */
export async function getAssetRepairs(assetCode: string) {
  return query<AssetRepair>(
    `select * from it.v_asset_repairs
      where asset_code = $1
      order by repair_date desc nulls last, created_at desc nulls last`,
    [assetCode]
  )
}

export type SpecChange = {
  id: string
  field: string
  old_value: string | null
  new_value: string | null
  changed_by_name: string | null
  changed_by_nickname: string | null
  changed_at: string | Date
}

/** ປະຫວັດການແກ້ໄຂ spec — ໜຶ່ງແຖວຕໍ່ໜຶ່ງຊ່ອງທີ່ປ່ຽນ, ໃໝ່ສຸດກ່ອນ */
export async function getSpecHistory(assetCode: string) {
  return query<SpecChange>(
    `select id, field, old_value, new_value,
            changed_by_name, changed_by_nickname, changed_at
       from it.v_asset_spec_history
      where asset_code = $1::varchar
      order by changed_at desc, id desc
      limit 200`,
    [assetCode]
  )
}

export type Holder = {
  emp_code: string
  emp_name: string
  division_name: string | null
  department_name: string | null
  unit_name: string | null
  is_former_employee: boolean
  holding: string
  total: string
  last_borrowed_at: string | null
}

export type HolderFilters = {
  q?: string
  /** 'holding' = ຍັງຖືຢູ່ · 'former' = ອອກແລ້ວແຕ່ຍັງບໍ່ຄືນ · ອື່ນ = ທັງໝົດ */
  state?: string
  division?: string
  department?: string
  unit?: string
}

/** ລາຍຊື່ຜູ້ຖືຄອງ ພ້ອມຈຳນວນທີ່ຖືຢູ່ ແລະ ຈຳນວນທີ່ເຄີຍຢືມທັງໝົດ */
export async function paginateHolders(
  filters: HolderFilters,
  page: number
): Promise<PageResult<Holder>> {
  const params: unknown[] = []
  const where: string[] = ['emp_code is not null']

  if (filters.q) {
    params.push(`%${filters.q}%`)
    const i = params.length
    where.push(`(emp_name ilike $${i} or emp_code ilike $${i}
                 or division_name ilike $${i} or org_department ilike $${i}
                 or unit_name ilike $${i})`)
  }

  if (filters.division) {
    params.push(filters.division)
    where.push(`division_name = $${params.length}`)
  }

  if (filters.department) {
    params.push(filters.department)
    where.push(`org_department = $${params.length}`)
  }

  if (filters.unit) {
    params.push(filters.unit)
    where.push(`unit_name = $${params.length}`)
  }

  // 'former' = ອອກໄປແລ້ວແຕ່ຍັງຄ້າງເຄື່ອງ ຈຶ່ງຕ້ອງທັງກັ່ນຕອງ ແລະ ຕ້ອງຍັງບໍ່ຄືນ
  if (filters.state === 'former') where.push('is_former_employee')

  const having =
    filters.state === 'holding' || filters.state === 'former'
      ? 'having count(*) filter (where not is_returned) > 0'
      : ''

  const grouped = `
    select emp_code,
           max(emp_name)                                   as emp_name,
           max(division_name)                              as division_name,
           max(org_department)                             as department_name,
           max(unit_name)                                  as unit_name,
           bool_or(is_former_employee)                     as is_former_employee,
           count(*) filter (where not is_returned)         as holding,
           count(*)                                        as total,
           max(borrowed_at)                                as last_borrowed_at
      from it.v_asset_movements
     where ${where.join(' and ')}
     group by emp_code
     ${having}`

  // ນັບຈຳນວນລວມດ້ວຍ window function ໃນ query ດຽວກັນ —
  // ເມື່ອກ່ອນເອີ້ນ subquery ໜັກອັນນີ້ 2 ເທື່ອ (ນັບ 1 + ດຶງໜ້າ 1)
  params.push(PAGE_SIZE, (page - 1) * PAGE_SIZE)
  const rows = await query<Holder & { total_count: string }>(
    `select *, count(*) over () as total_count
       from (${grouped}) g
      order by holding desc, total desc
      limit $${params.length - 1} offset $${params.length}`,
    params
  )

  const total = Number(rows[0]?.total_count ?? 0)
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const items = rows as Holder[]

  return { items, page: safePage, pageSize: PAGE_SIZE, total, pageCount }
}

/** ປະຫວັດການຖືຄອງທັງໝົດຂອງພະນັກງານຄົນໜຶ່ງ */
export async function getHolderHistory(empCode: string) {
  return query<AssetMovement>(
    `select * from it.v_asset_movements
      where emp_code = $1
      order by is_returned,
               borrowed_at desc nulls last,
               borrow_doc_no desc nulls last`,
    [empCode]
  )
}

export async function getHolder(empCode: string) {
  const rows = await query<Holder>(
    `select emp_code,
            max(emp_name)                           as emp_name,
            max(division_name)                      as division_name,
            max(org_department)                     as department_name,
            max(unit_name)                          as unit_name,
            bool_or(is_former_employee)             as is_former_employee,
            count(*) filter (where not is_returned) as holding,
            count(*)                                as total,
            max(borrowed_at)                        as last_borrowed_at
       from it.v_asset_movements
      where emp_code = $1
      group by emp_code`,
    [empCode]
  )
  return rows[0] ?? null
}

export type OrgOption = { name: string; people: string; items: string }

/**
 * ຕົວເລືອກໂຄງສ້າງອົງກອນສຳລັບກັ່ນຕອງ (ນັບສະເພາະຄົນທີ່ຍັງຖືເຄື່ອງຢູ່).
 * ແຕ່ລະລະດັບແຄບລົງຕາມລະດັບເທິງທີ່ເລືອກໄວ້: ຝ່າຍ → ພະແນກ → ໜ່ວຍງານ
 */
async function orgOptions(
  column: 'division_name' | 'org_department' | 'unit_name',
  narrow: { division?: string; department?: string } = {}
) {
  const params: unknown[] = []
  const where = [`${column} is not null`, 'not is_returned']

  if (narrow.division) {
    params.push(narrow.division)
    where.push(`division_name = $${params.length}`)
  }
  if (narrow.department) {
    params.push(narrow.department)
    where.push(`org_department = $${params.length}`)
  }

  // ໂຄງສ້າງອົງກອນປ່ຽນນານໆເທື່ອ — ຈື່ໄວ້ 5 ນາທີ
  const key = `org:${column}:${narrow.division ?? ''}:${narrow.department ?? ''}`

  return cached(key, 300, () =>
    query<OrgOption>(
      `select ${column} as name,
              count(distinct emp_code) as people,
              count(*) as items
         from it.v_asset_movements
        where ${where.join(' and ')}
        group by 1
        order by count(*) desc`,
      params
    )
  )
}

export function getMovementDivisions() {
  return orgOptions('division_name')
}

export function getMovementDepartments(division?: string) {
  return orgOptions('org_department', { division })
}

export function getMovementUnits(division?: string, department?: string) {
  return orgOptions('unit_name', { division, department })
}

/** ຕົວເລກສະຫຼຸບໜ້າຜູ້ຖືຄອງ — ລວມການແຈ້ງເຕືອນເລື່ອງພະນັກງານທີ່ອອກໄປແລ້ວ */
export async function getHolderStats() {
  return cached('asset:holder-stats', 30, async () => {
    const rows = await query<{
    holding_people: string
    former_people: string
    former_items: string
    all_people: string
  }>(
    `select count(distinct emp_code) filter (where not is_returned)
              as holding_people,
            count(distinct emp_code) filter (where not is_returned
                                               and is_former_employee)
              as former_people,
            count(*) filter (where not is_returned and is_former_employee)
              as former_items,
            count(distinct emp_code) as all_people
       from it.v_asset_movements
      where emp_code is not null`
  )
    return rows[0]
  })
}

/** ຈຳນວນອຸປະກອນຕໍ່ພະແນກ (ນັບຈາກຜູ້ຖືຄອງປັດຈຸບັນ) */
export async function getAssetsByDepartment() {
  return query<{ department_name: string; total: string }>(
    `select coalesce(holder_department, 'ຍັງບໍ່ໄດ້ມອບ') as department_name,
            count(*) as total
       from it.v_it_assets
      group by 1
      order by count(*) desc`
  )
}

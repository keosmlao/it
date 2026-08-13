import 'server-only'
import { query } from '@/lib/db'

export type LoanConflict = {
  asset_code: string
  asset_name: string
  category_name: string | null
  serial_no: string | null
  emp_code: string
  emp_name: string | null
  org_department: string | null
  division_name: string | null
  is_former_employee: boolean
  source: 'erp' | 'it'
  borrow_doc_no: string | null
  borrowed_at: string | Date | null
  expected_return: string | Date | null
  days_held: number
  open_count: string
  seq: string
  is_shown_as_holder: boolean
}

export type DateError = {
  asset_code: string
  asset_name: string
  borrow_doc_no: string | null
  return_doc_no: string | null
  emp_code: string
  emp_name: string | null
  org_department: string | null
  borrowed_at: string | Date | null
  returned_at: string | Date | null
}

/** ໃບຢືມຄ້າງທັງໝົດຂອງເຄື່ອງທີ່ມີໃບຄ້າງຫຼາຍກວ່າ 1 ໃບ */
export async function listLoanConflicts() {
  return query<LoanConflict>(
    `select * from it.v_loan_conflicts
      order by open_count desc, asset_code, seq`
  )
}

export async function listDateErrors() {
  return query<DateError>('select * from it.v_loan_date_errors order by asset_code')
}

export async function getConflictStats() {
  const rows = await query<{
    assets: string
    loans: string
    hidden: string
    worst: string
    date_errors: string
  }>(
    `select count(distinct asset_code)                        as assets,
            count(*)                                          as loans,
            count(*) filter (where not is_shown_as_holder)    as hidden,
            coalesce(max(open_count), 0)                      as worst,
            (select count(*) from it.v_loan_date_errors)      as date_errors
       from it.v_loan_conflicts`
  )
  return rows[0]
}

/** ໃບຢືມຄ້າງອື່ນຂອງເຄື່ອງນີ້ — ໃຊ້ເຕືອນຢູ່ໜ້າລາຍລະອຽດອຸປະກອນ */
export async function getAssetConflicts(assetCode: string) {
  return query<LoanConflict>(
    `select * from it.v_loan_conflicts
      where asset_code = $1::varchar
      order by seq`,
    [assetCode]
  )
}

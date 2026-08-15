import 'server-only'
import { query } from '@/lib/db'
import type { BudgetLine, BudgetSpend } from './model'

export async function listBudgetLines(fiscalYear: number) {
  return query<BudgetLine>(
    `select * from it.v_budget_lines
      where fiscal_year = $1::int
      order by category, name`,
    [fiscalYear]
  )
}

export async function getBudgetLine(id: string) {
  const rows = await query<BudgetLine>(
    'select * from it.v_budget_lines where id = $1::bigint',
    [id]
  )
  return rows[0] ?? null
}

export async function getBudgetSpends(lineId: string) {
  return query<BudgetSpend>(
    `select * from it.v_budget_spends
      where line_id = $1::bigint
      order by spend_date desc, id desc
      limit 200`,
    [lineId]
  )
}

/** ຍອດລວມແຍກຕາມສະກຸນ — ບໍ່ແປງອັດຕາແລກປ່ຽນ */
export async function getBudgetTotals(fiscalYear: number) {
  return query<{
    currency: string
    planned: string
    actual: string
    lines: string
    over: string
  }>(
    `select currency,
            sum(planned_amount)                        as planned,
            sum(actual_amount)                         as actual,
            count(*)                                   as lines,
            count(*) filter (where budget_state = 'over') as over
       from it.v_budget_lines
      where fiscal_year = $1::int
      group by currency
      order by currency`,
    [fiscalYear]
  )
}

/** ປີທີ່ມີຂໍ້ມູນຢູ່ແລ້ວ — ໃຫ້ເລືອກໄດ້ໂດຍບໍ່ຕ້ອງເດົາ */
export async function getBudgetYears() {
  const rows = await query<{ fiscal_year: number }>(
    'select distinct fiscal_year from it.budget_lines order by fiscal_year desc'
  )
  return rows.map((r) => r.fiscal_year)
}

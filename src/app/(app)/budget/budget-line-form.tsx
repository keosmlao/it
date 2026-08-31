'use client'

import ActionForm, { SubmitButton } from '@/components/action-form'
import {
  BUDGET_CATEGORIES,
  BUDGET_CATEGORY_LABEL_LO,
  BUDGET_SOURCES,
  BUDGET_SOURCE_HINT_LO,
  BUDGET_SOURCE_LABEL_LO,
  fiscalYearOptions,
  type BudgetLine,
} from '@/lib/budget/model'
import {
  SUB_CATEGORIES,
  SUB_CATEGORY_LABEL_LO,
  SUB_CURRENCIES,
} from '@/lib/subscriptions/model'
import { saveBudgetLine } from './actions'

const field = 'input mt-1 w-full rounded px-2 py-1 text-[13px]'
const label = 'block text-xs text-muted'

export default function BudgetLineForm({
  defaultYear,
  line,
}: {
  defaultYear: number
  line?: BudgetLine
}) {
  const l = line
  const years = fiscalYearOptions(new Date().getFullYear())
  const yearChoices = [...new Set([...years, defaultYear, l?.fiscal_year ?? defaultYear])]
    .sort((a, b) => b - a)

  return (
    <ActionForm action={saveBudgetLine} className="glass-card mt-3 rounded-xl p-5">
      {l && <input type="hidden" name="id" value={l.id} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className={label}>
          ປີງົບປະມານ *
          <select
            name="fiscal_year"
            required
            defaultValue={String(l?.fiscal_year ?? defaultYear)}
            className={field}
          >
            {yearChoices.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>

        <label className={`${label} sm:col-span-2`}>
          ຊື່ເສັ້ນງົບປະມານ *
          <input
            name="name"
            required
            maxLength={150}
            defaultValue={l?.name ?? ''}
            placeholder="ຄ່າອິນເຕີເນັດ ແລະ cloud"
            className={field}
          />
        </label>

        <label className={label}>
          ໝວດ *
          <select
            name="category"
            required
            defaultValue={l?.category ?? 'other'}
            className={field}
          >
            {BUDGET_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {BUDGET_CATEGORY_LABEL_LO[c]}
              </option>
            ))}
          </select>
        </label>

        <label className={label}>
          ຍອດໃຊ້ຈິງມາຈາກ *
          <select
            name="source"
            required
            defaultValue={l?.source ?? 'manual'}
            className={field}
          >
            {BUDGET_SOURCES.map((s) => (
              <option key={s} value={s}>
                {BUDGET_SOURCE_LABEL_LO[s]}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[11px] text-faint">
            {BUDGET_SOURCE_HINT_LO[l?.source ?? 'manual']}
          </span>
        </label>

        <label className={label}>
          ກັ່ນສະເພາະໝວດຄ່າເຊົ່າ
          <select
            name="source_filter"
            defaultValue={l?.source_filter ?? ''}
            className={field}
          >
            <option value="">— ທຸກໝວດ —</option>
            {SUB_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {SUB_CATEGORY_LABEL_LO[c]}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[11px] text-faint">
            ໃຊ້ໄດ້ສະເພາະເມື່ອເລືອກ “ງວດຄ່າເຊົ່າທີ່ຈ່າຍແລ້ວ”
          </span>
        </label>

        <label className={label}>
          ສະກຸນເງິນ *
          <select
            name="currency"
            required
            defaultValue={l?.currency ?? 'LAK'}
            className={field}
          >
            {SUB_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className={label}>
          ຍອດງົບປະມານ *
          <input
            name="planned_amount"
            required
            inputMode="decimal"
            defaultValue={l?.planned_amount ?? ''}
            className={field}
          />
        </label>

        <label className={`${label} sm:col-span-2 lg:col-span-3`}>
          ໝາຍເຫດ
          <input
            name="note"
            maxLength={300}
            defaultValue={l?.note ?? ''}
            className={field}
          />
        </label>
      </div>

      <SubmitButton className="btn-primary mt-4 rounded px-3 py-1.5 text-[13px] font-medium">
        {l ? 'ບັນທຶກການແກ້ໄຂ' : 'ເພີ່ມເສັ້ນງົບປະມານ'}
      </SubmitButton>
    </ActionForm>
  )
}

'use client'

import ActionForm, { SubmitButton } from '@/components/action-form'
import { addBudgetSpend } from '../actions'

const field = 'input mt-1 w-full rounded px-2 py-1 text-[13px]'
const label = 'block text-xs text-muted'

/** ບັນທຶກລາຍຈ່າຍເອງ — ສະເພາະເສັ້ນທີ່ຕັ້ງເປັນ “ປ້ອນເອງ” */
export default function SpendPanel({
  lineId,
  today,
}: {
  lineId: string
  today: string
}) {
  return (
    <div className="glass-card mt-4 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-fg">ບັນທຶກລາຍຈ່າຍ</h2>

      <ActionForm action={addBudgetSpend} className="mt-3">
        <input type="hidden" name="line_id" value={lineId} />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className={label}>
            ວັນທີ
            <input type="date" name="spend_date" defaultValue={today} className={field} />
          </label>

          <label className={label}>
            ຈຳນວນເງິນ *
            <input name="amount" required inputMode="decimal" className={field} />
          </label>

          <label className={`${label} sm:col-span-2`}>
            ລາຍລະອຽດ *
            <input name="description" required maxLength={200} className={field} />
          </label>

          <label className={label}>
            ເລກອ້າງອີງ
            <input name="ref_no" maxLength={60} className={field} />
          </label>
        </div>

        <SubmitButton className="btn-primary mt-3 rounded px-3 py-1.5 text-[13px] font-medium">
          ບັນທຶກລາຍຈ່າຍ
        </SubmitButton>
      </ActionForm>
    </div>
  )
}

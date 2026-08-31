'use client'

import ActionForm, { SubmitButton } from '@/components/action-form'
import {
  MOVE_KINDS,
  MOVE_KIND_LABEL_LO,
  formatQty,
  type Consumable,
} from '@/lib/consumables/model'
import { moveConsumable } from '../actions'

const field = 'input mt-1 w-full rounded px-2 py-1 text-[13px]'
const label = 'block text-xs text-muted'

type Employee = { employee_id: number; fullname_lo: string }

/** ຮັບເຂົ້າ / ເບີກອອກ / ປັບຍອດ — ຟອມດຽວ ເລືອກປະເພດເອົາ */
export default function MovePanel({
  item,
  employees,
  today,
}: {
  item: Consumable
  employees: Employee[]
  today: string
}) {
  return (
    <div className="glass-card mt-4 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-fg">ບັນທຶກການເຄື່ອນໄຫວ</h2>
      <p className="mt-0.5 text-xs text-muted">
        ຄົງເຫຼືອດຽວນີ້ {formatQty(item.on_hand)} {item.unit} — ເບີກເກີນຍອດບໍ່ໄດ້
        ຖ້ານັບຈິງບໍ່ກົງໃຫ້ໃຊ້ “ປັບຍອດ” ພ້ອມເຫດຜົນ
      </p>

      <ActionForm action={moveConsumable} className="mt-3">
        <input type="hidden" name="id" value={item.id} />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className={label}>
            ປະເພດ *
            <select name="kind" required defaultValue="out" className={field}>
              {MOVE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {MOVE_KIND_LABEL_LO[k]}
                </option>
              ))}
            </select>
          </label>

          <label className={label}>
            ຈຳນວນ ({item.unit}) *
            <input name="qty" required inputMode="decimal" className={field} />
          </label>

          <label className={label}>
            ວັນທີ
            <input type="date" name="moved_at" defaultValue={today} className={field} />
          </label>

          <label className={label}>
            ຜູ້ເບີກ
            <select name="employee_id" defaultValue="" className={field}>
              <option value="">— ບໍ່ລະບຸ —</option>
              {employees.map((e) => (
                <option key={e.employee_id} value={e.employee_id}>
                  {e.fullname_lo}
                </option>
              ))}
            </select>
          </label>

          <label className={label}>
            ໃສ່ໃຫ້ເຄື່ອງ (ລະຫັດ)
            <input
              name="asset_code"
              maxLength={40}
              placeholder="200-… / ITA-…"
              className={field}
            />
          </label>

          <label className={label}>
            ເລກອ້າງອີງ
            <input name="ref_no" maxLength={60} placeholder="ໃບບິນ / ໃບເບີກ" className={field} />
          </label>

          <label className={`${label} sm:col-span-2`}>
            ໝາຍເຫດ
            <input name="note" maxLength={300} className={field} />
          </label>
        </div>

        <SubmitButton className="btn-primary mt-3 rounded px-3 py-1.5 text-[13px] font-medium">
          ບັນທຶກ
        </SubmitButton>
      </ActionForm>
    </div>
  )
}

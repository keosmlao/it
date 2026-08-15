'use client'

import ActionForm, { SubmitButton } from '@/components/action-form'
import {
  CONSUMABLE_CATEGORIES,
  CONSUMABLE_CATEGORY_LABEL_LO,
  type Consumable,
} from '@/lib/consumables/model'
import { createConsumable, updateConsumable } from './actions'

const field = 'input mt-1 w-full rounded-lg px-3 py-2 text-sm'
const label = 'block text-xs text-muted'

export default function ConsumableForm({
  vendors,
  item,
}: {
  vendors: { id: string; name: string }[]
  item?: Consumable
}) {
  const editing = Boolean(item)
  const c = item

  return (
    <ActionForm
      action={editing ? updateConsumable : createConsumable}
      className="glass-card mt-4 rounded-xl p-5"
    >
      {editing && <input type="hidden" name="id" value={c!.id} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className={`${label} sm:col-span-2`}>
          ຊື່ລາຍການ *
          <input
            name="name"
            required
            maxLength={150}
            defaultValue={c?.name ?? ''}
            placeholder="ໝຶກພິມ HP 12A ດຳ"
            className={field}
          />
        </label>

        <label className={label}>
          ໝວດ *
          <select
            name="category"
            required
            defaultValue={c?.category ?? 'other'}
            className={field}
          >
            {CONSUMABLE_CATEGORIES.map((k) => (
              <option key={k} value={k}>
                {CONSUMABLE_CATEGORY_LABEL_LO[k]}
              </option>
            ))}
          </select>
        </label>

        <label className={label}>
          ຫົວໜ່ວຍ *
          <input
            name="unit"
            required
            maxLength={20}
            defaultValue={c?.unit ?? 'ອັນ'}
            placeholder="ອັນ / ກ່ອງ / ແມັດ"
            className={field}
          />
        </label>

        <label className={label}>
          ຈຸດສັ່ງຊື້ (ຕ່ຳກວ່ານີ້ຈະເຕືອນ)
          <input
            name="min_qty"
            inputMode="decimal"
            defaultValue={c?.min_qty ?? '0'}
            className={field}
          />
        </label>

        <label className={label}>
          ລາຄາຕໍ່ຫົວໜ່ວຍ (ກີບ)
          <input
            name="unit_price"
            inputMode="decimal"
            defaultValue={c?.unit_price ?? ''}
            className={field}
          />
        </label>

        <label className={label}>
          ບ່ອນເກັບ
          <input
            name="location"
            maxLength={120}
            defaultValue={c?.location ?? ''}
            placeholder="ຕູ້ IT ຊັ້ນ 2"
            className={field}
          />
        </label>

        <label className={label}>
          ຜູ້ຂາຍ
          <select name="vendor_id" defaultValue={c?.vendor_id ?? ''} className={field}>
            <option value="">— ບໍ່ລະບຸ —</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>

        <label className={`${label} sm:col-span-2 lg:col-span-3`}>
          ໝາຍເຫດ
          <input
            name="note"
            maxLength={300}
            defaultValue={c?.note ?? ''}
            className={field}
          />
        </label>
      </div>

      <SubmitButton className="btn-primary mt-4 rounded-lg px-5 py-2 text-sm font-medium">
        {editing ? 'ບັນທຶກການແກ້ໄຂ' : 'ເພີ່ມລາຍການ'}
      </SubmitButton>
    </ActionForm>
  )
}

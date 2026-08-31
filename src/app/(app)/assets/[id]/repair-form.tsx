'use client'

import { useState } from 'react'
import ActionForm, { SubmitButton } from '@/components/action-form'
import { addRepair } from '../actions'
import { REPAIR_STATUSES, REPAIR_STATUS_LABEL_LO } from '@/lib/assets/model'
import { todayISO } from '@/lib/format'

const inputClass = 'input mt-1 w-full rounded px-2 py-1 text-[13px]'

export default function RepairForm({ assetCode }: { assetCode: string }) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-secondary mt-3 rounded px-3 py-1.5 text-[13px]"
      >
        + ບັນທຶກການສ້ອມ
      </button>
    )
  }

  return (
    <ActionForm action={addRepair} className="mt-4 border-t border-line pt-4">
      <input type="hidden" name="asset_code" value={assetCode} />

      <label className="block text-xs text-muted">
        ອາການ / ສາເຫດ
        <input
          name="issue"
          required
          placeholder="ເຊັ່ນ ຈໍບໍ່ຕິດ, ແປ້ນພິມໃຊ້ບໍ່ໄດ້"
          className={inputClass}
        />
      </label>

      <label className="mt-3 block text-xs text-muted">
        ສິ່ງທີ່ເຮັດ / ອາໄຫຼ່ທີ່ປ່ຽນ
        <input name="action" placeholder="ປ່ຽນສາຍສາກ" className={inputClass} />
      </label>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-xs text-muted">
          ວັນທີສ້ອມ
          <input
            type="date"
            name="repair_date"
            defaultValue={todayISO()}
            className={inputClass}
          />
        </label>

        <label className="block text-xs text-muted">
          ຄ່າສ້ອມ (ກີບ)
          <input name="cost" inputMode="decimal" className={inputClass} />
        </label>

        <label className="block text-xs text-muted">
          ຮ້ານ / ຜູ້ສ້ອມ
          <input name="vendor" className={inputClass} />
        </label>

        <label className="block text-xs text-muted">
          ສະຖານະ
          <select name="status" defaultValue="done" className={inputClass}>
            {REPAIR_STATUSES.map((s) => (
              <option key={s} value={s}>
                {REPAIR_STATUS_LABEL_LO[s]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 flex gap-2">
        <SubmitButton className="btn-primary rounded px-3 py-1.5 text-[13px] font-medium">
          ບັນທຶກ
        </SubmitButton>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn-secondary rounded px-3 py-1.5 text-[13px]"
        >
          ຍົກເລີກ
        </button>
      </div>
    </ActionForm>
  )
}

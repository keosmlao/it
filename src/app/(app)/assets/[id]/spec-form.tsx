'use client'

import { useState } from 'react'
import ActionForm, { SubmitButton } from '@/components/action-form'
import { isoDate } from '@/lib/format'
import { saveAssetSpec } from '../actions'
import {
  SPEC_FIELDS,
  SPEC_NOTE_MAX,
  WARRANTY_NOTE_MAX,
  type AssetRow,
} from '@/lib/assets/model'

const inputClass = 'input mt-1 w-full rounded px-2 py-1 text-[13px]'

/**
 * ຟອມ spec + ວັນທີຊື້ + ປະກັນ.
 * ເລີ່ມຕົ້ນເປັນປຸ່ມ — ກົດແລ້ວຈຶ່ງເປີດຟອມ ບໍ່ໃຫ້ໜ້າຮົກ
 */
export default function SpecForm({ asset }: { asset: AssetRow }) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-secondary mt-3 rounded px-3 py-1.5 text-[13px]"
      >
        {asset.has_spec ? 'ແກ້ໄຂ spec ແລະ ປະກັນ' : '+ ເພີ່ມ spec ແລະ ປະກັນ'}
      </button>
    )
  }

  return (
    <ActionForm
      action={saveAssetSpec}
      className="mt-4 border-t border-line pt-4"
    >
      <input type="hidden" name="asset_code" value={asset.asset_code} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SPEC_FIELDS.map((field) => (
          <label key={field.name} className="block text-xs text-muted">
            {field.label}
            <input
              name={field.name}
              maxLength={field.max}
              defaultValue={asset[field.name] ?? ''}
              placeholder={field.placeholder}
              className={inputClass}
            />
          </label>
        ))}

        <label className="block text-xs text-muted">
          ວັນທີຊື້
          <input
            type="date"
            name="purchase_date"
            defaultValue={isoDate(asset.purchase_date)}
            className={inputClass}
          />
        </label>

        <label className="block text-xs text-muted">
          ລາຄາຊື້
          <input
            name="purchase_price"
            inputMode="decimal"
            defaultValue={asset.purchase_price ?? ''}
            className={inputClass}
          />
        </label>

        <label className="block text-xs text-muted">
          ປະກັນເຖິງວັນທີ
          <input
            type="date"
            name="warranty_until"
            defaultValue={isoDate(asset.warranty_until)}
            className={inputClass}
          />
        </label>

        <label className="block text-xs text-muted lg:col-span-2">
          ໝາຍເຫດປະກັນ
          <input
            name="warranty_note"
            maxLength={WARRANTY_NOTE_MAX}
            defaultValue={asset.warranty_note ?? ''}
            placeholder="ຮ້ານ, ເງື່ອນໄຂ, ເລກໃບຮັບປະກັນ"
            className={inputClass}
          />
        </label>

        <label className="block text-xs text-muted sm:col-span-2 lg:col-span-3">
          ໝາຍເຫດ spec
          <textarea
            name="spec_note"
            rows={2}
            maxLength={SPEC_NOTE_MAX}
            defaultValue={asset.spec_note ?? ''}
            className={inputClass}
          />
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

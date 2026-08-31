'use client'

import { useState } from 'react'
import ActionForm, { SubmitButton } from '@/components/action-form'
import { todayISO } from '@/lib/format'
import { undeployAsset } from '../condition-actions'

/** ຖອດອຸປະກອນສ່ວນກາງອອກ — ກັບເຂົ້າສາງ */
export default function UndeployButton({
  assetCode,
  place,
}: {
  assetCode: string
  place: string
}) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-secondary rounded px-3 py-1.5 text-xs"
      >
        ຖອດອອກ
      </button>
    )
  }

  return (
    <ActionForm action={undeployAsset} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="asset_code" value={assetCode} />
      <label className="flex flex-col gap-1 text-[11px] text-muted">
        ວັນທີຖອດ
        <input
          type="date"
          name="removed_at"
          defaultValue={todayISO()}
          className="input w-36 rounded-lg px-2 py-1 text-xs"
        />
      </label>
      <label className="flex flex-col gap-1 text-[11px] text-muted">
        ເຫດຜົນ
        <input
          name="remove_note"
          placeholder={`ຖອດຈາກ ${place}`}
          className="input w-48 rounded-lg px-2 py-1 text-xs"
        />
      </label>
      <SubmitButton
        pendingLabel="…"
        className="btn-primary rounded px-3 py-1.5 text-xs font-medium"
      >
        ຢືນຢັນ
      </SubmitButton>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs text-muted hover:underline"
      >
        ຍົກເລີກ
      </button>
    </ActionForm>
  )
}

'use client'

import ActionForm, { SubmitButton } from '@/components/action-form'
import type { ChecklistItem } from '@/lib/accounts/model'
import { formatDateTime } from '@/lib/format'
import { toggleChecklistItem } from '../actions'

/** ໜຶ່ງຂັ້ນຕອນ — ຕິກແລ້ວບັນທຶກທັນທີ ບໍ່ຕ້ອງກົດບັນທຶກລວມ */
export default function ItemRow({
  item,
  editable,
}: {
  item: ChecklistItem
  editable: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
      <span className="min-w-0 flex-1">
        <span
          className={`block ${item.is_done ? 'text-muted line-through' : 'text-fg'}`}
        >
          {item.title}
        </span>
        {item.hint && <span className="block text-xs text-faint">{item.hint}</span>}
        {item.is_done && item.done_at && (
          <span className="block text-xs text-muted">
            ຕິກເມື່ອ {formatDateTime(item.done_at)}
          </span>
        )}
      </span>

      {editable ? (
        <ActionForm action={toggleChecklistItem}>
          <input type="hidden" name="item_id" value={item.id} />
          <input type="hidden" name="is_done" value={item.is_done ? '0' : '1'} />
          <SubmitButton
            className={`rounded-lg px-3 py-1 text-xs ${
              item.is_done ? 'text-muted hover:text-body' : 'btn-secondary'
            }`}
            pendingLabel="…"
          >
            {item.is_done ? 'ຍົກເລີກ' : 'ເຮັດແລ້ວ'}
          </SubmitButton>
        </ActionForm>
      ) : (
        <span className="text-xs text-muted">{item.is_done ? '✓' : '—'}</span>
      )}
    </div>
  )
}

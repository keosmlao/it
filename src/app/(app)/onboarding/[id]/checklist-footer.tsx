'use client'

import ActionForm, { SubmitButton } from '@/components/action-form'
import { addChecklistItem, closeChecklist } from '../actions'

const field = 'input rounded-lg px-3 py-2 text-sm'

/** ເພີ່ມຂັ້ນຕອນນອກແມ່ແບບ + ປິດ/ຍົກເລີກ */
export default function ChecklistFooter({
  id,
  pending,
}: {
  id: string
  pending: number
}) {
  return (
    <div className="glass-card mt-4 rounded-xl p-5">
      <ActionForm action={addChecklistItem} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="checklist_id" value={id} />
        <label className="flex flex-1 flex-col gap-1 text-xs text-muted">
          ເພີ່ມຂັ້ນຕອນນອກແມ່ແບບ
          <input
            name="title"
            maxLength={200}
            placeholder="ເຊັ່ນ ຖອນສິດເຂົ້າຫ້ອງ server"
            className={`${field} w-full`}
          />
        </label>
        <SubmitButton className="btn-secondary rounded-lg px-4 py-2 text-sm">
          ເພີ່ມ
        </SubmitButton>
      </ActionForm>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <ActionForm action={closeChecklist}>
          <input type="hidden" name="id" value={id} />
          <SubmitButton className="btn-primary rounded-lg px-5 py-2 text-sm font-medium">
            ປິດວ່າຄົບແລ້ວ
          </SubmitButton>
        </ActionForm>

        <ActionForm action={closeChecklist}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="cancel" value="1" />
          <SubmitButton className="btn-danger rounded-lg px-4 py-2 text-sm">
            ຍົກເລີກຂັ້ນຕອນ
          </SubmitButton>
        </ActionForm>

        {pending > 0 && (
          <span className="text-xs text-muted">
            ຍັງເຫຼືອ {pending} ຂໍ້ — ຕ້ອງຕິກໃຫ້ຄົບກ່ອນຈຶ່ງປິດວ່າຄົບໄດ້
          </span>
        )}
      </div>
    </div>
  )
}

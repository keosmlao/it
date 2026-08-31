'use client'

import Link from 'next/link'
import { useState } from 'react'
import ActionForm, { SubmitButton } from '@/components/action-form'
import {
  PLAN_ITEM_LABEL_LO,
  PLAN_ITEM_STATUSES,
  PLAN_ITEM_STYLE,
  type PlanItem,
} from '@/lib/plans/model'
import { deletePlanItem, updatePlanItem } from './actions'

/** ແຖວວຽກໜຶ່ງໃນແຜນ — ກົດແລ້ວອັບເດດຄວາມຄືບໜ້າ */
export default function PlanItemRow({
  item,
  editable,
}: {
  item: PlanItem
  editable: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-start gap-3">
        <span
          className={`mt-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${PLAN_ITEM_STYLE[item.status]}`}
        >
          {PLAN_ITEM_LABEL_LO[item.status]}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-fg">{item.title}</p>

          {item.detail && (
            <p className="text-xs whitespace-pre-wrap text-muted">{item.detail}</p>
          )}

          <p className="mt-0.5 text-xs text-muted">
            ວາງແຜນ {Number(item.planned_hours)} ຊມ
            {item.actual_hours !== null &&
              ` · ໃຊ້ຈິງ ${Number(item.actual_hours)} ຊມ`}
            {item.ticket_no && (
              <>
                {' · '}
                <Link
                  href={`/tickets/${item.ticket_id}`}
                  className="font-mono text-brand-blue underline-offset-2 hover:underline"
                >
                  {item.ticket_no}
                </Link>
              </>
            )}
            {item.task_title && (
              <>
                {' · '}
                <Link
                  href={`/tasks/${item.task_id}`}
                  className="underline-offset-2 hover:underline"
                >
                  {item.task_title}
                </Link>
                {item.project_name && ` (${item.project_name})`}
              </>
            )}
          </p>

          {item.result_note && (
            <p className="mt-1 rounded-lg bg-brand-blue/5 px-2 py-1 text-xs text-body">
              ຜົນ: {item.result_note}
            </p>
          )}
        </div>

        {editable && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="btn-secondary rounded px-3 py-1.5 text-xs"
          >
            {open ? 'ຍົກເລີກ' : 'ອັບເດດ'}
          </button>
        )}
      </div>

      {open && (
        <div className="mt-3 rounded-lg bg-brand-blue/5 p-3">
          <ActionForm
            action={updatePlanItem}
            className="flex flex-wrap items-end gap-3"
          >
            <input type="hidden" name="plan_id" value={item.plan_id} />
            <input type="hidden" name="item_id" value={item.id} />

            <label className="flex flex-col gap-1 text-xs text-muted">
              ສະຖານະ
              <select
                name="status"
                defaultValue={item.status}
                className="input w-36 rounded px-2 py-1 text-[13px]"
              >
                {PLAN_ITEM_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {PLAN_ITEM_LABEL_LO[s]}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs text-muted">
              ຊົ່ວໂມງທີ່ໃຊ້ຈິງ
              <input
                type="number"
                name="actual_hours"
                min="0"
                max="24"
                step="0.25"
                defaultValue={item.actual_hours ?? ''}
                className="input w-28 rounded px-2 py-1 text-[13px]"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs text-muted">
              ຜົນ / ຕິດຂັດຫຍັງ
              <input
                name="result_note"
                defaultValue={item.result_note ?? ''}
                className="input w-72 rounded px-2 py-1 text-[13px]"
              />
            </label>

            <SubmitButton className="btn-primary rounded px-3 py-1.5 text-[13px] font-medium">
              ບັນທຶກ
            </SubmitButton>
          </ActionForm>

          <ActionForm action={deletePlanItem} className="mt-2">
            <input type="hidden" name="plan_id" value={item.plan_id} />
            <input type="hidden" name="item_id" value={item.id} />
            <SubmitButton
              pendingLabel="…"
              className="text-xs text-red-600 hover:underline dark:text-red-400"
            >
              ລຶບວຽກນີ້ອອກຈາກແຜນ
            </SubmitButton>
          </ActionForm>
        </div>
      )}
    </li>
  )
}

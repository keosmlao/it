'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useFormStatus } from 'react-dom'
import { useModalClose } from '@/components/modal'
import { createTask, type ActionState } from './actions'
import { TASK_STATUS_LABEL_LO, BOARD_COLUMNS } from '@/lib/projects/model'

type Staff = { employee_id: number; fullname_lo: string; nickname: string | null }
type Priority = { priority: string; name_lo: string }

const inputClass =
  'input w-full rounded-lg px-3 py-2 text-sm'

/** ຢູ່ຊັ້ນ module ຈຶ່ງຄົງ identity — ໃຊ້ຈຳແນກ "ຍັງບໍ່ທັນສົ່ງ" ຈາກ "ສົ່ງແລ້ວ" */
const NOT_SUBMITTED: ActionState = {}

export default function NewTaskForm({
  projectId,
  staff,
  priorities,
  canAssign,
  currentUserId,
}: {
  projectId?: string
  staff: Staff[]
  priorities: Priority[]
  canAssign: boolean
  currentUserId: number
}) {
  const [state, formAction] = useActionState(createTask, NOT_SUBMITTED)
  const ref = useRef<HTMLFormElement>(null)

  // ຢູ່ນອກ modal ຄ່ານີ້ບໍ່ເຮັດຫຍັງ — ຟອມຈຶ່ງໃຊ້ໄດ້ທັງສອງແບບ
  const close = useModalClose()

  /**
   * ລ້າງຟອມຫຼັງບັນທຶກສຳເລັດ ເພື່ອໃຫ້ເພີ່ມວຽກຕໍ່ໆກັນໄດ້ໄວ
   *
   * ທຸກຄັ້ງທີ່ action ຈົບ state ຈະເປັນ object ໃໝ່ ຈຶ່ງໃຊ້ identity ເປັນສັນຍານ —
   * ຢ່າໃຊ້ ref ແບບ "ຂ້າມຮອບທຳອິດ" ເພາະ Strict Mode ຕອນ dev ແລ່ນ effect
   * ຂອງການ mount ສອງເທື່ອ ແລ້ວຮອບທີສອງຈະລ້າງຟອມ/ປິດໜ້າຕ່າງໃສ່ທັນທີທີ່ເປີດ
   */
  useEffect(() => {
    if (state === NOT_SUBMITTED) return
    if (!state.error) {
      ref.current?.reset()
      close()
    }
  }, [state, close])

  return (
    // ບໍ່ມີຂອບກາດ — ຜູ້ເອີ້ນເປັນຄົນໃຫ້ພື້ນຜິວ (ຕອນນີ້ຄືໜ້າຕ່າງລອຍ)
    <form ref={ref} action={formAction}>
      {projectId && <input type="hidden" name="project_id" value={projectId} />}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="sm:col-span-2 lg:col-span-3">
          <span className="text-xs text-muted">ຫົວຂໍ້ວຽກ</span>
          <input name="title" required maxLength={200} className={inputClass} />
        </label>

        <label className="sm:col-span-2 lg:col-span-3">
          <span className="text-xs text-muted">ລາຍລະອຽດ</span>
          <textarea name="description" rows={2} className={inputClass} />
        </label>

        <label>
          <span className="text-xs text-muted">ຖັນເລີ່ມຕົ້ນ</span>
          <select name="status" defaultValue="todo" className={inputClass}>
            {BOARD_COLUMNS.map((s) => (
              <option key={s} value={s}>
                {TASK_STATUS_LABEL_LO[s]}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="text-xs text-muted">ຄວາມສຳຄັນ</span>
          <select name="priority" defaultValue="medium" className={inputClass}>
            {priorities.map((p) => (
              <option key={p.priority} value={p.priority}>
                {p.name_lo}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="text-xs text-muted">ຜູ້ຮັບຜິດຊອບ</span>
          <select
            name="assignee_employee_id"
            defaultValue={canAssign ? '' : currentUserId}
            disabled={!canAssign}
            className={inputClass}
          >
            <option value="">— ຍັງບໍ່ມອບໝາຍ —</option>
            {staff.map((s) => (
              <option key={s.employee_id} value={s.employee_id}>
                {s.fullname_lo}
                {s.nickname ? ` (${s.nickname})` : ''}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="text-xs text-muted">ກຳນົດສົ່ງ</span>
          <input type="date" name="due_date" className={inputClass} />
        </label>

        <label>
          <span className="text-xs text-muted">
            ຊົ່ວໂມງທີ່ຄາດ
          </span>
          <input
            type="number"
            name="estimate_hours"
            step="0.5"
            min="0"
            max="999"
            className={inputClass}
          />
        </label>
      </div>

      {state.error && (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          {state.error}
        </p>
      )}

      <Submit />
    </form>
  )
}

function Submit() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-4 btn-primary rounded-lg px-4 py-2 text-sm font-medium"
    >
      {pending ? 'ກຳລັງເພີ່ມ…' : '+ ເພີ່ມວຽກ'}
    </button>
  )
}

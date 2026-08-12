'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useFormStatus } from 'react-dom'
import { createTask, type ActionState } from './actions'
import { TASK_STATUS_LABEL_LO, BOARD_COLUMNS } from '@/lib/projects/model'

type Staff = { employee_id: number; fullname_lo: string; nickname: string | null }
type Priority = { priority: string; name_lo: string }

const inputClass =
  'input w-full rounded-lg px-3 py-2 text-sm'

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
  const [state, formAction] = useActionState(createTask, {} as ActionState)
  const ref = useRef<HTMLFormElement>(null)
  const firstRender = useRef(true)

  // ລ້າງຟອມຫຼັງບັນທຶກສຳເລັດ ເພື່ອໃຫ້ເພີ່ມວຽກຕໍ່ໆກັນໄດ້ໄວ.
  // ທຸກຄັ້ງທີ່ action ຈົບ state ຈະເປັນ object ໃໝ່ ຈຶ່ງໃຊ້ເປັນສັນຍານໄດ້.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    if (!state.error) ref.current?.reset()
  }, [state])

  return (
    <form
      ref={ref}
      action={formAction}
      className="glass-card rounded-xl p-4"
    >
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

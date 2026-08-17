'use client'

import Link from 'next/link'
import { useActionState, useRef, useState } from 'react'
import { moveTask } from '@/app/(app)/projects/actions'
import { EMPTY_STATE } from '@/lib/action-state'
import {
  BOARD_COLUMNS,
  TASK_STATUS_LABEL_LO,
  canEditTask,
  type TaskRow,
  type TaskStatus,
} from '@/lib/projects/model'
import type { ItStaff } from '@/lib/auth/roles'
import { PriorityBadge } from '@/components/badge'
import { blockNativeDrag, dropColumn, usePointerDrag } from '@/components/pointer-drag'

/**
 * ກະດານ Kanban ຂອງວຽກ — ຮູບແບບດຽວກັບກະດານ ticket
 *
 * ຍ້າຍໄດ້ 2 ທາງ ແລະ ທັງສອງທາງເອີ້ນ moveTask ອັນດຽວກັນ:
 *   • ລາກດ້ວຍເມົ້າ — ທາງຫຼັກຢູ່ຄອມພິວເຕີ
 *   • dropdown + ປຸ່ມ "ຍ້າຍ" — ມືຖື, ຄີບອດ ແລະ ຕອນ JS ບໍ່ແລ່ນ
 *     (HTML5 drag & drop ບໍ່ເຮັດວຽກເທິງໜ້າຈໍສຳຜັດ ຈຶ່ງຕັດອອກບໍ່ໄດ້)
 *
 * ວຽກຍ້າຍໄປຖັນໃດກໍໄດ້ (ຕ່າງຈາກ ticket ທີ່ມີກົດການໄຫຼ) ຈຶ່ງບໍ່ມີຖັນທີ່ຢ່ອນບໍ່ໄດ້
 * — ຍົກເວັ້ນຖັນທີ່ຕົນເອງຢູ່ ແລະ ວຽກທີ່ບໍ່ມີສິດແກ້ໄຂ
 */
export function KanbanBoard({
  tasks,
  user,
}: {
  tasks: TaskRow[]
  user: ItStaff
}) {
  /**
   * ຍ້າຍຜ່ານ <form> ຈິງ ບໍ່ແມ່ນເອີ້ນ action ຈາກ JS ໂດຍກົງ —
   * Next ຈຶ່ງ revalidate ແລະ render ໃໝ່ໃຫ້ເອງ ບໍ່ດີດກັບເປັນຂອງເກົ່າ
   */
  const [state, formAction, pending] = useActionState(moveTask, EMPTY_STATE)
  const moveForm = useRef<HTMLFormElement>(null)
  const moveId = useRef<HTMLInputElement>(null)
  const moveTo = useRef<HTMLInputElement>(null)

  function move(task: TaskRow, to: TaskStatus) {
    if (to === task.status) return
    if (!moveId.current || !moveTo.current) return
    moveId.current.value = task.id
    moveTo.current.value = to
    moveForm.current?.requestSubmit()
  }


  const { item: dragging, over, begin, ghost } = usePointerDrag<TaskRow>({
    // ບໍ່ຕ້ອງ memo — hook ເກັບ callback ໄວ້ໃນ ref ຂອງມັນເອງ ຈຶ່ງບໍ່ຄ້າງເກົ່າ
    canDrop: (task: TaskRow, column: string) => task.status !== column,
    onDrop: (task: TaskRow, column: string) => move(task, column as TaskStatus),
    label: (task: TaskRow) => task.title,
  })

  return (
    <div>
      {/* ຟອມລັບອັນດຽວຂອງກະດານ — ການລາກ ແລະ ປຸ່ມໃນກາດສົ່ງຜ່ານອັນນີ້ໝົດ */}
      <form ref={moveForm} action={formAction} className="hidden">
        <input type="hidden" name="task_id" ref={moveId} />
        <input type="hidden" name="status" ref={moveTo} />
      </form>

      {state.error && (
        <p
          role="alert"
          className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          {state.error}
        </p>
      )}

      {/* ຖັນສູງຕາມກາດທີ່ມີ ແຕ່ບໍ່ເກີນຈໍ — ກາດໜ້ອຍຖັນກໍ່ສັ້ນ ບໍ່ມີບ່ອນຫວ່າງລອຍ
          ກາດຫຼາຍຈຶ່ງເລື່ອນຢູ່ໃນຖັນ ໂດຍຫົວຖັນຄ້າງໃຫ້ເຫັນ */}
      <div className="flex max-h-[calc(100vh-17rem)] items-stretch gap-3 overflow-x-auto pb-2">
        {BOARD_COLUMNS.map((column) => {
          const items = tasks.filter((t) => t.status === column)
          const accepts = Boolean(dragging) && dragging?.status !== column

          return (
            <section
              key={column}
              {...dropColumn(column)}
              className={`flex min-h-0 w-64 shrink-0 flex-col glass-subtle rounded-xl p-2 transition ${
                over === column
                  ? 'ring-2 ring-brand-blue/60'
                  : accepts
                    ? 'ring-1 ring-brand-blue/25'
                    : ''
              }`}
            >
              <h3 className="shrink-0 px-2 py-1.5 text-sm font-medium text-body">
                {TASK_STATUS_LABEL_LO[column]}
                <span className="ml-1.5 text-faint">{items.length}</span>
              </h3>

              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-0.5">
                {items.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    user={user}
                    dimmed={dragging?.id === task.id}
                    onGrab={(event) => begin(event, task)}
                    onMove={(to) => move(task, to)}
                  />
                ))}

                {items.length === 0 && (
                  <p className="px-2 py-4 text-center text-xs text-faint">
                    {accepts ? 'ຢ່ອນລົງນີ້' : 'ວ່າງ'}
                  </p>
                )}
              </div>
            </section>
          )
        })}
      </div>

      <p className="mt-2 text-xs text-muted">
        {pending ? 'ກຳລັງບັນທຶກການຍ້າຍ…' : 'ລາກກາດໄປວາງໃສ່ຖັນທີ່ຕ້ອງການເພື່ອຍ້າຍວຽກ'}
      </p>

      {ghost}
    </div>
  )
}

function TaskCard({
  task,
  user,
  dimmed,
  onGrab,
  onMove,
}: {
  task: TaskRow
  user: ItStaff
  dimmed: boolean
  onGrab: (event: React.PointerEvent) => void
  onMove: (to: TaskStatus) => void
}) {
  const editable = canEditTask(user, task)

  return (
    <article
      onPointerDown={editable ? onGrab : undefined}
      {...blockNativeDrag()}
      className={`glass-card shrink-0 select-none rounded-lg p-3 transition ${
        editable ? 'cursor-grab active:cursor-grabbing' : ''
      } ${dimmed ? 'opacity-40' : ''}`}
    >
      <Link
        href={`/tasks/${task.id}`}
        className="text-sm font-medium text-fg underline-offset-2 hover:underline"
      >
        {task.title}
      </Link>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <PriorityBadge priority={task.priority} label={task.priority_name_lo} />
        {task.is_overdue && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800 dark:bg-red-950 dark:text-red-300">
            ເກີນກຳນົດ
          </span>
        )}
      </div>

      <p className="mt-2 text-xs text-muted">
        {task.assignee_nickname ?? task.assignee_name ?? 'ຍັງບໍ່ມອບໝາຍ'}
        {task.due_date && ` · ກຳນົດ ${task.due_date}`}
      </p>

      {editable && (
        <MovePicker task={task} onMove={onMove} />
      )}
    </article>
  )
}

/**
 * ທາງເລືອກສຳລັບມືຖື ແລະ ຄີບອດ — ລາກບໍ່ໄດ້ກໍ່ຍ້າຍໄດ້
 * ສົ່ງຜ່ານ onMove ອັນດຽວກັບການລາກ ຈຶ່ງມີເສັ້ນທາງບັນທຶກແຫ່ງດຽວ
 */
function MovePicker({
  task,
  onMove,
}: {
  task: TaskRow
  onMove: (to: TaskStatus) => void
}) {
  const [to, setTo] = useState<TaskStatus>(task.status)

  return (
    <div className="mt-2 flex gap-1">
      <select
        value={to}
        onChange={(event) => setTo(event.target.value as TaskStatus)}
        aria-label={`ຍ້າຍ "${task.title}" ໄປຖັນ`}
        className="input min-w-0 flex-1 rounded px-1.5 py-1 text-xs"
      >
        {[...BOARD_COLUMNS, 'cancelled' as TaskStatus].map((s) => (
          <option key={s} value={s}>
            {TASK_STATUS_LABEL_LO[s]}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => onMove(to)}
        className="btn-secondary rounded px-2 py-1 text-xs"
      >
        ຍ້າຍ
      </button>
    </div>
  )
}

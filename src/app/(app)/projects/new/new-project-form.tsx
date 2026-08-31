'use client'

import { useActionState, useMemo } from 'react'
import { useFormStatus } from 'react-dom'
import { createProject, type ActionState } from '../actions'
import {
  PROJECT_STATUSES,
  PROJECT_STATUS_LABEL_LO,
} from '@/lib/projects/model'

type Priority = { priority: string; name_lo: string }
type Staff = { employee_id: number; fullname_lo: string; nickname: string | null }
type Employee = {
  employee_id: number
  employee_code: string
  fullname_lo: string
  department_name_lo: string | null
}

const inputClass =
  'input mt-1.5 w-full rounded-lg px-3 py-2'

export default function NewProjectForm({
  priorities,
  staff,
  employees,
  defaultOwnerId,
}: {
  priorities: Priority[]
  staff: Staff[]
  employees: Employee[]
  defaultOwnerId: number
}) {
  const [state, formAction] = useActionState(createProject, {} as ActionState)

  const grouped = useMemo(() => {
    const map = new Map<string, Employee[]>()
    for (const e of employees) {
      const key = e.department_name_lo ?? 'ບໍ່ລະບຸພະແນກ'
      const list = map.get(key)
      if (list) list.push(e)
      else map.set(key, [e])
    }
    return [...map.entries()]
  }, [employees])

  return (
    <form
      action={formAction}
      className="mt-6 glass-card rounded-2xl p-6"
    >
      <label className="block text-sm font-medium text-body">
        ຊື່ໂປຣເຈັກ
        <input name="name" required maxLength={200} className={inputClass} />
      </label>

      <label className="mt-4 block text-sm font-medium text-body">
        ລາຍລະອຽດ / ຂອບເຂດວຽກ
        <textarea name="description" rows={4} className={inputClass} />
      </label>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block text-sm font-medium text-body">
          ເຈົ້າຂອງໂປຣເຈັກ
          <select
            name="owner_employee_id"
            defaultValue={defaultOwnerId}
            className={inputClass}
          >
            {staff.map((s) => (
              <option key={s.employee_id} value={s.employee_id}>
                {s.fullname_lo}
                {s.nickname ? ` (${s.nickname})` : ''}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-body">
          ພະແນກທີ່ຂໍ (ບໍ່ບັງຄັບ)
          <select name="requester_employee_id" defaultValue="" className={inputClass}>
            <option value="">— ບໍ່ລະບຸ —</option>
            {grouped.map(([department, list]) => (
              <optgroup key={department} label={department}>
                {list.map((e) => (
                  <option key={e.employee_id} value={e.employee_id}>
                    {e.fullname_lo} ({e.employee_code})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-body">
          ສະຖານະ
          <select name="status" defaultValue="planning" className={inputClass}>
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PROJECT_STATUS_LABEL_LO[s]}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-body">
          ຄວາມສຳຄັນ
          <select name="priority" defaultValue="medium" className={inputClass}>
            {priorities.map((p) => (
              <option key={p.priority} value={p.priority}>
                {p.name_lo}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-body">
          ວັນເລີ່ມ
          <input type="date" name="start_date" className={inputClass} />
        </label>

        <label className="block text-sm font-medium text-body">
          ກຳນົດສຳເລັດ
          <input type="date" name="due_date" className={inputClass} />
        </label>
      </div>

      {state.error && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
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
      className="mt-6 btn-primary rounded px-3 py-1.5 font-medium"
    >
      {pending ? 'ກຳລັງບັນທຶກ…' : 'ສ້າງໂປຣເຈັກ'}
    </button>
  )
}

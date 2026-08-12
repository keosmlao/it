'use client'

import { useActionState, useMemo, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { createTicket, type ActionState } from '../actions'
import { formatDuration } from '@/lib/format'
import ImagePicker from '@/components/image-picker'

type Category = { code: string; name_lo: string; unit_code: string | null }
type Priority = {
  priority: string
  name_lo: string
  respond_minutes: number
  resolve_minutes: number
}
type Employee = {
  employee_id: number
  employee_code: string
  fullname_lo: string
  department_name_lo: string | null
}
type Staff = {
  employee_id: number
  fullname_lo: string
  nickname: string | null
  unit_name_lo: string | null
}

const initialState: ActionState = {}

const inputClass =
  'input mt-1.5 w-full rounded-lg px-3 py-2'

export default function NewTicketForm({
  categories,
  priorities,
  employees,
  staff,
  canAssign,
  currentUser,
}: {
  categories: Category[]
  priorities: Priority[]
  employees: Employee[]
  staff: Staff[]
  canAssign: boolean
  currentUser: { employee_id: number; fullname_lo: string }
}) {
  const [state, formAction] = useActionState(createTicket, initialState)
  const [priority, setPriority] = useState('medium')

  const selected = priorities.find((p) => p.priority === priority)

  // ຈັດພະນັກງານຕາມພະແນກ ເພື່ອໃຫ້ຫາງ່າຍໃນລາຍການ 200+ ຄົນ
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
        ຫົວຂໍ້ບັນຫາ
        <input name="title" required maxLength={200} className={inputClass} />
      </label>

      <label className="mt-4 block text-sm font-medium text-body">
        ຜູ້ແຈ້ງ
        <select
          name="requester_employee_id"
          required
          defaultValue={currentUser.employee_id}
          className={inputClass}
        >
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

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block text-sm font-medium text-body">
          ປະເພດບັນຫາ
          <select
            name="category_code"
            required
            defaultValue="HARDWARE"
            className={inputClass}
          >
            {categories.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name_lo}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-body">
          ລະດັບຄວາມດ່ວນ
          <select
            name="priority"
            required
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className={inputClass}
          >
            {priorities.map((p) => (
              <option key={p.priority} value={p.priority}>
                {p.name_lo}
              </option>
            ))}
          </select>
        </label>
      </div>

      {selected && (
        <p className="mt-2 text-xs text-muted">
          SLA: ຕ້ອງຕອບພາຍໃນ {formatDuration(selected.respond_minutes)} · ແກ້ໄຂພາຍໃນ{' '}
          {formatDuration(selected.resolve_minutes)}
        </p>
      )}

      <label className="mt-4 block text-sm font-medium text-body">
        ລາຍລະອຽດ
        <textarea
          name="description"
          rows={5}
          placeholder="ອາການທີ່ພົບ, ເກີດຂຶ້ນເມື່ອໃດ, ເຄື່ອງ/ລະບົບໃດ"
          className={inputClass}
        />
      </label>

      <div className="mt-4">
        <ImagePicker
          label="ຮູບບັນຫາ"
          hint="ຮູບໜ້າຈໍ ຫຼື ຮູບຖ່າຍອາການ — ສູງສຸດ 5 ຮູບ, ຮູບລະ 8MB"
        />
      </div>

      {canAssign && (
        <label className="mt-4 block text-sm font-medium text-body">
          ມອບໝາຍໃຫ້ (ບໍ່ບັງຄັບ)
          <select name="assignee_employee_id" defaultValue="" className={inputClass}>
            <option value="">— ຍັງບໍ່ມອບໝາຍ —</option>
            {staff.map((s) => (
              <option key={s.employee_id} value={s.employee_id}>
                {s.fullname_lo}
                {s.nickname ? ` (${s.nickname})` : ''}
                {s.unit_name_lo ? ` · ${s.unit_name_lo}` : ''}
              </option>
            ))}
          </select>
        </label>
      )}

      {state.error && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-6 btn-primary rounded-lg px-5 py-2.5 font-medium"
    >
      {pending ? 'ກຳລັງບັນທຶກ…' : 'ບັນທຶກ ticket'}
    </button>
  )
}

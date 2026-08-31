'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { addWorkLog, type ActionState } from './actions'
import { WORK_TYPES } from '@/lib/worklogs/model'
import { todayISO } from '@/lib/format'

type Option = { id: string; label: string }

const inputClass =
  'input w-full rounded px-2 py-1 text-[13px]'

export default function WorkLogForm({
  tickets,
  tasks,
}: {
  tickets: Option[]
  tasks: Option[]
}) {
  const [state, formAction] = useActionState(addWorkLog, {} as ActionState)
  const [target, setTarget] = useState('other')
  const ref = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.ok) ref.current?.reset()
  }, [state])

  const isOther = !target.startsWith('ticket:') && !target.startsWith('task:')

  return (
    <form
      ref={ref}
      action={formAction}
      className="glass-card rounded-xl p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label>
          <span className="text-xs text-muted">ວັນທີ</span>
          <input
            type="date"
            name="log_date"
            defaultValue={todayISO()}
            className={inputClass}
          />
        </label>

        <label>
          <span className="text-xs text-muted">ຊົ່ວໂມງ</span>
          <input
            type="number"
            name="hours"
            step="0.25"
            min="0.25"
            max="24"
            required
            defaultValue="1"
            className={inputClass}
          />
        </label>

        <label className="lg:col-span-2">
          <span className="text-xs text-muted">ວຽກ</span>
          <select
            name="target"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className={inputClass}
          >
            <option value="other">— ວຽກທົ່ວໄປ —</option>
            {tickets.length > 0 && (
              <optgroup label="Ticket">
                {tickets.map((t) => (
                  <option key={t.id} value={`ticket:${t.id}`}>
                    {t.label}
                  </option>
                ))}
              </optgroup>
            )}
            {tasks.length > 0 && (
              <optgroup label="ວຽກພັດທະນາ">
                {tasks.map((t) => (
                  <option key={t.id} value={`task:${t.id}`}>
                    {t.label}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>

        {isOther && (
          <label>
            <span className="text-xs text-muted">
              ປະເພດວຽກ
            </span>
            <select name="work_type" defaultValue={WORK_TYPES[0]} className={inputClass}>
              {WORK_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className={isOther ? 'lg:col-span-3' : 'lg:col-span-4'}>
          <span className="text-xs text-muted">ໝາຍເຫດ</span>
          <input name="note" maxLength={300} className={inputClass} />
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
      className="mt-4 btn-primary rounded px-3 py-1.5 text-[13px] font-medium"
    >
      {pending ? 'ກຳລັງບັນທຶກ…' : '+ ບັນທຶກຊົ່ວໂມງ'}
    </button>
  )
}

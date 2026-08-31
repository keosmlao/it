'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { createRequest, type ActionState } from '../actions'

const inputClass =
  'input mt-1.5 w-full rounded-lg px-3 py-2'

export default function NewRequestForm({
  types,
}: {
  types: { code: string; name_lo: string }[]
}) {
  const [state, formAction] = useActionState(createRequest, {} as ActionState)

  return (
    <form
      action={formAction}
      className="mt-6 glass-card rounded-2xl p-6"
    >
      <label className="block text-sm font-medium text-body">
        ປະເພດຄຳຮ້ອງ
        <select name="type_code" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            — ເລືອກປະເພດ —
          </option>
          {types.map((t) => (
            <option key={t.code} value={t.code}>
              {t.name_lo}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-4 block text-sm font-medium text-body">
        ຫົວຂໍ້
        <input name="title" required maxLength={200} className={inputClass} />
      </label>

      <label className="mt-4 block text-sm font-medium text-body">
        ລາຍລະອຽດ / ເຫດຜົນ
        <textarea
          name="detail"
          rows={6}
          placeholder="ອະທິບາຍສິ່ງທີ່ຕ້ອງການ, ເຫດຜົນ ແລະ ຜົນທີ່ຄາດວ່າຈະໄດ້ຮັບ"
          className={inputClass}
        />
      </label>

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
      {pending ? 'ກຳລັງສົ່ງ…' : 'ສົ່ງຄຳຮ້ອງ'}
    </button>
  )
}

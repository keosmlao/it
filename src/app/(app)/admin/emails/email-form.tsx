'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { EMPTY_STATE } from '@/lib/action-state'
import { testSmtp } from './actions'

/**
 * ປຸ່ມທົດສອບ SMTP
 *
 * ບໍ່ໄດ້ໃຊ້ <ActionForm> ເພາະ action ນີ້ບໍ່ຮັບ FormData —
 * ມັນພຽງແຕ່ເປີດການເຊື່ອມຕໍ່ໄປຫາ SMTP ແລ້ວປິດ ບໍ່ໄດ້ສົ່ງອີເມວຈິງ
 */
export default function EmailForm() {
  const [state, action] = useActionState(testSmtp, EMPTY_STATE)

  return (
    <form action={action} className="glass-card mt-3 rounded-xl p-5">
      <p className="text-sm text-muted">
        ກົດເພື່ອລອງເຊື່ອມຕໍ່ຫາ SMTP ດ້ວຍຄ່າໃນ <code>.env.local</code> —
        ບໍ່ໄດ້ສົ່ງອີເມວຈິງອອກໄປຫາໃຜ
      </p>

      <TestButton />

      {state.ok && state.message && (
        <p
          role="status"
          className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
        >
          {state.message}
        </p>
      )}
      {state.error && (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          {state.error}
        </p>
      )}
    </form>
  )
}

function TestButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-secondary mt-3 rounded px-3 py-1.5 text-[13px] disabled:opacity-60"
    >
      {pending ? 'ກຳລັງທົດສອບ…' : 'ທົດສອບການເຊື່ອມຕໍ່'}
    </button>
  )
}

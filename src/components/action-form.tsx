'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { EMPTY_STATE, type FormState } from '@/lib/action-state'

/**
 * ຟອມທີ່ສະແດງຂໍ້ຄວາມແຈ້ງເຕືອນຈາກ server action ໄວ້ໃນຕົວມັນເອງ
 * ແທນທີ່ຈະປ່ອຍໃຫ້ error ຂຶ້ນເປັນໜ້າ Runtime Error.
 */
export default function ActionForm({
  action,
  children,
  className,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>
  children: React.ReactNode
  className?: string
}) {
  const [state, formAction] = useActionState(action, EMPTY_STATE)

  return (
    <form action={formAction} className={className}>
      {children}

      {state.ok && state.message && (
        <p
          role="status"
          className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
        >
          {state.message}
        </p>
      )}

      {state.error && (
        <p
          role="alert"
          className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          {state.error}
        </p>
      )}
    </form>
  )
}

/** ປຸ່ມສົ່ງທີ່ປິດຕົວເອງ ແລະ ປ່ຽນຂໍ້ຄວາມຂະນະກຳລັງບັນທຶກ */
export function SubmitButton({
  children,
  pendingLabel = 'ກຳລັງບັນທຶກ…',
  className = '',
  name,
  value,
}: {
  children: React.ReactNode
  pendingLabel?: string
  className?: string
  name?: string
  value?: string
}) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      className={`${className} disabled:opacity-60`}
    >
      {pending ? pendingLabel : children}
    </button>
  )
}

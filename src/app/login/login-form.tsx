'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { login, type LoginState } from './actions'

const initialState: LoginState = {}

function Icon({ d, className = 'size-[18px]' }: { d: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${className} shrink-0`}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  )
}

export default function LoginForm() {
  const [state, formAction] = useActionState(login, initialState)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <form
      action={formAction}
      className="glass-card glow-primary mt-6 rounded-2xl p-6"
    >
      <label className="block">
        <span className="text-sm font-medium text-body">ລະຫັດພະນັກງານ</span>
        <span className="relative mt-1.5 block">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint">
            <Icon d="M16 20v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
          </span>
          <input
            name="employee_code"
            autoComplete="username"
            inputMode="numeric"
            autoFocus
            required
            placeholder="ເຊັ່ນ 22020"
            className="input w-full rounded-xl py-2.5 pr-3 pl-10"
          />
        </span>
      </label>

      <label className="mt-4 block">
        <span className="text-sm font-medium text-body">ລະຫັດຜ່ານ</span>
        <span className="relative mt-1.5 block">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint">
            <Icon d="M6 10V7a6 6 0 1 1 12 0v3M5 10h14v11H5V10Z" />
          </span>
          <input
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            className="input w-full rounded-xl py-2.5 pr-11 pl-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'ເຊື່ອງລະຫັດຜ່ານ' : 'ສະແດງລະຫັດຜ່ານ'}
            className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition hover:text-body"
          >
            <Icon
              d={
                showPassword
                  ? 'M3 3l18 18M10.6 10.7a2 2 0 0 0 2.8 2.8M9.4 5.2A9.7 9.7 0 0 1 12 5c5 0 9 4.5 9 7 0 .9-.7 2.2-1.8 3.4M6.2 6.7C4 8.2 3 10.2 3 12c0 2.5 4 7 9 7 1.4 0 2.7-.4 3.8-.9'
                  : 'M3 12s3.6-7 9-7 9 7 9 7-3.6 7-9 7-9-7-9-7Zm9 2.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z'
              }
            />
          </button>
        </span>
      </label>

      {state.error && (
        <p
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          <Icon
            d="M12 9v4m0 4h.01M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
            className="mt-0.5 size-4"
          />
          {state.error}
        </p>
      )}

      <SubmitButton />

      <p className="mt-4 flex items-start gap-2 text-xs text-faint">
        <Icon d="M12 16v-4m0-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" className="mt-px size-4" />
        ເປີດໃຫ້ສະເພາະພະນັກງານພະແນກໄອທີ. ລືມລະຫັດຜ່ານ ຫຼື ເຂົ້າບໍ່ໄດ້
        ໃຫ້ຕິດຕໍ່ຫົວໜ້າໜ່ວຍງານ.
      </p>
    </form>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium disabled:opacity-60"
    >
      {pending ? (
        'ກຳລັງກວດສອບ…'
      ) : (
        <>
          ເຂົ້າສູ່ລະບົບ
          <Icon d="M15 17l5-5-5-5M20 12H9" className="size-4" />
        </>
      )}
    </button>
  )
}

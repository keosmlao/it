'use client'

import ActionForm, { SubmitButton } from '@/components/action-form'
import {
  ACCOUNT_STATUS_LABEL_LO,
  ACCOUNT_STATUS_STYLE,
  HR_STATE_LABEL_LO,
  type SystemAccount,
} from '@/lib/accounts/model'
import { safeDate } from '@/lib/assets/model'
import { setAccountStatus } from './actions'

/** ແຖວບັນຊີ — ອັນທີ່ຄວນປິດຂຶ້ນພື້ນແດງ ເພື່ອໃຫ້ເຫັນແຕ່ໄກ */
export default function AccountRow({
  account,
  editable,
}: {
  account: SystemAccount
  editable: boolean
}) {
  const a = account

  return (
    <div
      className={`flex flex-wrap items-center gap-3 px-4 py-3 ${
        a.should_close ? 'bg-red-50/60 dark:bg-red-950/30' : ''
      }`}
    >
      <span className="w-32 truncate text-xs text-muted">{a.system_name}</span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-fg">{a.username}</span>
        <span className="text-xs text-muted">
          {a.employee_name ?? `ລະຫັດ ${a.employee_id}`}
          {a.department_name && ` · ${a.department_name}`}
          {a.hr_state !== 'active' && (
            <span className="ml-1 font-medium text-red-600 dark:text-red-400">
              · {HR_STATE_LABEL_LO[a.hr_state]}
            </span>
          )}
        </span>
      </span>

      <span className="w-24 text-right text-xs text-muted">
        {safeDate(a.granted_at)}
      </span>

      <span
        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ACCOUNT_STATUS_STYLE[a.status]}`}
      >
        {ACCOUNT_STATUS_LABEL_LO[a.status]}
      </span>

      {editable && a.status !== 'closed' && (
        <span className="flex gap-1.5">
          {a.status === 'active' && (
            <ActionForm action={setAccountStatus}>
              <input type="hidden" name="id" value={a.id} />
              <input type="hidden" name="status" value="suspended" />
              <SubmitButton
                className="btn-secondary rounded px-2.5 py-1 text-xs"
                pendingLabel="…"
              >
                ພັກໄວ້
              </SubmitButton>
            </ActionForm>
          )}
          <ActionForm action={setAccountStatus}>
            <input type="hidden" name="id" value={a.id} />
            <input type="hidden" name="status" value="closed" />
            <SubmitButton
              className={`rounded-lg px-3 py-1 text-xs ${
                a.should_close ? 'btn-danger' : 'btn-secondary'
              }`}
              pendingLabel="…"
            >
              ປິດບັນຊີ
            </SubmitButton>
          </ActionForm>
        </span>
      )}

      {editable && a.status === 'closed' && (
        <ActionForm action={setAccountStatus}>
          <input type="hidden" name="id" value={a.id} />
          <input type="hidden" name="status" value="active" />
          <SubmitButton
            className="rounded-lg px-3 py-1 text-xs text-muted hover:text-brand-blue"
            pendingLabel="…"
          >
            ເປີດຄືນ
          </SubmitButton>
        </ActionForm>
      )}
    </div>
  )
}

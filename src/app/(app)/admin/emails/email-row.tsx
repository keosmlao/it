'use client'

import ActionForm, { SubmitButton } from '@/components/action-form'
import { saveEmployeeEmail, setEmailEnabled } from './actions'

type Target = {
  employee_id: number
  employee_code: string
  fullname_lo: string
  line_target: string | null
  email_target: string | null
  email_enabled: boolean
}

/** ໜຶ່ງແຖວ = ໜຶ່ງຄົນ — ບັນທຶກທັນທີບໍ່ຕ້ອງກົດບັນທຶກລວມ */
export default function EmailRow({ target }: { target: Target }) {
  const t = target
  const noChannel = !t.line_target && !t.email_target

  return (
    <div
      className={`flex flex-wrap items-center gap-3 px-4 py-3 ${
        noChannel ? 'bg-brand-orange/5' : ''
      }`}
    >
      <span className="w-16 font-mono text-xs text-muted">{t.employee_code}</span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-fg">{t.fullname_lo}</span>
        <span className="text-xs text-muted">
          {t.line_target ? 'ຜູກ LINE ແລ້ວ' : 'ຍັງບໍ່ໄດ້ຜູກ LINE'}
          {noChannel && ' · ບໍ່ໄດ້ຮັບການແຈ້ງເຕືອນເລີຍ'}
        </span>
      </span>

      <ActionForm action={saveEmployeeEmail} className="flex items-center gap-2">
        <input type="hidden" name="employee_id" value={t.employee_id} />
        <input
          name="email"
          type="email"
          defaultValue={t.email_target ?? ''}
          placeholder="ຍັງບໍ່ມີອີເມວ"
          className="input w-60 rounded px-2 py-1 text-[13px]"
        />
        <SubmitButton
          className="btn-secondary rounded px-3 py-1.5 text-xs"
          pendingLabel="…"
        >
          ບັນທຶກ
        </SubmitButton>
      </ActionForm>

      {t.email_target && (
        <ActionForm action={setEmailEnabled}>
          <input type="hidden" name="employee_id" value={t.employee_id} />
          <input type="hidden" name="enabled" value={t.email_enabled ? '0' : '1'} />
          <SubmitButton
            className="rounded-lg px-3 py-1.5 text-xs text-muted hover:text-brand-blue"
            pendingLabel="…"
          >
            {t.email_enabled ? 'ປິດການສົ່ງ' : 'ເປີດການສົ່ງ'}
          </SubmitButton>
        </ActionForm>
      )}
    </div>
  )
}

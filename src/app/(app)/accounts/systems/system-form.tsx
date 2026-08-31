'use client'

import ActionForm, { SubmitButton } from '@/components/action-form'
import {
  SYSTEM_KINDS,
  SYSTEM_KIND_LABEL_LO,
  type AccountSystem,
} from '@/lib/accounts/model'
import { saveAccountSystem } from '../actions'

const field = 'input mt-1 w-full rounded px-2 py-1 text-[13px]'
const label = 'block text-xs text-muted'

export default function SystemForm({
  subscriptions,
  owners,
  system,
}: {
  subscriptions: { id: string; code: string; service_name: string }[]
  owners: { employee_id: number; fullname_lo: string }[]
  system?: AccountSystem
}) {
  const editing = Boolean(system)
  const s = system

  return (
    <ActionForm action={saveAccountSystem} className="glass-card mt-3 rounded-xl p-5">
      {editing && <input type="hidden" name="editing" value="1" />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className={label}>
          ລະຫັດລະບົບ *
          <input
            name="code"
            required
            maxLength={20}
            readOnly={editing}
            defaultValue={s?.code ?? ''}
            placeholder="GWORKSPACE"
            className={`${field} ${editing ? 'opacity-60' : ''}`}
          />
        </label>

        <label className={label}>
          ຊື່ລະບົບ *
          <input
            name="name"
            required
            maxLength={120}
            defaultValue={s?.name ?? ''}
            placeholder="Google Workspace"
            className={field}
          />
        </label>

        <label className={label}>
          ປະເພດ *
          <select name="kind" required defaultValue={s?.kind ?? 'app'} className={field}>
            {SYSTEM_KINDS.map((k) => (
              <option key={k} value={k}>
                {SYSTEM_KIND_LABEL_LO[k]}
              </option>
            ))}
          </select>
        </label>

        <label className={label}>
          ຈຳນວນ seat ທີ່ຈ່າຍ
          <input
            name="seat_limit"
            type="number"
            min={0}
            defaultValue={s?.seat_limit ?? ''}
            className={field}
          />
          <span className="mt-1 block text-[11px] text-faint">
            ໃສ່ໄວ້ແລ້ວລະບົບຈະເຕືອນເມື່ອໃຊ້ເກີນ
          </span>
        </label>

        <label className={label}>
          ສັນຍາເຊົ່າທີ່ຈ່າຍ
          <select
            name="subscription_id"
            defaultValue={s?.subscription_id ?? ''}
            className={field}
          >
            <option value="">— ບໍ່ຜູກ —</option>
            {subscriptions.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.service_name}
              </option>
            ))}
          </select>
        </label>

        <label className={label}>
          ຜູ້ດູແລລະບົບ
          <select
            name="owner_employee_id"
            defaultValue={s?.owner_employee_id ? String(s.owner_employee_id) : ''}
            className={field}
          >
            <option value="">— ບໍ່ລະບຸ —</option>
            {owners.map((o) => (
              <option key={o.employee_id} value={o.employee_id}>
                {o.fullname_lo}
              </option>
            ))}
          </select>
        </label>

        <label className={`${label} sm:col-span-2 lg:col-span-3`}>
          ໝາຍເຫດ
          <input
            name="note"
            maxLength={300}
            defaultValue={s?.note ?? ''}
            className={field}
          />
        </label>
      </div>

      <SubmitButton className="btn-primary mt-4 rounded px-3 py-1.5 text-[13px] font-medium">
        {editing ? 'ບັນທຶກ' : 'ເພີ່ມລະບົບ'}
      </SubmitButton>
    </ActionForm>
  )
}

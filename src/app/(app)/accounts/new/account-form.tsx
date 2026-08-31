'use client'

import ActionForm, { SubmitButton } from '@/components/action-form'
import type { AccountSystem } from '@/lib/accounts/model'
import { createAccount } from '../actions'

const field = 'input mt-1 w-full rounded px-2 py-1 text-[13px]'
const label = 'block text-xs text-muted'

type Employee = {
  employee_id: number
  employee_code: string
  fullname_lo: string
  department_name: string | null
}

export default function AccountForm({
  systems,
  employees,
}: {
  systems: AccountSystem[]
  employees: Employee[]
}) {
  return (
    <ActionForm action={createAccount} className="glass-card mt-4 rounded-xl p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>
          ລະບົບ *
          <select name="system_code" required defaultValue="" className={field}>
            <option value="" disabled>
              — ເລືອກລະບົບ —
            </option>
            {systems.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
                {s.seat_limit !== null && ` (ໃຊ້ ${s.active_count}/${s.seat_limit})`}
              </option>
            ))}
          </select>
        </label>

        <label className={label}>
          ພະນັກງານ *
          <select name="employee_id" required defaultValue="" className={field}>
            <option value="" disabled>
              — ເລືອກພະນັກງານ —
            </option>
            {employees.map((e) => (
              <option key={e.employee_id} value={e.employee_id}>
                {e.fullname_lo}
                {e.department_name ? ` · ${e.department_name}` : ''}
              </option>
            ))}
          </select>
        </label>

        <label className={label}>
          ຊື່ບັນຊີ (username) *
          <input
            name="username"
            required
            maxLength={150}
            placeholder="somchai@odien.net"
            className={field}
          />
        </label>

        <label className={label}>
          ເປີດໃຫ້ເມື່ອ
          <input type="date" name="granted_at" defaultValue={todayISOClient()} className={field} />
        </label>

        <label className={`${label} sm:col-span-2`}>
          ໝາຍເຫດ
          <input
            name="note"
            maxLength={300}
            placeholder="ສິດທີ່ໃຫ້ · ໃຜອະນຸມັດ"
            className={field}
          />
        </label>
      </div>

      <p className="mt-4 rounded-lg bg-red-50 px-4 py-2.5 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
        ⚠️ ຢ່າປ້ອນລະຫັດຜ່ານ — ໃຫ້ເກັບໄວ້ໃນຕົວຈັດການລະຫັດຜ່ານແທນ
      </p>

      <SubmitButton className="btn-primary mt-4 rounded px-3 py-1.5 text-[13px] font-medium">
        ບັນທຶກບັນຊີ
      </SubmitButton>
    </ActionForm>
  )
}

function todayISOClient(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Vientiane' }).format(
    new Date()
  )
}

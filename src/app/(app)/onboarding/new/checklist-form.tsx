'use client'

import ActionForm, { SubmitButton } from '@/components/action-form'
import { CHECKLIST_KINDS, CHECKLIST_KIND_LABEL_LO } from '@/lib/accounts/model'
import { createChecklist } from '../actions'

const field = 'input mt-1 w-full rounded-lg px-3 py-2 text-sm'
const label = 'block text-xs text-muted'

type Employee = {
  employee_id: number
  fullname_lo: string
  department_name: string | null
  employment_status: string | null
}

export default function ChecklistForm({
  employees,
  counts,
}: {
  employees: Employee[]
  counts: { onboard: number; offboard: number }
}) {
  return (
    <ActionForm action={createChecklist} className="glass-card mt-4 rounded-xl p-5">
      <div className="grid gap-4 sm:grid-cols-2">
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
                {e.employment_status !== 'ACTIVE' ? ' (ອອກແລ້ວ)' : ''}
              </option>
            ))}
          </select>
        </label>

        <label className={label}>
          ປະເພດ *
          <select name="kind" required defaultValue="onboard" className={field}>
            {CHECKLIST_KINDS.map((k) => (
              <option key={k} value={k}>
                {CHECKLIST_KIND_LABEL_LO[k]} ({counts[k]} ຂັ້ນຕອນ)
              </option>
            ))}
          </select>
        </label>

        <label className={label}>
          ຄວນເຮັດໃຫ້ແລ້ວກ່ອນ
          <input type="date" name="target_date" className={field} />
        </label>

        <label className={label}>
          ໝາຍເຫດ
          <input name="note" maxLength={500} className={field} />
        </label>
      </div>

      <SubmitButton className="btn-primary mt-4 rounded-lg px-5 py-2 text-sm font-medium">
        ເລີ່ມຂັ້ນຕອນ
      </SubmitButton>
    </ActionForm>
  )
}

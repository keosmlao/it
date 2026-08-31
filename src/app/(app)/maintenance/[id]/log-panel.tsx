'use client'

import ActionForm, { SubmitButton } from '@/components/action-form'
import {
  PM_RESULTS,
  PM_RESULT_LABEL_LO,
  type MaintenancePlan,
} from '@/lib/maintenance/model'
import { logMaintenance, setMaintenanceActive } from '../actions'

const field = 'input mt-1 w-full rounded px-2 py-1 text-[13px]'
const label = 'block text-xs text-muted'

/** ບັນທຶກວ່າເຮັດແລ້ວ — ບັນທຶກເທື່ອດຽວ ກຳນົດຄັ້ງຕໍ່ໄປເລື່ອນເອງ */
export default function LogPanel({
  plan,
  today,
}: {
  plan: MaintenancePlan
  today: string
}) {
  return (
    <div className="glass-card mt-4 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-fg">ບັນທຶກການເຮັດວຽກ</h2>
      <p className="mt-0.5 text-xs text-muted">
        ບັນທຶກແລ້ວກຳນົດຄັ້ງຕໍ່ໄປຈະເລື່ອນເປັນ {plan.interval_days} ວັນ
        ນັບຈາກມື້ທີ່ເຮັດແທ້
      </p>

      <ActionForm action={logMaintenance} className="mt-3">
        <input type="hidden" name="id" value={plan.id} />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className={label}>
            ວັນທີເຮັດ *
            <input
              type="date"
              name="performed_at"
              required
              defaultValue={today}
              className={field}
            />
          </label>

          <label className={label}>
            ຜົນ *
            <select name="result" defaultValue="ok" className={field}>
              {PM_RESULTS.map((r) => (
                <option key={r} value={r}>
                  {PM_RESULT_LABEL_LO[r]}
                </option>
              ))}
            </select>
          </label>

          <label className={label}>
            ໃຊ້ເວລາ (ນາທີ)
            <input
              name="minutes"
              type="number"
              min={0}
              max={10000}
              className={field}
            />
          </label>

          <label className={`${label} sm:col-span-2 lg:col-span-4`}>
            ບັນທຶກ
            <textarea
              name="note"
              rows={2}
              placeholder="ພົບຫຍັງ ເຮັດຫຍັງໄປແດ່ — ຖ້າເລືອກ ‘ພົບບັນຫາ’ ຕ້ອງຂຽນ"
              className={field}
            />
          </label>
        </div>

        <SubmitButton className="btn-primary mt-3 rounded px-3 py-1.5 text-[13px] font-medium">
          ບັນທຶກວ່າເຮັດແລ້ວ
        </SubmitButton>
      </ActionForm>

      <div className="mt-5 border-t border-line pt-4">
        <ActionForm action={setMaintenanceActive}>
          <input type="hidden" name="id" value={plan.id} />
          <input type="hidden" name="is_active" value={plan.is_active ? '0' : '1'} />
          <SubmitButton
            className={`rounded-lg px-4 py-2 text-sm ${
              plan.is_active ? 'btn-danger' : 'btn-secondary'
            }`}
          >
            {plan.is_active ? 'ປິດແຜນນີ້ໄວ້' : 'ເປີດແຜນຄືນ'}
          </SubmitButton>
        </ActionForm>
      </div>
    </div>
  )
}

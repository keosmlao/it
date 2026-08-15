'use client'

import ActionForm, { SubmitButton } from '@/components/action-form'
import { resolveIncident } from '../actions'

const field = 'input mt-1 w-full rounded-lg px-3 py-2 text-sm'
const label = 'block text-xs text-muted'

/** ປຸ່ມດ່ວນຕອນລະບົບກັບມາໃຊ້ໄດ້ — ສາເຫດຕື່ມພາຍຫຼັງໄດ້ */
export default function ResolvePanel({ id, now }: { id: string; now: string }) {
  return (
    <div className="glass-card mt-4 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-fg">ປິດເຫດຂັດຂ້ອງ</h2>
      <p className="mt-0.5 text-xs text-muted">
        ບັນທຶກເວລາທີ່ກັບມາໃຊ້ໄດ້ກ່ອນ — ສາເຫດ ແລະ ວິທີກັນເກີດຄືນ ກັບມາຂຽນຕື່ມພາຍຫຼັງໄດ້
      </p>

      <ActionForm action={resolveIncident} className="mt-3">
        <input type="hidden" name="id" value={id} />

        <div className="grid gap-3 sm:grid-cols-2">
          <label className={label}>
            ກັບມາໃຊ້ໄດ້ເມື່ອ *
            <input
              type="datetime-local"
              name="resolved_at"
              required
              defaultValue={now}
              className={field}
            />
          </label>

          <label className={label}>
            ແກ້ໄຂແນວໃດ
            <input
              name="action"
              maxLength={4000}
              placeholder="ຣີສະຕາດ router / ຜູ້ໃຫ້ບໍລິການແກ້ໃຫ້"
              className={field}
            />
          </label>
        </div>

        <SubmitButton className="btn-primary mt-3 rounded-lg px-5 py-2 text-sm font-medium">
          ປິດເຫດຂັດຂ້ອງ
        </SubmitButton>
      </ActionForm>
    </div>
  )
}

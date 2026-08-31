import ActionForm, { SubmitButton } from '@/components/action-form'
import { query } from '@/lib/db'
import { requireMenuView } from '@/lib/auth/session'
import { getApprovalSteps } from '@/lib/purchase/queries'
import { Panel } from '../panel'
import { savePrStep, togglePrStep } from '../actions'

export const metadata = { title: 'ຂັ້ນຕອນອະນຸມັດ PR' }

/** ຂັ້ນຕອນອະນຸມັດໃບສະເໜີຊື້ — ຕັ້ງຕາມລະບຽບຈິງໂດຍບໍ່ຕ້ອງແກ້ໂປຣແກຣມ */
export default async function PurchaseStepsPage() {
  await requireMenuView('/admin/purchase-steps')

  const [prSteps, staff] = await Promise.all([
    getApprovalSteps(),
    query<{ employee_id: number; fullname_lo: string }>(
      'select employee_id, fullname_lo from it.v_it_staff order by employee_code'
    ),
  ])

  return (
    <div className="w-full">
      <Panel
        title="ຂັ້ນຕອນອະນຸມັດໃບສະເໜີຊື້"
        hint='ໃບສະເໜີຊື້ຈະຜ່ານຂັ້ນເຫຼົ່ານີ້ຕາມລຳດັບ · ຕັ້ງ "ມູນຄ່າຕັ້ງແຕ່" ໄວ້ ຖ້າຂັ້ນນັ້ນໃຊ້ສະເພາະໃບໃຫຍ່'
      >
        <div className="o-list-wrap overflow-x-auto">
          <table className="o-list w-full min-w-[620px] text-[13px]">
            <thead>
              <tr>
                <th className="px-3 py-1.5 text-left font-medium">ຂັ້ນ</th>
                <th className="px-3 py-1.5 text-left font-medium">ຊື່ຂັ້ນ</th>
                <th className="px-3 py-1.5 text-left font-medium">ຜູ້ອະນຸມັດ</th>
                <th className="px-3 py-1.5 text-right font-medium">ມູນຄ່າຕັ້ງແຕ່</th>
                <th className="px-3 py-1.5 text-left font-medium">ສະຖານະ</th>
                <th className="px-3 py-1.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {prSteps.map((s) => (
                <tr key={s.step_no} className="hover-surface transition">
                  <td className="px-3 py-1.5 text-muted">{s.step_no}</td>
                  <td className="px-3 py-1.5 text-fg">{s.name_lo}</td>
                  <td className="px-3 py-1.5 text-body">
                    {s.approver_name ??
                      (s.approver_role === 'manager'
                        ? 'ຜູ້ຈັດການ (ຜູ້ໃດກໍໄດ້)'
                        : 'ຫົວໜ້າໜ່ວຍງານ')}
                  </td>
                  <td className="px-3 py-1.5 text-right text-body">
                    {Number(s.min_amount) > 0
                      ? Number(s.min_amount).toLocaleString('lo-LA')
                      : 'ທຸກໃບ'}
                  </td>
                  <td className="px-3 py-1.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        s.is_active
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-slate-100 text-muted dark:bg-white/5'
                      }`}
                    >
                      {s.is_active ? 'ໃຊ້ຢູ່' : 'ປິດ'}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <div className="flex justify-end gap-3">
                      <ActionForm action={togglePrStep}>
                        <input type="hidden" name="step_no" value={s.step_no} />
                        <SubmitButton
                          pendingLabel="…"
                          className="text-xs text-muted hover:underline"
                        >
                          {s.is_active ? 'ປິດ' : 'ເປີດ'}
                        </SubmitButton>
                      </ActionForm>
                      <ActionForm action={togglePrStep}>
                        <input type="hidden" name="step_no" value={s.step_no} />
                        <input type="hidden" name="mode" value="delete" />
                        <SubmitButton
                          pendingLabel="…"
                          className="text-xs text-red-600 hover:underline dark:text-red-400"
                        >
                          ລຶບ
                        </SubmitButton>
                      </ActionForm>
                    </div>
                  </td>
                </tr>
              ))}

              {prSteps.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-muted">
                    ຍັງບໍ່ໄດ້ຕັ້ງຂັ້ນຕອນ — ໃບສະເໜີຊື້ຈະສົ່ງອະນຸມັດບໍ່ໄດ້
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <ActionForm
          action={savePrStep}
          className="mt-3 flex flex-wrap items-end gap-3 border-t border-line pt-3"
        >
          <label className="flex flex-col gap-1 text-xs text-muted">
            ຂັ້ນທີ *
            <input
              type="number"
              name="step_no"
              min="1"
              required
              defaultValue={prSteps.length + 1}
              className="input w-20 rounded px-2 py-1 text-[13px]"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            ຊື່ຂັ້ນ *
            <input
              name="name_lo"
              required
              placeholder="ຫົວໜ້າພະແນກບັນຊີ"
              className="input w-52 rounded px-2 py-1 text-[13px]"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            ບົດບາດຜູ້ອະນຸມັດ
            <select
              name="approver_role"
              defaultValue="head"
              className="input w-40 rounded px-2 py-1 text-[13px]"
            >
              <option value="head">ຫົວໜ້າໜ່ວຍງານ</option>
              <option value="manager">ຜູ້ຈັດການ</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            ຫຼື ລະບຸຄົນ
            <select
              name="approver_employee_id"
              defaultValue=""
              className="input w-52 rounded px-2 py-1 text-[13px]"
            >
              <option value="">— ໃຊ້ບົດບາດ —</option>
              {staff.map((s) => (
                <option key={s.employee_id} value={s.employee_id}>
                  {s.fullname_lo}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            ມູນຄ່າຕັ້ງແຕ່
            <input
              name="min_amount"
              inputMode="numeric"
              defaultValue="0"
              className="input w-36 rounded px-2 py-1 text-[13px]"
            />
          </label>
          <SubmitButton className="btn-primary rounded px-3 py-1.5 text-[13px] font-medium">
            ບັນທຶກຂັ້ນ
          </SubmitButton>
        </ActionForm>
      </Panel>
    </div>
  )
}

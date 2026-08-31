import Link from 'next/link'
import { notFound } from 'next/navigation'
import ActionForm, { SubmitButton } from '@/components/action-form'
import { requireModuleView } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import {
  canDecideStep,
  canEditPr,
  getPurchaseApprovals,
  getPurchaseLines,
  getPurchaseRequest,
  getStepsForAmount,
} from '@/lib/purchase/queries'
import { PrStatusBadge } from '@/components/pr-badge'
import { amountInWords } from '@/lib/purchase/model'
import { formatMoney, safeDate } from '@/lib/assets/model'
import { formatDateTime } from '@/lib/format'
import {
  addPurchaseLine,
  cancelPurchaseRequest,
  decidePurchaseRequest,
  deletePurchaseLine,
  markPurchaseOrdered,
  markPurchaseReceived,
  submitPurchaseRequest,
} from '../actions'

export default async function PurchaseDetailPage({
  params,
}: PageProps<'/purchase/[id]'>) {
  const { id } = await params
  const user = await requireModuleView('purchase')

  const pr = await getPurchaseRequest(id)
  if (!pr) notFound()

  const [lines, approvals, steps] = await Promise.all([
    getPurchaseLines(id),
    getPurchaseApprovals(id),
    getStepsForAmount(Number(pr.total_est)),
  ])

  const currentStep = steps.find((s) => s.step_no === pr.current_step)
  const editable = canEditPr(user, pr)
  const decidable = canDecideStep(user, pr, currentStep)
  const submittable =
    pr.status === 'draft' &&
    (pr.requester_employee_id === user.employee_id || user.role === 'manager')
  const cancellable =
    !pr.is_finished &&
    (pr.requester_employee_id === user.employee_id || user.role === 'manager')
  const orderable = pr.status === 'approved' && can.approve(user)
  const receivable = pr.status === 'ordered' || pr.status === 'approved'

  return (
    <div className="w-full">
      <div className="o-page-actions">
        <Link
          href="/purchase"
          className="text-sm text-muted underline-offset-2 hover:underline"
        >
          ← ກັບໄປລາຍການໃບສະເໜີຊື້
        </Link>
        <Link
          href={`/purchase/${pr.id}/print`}
          className="btn-secondary rounded px-3 py-1.5 text-[13px]"
        >
          🖶 ພິມຟອມ
        </Link>
      </div>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-sm text-muted">{pr.pr_no}</p>
          <h1 className="text-2xl font-semibold text-fg">{pr.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <PrStatusBadge status={pr.status} />
            <span className="text-sm text-muted">
              {pr.requester_name}
              {pr.department_name && ` · ${pr.department_name}`} ·{' '}
              {safeDate(pr.doc_date as string)}
              {pr.need_date && ` · ຕ້ອງການພາຍໃນ ${safeDate(pr.need_date as string)}`}
            </span>
          </div>
        </div>

        <div className="text-right">
          <p className="text-xs text-muted">ມູນຄ່າປະມານ</p>
          <p className="text-xl font-semibold text-fg">
            {formatMoney(pr.total_est)}{' '}
            <span className="text-sm font-normal text-muted">{pr.currency}</span>
          </p>
        </div>
      </header>

      <section className="glass-card mt-5 grid gap-4 rounded-xl p-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="ເຫດຜົນ / ຄວາມຈຳເປັນ" value={pr.purpose} wide />
        <Field
          label="ຜູ້ຈຳໜ່າຍ"
          value={
            pr.supplier_name
              ? `${pr.supplier_name} (${pr.supplier_code})`
              : pr.supplier_suggestion
          }
        />
        <Field label="ເອກະສານອ້າງອີງ" value={pr.doc_ref} />
        <Field label="ບ່ອນສົ່ງມອບ" value={pr.delivery_place} />
        <Field label="ງົບປະມານ" value={pr.budget_note} />
        <Field label="ໝາຍເຫດ" value={pr.erp_note} />
      </section>

      {pr.status === 'rejected' && pr.reject_reason && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          ເຫດຜົນທີ່ບໍ່ອະນຸມັດ: {pr.reject_reason}
        </p>
      )}

      {/* ---------- ລາຍການ ---------- */}
      <section className="o-list-wrap mt-3 overflow-x-auto">
        <table className="o-list w-full text-[13px]">
          <thead className="border-b border-line text-left text-muted">
            <tr>
              <th className="px-3 py-1.5 font-medium">#</th>
              <th className="px-3 py-1.5 font-medium">ລາຍການ</th>
              <th className="px-3 py-1.5 text-right font-medium">ຈຳນວນ</th>
              <th className="px-3 py-1.5 text-right font-medium">ລາຄາ</th>
              <th className="px-3 py-1.5 text-right font-medium">ສ່ວນຫຼຸດ</th>
              <th className="px-3 py-1.5 text-right font-medium">ຈຳນວນເງິນ</th>
              {editable && <th className="px-3 py-1.5" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {lines.map((line) => (
              <tr key={line.id}>
                <td className="px-3 py-1.5 text-muted">{line.line_no}</td>
                <td className="px-3 py-1.5">
                  <span className="text-fg">{line.item_name}</span>
                  {line.item_code && (
                    <span className="ml-2 font-mono text-xs text-muted">
                      {line.item_code}
                    </span>
                  )}
                  {line.spec && (
                    <div className="text-xs whitespace-pre-wrap text-muted">
                      {line.spec}
                    </div>
                  )}
                  {line.note && <div className="text-xs text-faint">{line.note}</div>}
                </td>
                <td className="px-3 py-1.5 text-right whitespace-nowrap text-body">
                  {Number(line.qty).toLocaleString('lo-LA')}
                  {line.unit && (
                    <span className="ml-1 text-xs text-muted">{line.unit}</span>
                  )}
                </td>
                <td className="px-3 py-1.5 text-right whitespace-nowrap text-body">
                  {formatMoney(line.est_price)}
                </td>
                <td className="px-3 py-1.5 text-right whitespace-nowrap text-muted">
                  {Number(line.discount) > 0 ? formatMoney(line.discount) : '—'}
                </td>
                <td className="px-3 py-1.5 text-right whitespace-nowrap text-fg">
                  {formatMoney(line.line_total)}
                </td>
                {editable && (
                  <td className="px-3 py-1.5 text-right">
                    <ActionForm action={deletePurchaseLine}>
                      <input type="hidden" name="pr_id" value={pr.id} />
                      <input type="hidden" name="line_id" value={line.id} />
                      <SubmitButton
                        pendingLabel="…"
                        className="text-xs text-red-600 hover:underline dark:text-red-400"
                      >
                        ລຶບ
                      </SubmitButton>
                    </ActionForm>
                  </td>
                )}
              </tr>
            ))}

            {lines.length === 0 && (
              <tr>
                <td
                  colSpan={editable ? 7 : 6}
                  className="px-4 py-8 text-center text-muted"
                >
                  ຍັງບໍ່ມີລາຍການ
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ---------- ທ້າຍບິນແບບ SML ---------- */}
        <div className="flex justify-end border-t border-line bg-brand-blue/5 px-4 py-4">
          <dl className="w-full max-w-xs space-y-1.5 text-sm">
            <Total label="ລວມເປັນເງິນ" value={pr.total_before_discount} />
            {Number(pr.discount_amount) > 0 && (
              <>
                <Total label="ສ່ວນຫຼຸດທ້າຍບິນ" value={pr.discount_amount} minus />
                <Total label="ມູນຄ່າຫຼັງຫັກສ່ວນຫຼຸດ" value={pr.total_after_discount} />
              </>
            )}
            {Number(pr.vat_rate) > 0 && (
              <Total
                label={`ພາສີມູນຄ່າເພີ່ມ ${Number(pr.vat_rate)}%`}
                value={pr.vat_amount}
              />
            )}
            <div className="flex items-center justify-between gap-3 border-t border-line pt-2">
              <dt className="font-semibold text-fg">ລວມທັງສິ້ນ</dt>
              <dd className="text-lg font-semibold text-fg">
                {formatMoney(pr.total_est)}{' '}
                <span className="text-xs font-normal text-muted">{pr.currency}</span>
              </dd>
            </div>
            <p className="pt-1 text-right text-xs text-muted">
              ({amountInWords(Number(pr.total_est))} {pr.currency})
            </p>
          </dl>
        </div>
      </section>

      {editable && (
        <section className="glass-card mt-4 rounded-xl p-4">
          <h2 className="mb-3 text-sm font-semibold text-fg">ເພີ່ມລາຍການ</h2>
          <ActionForm
            action={addPurchaseLine}
            className="flex flex-wrap items-end gap-3"
          >
            <input type="hidden" name="pr_id" value={pr.id} />
            <label className="flex flex-col gap-1 text-xs text-muted">
              ຊື່ລາຍການ *
              <input
                name="item_name"
                required
                className="input w-60 rounded px-2 py-1 text-[13px]"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">
              ສະເປັກ
              <input name="spec" className="input w-52 rounded px-2 py-1 text-[13px]" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">
              ຫົວໜ່ວຍ
              <input name="unit" className="input w-24 rounded px-2 py-1 text-[13px]" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">
              ຈຳນວນ *
              <input
                type="number"
                name="qty"
                min="0.01"
                step="0.01"
                defaultValue={1}
                required
                className="input w-24 rounded px-2 py-1 text-[13px]"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">
              ລາຄາ/ຫົວໜ່ວຍ
              <input
                name="est_price"
                inputMode="numeric"
                className="input w-36 rounded px-2 py-1 text-[13px]"
              />
            </label>
            <SubmitButton className="btn-secondary rounded px-3 py-1.5 text-[13px]">
              + ເພີ່ມ
            </SubmitButton>
          </ActionForm>
        </section>
      )}

      {/* ---------- ຂັ້ນຕອນອະນຸມັດ ---------- */}
      <section className="glass-card mt-4 rounded-xl p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-fg">ຂັ້ນຕອນການອະນຸມັດ</h2>
          {can.administer(user) && (
            <Link href="/admin#pr-steps" className="text-xs text-muted hover:underline">
              ຕັ້ງຄ່າຂັ້ນຕອນ →
            </Link>
          )}
        </div>

        <ol className="space-y-3">
          {steps.map((step) => {
            const done = approvals.find((a) => a.step_no === step.step_no)
            const active = pr.status === 'submitted' && pr.current_step === step.step_no
            return (
              <li key={step.step_no} className="flex gap-3">
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                    done
                      ? done.decision === 'approved'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-red-600 text-white'
                      : active
                        ? 'bg-brand-orange text-white'
                        : 'bg-slate-200 text-muted dark:bg-slate-800'
                  }`}
                >
                  {step.step_no}
                </span>
                <div>
                  <p className="text-sm font-medium text-fg">
                    {step.name_lo}
                    {step.approver_name && (
                      <span className="ml-2 text-xs font-normal text-muted">
                        {step.approver_name}
                      </span>
                    )}
                  </p>
                  {done ? (
                    <p className="text-xs text-muted">
                      {done.decision === 'approved' ? 'ອະນຸມັດ' : 'ບໍ່ອະນຸມັດ'} ໂດຍ{' '}
                      {done.approver_name} · {formatDateTime(done.decided_at)}
                      {done.note && ` — ${done.note}`}
                    </p>
                  ) : (
                    <p className="text-xs text-faint">
                      {active ? 'ກຳລັງລໍຂັ້ນນີ້' : 'ລໍຖ້າ'}
                      {Number(step.min_amount) > 0 &&
                        ` · ໃຊ້ກັບໃບຕັ້ງແຕ່ ${formatMoney(step.min_amount)} ຂຶ້ນໄປ`}
                    </p>
                  )}
                </div>
              </li>
            )
          })}

          {steps.length === 0 && (
            <li className="text-sm text-brand-orange">
              ຍັງບໍ່ໄດ້ຕັ້ງຂັ້ນຕອນອະນຸມັດ — ໃຫ້ຜູ້ຈັດການຕັ້ງຢູ່ໜ້າຕັ້ງຄ່າກ່ອນ
            </li>
          )}
        </ol>

        {pr.po_no && (
          <p className="mt-3 text-sm text-muted">
            ເລກ PO: <span className="font-mono text-body">{pr.po_no}</span>
          </p>
        )}
      </section>

      {decidable && (
        <section className="glass-card mt-4 rounded-xl p-4">
          <h2 className="mb-3 text-sm font-semibold text-fg">
            ຕັດສິນຂັ້ນ {currentStep?.step_no} — {currentStep?.name_lo}
          </h2>
          <ActionForm action={decidePurchaseRequest} className="space-y-3">
            <input type="hidden" name="pr_id" value={pr.id} />
            <textarea
              name="note"
              rows={3}
              placeholder="ຄຳເຫັນ (ບັງຄັບເມື່ອບໍ່ອະນຸມັດ)"
              className="input w-full rounded px-2 py-1 text-[13px]"
            />
            <div className="flex gap-2">
              <SubmitButton
                name="decision"
                value="approved"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
              >
                ອະນຸມັດ
              </SubmitButton>
              <SubmitButton
                name="decision"
                value="rejected"
                className="btn-danger rounded px-3 py-1.5 text-[13px] font-medium"
              >
                ບໍ່ອະນຸມັດ
              </SubmitButton>
            </div>
          </ActionForm>
        </section>
      )}

      {orderable && (
        <section className="glass-card mt-4 rounded-xl p-4">
          <h2 className="mb-3 text-sm font-semibold text-fg">ບັນທຶກເລກໃບສັ່ງຊື້ (PO)</h2>
          <ActionForm
            action={markPurchaseOrdered}
            className="flex flex-wrap items-end gap-3"
          >
            <input type="hidden" name="pr_id" value={pr.id} />
            <label className="flex flex-col gap-1 text-xs text-muted">
              ເລກ PO *
              <input
                name="po_no"
                required
                className="input w-56 rounded px-2 py-1 text-[13px]"
              />
            </label>
            <SubmitButton className="btn-primary rounded px-3 py-1.5 text-[13px] font-medium">
              ບັນທຶກ
            </SubmitButton>
          </ActionForm>
        </section>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {submittable && (
          <ActionForm action={submitPurchaseRequest}>
            <input type="hidden" name="pr_id" value={pr.id} />
            <SubmitButton className="btn-primary rounded px-3 py-1.5 text-[13px] font-medium">
              ສົ່ງອະນຸມັດ
            </SubmitButton>
          </ActionForm>
        )}

        {receivable && (
          <ActionForm action={markPurchaseReceived}>
            <input type="hidden" name="pr_id" value={pr.id} />
            <SubmitButton className="btn-secondary rounded px-3 py-1.5 text-[13px]">
              ຮັບເຄື່ອງແລ້ວ
            </SubmitButton>
          </ActionForm>
        )}

        {cancellable && (
          <ActionForm action={cancelPurchaseRequest}>
            <input type="hidden" name="pr_id" value={pr.id} />
            <SubmitButton className="btn-secondary rounded px-3 py-1.5 text-[13px]">
              ຍົກເລີກໃບນີ້
            </SubmitButton>
          </ActionForm>
        )}
      </div>

      <p className="mt-4 text-xs text-faint">
        ສ້າງເມື່ອ {formatDateTime(pr.created_at)}
        {pr.approved_by_name &&
          ` · ອະນຸມັດສຸດທ້າຍໂດຍ ${pr.approved_by_name} ${formatDateTime(pr.approved_at)}`}
        {' · ເກັບຢູ່ຕາຕະລາງ PR ຂອງ ERP (odg_pm_pr)'}
      </p>
    </div>
  )
}

function Total({
  label,
  value,
  minus,
}: {
  label: string
  value: string
  minus?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-body">
        {minus && '−'}
        {formatMoney(value)}
      </dd>
    </div>
  )
}

function Field({
  label,
  value,
  wide,
}: {
  label: string
  value: string | null
  wide?: boolean
}) {
  if (!value) return null
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <p className="text-xs text-muted">{label}</p>
      <p className="whitespace-pre-wrap text-body">{value}</p>
    </div>
  )
}

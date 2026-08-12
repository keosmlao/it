import Link from 'next/link'
import { notFound } from 'next/navigation'
import ActionForm, { SubmitButton } from '@/components/action-form'
import { requireUser } from '@/lib/auth/session'
import {
  canDecidePr,
  canEditPr,
  getPurchaseApprovals,
  getPurchaseLines,
  getPurchaseRequest,
} from '@/lib/purchase/queries'
import { PrStatusBadge } from '@/components/pr-badge'
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
  const user = await requireUser()

  const pr = await getPurchaseRequest(id)
  if (!pr) notFound()

  const [lines, approvals] = await Promise.all([
    getPurchaseLines(id),
    getPurchaseApprovals(id),
  ])

  const editable = canEditPr(user, pr)
  const decidable = canDecidePr(user, pr)
  const submittable =
    pr.status === 'draft' &&
    (pr.requester_employee_id === user.employee_id || user.role === 'manager')
  const cancellable =
    !pr.is_finished &&
    (pr.requester_employee_id === user.employee_id || user.role === 'manager')
  const orderable =
    pr.status === 'approved' && (user.role === 'manager' || user.role === 'head')
  const receivable = pr.status === 'ordered' || pr.status === 'approved'

  return (
    <div className="w-full">
      <Link
        href="/purchase"
        className="text-sm text-muted underline-offset-2 hover:underline"
      >
        ← ກັບໄປລາຍການໃບສະເໜີຊື້
      </Link>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-sm text-muted">{pr.pr_no}</p>
          <h1 className="text-2xl font-semibold text-fg">{pr.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <PrStatusBadge status={pr.status} />
            <span className="text-sm text-muted">
              {pr.requester_name}
              {pr.department_name && ` · ${pr.department_name}`} ·{' '}
              {safeDate(pr.doc_date)}
              {pr.need_date && ` · ຕ້ອງການພາຍໃນ ${safeDate(pr.need_date)}`}
            </span>
          </div>
        </div>

        <div className="text-right">
          <p className="text-xs text-muted">ມູນຄ່າປະມານ</p>
          <p className="text-xl font-semibold text-fg">
            {formatMoney(pr.total_est)}{' '}
            <span className="text-sm font-normal text-muted">ກີບ</span>
          </p>
        </div>
      </header>

      {pr.purpose && (
        <section className="glass-card mt-5 rounded-xl p-4">
          <h2 className="mb-2 text-sm font-semibold text-fg">ເຫດຜົນ / ຄວາມຈຳເປັນ</h2>
          <p className="whitespace-pre-wrap text-body">{pr.purpose}</p>
        </section>
      )}

      {pr.status === 'rejected' && pr.reject_reason && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          ເຫດຜົນທີ່ບໍ່ອະນຸມັດ: {pr.reject_reason}
        </p>
      )}

      {/* ---------- ລາຍການ ---------- */}
      <section className="glass-card mt-4 overflow-x-auto rounded-xl">
        <table className="w-full text-sm">
          <thead className="border-b border-line text-left text-muted">
            <tr>
              <th className="px-4 py-2.5 font-medium">#</th>
              <th className="px-4 py-2.5 font-medium">ລາຍການ</th>
              <th className="px-4 py-2.5 text-right font-medium">ຈຳນວນ</th>
              <th className="px-4 py-2.5 text-right font-medium">ລາຄາ/ຫົວໜ່ວຍ</th>
              <th className="px-4 py-2.5 text-right font-medium">ລວມ</th>
              {editable && <th className="px-4 py-2.5" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {lines.map((line) => (
              <tr key={line.id}>
                <td className="px-4 py-2.5 text-muted">{line.line_no}</td>
                <td className="px-4 py-2.5">
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
                  {line.note && (
                    <div className="text-xs text-faint">{line.note}</div>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap text-body">
                  {Number(line.qty).toLocaleString('lo-LA')}
                  {line.unit && (
                    <span className="ml-1 text-xs text-muted">{line.unit}</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap text-body">
                  {formatMoney(line.est_price)}
                </td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap text-fg">
                  {formatMoney(
                    String(Number(line.qty) * Number(line.est_price ?? 0))
                  )}
                </td>
                {editable && (
                  <td className="px-4 py-2.5 text-right">
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
                <td colSpan={editable ? 6 : 5} className="px-4 py-8 text-center text-muted">
                  ຍັງບໍ່ມີລາຍການ
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="border-t border-line">
            <tr>
              <td colSpan={4} className="px-4 py-2.5 text-right text-sm text-muted">
                ລວມທັງໝົດ
              </td>
              <td className="px-4 py-2.5 text-right font-semibold text-fg">
                {formatMoney(pr.total_est)}
              </td>
              {editable && <td />}
            </tr>
          </tfoot>
        </table>
      </section>

      {editable && (
        <section className="glass-card mt-4 rounded-xl p-4">
          <h2 className="mb-3 text-sm font-semibold text-fg">ເພີ່ມລາຍການ</h2>
          <ActionForm action={addPurchaseLine} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="pr_id" value={pr.id} />
            <label className="flex flex-col gap-1 text-xs text-muted">
              ຊື່ລາຍການ *
              <input
                name="item_name"
                required
                className="input w-64 rounded-lg px-3 py-1.5 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">
              ສະເປັກ
              <input name="spec" className="input w-56 rounded-lg px-3 py-1.5 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">
              ຫົວໜ່ວຍ
              <input name="unit" className="input w-24 rounded-lg px-3 py-1.5 text-sm" />
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
                className="input w-24 rounded-lg px-3 py-1.5 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">
              ລາຄາ/ຫົວໜ່ວຍ
              <input
                name="est_price"
                inputMode="numeric"
                className="input w-36 rounded-lg px-3 py-1.5 text-sm"
              />
            </label>
            <SubmitButton className="btn-secondary rounded-lg px-4 py-1.5 text-sm">
              + ເພີ່ມ
            </SubmitButton>
          </ActionForm>
        </section>
      )}

      {/* ---------- ການອະນຸມັດ ---------- */}
      <section className="glass-card mt-4 rounded-xl p-4">
        <h2 className="mb-3 text-sm font-semibold text-fg">ຂັ້ນຕອນການອະນຸມັດ</h2>
        <ol className="space-y-3">
          <Step
            level={1}
            label="ຫົວໜ້າໜ່ວຍງານ"
            approval={approvals.find((a) => a.level === 1)}
          />
          <Step
            level={2}
            label="ຜູ້ຈັດການພະແນກ"
            approval={approvals.find((a) => a.level === 2)}
          />
        </ol>

        {pr.po_no && (
          <p className="mt-3 text-sm text-muted">
            ເລກ PO: <span className="font-mono text-body">{pr.po_no}</span>
            {pr.received_at && ` · ຮັບເຄື່ອງ ${safeDate(pr.received_at)}`}
          </p>
        )}
      </section>

      {decidable && (
        <section className="glass-card mt-4 rounded-xl p-4">
          <h2 className="mb-3 text-sm font-semibold text-fg">ຕັດສິນໃບສະເໜີຊື້</h2>
          <ActionForm action={decidePurchaseRequest} className="space-y-3">
            <input type="hidden" name="pr_id" value={pr.id} />
            <textarea
              name="note"
              rows={3}
              placeholder="ຄຳເຫັນ (ບັງຄັບເມື່ອບໍ່ອະນຸມັດ)"
              className="input w-full rounded-lg px-3 py-2 text-sm"
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
                className="btn-danger rounded-lg px-4 py-2 text-sm font-medium"
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
          <ActionForm action={markPurchaseOrdered} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="pr_id" value={pr.id} />
            <label className="flex flex-col gap-1 text-xs text-muted">
              ເລກ PO *
              <input
                name="po_no"
                required
                className="input w-56 rounded-lg px-3 py-1.5 text-sm"
              />
            </label>
            <SubmitButton className="btn-primary rounded-lg px-4 py-1.5 text-sm font-medium">
              ບັນທຶກ
            </SubmitButton>
          </ActionForm>
        </section>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {submittable && (
          <ActionForm action={submitPurchaseRequest}>
            <input type="hidden" name="pr_id" value={pr.id} />
            <SubmitButton className="btn-primary rounded-lg px-4 py-2 text-sm font-medium">
              ສົ່ງອະນຸມັດ
            </SubmitButton>
          </ActionForm>
        )}

        {receivable && (
          <ActionForm action={markPurchaseReceived}>
            <input type="hidden" name="pr_id" value={pr.id} />
            <SubmitButton className="btn-secondary rounded-lg px-4 py-2 text-sm">
              ຮັບເຄື່ອງແລ້ວ
            </SubmitButton>
          </ActionForm>
        )}

        {cancellable && (
          <ActionForm action={cancelPurchaseRequest}>
            <input type="hidden" name="pr_id" value={pr.id} />
            <SubmitButton className="btn-secondary rounded-lg px-4 py-2 text-sm">
              ຍົກເລີກໃບນີ້
            </SubmitButton>
          </ActionForm>
        )}
      </div>

      <p className="mt-4 text-xs text-faint">
        ສ້າງເມື່ອ {formatDateTime(pr.created_at)}
        {pr.approved_by_name &&
          ` · ອະນຸມັດສຸດທ້າຍໂດຍ ${pr.approved_by_name} ${formatDateTime(pr.approved_at)}`}
      </p>
    </div>
  )
}

function Step({
  level,
  label,
  approval,
}: {
  level: number
  label: string
  approval?: {
    decision: string
    note: string | null
    approver_name: string
    decided_at: string
  }
}) {
  return (
    <li className="flex gap-3">
      <span
        className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
          !approval
            ? 'bg-slate-200 text-muted dark:bg-slate-800'
            : approval.decision === 'approved'
              ? 'bg-emerald-600 text-white'
              : 'bg-red-600 text-white'
        }`}
      >
        {level}
      </span>
      <div>
        <p className="text-sm font-medium text-fg">{label}</p>
        {approval ? (
          <p className="text-xs text-muted">
            {approval.decision === 'approved' ? 'ອະນຸມັດ' : 'ບໍ່ອະນຸມັດ'} ໂດຍ{' '}
            {approval.approver_name} · {formatDateTime(approval.decided_at)}
            {approval.note && ` — ${approval.note}`}
          </p>
        ) : (
          <p className="text-xs text-faint">ລໍຖ້າ</p>
        )}
      </div>
    </li>
  )
}

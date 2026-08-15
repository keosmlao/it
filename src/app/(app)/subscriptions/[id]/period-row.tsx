'use client'

import ActionForm, { SubmitButton } from '@/components/action-form'
import { PeriodStatusBadge } from '@/components/subscription-badge'
import { safeDate } from '@/lib/assets/model'
import { formatAmount, type SubscriptionPeriodRow } from '@/lib/subscriptions/model'
import { deletePeriod, setPeriodStatus } from '../actions'

/** ແຖວງວດການຈ່າຍ — ປຸ່ມສະແດງສະເພາະຄົນທີ່ມີສິດແກ້ */
export default function PeriodRow({
  period,
  editable,
}: {
  period: SubscriptionPeriodRow
  editable: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
      <span className="w-44 text-sm text-body">
        {safeDate(period.period_start)} – {safeDate(period.period_end)}
      </span>

      <span className="min-w-0 flex-1 text-xs text-muted">
        {period.invoice_no && <span>ໃບບິນ {period.invoice_no} · </span>}
        {period.status === 'paid'
          ? `ຈ່າຍເມື່ອ ${safeDate(period.paid_at)}`
          : `ກຳນົດ ${safeDate(period.due_date)}`}
        {period.note && <span className="block truncate">{period.note}</span>}
      </span>

      <span className="text-right text-sm text-body">
        {formatAmount(period.amount, period.currency)}
      </span>

      {period.is_overdue ? (
        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-950 dark:text-red-300">
          ເລີຍກຳນົດ
        </span>
      ) : (
        <PeriodStatusBadge status={period.status} />
      )}

      {editable && (
        <span className="flex gap-1.5">
          {period.status !== 'paid' && (
            <ActionForm action={setPeriodStatus}>
              <input type="hidden" name="period_id" value={period.id} />
              <input type="hidden" name="status" value="paid" />
              <SubmitButton
                className="btn-secondary rounded-lg px-3 py-1 text-xs"
                pendingLabel="…"
              >
                ໝາຍວ່າຈ່າຍແລ້ວ
              </SubmitButton>
            </ActionForm>
          )}

          <ActionForm action={deletePeriod}>
            <input type="hidden" name="period_id" value={period.id} />
            <SubmitButton
              className="rounded-lg px-3 py-1 text-xs text-muted hover:text-red-600"
              pendingLabel="…"
            >
              ລຶບ
            </SubmitButton>
          </ActionForm>
        </span>
      )}
    </div>
  )
}

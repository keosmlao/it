'use client'

import { useState } from 'react'
import ActionForm, { SubmitButton } from '@/components/action-form'
import { isoDate } from '@/lib/format'
import {
  PERIOD_STATUSES,
  PERIOD_STATUS_LABEL_LO,
  SUB_CURRENCIES,
  type SubscriptionRow,
} from '@/lib/subscriptions/model'
import { cancelSubscription, recordPeriod, renewSubscription, reopenSubscription } from '../actions'

const field = 'input mt-1 w-full rounded px-2 py-1 text-[13px]'
const label = 'block text-xs text-muted'

/**
 * ແຜງບັນທຶກງວດ ແລະ ຈັດການສັນຍາ
 *
 * ວາງ 3 ວຽກໄວ້ບ່ອນດຽວເພາະມັນຕໍ່ເນື່ອງກັນ: ຈ່າຍແລ້ວ → ບັນທຶກ ·
 * ຕັດບັດເອງ → ຕໍ່ອາຍຸ · ບໍ່ໃຊ້ແລ້ວ → ຍົກເລີກ
 */
export default function PaymentPanel({
  subscription,
  today,
}: {
  subscription: SubscriptionRow
  today: string
}) {
  const s = subscription
  const [showCancel, setShowCancel] = useState(false)

  if (s.status !== 'active') {
    return (
      <div className="glass-card mt-4 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-fg">ສັນຍານີ້ບໍ່ໄດ້ໃຊ້ງານແລ້ວ</h2>
        {s.cancel_reason && (
          <p className="mt-1 text-sm text-muted">ເຫດຜົນ: {s.cancel_reason}</p>
        )}
        <ActionForm action={reopenSubscription} className="mt-3">
          <input type="hidden" name="id" value={s.id} />
          <SubmitButton className="btn-secondary rounded px-3 py-1.5 text-[13px]">
            ເປີດໃຊ້ຄືນ
          </SubmitButton>
        </ActionForm>
      </div>
    )
  }

  return (
    <div className="glass-card mt-4 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-fg">ບັນທຶກງວດການຈ່າຍ</h2>
      <p className="mt-0.5 text-xs text-muted">
        ບັນທຶກແລ້ວລະບົບຈະເລື່ອນກຳນົດຈ່າຍໄປງວດຖັດໄປໃຫ້ເອງ
      </p>

      <ActionForm action={recordPeriod} className="mt-3">
        <input type="hidden" name="id" value={s.id} />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className={label}>
            ງວດເລີ່ມວັນທີ *
            <input
              type="date"
              name="period_start"
              required
              defaultValue={isoDate(s.next_due_date) || today}
              className={field}
            />
          </label>

          <label className={label}>
            ຈຳນວນເງິນ
            <input
              name="period_amount"
              inputMode="decimal"
              defaultValue={s.amount}
              className={field}
            />
          </label>

          <label className={label}>
            ສະກຸນເງິນ
            <select name="period_currency" defaultValue={s.currency} className={field}>
              {SUB_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className={label}>
            ສະຖານະ
            <select name="period_status" defaultValue="paid" className={field}>
              {PERIOD_STATUSES.map((p) => (
                <option key={p} value={p}>
                  {PERIOD_STATUS_LABEL_LO[p]}
                </option>
              ))}
            </select>
          </label>

          <label className={label}>
            ວັນທີຈ່າຍ
            <input type="date" name="paid_at" defaultValue={today} className={field} />
          </label>

          <label className={label}>
            ເລກໃບບິນ
            <input name="invoice_no" maxLength={60} className={field} />
          </label>

          <label className={`${label} sm:col-span-2 lg:col-span-3`}>
            ໝາຍເຫດ
            <input
              name="period_note"
              maxLength={300}
              placeholder="ຈ່າຍຜ່ານບັນຊີ… / ໃບບິນຢູ່ແຟ້ມ…"
              className={field}
            />
          </label>
        </div>

        <SubmitButton className="btn-primary mt-3 rounded px-3 py-1.5 text-[13px] font-medium">
          ບັນທຶກງວດ
        </SubmitButton>
      </ActionForm>

      <div className="divide-line mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
        {s.billing_cycle !== 'one_time' && (
          <ActionForm action={renewSubscription}>
            <input type="hidden" name="id" value={s.id} />
            <SubmitButton
              className="btn-secondary rounded px-3 py-1.5 text-[13px]"
              pendingLabel="ກຳລັງເລື່ອນ…"
            >
              ຕໍ່ອາຍຸ 1 ງວດ (ບໍ່ມີໃບບິນ)
            </SubmitButton>
          </ActionForm>
        )}

        {!showCancel ? (
          <button
            type="button"
            onClick={() => setShowCancel(true)}
            className="btn-danger rounded px-3 py-1.5 text-[13px]"
          >
            ຍົກເລີກສັນຍາ
          </button>
        ) : (
          <ActionForm action={cancelSubscription} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="id" value={s.id} />
            <label className={label}>
              ເຫດຜົນທີ່ຍົກເລີກ *
              <input
                name="cancel_reason"
                required
                maxLength={200}
                autoFocus
                placeholder="ຍ້າຍໄປໃຊ້ຜູ້ໃຫ້ບໍລິການອື່ນ"
                className={`${field} w-64`}
              />
            </label>
            <SubmitButton className="btn-danger rounded px-3 py-1.5 text-[13px]">
              ຢືນຢັນຍົກເລີກ
            </SubmitButton>
            <button
              type="button"
              onClick={() => setShowCancel(false)}
              className="btn-secondary rounded px-3 py-1.5 text-[13px]"
            >
              ບໍ່ຍົກເລີກ
            </button>
          </ActionForm>
        )}
      </div>
    </div>
  )
}

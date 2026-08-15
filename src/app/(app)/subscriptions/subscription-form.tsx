'use client'

import ActionForm, { SubmitButton } from '@/components/action-form'
import { isoDate } from '@/lib/format'
import {
  BILLING_CYCLES,
  BILLING_CYCLE_LABEL_LO,
  SUB_CATEGORIES,
  SUB_CATEGORY_LABEL_LO,
  SUB_CURRENCIES,
  type SubscriptionRow,
} from '@/lib/subscriptions/model'
import { createSubscription, updateSubscription } from './actions'

type Option = { code: string; name: string }
type Owner = { employee_id: number; fullname_lo: string }

const field = 'input mt-1 w-full rounded-lg px-3 py-2 text-sm'
const label = 'block text-xs text-muted'

/**
 * ຟອມລົງທະບຽນ / ແກ້ໄຂສັນຍາເຊົ່າ
 *
 * ໃຊ້ຟອມດຽວທັງສອງໜ້າວຽກ ເພາະຊ່ອງຂໍ້ມູນຄືກັນໝົດ — ຕ່າງກັນພຽງ action
 */
export default function SubscriptionForm({
  owners,
  departments,
  vendors,
  subscription,
}: {
  owners: Owner[]
  departments: Option[]
  vendors: { id: string; name: string }[]
  subscription?: SubscriptionRow
}) {
  const editing = Boolean(subscription)
  const s = subscription

  return (
    <ActionForm
      action={editing ? updateSubscription : createSubscription}
      className="glass-card mt-4 rounded-xl p-5"
    >
      {editing && <input type="hidden" name="id" value={s!.id} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className={`${label} sm:col-span-2`}>
          ຊື່ບໍລິການ *
          <input
            name="service_name"
            required
            maxLength={150}
            defaultValue={s?.service_name ?? ''}
            placeholder="Internet Leased Line 100Mbps ຫ້ອງການໃຫຍ່"
            className={field}
          />
        </label>

        <label className={label}>
          ປະເພດ *
          <select
            name="category"
            required
            defaultValue={s?.category ?? 'internet'}
            className={field}
          >
            {SUB_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {SUB_CATEGORY_LABEL_LO[c]}
              </option>
            ))}
          </select>
        </label>

        <label className={label}>
          ຜູ້ໃຫ້ບໍລິການ
          <input
            name="vendor"
            maxLength={150}
            defaultValue={s?.vendor ?? ''}
            placeholder="ETL / Lao Telecom / Google / OpenAI"
            className={field}
          />
        </label>

        <label className={label}>
          ຜູກກັບທະບຽນຜູ້ຂາຍ
          <select name="vendor_id" defaultValue={s?.vendor_id ?? ''} className={field}>
            <option value="">— ບໍ່ຜູກ —</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[11px] text-faint">
            ຜູກແລ້ວຈະເຫັນເບີແຈ້ງບັນຫາ ແລະ ຍອດຈ່າຍລວມຕໍ່ເຈົ້າ
          </span>
        </label>

        <label className={label}>
          ແພັກເກັດ
          <input
            name="plan_name"
            maxLength={150}
            defaultValue={s?.plan_name ?? ''}
            placeholder="Business 100Mbps / Workspace Business Standard"
            className={field}
          />
        </label>

        <label className={label}>
          ບັນຊີ / ເລກສັນຍາ
          <input
            name="account_ref"
            maxLength={150}
            defaultValue={s?.account_ref ?? ''}
            placeholder="ຊື່ບັນຊີ ຫຼື ເລກສັນຍາທີ່ໃຊ້ອ້າງອີງ"
            className={field}
          />
        </label>

        <label className={`${label} sm:col-span-2`}>
          ລິ້ງໜ້າຈັດການ
          <input
            name="admin_url"
            type="url"
            maxLength={300}
            defaultValue={s?.admin_url ?? ''}
            placeholder="https://admin.google.com"
            className={field}
          />
        </label>

        <label className={label}>
          ຮອບການຈ່າຍ *
          <select
            name="billing_cycle"
            required
            defaultValue={s?.billing_cycle ?? 'monthly'}
            className={field}
          >
            {BILLING_CYCLES.map((c) => (
              <option key={c} value={c}>
                {BILLING_CYCLE_LABEL_LO[c]}
              </option>
            ))}
          </select>
        </label>

        <label className={label}>
          ຈຳນວນເງິນຕໍ່ງວດ *
          <input
            name="amount"
            required
            inputMode="decimal"
            defaultValue={s?.amount ?? ''}
            className={field}
          />
        </label>

        <label className={label}>
          ສະກຸນເງິນ *
          <select
            name="currency"
            required
            defaultValue={s?.currency ?? 'LAK'}
            className={field}
          >
            {SUB_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className={label}>
          ວັນເລີ່ມສັນຍາ *
          <input
            type="date"
            name="start_date"
            required
            defaultValue={isoDate(s?.start_date) || todayISOClient()}
            className={field}
          />
        </label>

        <label className={label}>
          ວັນສິ້ນສຸດສັນຍາ
          <input
            type="date"
            name="end_date"
            defaultValue={isoDate(s?.end_date)}
            className={field}
          />
        </label>

        <label className={label}>
          ກຳນົດຈ່າຍຄັ້ງຕໍ່ໄປ
          <input
            type="date"
            name="next_due_date"
            defaultValue={isoDate(s?.next_due_date)}
            className={field}
          />
          <span className="mt-1 block text-[11px] text-faint">
            ວ່າງໄວ້ = ລະບົບຄິດຈາກວັນເລີ່ມ ແລະ ຮອບການຈ່າຍ
          </span>
        </label>

        <label className={label}>
          ຜູ້ຮັບຜິດຊອບ
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
          <span className="mt-1 block text-[11px] text-faint">
            ຄົນນີ້ຈະໄດ້ຮັບການແຈ້ງເຕືອນກ່ອນຮອດກຳນົດຈ່າຍ
          </span>
        </label>

        <label className={label}>
          ພະແນກທີ່ຮັບພາລະຄ່າໃຊ້ຈ່າຍ
          <select
            name="department_code"
            defaultValue={s?.department_code ?? ''}
            className={field}
          >
            <option value="">— ບໍ່ລະບຸ —</option>
            {departments.map((d) => (
              <option key={d.code} value={d.code}>
                {d.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 pt-6 text-sm text-body">
          <input
            type="checkbox"
            name="auto_renew"
            value="1"
            defaultChecked={s ? s.auto_renew : true}
            className="size-4"
          />
          ຕໍ່ອາຍຸອັດຕະໂນມັດ
        </label>

        <label className={`${label} sm:col-span-2 lg:col-span-3`}>
          ໝາຍເຫດ
          <textarea
            name="note"
            rows={3}
            maxLength={2000}
            defaultValue={s?.note ?? ''}
            placeholder="ເງື່ອນໄຂສັນຍາ, ຜູ້ຕິດຕໍ່ຝ່າຍຂາຍ, ບ່ອນເກັບໃບສັນຍາ…"
            className={field}
          />
        </label>
      </div>

      <p className="mt-4 rounded-lg bg-red-50 px-4 py-2.5 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
        ⚠️ ຢ່າປ້ອນລະຫັດຜ່ານ ຫຼື API key ຢູ່ຟອມນີ້ — ພະນັກງານ IT ທຸກຄົນອ່ານໄດ້
        ແລະ ດຶງອອກເປັນ Excel ໄດ້. ໃຫ້ເກັບໄວ້ໃນຕົວຈັດການລະຫັດຜ່ານແທນ
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <SubmitButton className="btn-primary rounded-lg px-5 py-2 text-sm font-medium">
          {editing ? 'ບັນທຶກການແກ້ໄຂ' : 'ລົງທະບຽນ'}
        </SubmitButton>
        {!editing && (
          <span className="text-xs text-muted">
            ລະຫັດຈະອອກໃຫ້ອັດຕະໂນມັດເປັນ SUB-ປີ-ລຳດັບ
          </span>
        )}
      </div>
    </ActionForm>
  )
}

/** ວັນນີ້ຕາມເວລາລາວ — ຄິດຢູ່ client ເພື່ອບໍ່ໃຫ້ຄ່າຕັ້ງຕົ້ນຄ້າງຢູ່ cache ຂອງໜ້າ */
function todayISOClient(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Vientiane' }).format(
    new Date()
  )
}

'use client'

import ActionForm, { SubmitButton } from '@/components/action-form'
import { isoDate } from '@/lib/format'
import {
  PM_CATEGORIES,
  PM_CATEGORY_LABEL_LO,
  PM_INTERVALS,
  type MaintenancePlan,
} from '@/lib/maintenance/model'
import { createMaintenancePlan, updateMaintenancePlan } from './actions'

const field = 'input mt-1 w-full rounded px-2 py-1 text-[13px]'
const label = 'block text-xs text-muted'

export default function PlanForm({
  owners,
  assets,
  locations,
  plan,
}: {
  owners: { employee_id: number; fullname_lo: string }[]
  assets: { asset_code: string; name: string }[]
  locations: { code: string; name: string }[]
  plan?: MaintenancePlan
}) {
  const editing = Boolean(plan)
  const p = plan

  return (
    <ActionForm
      action={editing ? updateMaintenancePlan : createMaintenancePlan}
      className="glass-card mt-4 rounded-xl p-5"
    >
      {editing && <input type="hidden" name="id" value={p!.id} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className={`${label} sm:col-span-2`}>
          ຊື່ວຽກ *
          <input
            name="title"
            required
            maxLength={150}
            defaultValue={p?.title ?? ''}
            placeholder="ທົດສອບກູ້ຄືນ backup ຂອງ ERP"
            className={field}
          />
        </label>

        <label className={label}>
          ປະເພດ *
          <select
            name="category"
            required
            defaultValue={p?.category ?? 'backup'}
            className={field}
          >
            {PM_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {PM_CATEGORY_LABEL_LO[c]}
              </option>
            ))}
          </select>
        </label>

        <label className={label}>
          ຮອບ (ວັນ) *
          <input
            name="interval_days"
            required
            type="number"
            min={1}
            max={3650}
            list="pm-intervals"
            defaultValue={p?.interval_days ?? 90}
            className={field}
          />
          <datalist id="pm-intervals">
            {PM_INTERVALS.map((i) => (
              <option key={i.days} value={i.days}>
                {i.label}
              </option>
            ))}
          </datalist>
          <span className="mt-1 block text-[11px] text-faint">
            7 = ທຸກອາທິດ · 30 = ທຸກເດືອນ · 90 = ທຸກໄຕມາດ · 365 = ທຸກປີ
          </span>
        </label>

        <label className={label}>
          ກຳນົດຄັ້ງຕໍ່ໄປ *
          <input
            type="date"
            name="next_due_date"
            required
            defaultValue={isoDate(p?.next_due_date) || todayISOClient()}
            className={field}
          />
        </label>

        <label className={label}>
          ຜູ້ຮັບຜິດຊອບ
          <select
            name="owner_employee_id"
            defaultValue={p?.owner_employee_id ? String(p.owner_employee_id) : ''}
            className={field}
          >
            <option value="">— ບໍ່ລະບຸ —</option>
            {owners.map((o) => (
              <option key={o.employee_id} value={o.employee_id}>
                {o.fullname_lo}
              </option>
            ))}
          </select>
        </label>

        <label className={label}>
          ສະຖານທີ່
          <select
            name="location_code"
            defaultValue={p?.location_code ?? ''}
            className={field}
          >
            <option value="">— ບໍ່ລະບຸ —</option>
            {locations.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </label>

        <label className={`${label} sm:col-span-2`}>
          ອຸປະກອນທີ່ກ່ຽວຂ້ອງ
          <select name="asset_code" defaultValue={p?.asset_code ?? ''} className={field}>
            <option value="">— ບໍ່ຜູກກັບເຄື່ອງໃດ —</option>
            {assets.map((a) => (
              <option key={a.asset_code} value={a.asset_code}>
                {a.asset_code} · {a.name}
              </option>
            ))}
          </select>
        </label>

        <label className={`${label} sm:col-span-2 lg:col-span-3`}>
          ລາຍການທີ່ຕ້ອງກວດ
          <textarea
            name="checklist"
            rows={5}
            maxLength={4000}
            defaultValue={p?.checklist ?? ''}
            placeholder={'ຂຽນເປັນຂໍ້ໆ ເຊັ່ນ:\n1. ກູ້ໄຟລ໌ຕົວຢ່າງອອກມາ\n2. ເປີດເບິ່ງວ່າຂໍ້ມູນຄົບ\n3. ບັນທຶກເວລາທີ່ໃຊ້'}
            className={field}
          />
        </label>
      </div>

      <SubmitButton className="btn-primary mt-4 rounded px-3 py-1.5 text-[13px] font-medium">
        {editing ? 'ບັນທຶກການແກ້ໄຂ' : 'ຕັ້ງແຜນ'}
      </SubmitButton>
    </ActionForm>
  )
}

function todayISOClient(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Vientiane' }).format(
    new Date()
  )
}

'use client'

import { useMemo, useState } from 'react'
import ActionForm, { SubmitButton } from '@/components/action-form'
import { todayISO } from '@/lib/format'
import { deployAsset } from '../condition-actions'

type Asset = {
  asset_code: string
  name: string
  category_name: string | null
  serial_no: string | null
}
type Employee = {
  employee_id: number
  employee_code: string
  fullname_lo: string
  department_name_lo: string | null
}

const field = 'input mt-1 w-full rounded px-2 py-1 text-[13px]'

/** ຟອມຕິດຕັ້ງອຸປະກອນສ່ວນກາງ — ເປີດເມື່ອກົດປຸ່ມ */
export default function DeployPanel({
  assets,
  employees,
  locations,
  places,
}: {
  assets: Asset[]
  employees: Employee[]
  locations: { code: string; name: string }[]
  places: { place: string; total: string }[]
}) {
  const [open, setOpen] = useState(false)

  const grouped = useMemo(() => {
    const map = new Map<string, Asset[]>()
    for (const a of assets) {
      const key = a.category_name ?? 'ອື່ນໆ'
      const list = map.get(key)
      if (list) list.push(a)
      else map.set(key, [a])
    }
    return [...map.entries()]
  }, [assets])

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-primary mt-4 rounded px-3 py-1.5 text-[13px] font-medium"
      >
        + ຕິດຕັ້ງອຸປະກອນສ່ວນກາງ
      </button>
    )
  }

  return (
    <ActionForm action={deployAsset} className="glass-card mt-4 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-fg">ຕິດຕັ້ງອຸປະກອນສ່ວນກາງ</h2>
      <p className="mt-1 text-xs text-muted">
        ເລືອກໄດ້ສະເພາະເຄື່ອງທີ່ຢູ່ໃນສາງ ({assets.length} ເຄື່ອງ) —
        ເຄື່ອງທີ່ຢູ່ກັບຄົນຕ້ອງບັນທຶກການຄືນກ່ອນ
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block">
          <span className="text-xs text-muted">ອຸປະກອນ *</span>
          <select name="asset_code" required defaultValue="" className={field}>
            <option value="" disabled>
              — ເລືອກອຸປະກອນ —
            </option>
            {grouped.map(([category, list]) => (
              <optgroup key={category} label={category}>
                {list.map((a) => (
                  <option key={a.asset_code} value={a.asset_code}>
                    {a.name} ({a.asset_code})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs text-muted">ບ່ອນຕິດຕັ້ງ *</span>
          <input
            name="place"
            required
            list="place-list"
            placeholder="ຫ້ອງປະຊຸມໃຫຍ່ ຊັ້ນ 3"
            className={field}
          />
          <datalist id="place-list">
            {places.map((p) => (
              <option key={p.place} value={p.place} />
            ))}
          </datalist>
        </label>

        <label className="block">
          <span className="text-xs text-muted">ສະຖານທີ່ຕາມທະບຽນ ERP</span>
          <select name="location_code" defaultValue="" className={field}>
            <option value="">— ບໍ່ລະບຸ —</option>
            {locations.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs text-muted">ໃຊ້ເຮັດຫຍັງ</span>
          <input
            name="purpose"
            placeholder="ກະຈາຍສັນຍານເນັດຊັ້ນ 3"
            className={field}
          />
        </label>

        <label className="block">
          <span className="text-xs text-muted">ຜູ້ຮັບຜິດຊອບ</span>
          <select name="responsible_emp_code" defaultValue="" className={field}>
            <option value="">— ບໍ່ລະບຸ —</option>
            {employees.map((e) => (
              <option key={e.employee_id} value={e.employee_code}>
                {e.fullname_lo} ({e.department_name_lo ?? '—'})
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs text-muted">ວັນທີຕິດຕັ້ງ</span>
          <input
            type="date"
            name="installed_at"
            defaultValue={todayISO()}
            className={field}
          />
        </label>

        <label className="block sm:col-span-2 lg:col-span-3">
          <span className="text-xs text-muted">ໝາຍເຫດ</span>
          <input name="note" className={field} />
        </label>
      </div>

      <div className="mt-4 flex gap-2">
        <SubmitButton className="btn-primary rounded px-3 py-1.5 text-[13px] font-medium">
          ບັນທຶກການຕິດຕັ້ງ
        </SubmitButton>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn-secondary rounded px-3 py-1.5 text-[13px]"
        >
          ຍົກເລີກ
        </button>
      </div>
    </ActionForm>
  )
}

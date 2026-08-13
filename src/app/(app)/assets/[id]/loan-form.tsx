'use client'

import { useMemo, useState } from 'react'
import ActionForm, { SubmitButton } from '@/components/action-form'
import { lendAsset, returnAsset, transferAsset } from '../actions'

type Employee = {
  employee_id: number
  employee_code: string
  fullname_lo: string
  department_name_lo: string | null
}

const inputClass = 'input mt-1 w-full rounded-lg px-3 py-2 text-sm'
const today = () => new Date().toISOString().slice(0, 10)

/** ບັນທຶກການຢືມ — ສະແດງເມື່ອເຄື່ອງຫວ່າງ */
export function LendForm({
  assetCode,
  employees,
}: {
  assetCode: string
  employees: Employee[]
}) {
  const [open, setOpen] = useState(false)

  const grouped = useMemo(() => {
    const map = new Map<string, Employee[]>()
    for (const e of employees) {
      const key = e.department_name_lo ?? 'ບໍ່ລະບຸພະແນກ'
      const list = map.get(key)
      if (list) list.push(e)
      else map.set(key, [e])
    }
    return [...map.entries()]
  }, [employees])

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-primary mt-3 w-full rounded-lg px-4 py-2 text-sm font-medium"
      >
        + ບັນທຶກການຢືມ
      </button>
    )
  }

  return (
    <ActionForm action={lendAsset} className="mt-3 border-t border-line pt-3">
      <input type="hidden" name="asset_code" value={assetCode} />

      <label className="block text-xs text-muted">
        ຜູ້ຢືມ
        <select name="emp_code" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            — ເລືອກພະນັກງານ —
          </option>
          {grouped.map(([department, list]) => (
            <optgroup key={department} label={department}>
              {list.map((e) => (
                <option key={e.employee_id} value={e.employee_code}>
                  {e.fullname_lo} ({e.employee_code})
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block text-xs text-muted">
          ວັນທີຢືມ
          <input
            type="date"
            name="borrowed_at"
            defaultValue={today()}
            className={inputClass}
          />
        </label>
        <label className="block text-xs text-muted">
          ຄາດວ່າຈະຄືນ
          <input type="date" name="expected_return" className={inputClass} />
        </label>
      </div>

      <label className="mt-3 block text-xs text-muted">
        ໝາຍເຫດ
        <input
          name="borrow_note"
          placeholder="ອຸປະກອນເສີມທີ່ໃຫ້ໄປນຳ, ເງື່ອນໄຂ"
          className={inputClass}
        />
      </label>

      <div className="mt-3 flex gap-2">
        <SubmitButton className="btn-primary rounded-lg px-4 py-2 text-sm font-medium">
          ບັນທຶກການຢືມ
        </SubmitButton>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn-secondary rounded-lg px-4 py-2 text-sm"
        >
          ຍົກເລີກ
        </button>
      </div>
    </ActionForm>
  )
}

/**
 * ໂອນໃຫ້ຄົນອື່ນ — ສະແດງເມື່ອເຄື່ອງມີຜູ້ຖືຄອງຢູ່ແລ້ວ.
 * ປິດໃບເກົ່າ ແລະ ເປີດໃບໃໝ່ໃຫ້ພ້ອມກັນ ບໍ່ຕ້ອງຄືນເຂົ້າສາງກ່ອນ
 */
export function TransferForm({
  assetCode,
  holderName,
  employees,
}: {
  assetCode: string
  holderName: string
  employees: Employee[]
}) {
  const [open, setOpen] = useState(false)

  const grouped = useMemo(() => {
    const map = new Map<string, Employee[]>()
    for (const e of employees) {
      const key = e.department_name_lo ?? 'ບໍ່ລະບຸພະແນກ'
      const list = map.get(key)
      if (list) list.push(e)
      else map.set(key, [e])
    }
    return [...map.entries()]
  }, [employees])

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-secondary mt-2 w-full rounded-lg px-4 py-2 text-sm"
      >
        ⇄ ໂອນໃຫ້ຄົນອື່ນ
      </button>
    )
  }

  return (
    <ActionForm action={transferAsset} className="mt-3 border-t border-line pt-3">
      <input type="hidden" name="asset_code" value={assetCode} />

      <p className="text-xs text-muted">
        ຈາກ <span className="text-body">{holderName}</span> →
      </p>

      <label className="mt-1 block text-xs text-muted">
        ຜູ້ຮັບໂອນ
        <select name="to_emp_code" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            — ເລືອກພະນັກງານ —
          </option>
          {grouped.map(([department, list]) => (
            <optgroup key={department} label={department}>
              {list.map((e) => (
                <option key={e.employee_id} value={e.employee_code}>
                  {e.fullname_lo} ({e.employee_code})
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block text-xs text-muted">
          ວັນທີໂອນ
          <input
            type="date"
            name="transferred_at"
            defaultValue={today()}
            className={inputClass}
          />
        </label>
        <label className="block text-xs text-muted">
          ສະພາບເຄື່ອງ
          <select name="condition" defaultValue="good" className={inputClass}>
            <option value="good">ປົກກະຕິ</option>
            <option value="damaged">ເສຍຫາຍ</option>
          </select>
        </label>
      </div>

      <label className="mt-3 block text-xs text-muted">
        ເຫດຜົນ / ໝາຍເຫດ
        <input
          name="note"
          placeholder="ຍ້າຍໜ່ວຍງານ, ຮັບວຽກຕໍ່"
          className={inputClass}
        />
      </label>

      <p className="mt-2 text-[11px] text-faint">
        ລະບົບຈະປິດໃບຢືມເກົ່າ ແລະ ອອກໃບໃໝ່ໃຫ້ຜູ້ຮັບພ້ອມກັນ
      </p>

      <div className="mt-3 flex gap-2">
        <SubmitButton className="btn-primary rounded-lg px-4 py-2 text-sm font-medium">
          ຢືນຢັນການໂອນ
        </SubmitButton>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn-secondary rounded-lg px-4 py-2 text-sm"
        >
          ຍົກເລີກ
        </button>
      </div>
    </ActionForm>
  )
}

/** ບັນທຶກການຄືນ — ສະແດງເມື່ອໃບຢືມອອກຈາກລະບົບນີ້ */
export function ReturnForm({ assetCode }: { assetCode: string }) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-primary mt-3 w-full rounded-lg px-4 py-2 text-sm font-medium"
      >
        ↩ ບັນທຶກການຄືນ
      </button>
    )
  }

  return (
    <ActionForm action={returnAsset} className="mt-3 border-t border-line pt-3">
      <input type="hidden" name="asset_code" value={assetCode} />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs text-muted">
          ວັນທີຄືນ
          <input
            type="date"
            name="returned_at"
            defaultValue={today()}
            className={inputClass}
          />
        </label>
        <label className="block text-xs text-muted">
          ສະພາບເຄື່ອງ
          <select name="return_condition" defaultValue="good" className={inputClass}>
            <option value="good">ປົກກະຕິ</option>
            <option value="damaged">ເສຍຫາຍ</option>
            <option value="lost">ສູນຫາຍ</option>
          </select>
        </label>
      </div>

      <label className="mt-3 block text-xs text-muted">
        ໝາຍເຫດ
        <input name="return_note" className={inputClass} />
      </label>

      <div className="mt-3 flex gap-2">
        <SubmitButton className="btn-primary rounded-lg px-4 py-2 text-sm font-medium">
          ບັນທຶກການຄືນ
        </SubmitButton>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn-secondary rounded-lg px-4 py-2 text-sm"
        >
          ຍົກເລີກ
        </button>
      </div>
    </ActionForm>
  )
}

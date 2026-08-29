'use client'

import { useMemo, useState } from 'react'
import ActionForm, { SubmitButton } from '@/components/action-form'
import { lendAsset } from '../actions'

type Asset = {
  asset_code: string
  name: string
  category_name: string
  brand: string | null
  serial_no: string | null
  location_code: string | null
  location_name: string | null
  movement_count: number
}

type Location = { code: string; name: string; total: string }

type Employee = {
  employee_id: number
  employee_code: string
  fullname_lo: string
  department_name_lo: string | null
}

const inputClass = 'input mt-1 w-full rounded-lg px-3 py-2 text-sm'

/**
 * ອອກໃບຢືມ: ເລືອກເຄື່ອງ → ເລືອກຜູ້ຢືມ → ບັນທຶກ
 * ມີຊ່ອງຄົ້ນຫາເພາະເຄື່ອງໃນສາງມີເກືອບ 200 ອັນ
 */
export default function LendPanel({
  assets,
  employees,
  locations,
}: {
  assets: Asset[]
  employees: Employee[]
  locations: Location[]
}) {
  const [search, setSearch] = useState('')
  const [location, setLocation] = useState('')
  const [neverLent, setNeverLent] = useState(false)
  const [selected, setSelected] = useState<Asset | null>(null)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()

    return assets.filter((a) => {
      if (location && (a.location_code ?? '') !== location) return false
      // ເຄື່ອງທີ່ບໍ່ເຄີຍມີໃບຢືມເລີຍ ອາດຢູ່ກັບຄົນແລ້ວແຕ່ບໍ່ມີເອກະສານ
      if (neverLent && Number(a.movement_count) > 0) return false
      if (!term) return true

      return [a.asset_code, a.name, a.brand, a.serial_no, a.category_name]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(term))
    })
  }, [assets, search, location, neverLent])

  const matches = filtered.slice(0, 40)

  const groupedEmployees = useMemo(() => {
    const map = new Map<string, Employee[]>()
    for (const e of employees) {
      const key = e.department_name_lo ?? 'ບໍ່ລະບຸພະແນກ'
      const list = map.get(key)
      if (list) list.push(e)
      else map.set(key, [e])
    }
    return [...map.entries()]
  }, [employees])

  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_380px]">
      {/* ---- ເລືອກເຄື່ອງ ---- */}
      {/* min-w-0: ຊ່ອງ grid ຄິດຄວາມກວ້າງຕ່ຳສຸດຈາກເນື້ອໃນ ແລະ <select>
          ຜູ້ຢືມກວ້າງຕາມຊື່ພະນັກງານທີ່ຍາວທີ່ສຸດ — ດັນໜ້າລົ້ນຈໍມືຖື */}
      <section className="glass-card min-w-0 rounded-xl p-4">
        <h2 className="font-semibold text-fg">1. ເລືອກອຸປະກອນ</h2>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ຄົ້ນຫາ ລະຫັດ, ຊື່, ຍີ່ຫໍ້, S/N, ປະເພດ"
          className="input mt-3 w-full rounded-lg px-3 py-2 text-sm"
        />

        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-muted">
            ສະຖານທີ່ຕັ້ງ
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="input w-56 rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="">ທຸກສະຖານທີ່</option>
              {locations.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name} ({l.total})
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 pb-1.5 text-sm text-body">
            <input
              type="checkbox"
              checked={neverLent}
              onChange={(e) => setNeverLent(e.target.checked)}
              className="size-4"
            />
            ບໍ່ເຄີຍຖືກຢືມ
          </label>
        </div>

        <p className="mt-2 text-xs text-muted">
          ພົບ {filtered.length} ເຄື່ອງ
          {filtered.length > 40 && ' (ສະແດງ 40 ອັນທຳອິດ)'}
        </p>

        <ul className="divide-line mt-2 max-h-[26rem] divide-y overflow-y-auto">
          {matches.map((asset) => (
            <li key={asset.asset_code}>
              <button
                type="button"
                onClick={() => setSelected(asset)}
                className={`hover-surface flex w-full items-center gap-3 px-2 py-2.5 text-left transition ${
                  selected?.asset_code === asset.asset_code
                    ? 'bg-brand-blue/10'
                    : ''
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-fg">{asset.name}</span>
                  <span className="block font-mono text-xs text-muted">
                    {asset.asset_code}
                    {asset.serial_no && ` · ${asset.serial_no}`}
                  </span>
                  <span className="block text-xs text-faint">
                    {asset.location_name ?? 'ບໍ່ລະບຸສະຖານທີ່'}
                    {Number(asset.movement_count) === 0 && ' · ບໍ່ເຄີຍຖືກຢືມ'}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-brand-blue/10 px-2 py-0.5 text-xs text-brand-blue dark:text-brand-sky">
                  {asset.category_name}
                </span>
              </button>
            </li>
          ))}

          {matches.length === 0 && (
            <li className="py-8 text-center text-sm text-muted">
              ບໍ່ພົບເຄື່ອງທີ່ຢືມໄດ້ຕາມຄຳຄົ້ນຫາ
            </li>
          )}
        </ul>
      </section>

      {/* ---- ຂໍ້ມູນການຢືມ ---- */}
      <section className="glass-card h-fit min-w-0 rounded-xl p-4">
        <h2 className="font-semibold text-fg">2. ຂໍ້ມູນການຢືມ</h2>

        {!selected ? (
          <p className="mt-3 rounded-lg bg-brand-blue/5 px-3 py-6 text-center text-sm text-muted">
            ເລືອກອຸປະກອນຈາກລາຍການທາງຊ້າຍກ່ອນ
          </p>
        ) : (
          <ActionForm action={lendAsset} className="mt-3">
            <input type="hidden" name="asset_code" value={selected.asset_code} />

            <div className="rounded-lg bg-brand-blue/5 px-3 py-2">
              <p className="text-sm font-medium text-fg">{selected.name}</p>
              <p className="font-mono text-xs text-muted">{selected.asset_code}</p>
            </div>

            <label className="mt-3 block text-xs text-muted">
              ຜູ້ຢືມ
              <select name="emp_code" required defaultValue="" className={inputClass}>
                <option value="" disabled>
                  — ເລືອກພະນັກງານ —
                </option>
                {groupedEmployees.map(([department, list]) => (
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
                  defaultValue={new Date().toISOString().slice(0, 10)}
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

            <SubmitButton className="btn-primary mt-4 w-full rounded-lg px-4 py-2.5 text-sm font-medium">
              ອອກໃບຢືມ
            </SubmitButton>
          </ActionForm>
        )}
      </section>
    </div>
  )
}

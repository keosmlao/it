'use client'

import { useState } from 'react'
import ActionForm, { SubmitButton } from '@/components/action-form'
import { isoDate } from '@/lib/format'
import {
  REQUIRED_SPEC_FIELDS,
  SPEC_FIELDS,
  isComputerCategory,
  type SpecValues,
} from '@/lib/assets/model'
import type { LocalAsset } from '@/lib/assets/local'
import { registerLocalAsset, updateLocalAsset } from '../local-actions'

type Option = { code: string; name: string }

const field = 'input mt-1 w-full rounded-lg px-3 py-2 text-sm'
const label = 'block text-xs text-muted'

const REQUIRED = new Set<string>(REQUIRED_SPEC_FIELDS)

/**
 * ຟອມລົງທະບຽນ / ແກ້ໄຂອຸປະກອນທີ່ບໍ່ໄດ້ມາຈາກ ERP
 *
 * ໃຊ້ຟອມດຽວທັງສອງໜ້າວຽກ ເພາະຊ່ອງຂໍ້ມູນຄືກັນໝົດ —
 * ຕ່າງກັນພຽງ action ແລະ ຂໍ້ຄວາມເທົ່ານັ້ນ
 */
export default function AssetForm({
  categories,
  locations,
  departments,
  asset,
  spec,
}: {
  categories: Option[]
  locations: Option[]
  departments: Option[]
  asset?: LocalAsset
  spec?: SpecValues
}) {
  const editing = Boolean(asset)

  // ໝວດຕ້ອງເປັນ state ເພາະຊ່ອງສະເປັກຂຶ້ນຢູ່ກັບວ່າເລືອກຄອມ ຫຼື ບໍ່
  const [categoryCode, setCategoryCode] = useState(asset?.category_code ?? '')
  const categoryName = categories.find((c) => c.code === categoryCode)?.name
  const needSpec = isComputerCategory(categoryName)

  // ອຸປະກອນອື່ນປ້ອນສະເປັກໄດ້ຄືກັນ ພຽງແຕ່ບໍ່ບັງຄັບ —
  // ເປີດໃຫ້ເອງຖ້າເຄື່ອງນີ້ມີສະເປັກເກັບໄວ້ຢູ່ແລ້ວ ຈຶ່ງບໍ່ຖືກລຶບຕອນແກ້ຂໍ້ມູນ
  const [openSpec, setOpenSpec] = useState(
    SPEC_FIELDS.some((f) => spec?.[f.name]) || Boolean(spec?.spec_note)
  )
  const showSpec = needSpec || openSpec

  return (
    <ActionForm
      action={editing ? updateLocalAsset : registerLocalAsset}
      className="glass-card mt-4 rounded-xl p-5"
    >
      {editing && (
        <input type="hidden" name="asset_code" value={asset!.asset_code} />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className={`${label} sm:col-span-2`}>
          ຊື່ອຸປະກອນ *
          <input
            name="name"
            required
            maxLength={100}
            defaultValue={asset?.name ?? ''}
            placeholder="SWITCH TP-Link 8 ports ຫ້ອງປະຊຸມ"
            className={field}
          />
        </label>

        <label className={label}>
          ໝວດ
          <select
            name="category_code"
            value={categoryCode}
            onChange={(e) => setCategoryCode(e.target.value)}
            className={field}
          >
            <option value="">— ບໍ່ລະບຸ —</option>
            {categories.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className={label}>
          ຍີ່ຫໍ້
          <input
            name="brand"
            maxLength={120}
            defaultValue={asset?.brand ?? ''}
            className={field}
          />
        </label>

        <label className={label}>
          ຮຸ່ນ
          <input
            name="model"
            maxLength={120}
            defaultValue={asset?.model ?? ''}
            className={field}
          />
        </label>

        <label className={label}>
          Serial
          <input
            name="serial_no"
            maxLength={120}
            defaultValue={asset?.serial_no ?? ''}
            placeholder="ປ້ອນໄວ້ຈະກັນລົງທະບຽນຊໍ້າ"
            className={field}
          />
        </label>

        <label className={label}>
          MAC
          <input
            name="mac_address"
            maxLength={60}
            defaultValue={asset?.mac_address ?? ''}
            className={field}
          />
        </label>

        <label className={label}>
          ສະຖານທີ່
          <select
            name="location_code"
            defaultValue={asset?.location_code ?? ''}
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

        <label className={label}>
          ພະແນກທີ່ຮັບຜິດຊອບ
          <select
            name="department_code"
            defaultValue={asset?.department_code ?? ''}
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

        <label className={label}>
          ວັນທີໄດ້ມາ
          <input
            type="date"
            name="purchase_date"
            defaultValue={isoDate(asset?.purchase_date)}
            className={field}
          />
        </label>

        <label className={label}>
          ລາຄາ (ກີບ)
          <input
            name="purchase_price"
            inputMode="decimal"
            defaultValue={asset?.purchase_price ?? ''}
            className={field}
          />
        </label>

        <label className={`${label} sm:col-span-2 lg:col-span-3`}>
          ໄດ້ມາແນວໃດ
          <input
            name="source_note"
            maxLength={200}
            defaultValue={asset?.source_note ?? ''}
            placeholder="ຮັບບໍລິຈາກຈາກ… / ຊື້ດ່ວນໃບບິນ… / ຢືມມາທົດລອງ"
            className={field}
          />
        </label>
      </div>

      {showSpec && (
        <div className="mt-5 border-t border-line pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-fg">
              ສະເປັກເຄື່ອງ{needSpec && ' *'}
            </h3>
            {!needSpec && (
              <button
                type="button"
                onClick={() => setOpenSpec(false)}
                className="text-xs text-muted hover:text-fg"
              >
                ເຊື່ອງ
              </button>
            )}
          </div>

          {needSpec && (
            <p className="mt-1 text-xs text-muted">
              ໝວດ {categoryName} ເປັນຄອມ — ຕ້ອງປ້ອນ CPU, RAM ແລະ ດິສກ໌
            </p>
          )}

          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SPEC_FIELDS.map((f) => (
              <label key={f.name} className={label}>
                {f.label}
                {needSpec && REQUIRED.has(f.name) && ' *'}
                <input
                  name={f.name}
                  required={needSpec && REQUIRED.has(f.name)}
                  maxLength={f.max}
                  defaultValue={spec?.[f.name] ?? ''}
                  placeholder={f.placeholder}
                  className={field}
                />
              </label>
            ))}

            <label className={`${label} sm:col-span-2 lg:col-span-3`}>
              ໝາຍເຫດສະເປັກ
              <textarea
                name="spec_note"
                rows={2}
                defaultValue={spec?.spec_note ?? ''}
                placeholder="ອັບເກຣດ RAM ເມື່ອ… / ດິສກ໌ເສີມ / ໂປຣແກຣມທີ່ຕິດຕັ້ງໄວ້"
                className={field}
              />
            </label>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <SubmitButton className="btn-primary rounded-lg px-5 py-2 text-sm font-medium">
          {editing ? 'ບັນທຶກການແກ້ໄຂ' : 'ລົງທະບຽນ'}
        </SubmitButton>

        {!showSpec && (
          <button
            type="button"
            onClick={() => setOpenSpec(true)}
            className="btn-secondary rounded-lg px-4 py-2 text-sm"
          >
            + ເພີ່ມສະເປັກເຄື່ອງ
          </button>
        )}

        {!editing && (
          <span className="text-xs text-muted">
            ລະຫັດຈະອອກໃຫ້ອັດຕະໂນມັດເປັນ ITA-ປີ-ລຳດັບ
          </span>
        )}
      </div>
    </ActionForm>
  )
}

'use client'

import ActionForm, { SubmitButton } from '@/components/action-form'
import type { VendorRow } from '@/lib/vendors/model'
import { createVendor, updateVendor } from './actions'

const field = 'input mt-1 w-full rounded px-2 py-1 text-[13px]'
const label = 'block text-xs text-muted'

/** ຟອມເພີ່ມ / ແກ້ຜູ້ຂາຍ — ຊ່ອງດຽວກັນທັງສອງໜ້າວຽກ */
export default function VendorForm({
  suppliers,
  vendor,
}: {
  suppliers: { code: string; name: string }[]
  vendor?: VendorRow
}) {
  const editing = Boolean(vendor)
  const v = vendor

  return (
    <ActionForm
      action={editing ? updateVendor : createVendor}
      className="glass-card mt-4 rounded-xl p-5"
    >
      {editing && <input type="hidden" name="id" value={v!.id} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className={`${label} sm:col-span-2`}>
          ຊື່ຜູ້ຂາຍ / ຜູ້ໃຫ້ບໍລິການ *
          <input
            name="name"
            required
            maxLength={150}
            defaultValue={v?.name ?? ''}
            placeholder="ບໍລິສັດ ETL ມະຫາຊົນ"
            className={field}
          />
        </label>

        <label className={label}>
          ຊື່ຫຍໍ້
          <input
            name="short_name"
            maxLength={60}
            defaultValue={v?.short_name ?? ''}
            placeholder="ETL"
            className={field}
          />
        </label>

        <label className={label}>
          ຜູ້ຕິດຕໍ່
          <input
            name="contact_name"
            maxLength={120}
            defaultValue={v?.contact_name ?? ''}
            className={field}
          />
        </label>

        <label className={label}>
          ເບີໂທ
          <input
            name="phone"
            maxLength={60}
            defaultValue={v?.phone ?? ''}
            className={field}
          />
        </label>

        <label className={label}>
          ອີເມວ
          <input
            name="email"
            type="email"
            maxLength={150}
            defaultValue={v?.email ?? ''}
            className={field}
          />
        </label>

        <label className={label}>
          ເບີແຈ້ງບັນຫາ (support)
          <input
            name="support_phone"
            maxLength={60}
            defaultValue={v?.support_phone ?? ''}
            placeholder="ເບີທີ່ໂທຕອນລະບົບລົ້ມ"
            className={field}
          />
        </label>

        <label className={label}>
          ອີເມວແຈ້ງບັນຫາ
          <input
            name="support_email"
            type="email"
            maxLength={150}
            defaultValue={v?.support_email ?? ''}
            className={field}
          />
        </label>

        <label className={label}>
          ເວລາໃຫ້ບໍລິການ
          <input
            name="support_hours"
            maxLength={120}
            defaultValue={v?.support_hours ?? ''}
            placeholder="ຈັນ–ສຸກ 08:00–17:00 / 24×7"
            className={field}
          />
        </label>

        <label className={label}>
          ເວັບໄຊ
          <input
            name="website"
            type="url"
            maxLength={300}
            defaultValue={v?.website ?? ''}
            className={field}
          />
        </label>

        <label className={label}>
          ຜູກກັບຜູ້ຈຳໜ່າຍ ERP
          <select
            name="erp_supplier_code"
            defaultValue={v?.erp_supplier_code ?? ''}
            className={field}
          >
            <option value="">— ບໍ່ຜູກ —</option>
            {suppliers.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[11px] text-faint">
            ຜູກແລ້ວອ້າງອີງກັບໃບສະເໜີຊື້ໄດ້
          </span>
        </label>

        <label className={`${label} sm:col-span-2`}>
          ທີ່ຢູ່
          <input
            name="address"
            maxLength={300}
            defaultValue={v?.address ?? ''}
            className={field}
          />
        </label>

        <label className={`${label} sm:col-span-2 lg:col-span-3`}>
          ເງື່ອນໄຂການຮັບປະກັນ / ເວລາຕອບສະໜອງ
          <input
            name="sla_note"
            maxLength={300}
            defaultValue={v?.sla_note ?? ''}
            placeholder="ຮັບແຈ້ງພາຍໃນ 2 ຊົ່ວໂມງ · ເຂົ້າໜ້າງານພາຍໃນ 1 ມື້ລັດຖະການ"
            className={field}
          />
        </label>

        <label className={`${label} sm:col-span-2 lg:col-span-3`}>
          ໝາຍເຫດ
          <textarea
            name="note"
            rows={3}
            maxLength={2000}
            defaultValue={v?.note ?? ''}
            className={field}
          />
        </label>
      </div>

      <SubmitButton className="btn-primary mt-4 rounded px-3 py-1.5 text-[13px] font-medium">
        {editing ? 'ບັນທຶກການແກ້ໄຂ' : 'ເພີ່ມຜູ້ຂາຍ'}
      </SubmitButton>
    </ActionForm>
  )
}

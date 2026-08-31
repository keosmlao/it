'use client'

import ActionForm, { SubmitButton } from '@/components/action-form'
import {
  IP_KINDS,
  IP_KIND_LABEL_LO,
  IP_STATUSES,
  IP_STATUS_LABEL_LO,
} from '@/lib/network/model'
import { saveIpAssignment } from '../actions'

const field = 'input mt-1 w-full rounded px-2 py-1 text-[13px]'
const label = 'block text-xs text-muted'

/** ເພີ່ມ IP ເຂົ້າວົງນີ້ — IP ຊໍ້າຖືກກັນຢູ່ຖານຂໍ້ມູນ */
export default function IpForm({
  segmentId,
  assets,
  employees,
}: {
  segmentId: string
  assets: { asset_code: string; name: string }[]
  employees: { employee_id: number; fullname_lo: string }[]
}) {
  return (
    <div className="glass-card mt-4 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-fg">ເພີ່ມ IP</h2>

      <ActionForm action={saveIpAssignment} className="mt-3">
        <input type="hidden" name="segment_id" value={segmentId} />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className={label}>
            IP *
            <input
              name="ip_address"
              required
              placeholder="10.0.10.25"
              className={`${field} font-mono`}
            />
          </label>

          <label className={label}>
            ຊື່ເຄື່ອງ (hostname)
            <input name="hostname" maxLength={120} className={field} />
          </label>

          <label className={label}>
            ປະເພດ
            <select name="kind" defaultValue="static" className={field}>
              {IP_KINDS.map((k) => (
                <option key={k} value={k}>
                  {IP_KIND_LABEL_LO[k]}
                </option>
              ))}
            </select>
          </label>

          <label className={label}>
            ສະຖານະ
            <select name="status" defaultValue="in_use" className={field}>
              {IP_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {IP_STATUS_LABEL_LO[s]}
                </option>
              ))}
            </select>
          </label>

          <label className={label}>
            MAC
            <input name="mac_address" maxLength={60} className={field} />
          </label>

          <label className={label}>
            ອຸປະກອນ
            <select name="asset_code" defaultValue="" className={field}>
              <option value="">— ບໍ່ຜູກ —</option>
              {assets.map((a) => (
                <option key={a.asset_code} value={a.asset_code}>
                  {a.asset_code} · {a.name}
                </option>
              ))}
            </select>
          </label>

          <label className={label}>
            ຜູ້ໃຊ້
            <select name="employee_id" defaultValue="" className={field}>
              <option value="">— ບໍ່ລະບຸ —</option>
              {employees.map((e) => (
                <option key={e.employee_id} value={e.employee_id}>
                  {e.fullname_lo}
                </option>
              ))}
            </select>
          </label>

          <label className={label}>
            ໝາຍເຫດ
            <input name="note" maxLength={300} className={field} />
          </label>
        </div>

        <SubmitButton className="btn-primary mt-3 rounded px-3 py-1.5 text-[13px] font-medium">
          ເພີ່ມ IP
        </SubmitButton>
      </ActionForm>
    </div>
  )
}

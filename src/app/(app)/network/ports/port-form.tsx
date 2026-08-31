'use client'

import ActionForm, { SubmitButton } from '@/components/action-form'
import { saveSwitchPort } from '../actions'

const field = 'input mt-1 w-full rounded px-2 py-1 text-[13px]'
const label = 'block text-xs text-muted'

export default function PortForm({
  assets,
}: {
  assets: { asset_code: string; name: string }[]
}) {
  return (
    <ActionForm action={saveSwitchPort} className="glass-card mt-3 rounded-xl p-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className={label}>
          ສະວິດ *
          <select name="switch_asset_code" required defaultValue="" className={field}>
            <option value="" disabled>
              — ເລືອກສະວິດ —
            </option>
            {assets.map((a) => (
              <option key={a.asset_code} value={a.asset_code}>
                {a.asset_code} · {a.name}
              </option>
            ))}
          </select>
        </label>

        <label className={label}>
          ເລກພອດ *
          <input
            name="port_label"
            required
            maxLength={30}
            placeholder="Gi1/0/12"
            className={field}
          />
        </label>

        <label className={label}>
          VLAN
          <input name="vlan_id" type="number" min={1} max={4094} className={field} />
        </label>

        <label className={label}>
          Patch panel
          <input name="patch_panel" maxLength={60} placeholder="PP-A ຊ່ອງ 12" className={field} />
        </label>

        <label className={label}>
          ຫ້ອງ / ຈຸດປາຍທາງ
          <input name="room" maxLength={120} placeholder="ຫ້ອງບັນຊີ ຊັ້ນ 2" className={field} />
        </label>

        <label className={label}>
          ຕໍ່ໄປຫາເຄື່ອງ
          <select name="connected_asset_code" defaultValue="" className={field}>
            <option value="">— ບໍ່ຜູກ —</option>
            {assets.map((a) => (
              <option key={a.asset_code} value={a.asset_code}>
                {a.asset_code} · {a.name}
              </option>
            ))}
          </select>
        </label>

        <label className={`${label} sm:col-span-2`}>
          ລາຍລະອຽດ
          <input name="description" maxLength={200} className={field} />
        </label>

        <label className="flex items-center gap-2 pt-6 text-sm text-body">
          <input type="checkbox" name="is_uplink" value="1" className="size-4" />
          ເປັນ uplink
        </label>
      </div>

      <SubmitButton className="btn-primary mt-4 rounded px-3 py-1.5 text-[13px] font-medium">
        ເພີ່ມພອດ
      </SubmitButton>
    </ActionForm>
  )
}

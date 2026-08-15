'use client'

import ActionForm, { SubmitButton } from '@/components/action-form'
import type { NetworkSegment } from '@/lib/network/model'
import { saveSegment } from './actions'

const field = 'input mt-1 w-full rounded-lg px-3 py-2 text-sm'
const label = 'block text-xs text-muted'

export default function SegmentForm({
  locations,
  segment,
}: {
  locations: { code: string; name: string }[]
  segment?: NetworkSegment
}) {
  const s = segment

  return (
    <ActionForm action={saveSegment} className="glass-card mt-3 rounded-xl p-5">
      {s && <input type="hidden" name="id" value={s.id} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className={label}>
          ຊື່ວົງເນັດ *
          <input
            name="name"
            required
            maxLength={120}
            defaultValue={s?.name ?? ''}
            placeholder="ຫ້ອງການໃຫຍ່ ຊັ້ນ 2"
            className={field}
          />
        </label>

        <label className={label}>
          CIDR *
          <input
            name="cidr"
            required
            maxLength={50}
            defaultValue={s?.cidr ?? ''}
            placeholder="10.0.10.0/24"
            className={field}
          />
        </label>

        <label className={label}>
          VLAN
          <input
            name="vlan_id"
            type="number"
            min={1}
            max={4094}
            defaultValue={s?.vlan_id ?? ''}
            className={field}
          />
        </label>

        <label className={label}>
          Gateway
          <input
            name="gateway"
            maxLength={45}
            defaultValue={s?.gateway ?? ''}
            placeholder="10.0.10.1"
            className={field}
          />
        </label>

        <label className={label}>
          DNS
          <input
            name="dns"
            maxLength={120}
            defaultValue={s?.dns ?? ''}
            placeholder="10.0.10.5, 8.8.8.8"
            className={field}
          />
        </label>

        <label className={label}>
          ຊ່ວງ DHCP
          <input
            name="dhcp_range"
            maxLength={80}
            defaultValue={s?.dhcp_range ?? ''}
            placeholder="10.0.10.100–10.0.10.200"
            className={field}
          />
        </label>

        <label className={label}>
          ສະຖານທີ່
          <select
            name="location_code"
            defaultValue={s?.location_code ?? ''}
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
          ໃຊ້ເຮັດຫຍັງ
          <input
            name="purpose"
            maxLength={200}
            defaultValue={s?.purpose ?? ''}
            placeholder="ຄອມພະນັກງານທົ່ວໄປ / ກ້ອງ CCTV / ເຄື່ອງ server"
            className={field}
          />
        </label>

        <label className={`${label} sm:col-span-2 lg:col-span-3`}>
          ໝາຍເຫດ
          <textarea
            name="note"
            rows={2}
            defaultValue={s?.note ?? ''}
            className={field}
          />
        </label>
      </div>

      <SubmitButton className="btn-primary mt-4 rounded-lg px-5 py-2 text-sm font-medium">
        {s ? 'ບັນທຶກການແກ້ໄຂ' : 'ເພີ່ມວົງເນັດ'}
      </SubmitButton>
    </ActionForm>
  )
}

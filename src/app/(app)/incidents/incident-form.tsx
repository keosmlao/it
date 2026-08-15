'use client'

import ActionForm, { SubmitButton } from '@/components/action-form'
import {
  INCIDENT_SERVICES,
  INCIDENT_SERVICE_LABEL_LO,
  INCIDENT_SEVERITIES,
  SEVERITY_LABEL_LO,
  nowLocalInput,
  type IncidentRow,
} from '@/lib/incidents/model'
import { createIncident, updateIncident } from './actions'

const field = 'input mt-1 w-full rounded-lg px-3 py-2 text-sm'
const label = 'block text-xs text-muted'

/** ເວລາຈາກ DB (ISO ພ້ອມ timezone) → ຄ່າຂອງ <input type="datetime-local"> */
function toLocalInput(value: string | null): string {
  if (!value) return ''
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Vientiane',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
  return parts.replace(' ', 'T')
}

export default function IncidentForm({
  subscriptions,
  assets,
  incident,
}: {
  subscriptions: { id: string; code: string; service_name: string }[]
  assets: { asset_code: string; name: string }[]
  incident?: IncidentRow
}) {
  const editing = Boolean(incident)
  const i = incident

  return (
    <ActionForm
      action={editing ? updateIncident : createIncident}
      className="glass-card mt-4 rounded-xl p-5"
    >
      {editing && <input type="hidden" name="id" value={i!.id} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className={`${label} sm:col-span-2`}>
          ເກີດຫຍັງຂຶ້ນ *
          <input
            name="title"
            required
            maxLength={200}
            defaultValue={i?.title ?? ''}
            placeholder="ອິນເຕີເນັດຫຼຸດທັງຫ້ອງການ"
            className={field}
          />
        </label>

        <label className={label}>
          ບໍລິການທີ່ລົ້ມ *
          <select
            name="service"
            required
            defaultValue={i?.service ?? 'internet'}
            className={field}
          >
            {INCIDENT_SERVICES.map((s) => (
              <option key={s} value={s}>
                {INCIDENT_SERVICE_LABEL_LO[s]}
              </option>
            ))}
          </select>
        </label>

        <label className={label}>
          ຄວາມຮ້າຍແຮງ *
          <select
            name="severity"
            required
            defaultValue={i?.severity ?? 'major'}
            className={field}
          >
            {INCIDENT_SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {SEVERITY_LABEL_LO[s]}
              </option>
            ))}
          </select>
        </label>

        <label className={label}>
          ເລີ່ມລົ້ມເມື່ອ *
          <input
            type="datetime-local"
            name="started_at"
            required
            defaultValue={toLocalInput(i?.started_at ?? null) || nowLocalInput()}
            className={field}
          />
        </label>

        <label className={label}>
          ກັບມາໃຊ້ໄດ້ເມື່ອ
          <input
            type="datetime-local"
            name="resolved_at"
            defaultValue={toLocalInput(i?.resolved_at ?? null)}
            className={field}
          />
          <span className="mt-1 block text-[11px] text-faint">
            ວ່າງໄວ້ = ຍັງລົ້ມຢູ່ (ລະບົບຈະນັບເວລາໃຫ້ເອງ)
          </span>
        </label>

        <label className={label}>
          ສັນຍາເຊົ່າທີ່ກ່ຽວຂ້ອງ
          <select
            name="subscription_id"
            defaultValue={i?.subscription_id ?? ''}
            className={field}
          >
            <option value="">— ບໍ່ຜູກ —</option>
            {subscriptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.service_name}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[11px] text-faint">
            ຜູກແລ້ວຄິດເວລາລົ້ມຕໍ່ຜູ້ໃຫ້ບໍລິການໄດ້
          </span>
        </label>

        <label className={label}>
          ອຸປະກອນທີ່ກ່ຽວຂ້ອງ
          <select name="asset_code" defaultValue={i?.asset_code ?? ''} className={field}>
            <option value="">— ບໍ່ຜູກ —</option>
            {assets.map((a) => (
              <option key={a.asset_code} value={a.asset_code}>
                {a.asset_code} · {a.name}
              </option>
            ))}
          </select>
        </label>

        <label className={label}>
          ຜູ້ແຈ້ງ
          <input
            name="reported_by"
            maxLength={120}
            defaultValue={i?.reported_by ?? ''}
            placeholder="ຊື່ຄົນ ຫຼື ພະແນກທີ່ແຈ້ງມາ"
            className={field}
          />
        </label>

        <label className={`${label} sm:col-span-2 lg:col-span-3`}>
          ຜົນກະທົບ
          <input
            name="impact"
            maxLength={300}
            defaultValue={i?.impact ?? ''}
            placeholder="ທັງຫ້ອງການໃຊ້ອິນເຕີເນັດບໍ່ໄດ້ · ຂາຍໜ້າຮ້ານຍັງໃຊ້ໄດ້ປົກກະຕິ"
            className={field}
          />
        </label>

        <label className={`${label} sm:col-span-2 lg:col-span-3`}>
          ສາເຫດ
          <textarea
            name="cause"
            rows={2}
            defaultValue={i?.cause ?? ''}
            className={field}
          />
        </label>

        <label className={`${label} sm:col-span-2 lg:col-span-3`}>
          ແກ້ໄຂແນວໃດ
          <textarea
            name="action"
            rows={2}
            defaultValue={i?.action ?? ''}
            className={field}
          />
        </label>

        <label className={`${label} sm:col-span-2 lg:col-span-3`}>
          ກັນບໍ່ໃຫ້ເກີດຄືນແນວໃດ
          <textarea
            name="prevention"
            rows={2}
            defaultValue={i?.prevention ?? ''}
            placeholder="ຂໍ້ນີ້ສຳຄັນ — ບໍ່ຂຽນໄວ້ ເລື່ອງເກົ່າຈະເກີດຊໍ້າ"
            className={field}
          />
        </label>
      </div>

      <SubmitButton className="btn-primary mt-4 rounded-lg px-5 py-2 text-sm font-medium">
        {editing ? 'ບັນທຶກການແກ້ໄຂ' : 'ບັນທຶກເຫດຂັດຂ້ອງ'}
      </SubmitButton>
    </ActionForm>
  )
}

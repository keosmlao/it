'use client'

import ActionForm, { SubmitButton } from '@/components/action-form'
import {
  IP_KIND_LABEL_LO,
  IP_STATUS_LABEL_LO,
  IP_STATUS_STYLE,
  type IpAssignment,
} from '@/lib/network/model'
import { deleteIpAssignment } from '../actions'

export default function IpRow({
  ip,
  editable,
}: {
  ip: IpAssignment
  editable: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-2.5">
      <span className="w-32 font-mono text-sm text-fg">{ip.ip}</span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-body">
          {ip.hostname ?? ip.asset_name ?? ip.employee_name ?? '—'}
        </span>
        <span className="text-xs text-muted">
          {IP_KIND_LABEL_LO[ip.kind]}
          {ip.asset_code && ` · ${ip.asset_code}`}
          {ip.mac_address && ` · ${ip.mac_address}`}
          {ip.note && ` · ${ip.note}`}
        </span>
      </span>

      <span
        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${IP_STATUS_STYLE[ip.status]}`}
      >
        {IP_STATUS_LABEL_LO[ip.status]}
      </span>

      {editable && (
        <ActionForm action={deleteIpAssignment}>
          <input type="hidden" name="id" value={ip.id} />
          <SubmitButton
            className="rounded-lg px-3 py-1 text-xs text-muted hover:text-red-600"
            pendingLabel="…"
          >
            ລຶບ
          </SubmitButton>
        </ActionForm>
      )}
    </div>
  )
}

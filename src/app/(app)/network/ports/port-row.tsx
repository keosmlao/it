'use client'

import ActionForm, { SubmitButton } from '@/components/action-form'
import type { SwitchPort } from '@/lib/network/model'
import { deleteSwitchPort } from '../actions'

export default function PortRow({
  port,
  editable,
}: {
  port: SwitchPort
  editable: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-2.5">
      <span className="w-40 truncate text-xs text-muted">
        {port.switch_name ?? port.switch_asset_code}
      </span>

      <span className="w-24 font-mono text-sm text-fg">{port.port_label}</span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-body">
          {port.room ?? port.description ?? '—'}
        </span>
        <span className="text-xs text-muted">
          {port.patch_panel && `${port.patch_panel} · `}
          {port.vlan_id !== null && `VLAN ${port.vlan_id} · `}
          {port.connected_asset_name ?? port.connected_asset_code ?? 'ບໍ່ໄດ້ຜູກເຄື່ອງ'}
        </span>
      </span>

      {port.is_uplink && (
        <span className="rounded-full bg-brand-sky/20 px-2 py-0.5 text-xs font-medium text-brand-navy dark:text-brand-sky">
          uplink
        </span>
      )}

      {editable && (
        <ActionForm action={deleteSwitchPort}>
          <input type="hidden" name="id" value={port.id} />
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

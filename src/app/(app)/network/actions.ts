'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { query } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { logAudit } from '@/lib/activity'
import { isCidr, isIPv4, isIpKind, isIpStatus } from '@/lib/network/model'
import type { FormState } from '@/lib/action-state'

// ------------------------------------------------------------ ວົງເນັດ

export async function saveSegment(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.module(user, 'network', 'edit')) return { error: 'ບໍ່ມີສິດແກ້ຂໍ້ມູນເຄືອຂ່າຍ' }

  const id = String(formData.get('id') ?? '').trim()
  const name = String(formData.get('name') ?? '')
    .trim()
    .slice(0, 120)
  const cidr = String(formData.get('cidr') ?? '').trim().slice(0, 50)

  if (!name) return { error: 'ກະລຸນາປ້ອນຊື່ວົງເນັດ' }
  if (!isCidr(cidr)) return { error: 'ຮູບແບບ CIDR ບໍ່ຖືກຕ້ອງ (ຕົວຢ່າງ 10.0.10.0/24)' }

  const vlanRaw = String(formData.get('vlan_id') ?? '').trim()
  const vlan = vlanRaw ? Number(vlanRaw) : null
  if (vlan !== null && (!Number.isInteger(vlan) || vlan < 1 || vlan > 4094)) {
    return { error: 'VLAN ຕ້ອງຢູ່ລະຫວ່າງ 1 ຫາ 4094' }
  }

  const gateway = String(formData.get('gateway') ?? '').trim() || null
  if (gateway && !isIPv4(gateway)) return { error: 'Gateway ບໍ່ຖືກຮູບແບບ IP' }

  const params = [
    name,
    vlan,
    cidr,
    gateway,
    String(formData.get('dns') ?? '').trim().slice(0, 120) || null,
    String(formData.get('dhcp_range') ?? '').trim().slice(0, 80) || null,
    String(formData.get('location_code') ?? '').trim().slice(0, 20) || null,
    String(formData.get('purpose') ?? '').trim().slice(0, 200) || null,
    String(formData.get('note') ?? '').trim() || null,
  ]

  try {
    if (id) {
      const rows = await query<{ id: string }>(
        `update it.network_segments
            set name = $2::varchar, vlan_id = $3::int, cidr = $4::varchar,
                gateway = $5::varchar, dns = $6::varchar, dhcp_range = $7::varchar,
                location_code = $8::varchar, purpose = $9::varchar, note = $10::text,
                updated_at = now()
          where id = $1::bigint
          returning id`,
        [id, ...params]
      )
      if (rows.length === 0) return { error: 'ບໍ່ພົບວົງເນັດນີ້' }
      await logAudit(user.employee_id, 'network_segment', id, 'update', name)
      revalidatePath(`/network/${id}`)
    } else {
      const rows = await query<{ id: string }>(
        `insert into it.network_segments
           (name, vlan_id, cidr, gateway, dns, dhcp_range, location_code, purpose,
            note, created_by)
         values ($1::varchar, $2::int, $3::varchar, $4::varchar, $5::varchar,
                 $6::varchar, $7::varchar, $8::varchar, $9::text, $10::int)
         returning id`,
        [...params, user.employee_id]
      )
      await logAudit(user.employee_id, 'network_segment', rows[0].id, 'create', name)
      revalidatePath('/network')
      redirect(`/network/${rows[0].id}`)
    }
  } catch (err) {
    if (String((err as { code?: string })?.code) === '23505') {
      return { error: 'ວົງເນັດ (CIDR) ນີ້ມີໃນທະບຽນແລ້ວ' }
    }
    throw err
  }

  revalidatePath('/network')
  return { ok: true }
}

// -------------------------------------------------------------- IP

export async function saveIpAssignment(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.module(user, 'network', 'edit')) return { error: 'ບໍ່ມີສິດແກ້ທະບຽນ IP' }

  const id = String(formData.get('id') ?? '').trim()
  const segmentId = String(formData.get('segment_id') ?? '').trim()
  const ip = String(formData.get('ip_address') ?? '').trim()

  if (!/^\d+$/.test(segmentId)) return { error: 'ກະລຸນາເລືອກວົງເນັດ' }
  if (!isIPv4(ip)) return { error: 'IP ບໍ່ຖືກຮູບແບບ (ຕົວຢ່າງ 10.0.10.25)' }

  const kind = String(formData.get('kind') ?? 'static').trim()
  const status = String(formData.get('status') ?? 'in_use').trim()
  if (!isIpKind(kind)) return { error: 'ປະເພດການຈ່າຍ IP ບໍ່ຖືກຕ້ອງ' }
  if (!isIpStatus(status)) return { error: 'ສະຖານະບໍ່ຖືກຕ້ອງ' }

  const employeeId = String(formData.get('employee_id') ?? '').trim()

  const params = [
    Number(segmentId),
    ip,
    String(formData.get('hostname') ?? '').trim().slice(0, 120) || null,
    String(formData.get('asset_code') ?? '').trim().slice(0, 40) || null,
    String(formData.get('mac_address') ?? '').trim().slice(0, 60) || null,
    employeeId && /^\d+$/.test(employeeId) ? Number(employeeId) : null,
    kind,
    status,
    String(formData.get('note') ?? '').trim().slice(0, 300) || null,
  ]

  try {
    if (id) {
      const rows = await query<{ id: string }>(
        `update it.ip_assignments
            set segment_id = $2::bigint, ip_address = $3::inet, hostname = $4::varchar,
                asset_code = $5::varchar, mac_address = $6::varchar,
                employee_id = $7::int, kind = $8::varchar, status = $9::varchar,
                note = $10::varchar, updated_at = now()
          where id = $1::bigint
          returning id`,
        [id, ...params]
      )
      if (rows.length === 0) return { error: 'ບໍ່ພົບ IP ນີ້' }
      await logAudit(user.employee_id, 'ip_assignment', id, 'update', ip)
    } else {
      const rows = await query<{ id: string }>(
        `insert into it.ip_assignments
           (segment_id, ip_address, hostname, asset_code, mac_address, employee_id,
            kind, status, note, created_by)
         values ($1::bigint, $2::inet, $3::varchar, $4::varchar, $5::varchar,
                 $6::int, $7::varchar, $8::varchar, $9::varchar, $10::int)
         returning id`,
        [...params, user.employee_id]
      )
      await logAudit(user.employee_id, 'ip_assignment', rows[0].id, 'create', ip)
    }
  } catch (err) {
    if (String((err as { code?: string })?.code) === '23505') {
      return { error: `IP ${ip} ຖືກຈອງໄວ້ແລ້ວ — ຄົ້ນຫາເບິ່ງກ່ອນ` }
    }
    throw err
  }

  revalidatePath('/network')
  revalidatePath(`/network/${segmentId}`)
  return { ok: true }
}

export async function deleteIpAssignment(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.module(user, 'network', 'delete')) return { error: 'ບໍ່ມີສິດລຶບ' }

  const id = String(formData.get('id') ?? '').trim()
  const rows = await query<{ segment_id: string }>(
    'delete from it.ip_assignments where id = $1::bigint returning segment_id',
    [id]
  )
  if (rows.length === 0) return { error: 'ບໍ່ພົບ IP ນີ້' }

  await logAudit(user.employee_id, 'ip_assignment', id, 'delete')
  revalidatePath(`/network/${rows[0].segment_id}`)
  revalidatePath('/network')
  return { ok: true }
}

// ----------------------------------------------------------- ພອດສະວິດ

export async function saveSwitchPort(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.module(user, 'network', 'edit')) return { error: 'ບໍ່ມີສິດແກ້ຜັງພອດ' }

  const id = String(formData.get('id') ?? '').trim()
  const switchCode = String(formData.get('switch_asset_code') ?? '')
    .trim()
    .slice(0, 40)
  const portLabel = String(formData.get('port_label') ?? '').trim().slice(0, 30)

  if (!switchCode) return { error: 'ກະລຸນາເລືອກສະວິດ' }
  if (!portLabel) return { error: 'ກະລຸນາປ້ອນເລກພອດ' }

  const vlanRaw = String(formData.get('vlan_id') ?? '').trim()
  const vlan = vlanRaw ? Number(vlanRaw) : null
  if (vlan !== null && (!Number.isInteger(vlan) || vlan < 1 || vlan > 4094)) {
    return { error: 'VLAN ຕ້ອງຢູ່ລະຫວ່າງ 1 ຫາ 4094' }
  }

  const params = [
    switchCode,
    portLabel,
    String(formData.get('description') ?? '').trim().slice(0, 200) || null,
    String(formData.get('patch_panel') ?? '').trim().slice(0, 60) || null,
    String(formData.get('room') ?? '').trim().slice(0, 120) || null,
    vlan,
    String(formData.get('connected_asset_code') ?? '').trim().slice(0, 40) || null,
    String(formData.get('is_uplink') ?? '') === '1',
    String(formData.get('note') ?? '').trim().slice(0, 300) || null,
  ]

  try {
    if (id) {
      const rows = await query<{ id: string }>(
        `update it.switch_ports
            set switch_asset_code = $2::varchar, port_label = $3::varchar,
                description = $4::varchar, patch_panel = $5::varchar,
                room = $6::varchar, vlan_id = $7::int,
                connected_asset_code = $8::varchar, is_uplink = $9::boolean,
                note = $10::varchar, updated_at = now()
          where id = $1::bigint
          returning id`,
        [id, ...params]
      )
      if (rows.length === 0) return { error: 'ບໍ່ພົບພອດນີ້' }
      await logAudit(user.employee_id, 'switch_port', id, 'update', portLabel)
    } else {
      const rows = await query<{ id: string }>(
        `insert into it.switch_ports
           (switch_asset_code, port_label, description, patch_panel, room, vlan_id,
            connected_asset_code, is_uplink, note, created_by)
         values ($1::varchar, $2::varchar, $3::varchar, $4::varchar, $5::varchar,
                 $6::int, $7::varchar, $8::boolean, $9::varchar, $10::int)
         returning id`,
        [...params, user.employee_id]
      )
      await logAudit(user.employee_id, 'switch_port', rows[0].id, 'create', portLabel)
    }
  } catch (err) {
    if (String((err as { code?: string })?.code) === '23505') {
      return { error: `ພອດ ${portLabel} ຂອງສະວິດນີ້ລົງທະບຽນໄວ້ແລ້ວ` }
    }
    throw err
  }

  revalidatePath('/network/ports')
  return { ok: true }
}

export async function deleteSwitchPort(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  if (!can.module(user, 'network', 'delete')) return { error: 'ບໍ່ມີສິດລຶບ' }

  const id = String(formData.get('id') ?? '').trim()
  const rows = await query<{ id: string }>(
    'delete from it.switch_ports where id = $1::bigint returning id',
    [id]
  )
  if (rows.length === 0) return { error: 'ບໍ່ພົບພອດນີ້' }

  await logAudit(user.employee_id, 'switch_port', id, 'delete')
  revalidatePath('/network/ports')
  return { ok: true }
}

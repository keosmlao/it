import 'server-only'
import { query } from '@/lib/db'
import type { IpAssignment, NetworkSegment, SwitchPort } from './model'

export async function listSegments(includeInactive = false) {
  return query<NetworkSegment>(
    `select * from it.v_network_segments
      where $1::boolean or is_active
      order by vlan_id nulls last, name`,
    [includeInactive]
  )
}

export async function getSegment(id: string) {
  const rows = await query<NetworkSegment>(
    'select * from it.v_network_segments where id = $1::bigint',
    [id]
  )
  return rows[0] ?? null
}

export async function listIpAssignments(
  filters: { segment?: string; status?: string; q?: string } = {}
) {
  const params: unknown[] = []
  const where: string[] = ['true']

  if (filters.segment && filters.segment !== 'all') {
    params.push(filters.segment)
    where.push(`segment_id = $${params.length}::bigint`)
  }

  if (filters.status && filters.status !== 'all') {
    params.push(filters.status)
    where.push(`status = $${params.length}`)
  }

  if (filters.q) {
    params.push(`%${filters.q}%`)
    const i = params.length
    where.push(
      `(host(ip_address) ilike $${i} or hostname ilike $${i}
        or asset_code ilike $${i} or mac_address ilike $${i}
        or employee_name ilike $${i})`
    )
  }

  return query<IpAssignment>(
    `select * from it.v_ip_assignments
      where ${where.join(' and ')}
      order by segment_name, ip_address
      limit 500`,
    params
  )
}

export async function listSwitchPorts(
  filters: { switchCode?: string; q?: string } = {}
) {
  const params: unknown[] = []
  const where: string[] = ['true']

  if (filters.switchCode && filters.switchCode !== 'all') {
    params.push(filters.switchCode)
    where.push(`switch_asset_code = $${params.length}`)
  }

  if (filters.q) {
    params.push(`%${filters.q}%`)
    const i = params.length
    where.push(
      `(port_label ilike $${i} or description ilike $${i} or room ilike $${i}
        or patch_panel ilike $${i} or switch_name ilike $${i})`
    )
  }

  return query<SwitchPort>(
    `select * from it.v_switch_ports
      where ${where.join(' and ')}
      order by switch_name nulls last, port_label
      limit 500`,
    params
  )
}

/** ສະວິດທີ່ມີພອດລົງທະບຽນແລ້ວ — ໃຊ້ເປັນຕົວກັ່ນຕອງ */
export async function getSwitchOptions() {
  return query<{ switch_asset_code: string; switch_name: string | null; ports: string }>(
    `select switch_asset_code, max(switch_name) as switch_name, count(*) as ports
       from it.v_switch_ports
      group by switch_asset_code
      order by max(switch_name) nulls last`
  )
}

export async function getNetworkStats() {
  const rows = await query<{ segments: string; ips: string; ports: string }>(
    `select (select count(*) from it.network_segments where is_active) as segments,
            (select count(*) from it.ip_assignments)                   as ips,
            (select count(*) from it.switch_ports where is_active)     as ports`
  )
  return rows[0]
}

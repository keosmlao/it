/**
 * ເອກະສານເຄືອຂ່າຍ — ຄ່າຄົງທີ່ໃຊ້ໄດ້ທັງ server ແລະ client
 * ຕ້ອງກົງກັບ check constraint ຂອງ db/migrations/046_network.sql
 */

export const IP_KINDS = ['static', 'reservation', 'reserved', 'dhcp'] as const
export type IpKind = (typeof IP_KINDS)[number]

export const IP_KIND_LABEL_LO: Record<IpKind, string> = {
  static: 'ຕັ້ງຄົງທີ່ໃນເຄື່ອງ',
  reservation: 'ຈອງໄວ້ໃນ DHCP',
  reserved: 'ກັນໄວ້ (ຍັງບໍ່ໃຊ້)',
  dhcp: 'ແຈກຈາກ DHCP',
}

export const IP_STATUSES = ['in_use', 'free', 'blocked'] as const
export type IpStatus = (typeof IP_STATUSES)[number]

export const IP_STATUS_LABEL_LO: Record<IpStatus, string> = {
  in_use: 'ໃຊ້ຢູ່',
  free: 'ຫວ່າງ',
  blocked: 'ຫ້າມໃຊ້',
}

export const IP_STATUS_STYLE: Record<IpStatus, string> = {
  in_use: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  free: 'bg-slate-100 text-muted dark:bg-white/5',
  blocked: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
}

export type NetworkSegment = {
  id: string
  name: string
  vlan_id: number | null
  cidr: string
  gateway: string | null
  dns: string | null
  dhcp_range: string | null
  location_code: string | null
  location_name: string | null
  purpose: string | null
  note: string | null
  is_active: boolean
  created_by: number
  created_at: string
  updated_at: string
  ip_count: string
  ip_in_use: string
}

export type IpAssignment = {
  id: string
  segment_id: string
  segment_name: string
  vlan_id: number | null
  cidr: string
  ip: string
  hostname: string | null
  asset_code: string | null
  asset_name: string | null
  mac_address: string | null
  employee_id: number | null
  employee_name: string | null
  kind: IpKind
  status: IpStatus
  note: string | null
  created_by: number
  created_at: string
  updated_at: string
}

export type SwitchPort = {
  id: string
  switch_asset_code: string
  switch_name: string | null
  switch_location: string | null
  port_label: string
  description: string | null
  patch_panel: string | null
  room: string | null
  vlan_id: number | null
  connected_asset_code: string | null
  connected_asset_name: string | null
  is_uplink: boolean
  is_active: boolean
  note: string | null
  created_by: number
  created_at: string
  updated_at: string
}

export function isIpKind(value: string): value is IpKind {
  return (IP_KINDS as readonly string[]).includes(value)
}

export function isIpStatus(value: string): value is IpStatus {
  return (IP_STATUSES as readonly string[]).includes(value)
}

/** ຮູບແບບ IPv4 ຢ່າງງ່າຍ — ຖານຂໍ້ມູນຈະກວດຊໍ້າອີກເທື່ອດ້ວຍຊະນິດ inet */
export function isIPv4(value: string): boolean {
  const parts = value.trim().split('.')
  if (parts.length !== 4) return false
  return parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255)
}

/** ຮູບແບບ CIDR ເຊັ່ນ 10.0.10.0/24 */
export function isCidr(value: string): boolean {
  const [addr, bits] = value.trim().split('/')
  if (!addr || !bits) return false
  if (!isIPv4(addr)) return false
  const n = Number(bits)
  return Number.isInteger(n) && n >= 0 && n <= 32
}

import 'server-only'
import { query } from '@/lib/db'
import { can, type ItStaff } from '@/lib/auth/roles'

/**
 * ຄົ້ນຫາຂ້າມໂມດູນ
 *
 * ເມື່ອກ່ອນຊ່ອງຄົ້ນຫາເທິງຫົວຫາໄດ້ແຕ່ ticket — ດຽວນີ້ມີ 16 ໂມດູນແລ້ວ
 * ຄົນຈຶ່ງຕ້ອງເດົາເອງວ່າຂໍ້ມູນທີ່ຢາກໄດ້ຢູ່ໜ້າໃດ
 *
 * ແຕ່ລະແຫຼ່ງຈຳກັດ 5 ແຖວ ແລະ ແລ່ນພ້ອມກັນ — ໜ້ານີ້ຕ້ອງໄວພໍທີ່ຈະພິມແລ້ວກົດ Enter
 * ໄດ້ເລີຍ ບໍ່ແມ່ນລາຍງານ
 */

export type SearchHit = {
  group: string
  href: string
  title: string
  subtitle: string | null
  badge: string | null
}

export type SearchResults = {
  hits: SearchHit[]
  total: number
}

export async function searchAll(user: ItStaff, term: string): Promise<SearchResults> {
  const q = term.trim()
  if (q.length < 2) return { hits: [], total: 0 }

  const like = `%${q}%`
  const sources: Promise<SearchHit[]>[] = [
    tickets(like),
    assets(like),
    articles(like),
    subscriptions(like),
    incidents(like),
    maintenance(like),
    consumables(like),
    ipAddresses(like),
    vendors(like),
  ]

  // ບັນຊີຜູ້ໃຊ້ເປັນຂໍ້ມູນອ່ອນໄຫວ — ຄົ້ນໄດ້ສະເພາະຄົນທີ່ຮັບຜິດຊອບ
  if (can.manageAccounts(user)) sources.push(accounts(like))

  const results = await Promise.all(sources)
  const hits = results.flat()
  return { hits, total: hits.length }
}

async function tickets(like: string): Promise<SearchHit[]> {
  const rows = await query<{
    id: string
    ticket_no: string
    title: string
    status_label: string | null
    requester_name: string | null
  }>(
    `select id, ticket_no, title, category_name_lo as status_label, requester_name
       from it.v_tickets
      where ticket_no ilike $1::text or title ilike $1::text
      order by created_at desc
      limit 5`,
    [like]
  )
  return rows.map((r) => ({
    group: 'Ticket',
    href: `/tickets/${r.id}`,
    title: r.title,
    subtitle: `${r.ticket_no}${r.requester_name ? ` · ${r.requester_name}` : ''}`,
    badge: r.status_label,
  }))
}

async function assets(like: string): Promise<SearchHit[]> {
  const rows = await query<{
    asset_code: string
    name: string
    serial_no: string | null
    holder_name: string | null
    category_name: string | null
  }>(
    `select asset_code, name, serial_no, holder_name, category_name
       from it.v_it_assets
      where asset_code ilike $1::text or name ilike $1::text
         or serial_no ilike $1::text or mac_address ilike $1::text
      order by asset_code
      limit 5`,
    [like]
  )
  return rows.map((r) => ({
    group: 'ອຸປະກອນ',
    href: `/assets/${r.asset_code}`,
    title: r.name,
    subtitle: `${r.asset_code}${r.serial_no ? ` · S/N ${r.serial_no}` : ''}${
      r.holder_name ? ` · ${r.holder_name}` : ''
    }`,
    badge: r.category_name,
  }))
}

async function articles(like: string): Promise<SearchHit[]> {
  const rows = await query<{
    id: string
    title: string
    category_name_lo: string | null
    is_published: boolean
  }>(
    `select id, title, category_name_lo, is_published
       from it.v_kb_articles
      where title ilike $1::text or body ilike $1::text or keywords ilike $1::text
      order by updated_at desc
      limit 5`,
    [like]
  )
  return rows.map((r) => ({
    group: 'ຄັງຄວາມຮູ້',
    href: `/kb/${r.id}`,
    title: r.title,
    subtitle: r.is_published ? null : 'ຍັງບໍ່ໄດ້ເຜີຍແຜ່',
    badge: r.category_name_lo,
  }))
}

async function subscriptions(like: string): Promise<SearchHit[]> {
  const rows = await query<{
    id: string
    code: string
    service_name: string
    vendor: string | null
    status: string
  }>(
    `select id, code, service_name, vendor, status
       from it.v_subscriptions
      where code ilike $1::text or service_name ilike $1::text
         or vendor ilike $1::text or account_ref ilike $1::text
      order by service_name
      limit 5`,
    [like]
  )
  return rows.map((r) => ({
    group: 'ຄ່າເຊົ່າບໍລິການ',
    href: `/subscriptions/${r.id}`,
    title: r.service_name,
    subtitle: `${r.code}${r.vendor ? ` · ${r.vendor}` : ''}`,
    badge: r.status === 'active' ? null : 'ບໍ່ໄດ້ໃຊ້ງານ',
  }))
}

async function incidents(like: string): Promise<SearchHit[]> {
  const rows = await query<{
    id: string
    code: string
    title: string
    status: string
  }>(
    `select id, code, title, status
       from it.v_incidents
      where code ilike $1::text or title ilike $1::text or impact ilike $1::text
      order by started_at desc
      limit 5`,
    [like]
  )
  return rows.map((r) => ({
    group: 'ເຫດຂັດຂ້ອງ',
    href: `/incidents/${r.id}`,
    title: r.title,
    subtitle: r.code,
    badge: r.status === 'open' ? 'ຍັງບໍ່ຈົບ' : null,
  }))
}

async function maintenance(like: string): Promise<SearchHit[]> {
  const rows = await query<{
    id: string
    code: string
    title: string
    due_status: string
  }>(
    `select id, code, title, due_status
       from it.v_maintenance_plans
      where code ilike $1::text or title ilike $1::text
      order by next_due_date
      limit 5`,
    [like]
  )
  return rows.map((r) => ({
    group: 'ບຳລຸງຮັກສາ',
    href: `/maintenance/${r.id}`,
    title: r.title,
    subtitle: r.code,
    badge: r.due_status === 'overdue' ? 'ເລີຍກຳນົດ' : null,
  }))
}

async function consumables(like: string): Promise<SearchHit[]> {
  const rows = await query<{
    id: string
    code: string
    name: string
    on_hand: string
    unit: string
    stock_state: string
  }>(
    `select id, code, name, on_hand, unit, stock_state
       from it.v_consumables
      where code ilike $1::text or name ilike $1::text
      order by name
      limit 5`,
    [like]
  )
  return rows.map((r) => ({
    group: 'ຂອງສິ້ນເປືອງ',
    href: `/consumables/${r.id}`,
    title: r.name,
    subtitle: `${r.code} · ເຫຼືອ ${r.on_hand} ${r.unit}`,
    badge: r.stock_state === 'ok' ? null : 'ໃກ້ໝົດ',
  }))
}

async function ipAddresses(like: string): Promise<SearchHit[]> {
  const rows = await query<{
    segment_id: string
    ip: string
    hostname: string | null
    segment_name: string
    asset_code: string | null
  }>(
    `select segment_id, host(ip_address) as ip, hostname, segment_name, asset_code
       from it.v_ip_assignments
      where host(ip_address) ilike $1::text or hostname ilike $1::text
         or mac_address ilike $1::text
      order by ip_address
      limit 5`,
    [like]
  )
  return rows.map((r) => ({
    group: 'ທະບຽນ IP',
    href: `/network/${r.segment_id}`,
    title: r.ip,
    subtitle: `${r.segment_name}${r.hostname ? ` · ${r.hostname}` : ''}${
      r.asset_code ? ` · ${r.asset_code}` : ''
    }`,
    badge: null,
  }))
}

async function vendors(like: string): Promise<SearchHit[]> {
  const rows = await query<{
    id: string
    name: string
    contact_name: string | null
    support_phone: string | null
  }>(
    `select id, name, contact_name, support_phone
       from it.v_vendors
      where name ilike $1::text or contact_name ilike $1::text
         or phone ilike $1::text or support_phone ilike $1::text
      order by name
      limit 5`,
    [like]
  )
  return rows.map((r) => ({
    group: 'ຜູ້ຂາຍ',
    href: `/vendors/${r.id}`,
    title: r.name,
    subtitle: [r.contact_name, r.support_phone].filter(Boolean).join(' · ') || null,
    badge: null,
  }))
}

async function accounts(like: string): Promise<SearchHit[]> {
  const rows = await query<{
    system_name: string
    username: string
    employee_name: string | null
    should_close: boolean
  }>(
    `select system_name, username, employee_name, should_close
       from it.v_system_accounts
      where username ilike $1::text or employee_name ilike $1::text
      order by should_close desc, username
      limit 5`,
    [like]
  )
  return rows.map((r) => ({
    group: 'ບັນຊີຜູ້ໃຊ້',
    href: '/accounts',
    title: r.username,
    subtitle: `${r.system_name}${r.employee_name ? ` · ${r.employee_name}` : ''}`,
    badge: r.should_close ? 'ຄວນປິດ' : null,
  }))
}

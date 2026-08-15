import 'server-only'
import { query } from '@/lib/db'

/** ຄະແນນຄວາມພໍໃຈຫຼັງປິດ ticket (CSAT) — 1 ຫາ 5 ດາວ */
export type TicketRating = {
  ticket_id: string
  score: number
  comment: string | null
  rated_by: number
  rated_at: string
}

export const SCORE_LABEL_LO: Record<number, string> = {
  1: 'ບໍ່ພໍໃຈຢ່າງຍິ່ງ',
  2: 'ບໍ່ພໍໃຈ',
  3: 'ພໍໃຊ້',
  4: 'ພໍໃຈ',
  5: 'ພໍໃຈຫຼາຍ',
}

export async function getTicketRating(ticketId: string) {
  const rows = await query<TicketRating>(
    `select ticket_id, score, comment, rated_by, rated_at
       from it.ticket_ratings
      where ticket_id = $1::bigint`,
    [ticketId]
  )
  return rows[0] ?? null
}

/** ຄະແນນລວມໃນຊ່ວງເວລາ — ໃຊ້ໃນໜ້າລາຍງານ */
export async function getRatingSummary(from: string, to: string) {
  const rows = await query<{
    total: string
    average: string | null
    good: string
    bad: string
  }>(
    `select count(*)                                    as total,
            round(avg(score), 2)                        as average,
            count(*) filter (where score >= 4)          as good,
            count(*) filter (where score <= 2)          as bad
       from it.v_ticket_ratings
      where rated_at >= $1::date and rated_at < $2::date + 1`,
    [from, to]
  )
  return rows[0]
}

/** ຄະແນນຕໍ່ພະນັກງານ — ບອກຄຸນນະພາບ ບໍ່ແມ່ນພຽງຄວາມໄວ */
export async function getRatingByStaff(from: string, to: string) {
  return query<{
    assignee_employee_id: number | null
    assignee_name: string | null
    total: string
    average: string
    bad: string
  }>(
    `select assignee_employee_id, assignee_name,
            count(*)                           as total,
            round(avg(score), 2)               as average,
            count(*) filter (where score <= 2) as bad
       from it.v_ticket_ratings
      where rated_at >= $1::date and rated_at < $2::date + 1
      group by assignee_employee_id, assignee_name
      order by avg(score) desc
      limit 20`,
    [from, to]
  )
}

/** ຄຳຕິຊົມຫຼ້າສຸດ — ອ່ານຄຳເວົ້າຈິງໄດ້ຄຸນຄ່າກວ່າຕົວເລກລວມ */
export async function getRecentComments(from: string, to: string, limit = 10) {
  return query<{
    ticket_id: string
    ticket_no: string
    title: string
    score: number
    comment: string
    requester_name: string | null
    assignee_name: string | null
    rated_at: string
  }>(
    `select ticket_id, ticket_no, title, score, comment, requester_name,
            assignee_name, rated_at
       from it.v_ticket_ratings
      where comment is not null and comment <> ''
        and rated_at >= $1::date and rated_at < $2::date + 1
      order by rated_at desc
      limit $3::int`,
    [from, to, limit]
  )
}

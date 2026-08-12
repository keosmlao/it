import 'server-only'
import { query } from '@/lib/db'

export type Article = {
  id: string
  title: string
  body: string
  category_code: string | null
  category_name_lo: string | null
  keywords: string | null
  is_published: boolean
  view_count: number
  author_employee_id: number
  author_name: string
  author_nickname: string | null
  created_at: string
  updated_at: string
}

export async function listArticles(filters: { category?: string; q?: string } = {}) {
  const params: unknown[] = []
  const where: string[] = ['is_published']

  if (filters.category) {
    params.push(filters.category)
    where.push(`category_code = $${params.length}`)
  }
  if (filters.q) {
    params.push(`%${filters.q}%`)
    const i = params.length
    where.push(`(title ilike $${i} or body ilike $${i} or keywords ilike $${i})`)
  }

  return query<Article>(
    `select * from it.v_kb_articles
      where ${where.join(' and ')}
      order by updated_at desc
      limit 200`,
    params
  )
}

export async function getArticle(id: string) {
  const rows = await query<Article>('select * from it.v_kb_articles where id = $1', [id])
  return rows[0] ?? null
}

/** ນັບຈຳນວນຄັ້ງທີ່ເປີດອ່ານ — ໃຊ້ຈັດອັນດັບບົດຄວາມທີ່ເປັນປະໂຫຍດ */
export async function recordView(id: string) {
  await query('update it.kb_articles set view_count = view_count + 1 where id = $1', [id])
}

'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { query } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { logAudit } from '@/lib/activity'

export type ActionState = { error?: string }

export async function saveArticle(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser()

  const id = String(formData.get('id') ?? '')
  const title = String(formData.get('title') ?? '').trim()
  const body = String(formData.get('body') ?? '').trim()
  if (!title || !body) return { error: 'ກະລຸນາປ້ອນຫົວຂໍ້ ແລະ ເນື້ອຫາ' }

  const values = [
    title,
    body,
    String(formData.get('category_code') ?? '') || null,
    String(formData.get('keywords') ?? '').trim() || null,
    formData.get('is_published') === 'on',
  ]

  let articleId = id
  if (id) {
    // ແກ້ໄຂໄດ້ສະເພາະຜູ້ຂຽນ ຫຼື ຜູ້ຈັດການ
    const rows = await query<{ id: string }>(
      `update it.kb_articles
          set title = $1::varchar, body = $2::text, category_code = $3::varchar,
              keywords = $4::varchar, is_published = $5::boolean, updated_at = now()
        where id = $6::bigint
          and ($7::boolean or author_employee_id = $8::int)
        returning id`,
      [...values, id, user.role === 'manager', user.employee_id]
    )
    if (!rows[0]) return { error: 'ບໍ່ມີສິດແກ້ໄຂບົດຄວາມນີ້' }
    await logAudit(user.employee_id, 'kb', id, 'update', title)
  } else {
    const rows = await query<{ id: string }>(
      `insert into it.kb_articles
         (title, body, category_code, keywords, is_published, author_employee_id)
       values ($1, $2, $3, $4, $5, $6)
       returning id`,
      [...values, user.employee_id]
    )
    articleId = rows[0].id
    await logAudit(user.employee_id, 'kb', articleId, 'create', title)
  }

  revalidatePath('/kb')
  redirect(`/kb/${articleId}`)
}

export async function deleteArticle(formData: FormData) {
  const user = await requireUser()
  const id = String(formData.get('id'))

  await query(
    `update it.kb_articles set deleted_at = now()
      where id = $1::bigint and ($2::boolean or author_employee_id = $3::int)`,
    [id, user.role === 'manager', user.employee_id]
  )

  await logAudit(user.employee_id, 'kb', id, 'delete')
  revalidatePath('/kb')
  redirect('/kb')
}

'use server'

import { revalidatePath } from 'next/cache'
import { query } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'

export async function markRead(formData: FormData) {
  const user = await requireUser()
  await query(
    `update it.notifications set is_read = true
      where id = $1 and employee_id = $2`,
    [String(formData.get('id')), user.employee_id]
  )
  revalidatePath('/notifications')
  revalidatePath('/', 'layout')
}

export async function markAllRead() {
  const user = await requireUser()
  await query(
    `update it.notifications set is_read = true
      where employee_id = $1 and is_read = false`,
    [user.employee_id]
  )
  revalidatePath('/notifications')
  revalidatePath('/', 'layout')
}

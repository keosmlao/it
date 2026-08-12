import Link from 'next/link'
import { requireUser } from '@/lib/auth/session'
import { getCategories } from '@/lib/tickets/queries'
import ArticleForm from '../article-form'

export const metadata = { title: 'ຂຽນບົດຄວາມ' }

export default async function NewArticlePage() {
  await requireUser()
  const categories = await getCategories()

  return (
    <div className="w-full">
      <Link
        href="/kb"
        className="text-sm text-muted underline-offset-2 hover:underline"
      >
        ← ກັບໄປຄັງຄວາມຮູ້
      </Link>

      <ArticleForm categories={categories} />
    </div>
  )
}

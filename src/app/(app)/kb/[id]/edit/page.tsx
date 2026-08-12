import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/session'
import { getArticle } from '@/lib/kb/queries'
import { getCategories } from '@/lib/tickets/queries'
import ArticleForm from '../../article-form'

export const metadata = { title: 'ແກ້ໄຂບົດຄວາມ' }

export default async function EditArticlePage({
  params,
}: PageProps<'/kb/[id]/edit'>) {
  const { id } = await params
  const user = await requireUser()

  const article = await getArticle(id)
  if (!article) notFound()

  const canEdit =
    user.role === 'manager' || article.author_employee_id === user.employee_id
  if (!canEdit) redirect(`/kb/${id}`)

  const categories = await getCategories()

  return (
    <div className="w-full">
      <Link
        href={`/kb/${id}`}
        className="text-sm text-muted underline-offset-2 hover:underline"
      >
        ← ກັບໄປບົດຄວາມ
      </Link>

      <ArticleForm categories={categories} article={article} />
    </div>
  )
}

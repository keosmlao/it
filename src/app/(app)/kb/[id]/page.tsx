import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireModuleView } from '@/lib/auth/session'
import { getArticle, recordView } from '@/lib/kb/queries'
import { formatDateTime } from '@/lib/format'
import { deleteArticle } from '../actions'

export default async function ArticlePage({ params }: PageProps<'/kb/[id]'>) {
  const { id } = await params
  const user = await requireModuleView('kb')

  const article = await getArticle(id)
  if (!article) notFound()

  await recordView(id)

  const canEdit =
    user.role === 'manager' || article.author_employee_id === user.employee_id

  return (
    <div className="w-full">
      <Link
        href="/kb"
        className="text-sm text-muted underline-offset-2 hover:underline"
      >
        ← ກັບໄປຄັງຄວາມຮູ້
      </Link>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-fg">
            {article.title}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {article.category_name_lo ?? 'ບໍ່ລະບຸປະເພດ'} ·{' '}
            {article.author_nickname ?? article.author_name} · ອັບເດດ{' '}
            {formatDateTime(article.updated_at)} · ອ່ານ {article.view_count} ຄັ້ງ
          </p>
        </div>

        {canEdit && (
          <div className="flex gap-2">
            <Link
              href={`/kb/${article.id}/edit`}
              className="btn-secondary rounded px-3 py-1.5 text-[13px]"
            >
              ແກ້ໄຂ
            </Link>
            <form action={deleteArticle}>
              <input type="hidden" name="id" value={article.id} />
              <button
                type="submit"
                className="btn-danger rounded px-3 py-1.5 text-[13px]"
              >
                ລຶບ
              </button>
            </form>
          </div>
        )}
      </header>

      <article className="mt-5 glass-card rounded-xl p-6">
        <p className="whitespace-pre-wrap text-body">
          {article.body}
        </p>
      </article>

      {article.keywords && (
        <p className="mt-3 text-sm text-muted">
          ຄຳຄົ້ນຫາ: {article.keywords}
        </p>
      )}
    </div>
  )
}

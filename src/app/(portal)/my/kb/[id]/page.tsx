import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth/session'
import { getArticle, recordView } from '@/lib/kb/queries'

export default async function PortalArticlePage({ params }: PageProps<'/my/kb/[id]'>) {
  const { id } = await params
  await requireUser()

  const article = await getArticle(id)
  if (!article || !article.is_published) notFound()

  await recordView(id)

  return (
    <div>
      <Link href="/my/kb" className="text-sm text-muted underline-offset-2 hover:underline">
        ← ກັບໄປລາຍການ
      </Link>

      <h1 className="mt-2 text-xl font-semibold text-fg">{article.title}</h1>
      <p className="text-xs text-muted">
        {article.category_name_lo ?? 'ອື່ນໆ'} · ໂດຍ {article.author_name}
      </p>

      <article className="glass-card mt-4 rounded-xl p-5">
        <p className="leading-relaxed whitespace-pre-wrap text-body">{article.body}</p>
      </article>

      <div className="mt-4 rounded-xl bg-brand-blue/5 px-4 py-3 text-sm text-muted">
        ລອງແລ້ວຍັງບໍ່ໄດ້?{' '}
        <Link href="/my/tickets/new" className="text-brand-blue hover:underline">
          ແຈ້ງບັນຫາໃຫ້ທີມໄອທີ →
        </Link>
      </div>
    </div>
  )
}

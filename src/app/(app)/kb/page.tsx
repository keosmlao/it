import Link from 'next/link'
import { requireUser } from '@/lib/auth/session'
import { listArticles } from '@/lib/kb/queries'
import { getCategories } from '@/lib/tickets/queries'
import { formatDateTime } from '@/lib/format'

export const metadata = { title: 'ຄັງຄວາມຮູ້' }

export default async function KbPage({ searchParams }: PageProps<'/kb'>) {
  const params = await searchParams
  await requireUser()

  const category = pick(params.category)
  const q = pick(params.q)

  const [articles, categories] = await Promise.all([
    listArticles({ category, q }),
    getCategories(),
  ])

  return (
    <div className="w-full">
      <div className="o-page-actions">
        <div>
          <p className="mt-1 text-sm text-muted">
            ວິທີແກ້ບັນຫາທີ່ພົບເລື້ອຍ · {articles.length} ບົດ
          </p>
        </div>

        <Link
          href="/kb/new"
          className="btn-primary rounded px-3 py-1.5 text-[13px] font-medium"
        >
          + ຂຽນບົດຄວາມ
        </Link>
      </div>

      <form className="o-filter-bar mt-3">
        <label className="flex flex-col gap-1 text-xs text-muted">
          ຄົ້ນຫາ
          <input
            name="q"
            defaultValue={q}
            placeholder="ຫົວຂໍ້ ຫຼື ເນື້ອຫາ"
            className="input w-64 rounded px-2 py-1 text-[13px]"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          ປະເພດ
          <select
            name="category"
            defaultValue={category}
            className="input rounded px-2 py-1 text-[13px]"
          >
            <option value="">ທັງໝົດ</option>
            {categories.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name_lo}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="btn-secondary rounded px-3 py-1.5 text-[13px]"
        >
          ຄົ້ນຫາ
        </button>
      </form>

      <div className="mt-5 divide-y divide-line glass-card rounded-xl">
        {articles.map((a) => (
          <Link
            key={a.id}
            href={`/kb/${a.id}`}
            className="block px-4 py-3 transition hover-surface"
          >
            <h2 className="font-medium text-fg">{a.title}</h2>
            <p className="mt-0.5 line-clamp-2 text-sm text-muted">
              {a.body}
            </p>
            <p className="mt-1 text-xs text-faint">
              {a.category_name_lo ?? 'ບໍ່ລະບຸປະເພດ'} ·{' '}
              {a.author_nickname ?? a.author_name} · ອັບເດດ{' '}
              {formatDateTime(a.updated_at)} · ອ່ານ {a.view_count} ຄັ້ງ
            </p>
          </Link>
        ))}

        {articles.length === 0 && (
          <p className="px-4 py-10 text-center text-muted">
            ຍັງບໍ່ມີບົດຄວາມ — ເລີ່ມຈາກບັນຫາທີ່ຖືກຖາມເລື້ອຍທີ່ສຸດ
          </p>
        )}
      </div>
    </div>
  )
}

function pick(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

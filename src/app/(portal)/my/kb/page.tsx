import Link from 'next/link'
import { requireUser } from '@/lib/auth/session'
import { listArticles } from '@/lib/kb/queries'

export const metadata = { title: 'ວິທີແກ້ບັນຫາດ້ວຍຕົນເອງ' }

export default async function PortalKbPage({ searchParams }: PageProps<'/my/kb'>) {
  const params = await searchParams
  await requireUser()

  const q = pick(params.q)
  const articles = await listArticles({ q })

  return (
    <div>
      <h1 className="text-lg font-semibold text-fg">ວິທີແກ້ບັນຫາດ້ວຍຕົນເອງ</h1>
      <p className="text-sm text-muted">
        ຫຼາຍບັນຫາແກ້ໄດ້ເອງພາຍໃນ 5 ນາທີ — ລອງເບິ່ງກ່ອນແຈ້ງ
      </p>

      <form className="glass-card mt-4 flex flex-wrap items-end gap-3 rounded-xl p-4">
        <input
          name="q"
          defaultValue={q}
          placeholder="ຄົ້ນຫາ ເຊັ່ນ ເຄື່ອງພິມ, ເນັດ, ລະຫັດຜ່ານ"
          className="input min-w-56 flex-1 rounded-lg px-3 py-2 text-sm"
        />
        <button type="submit" className="btn-secondary rounded-lg px-4 py-2 text-sm">
          ຄົ້ນຫາ
        </button>
      </form>

      <div className="glass-card mt-4 divide-y divide-line rounded-xl">
        {articles.map((a) => (
          <Link
            key={a.id}
            href={`/my/kb/${a.id}`}
            className="hover-surface block px-4 py-3 transition"
          >
            <p className="text-fg">{a.title}</p>
            <p className="text-xs text-muted">
              {a.category_name_lo ?? 'ອື່ນໆ'}
              {a.view_count > 0 && ` · ອ່ານແລ້ວ ${a.view_count} ຄັ້ງ`}
            </p>
          </Link>
        ))}

        {articles.length === 0 && (
          <p className="px-4 py-10 text-center text-muted">
            ບໍ່ພົບບົດຄວາມ — ລອງຄຳຄົ້ນຫາອື່ນ ຫຼື{' '}
            <Link href="/my/tickets/new" className="text-brand-blue hover:underline">
              ແຈ້ງບັນຫາ
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}

function pick(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

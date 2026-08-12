import Link from 'next/link'

export default function Pagination({ page, pageCount, total, query }: {
  page: number
  pageCount: number
  total: number
  query?: Record<string, string | string[] | undefined>
}) {
  if (pageCount <= 1) return null
  const href = (next: number) => {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query ?? {})) {
      if (key === 'page' || value === undefined) continue
      for (const item of Array.isArray(value) ? value : [value]) params.append(key, item)
    }
    params.set('page', String(next))
    return `?${params}`
  }

  return (
    <nav className="mt-4 flex items-center justify-between gap-3" aria-label="ແບ່ງໜ້າ">
      <p className="text-xs text-muted">ທັງໝົດ {total} ລາຍການ · ໜ້າ {page}/{pageCount}</p>
      <div className="flex gap-2">
        {page > 1 && <Link href={href(page - 1)} className="btn-secondary rounded-lg px-3 py-1.5 text-sm">← ກ່ອນໜ້າ</Link>}
        {page < pageCount && <Link href={href(page + 1)} className="btn-secondary rounded-lg px-3 py-1.5 text-sm">ຖັດໄປ →</Link>}
      </div>
    </nav>
  )
}

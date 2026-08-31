import Link from 'next/link'

/**
 * ຕົວນັບໜ້າແບບ Odoo — "81-160 / 421" ພ້ອມລູກສອນສອງອັນ
 *
 * ບອກຊ່ວງແຖວທີ່ກຳລັງເບິ່ງ ບໍ່ແມ່ນເລກໜ້າ ເພາະຄົນຢາກຮູ້ວ່າ
 * ເຫຼືອອີກຈັກລາຍການ ບໍ່ແມ່ນວ່າຢູ່ໜ້າທີ່ເທົ່າໃດ
 */
export default function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  query,
}: {
  page: number
  pageCount: number
  total: number
  /** ຈຳນວນຕໍ່ໜ້າ — ບໍ່ໃສ່ກໍ່ຄິດເອົາຈາກຍອດລວມ */
  pageSize?: number
  query?: Record<string, string | string[] | undefined>
}) {
  if (pageCount <= 1) return null

  const size = pageSize ?? Math.ceil(total / pageCount)
  const from = (page - 1) * size + 1
  const to = Math.min(page * size, total)

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
    <nav
      className="o-pager mt-2 flex justify-end py-1"
      aria-label="ແບ່ງໜ້າ"
    >
      <span className="tabular-nums">
        {from}-{to} / {total}
      </span>

      {page > 1 ? (
        <Link href={href(page - 1)} aria-label="ໜ້າກ່ອນ">
          ‹
        </Link>
      ) : (
        <span className="w-[22px] text-center text-faint">‹</span>
      )}

      {page < pageCount ? (
        <Link href={href(page + 1)} aria-label="ໜ້າຖັດໄປ">
          ›
        </Link>
      ) : (
        <span className="w-[22px] text-center text-faint">›</span>
      )}
    </nav>
  )
}

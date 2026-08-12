import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth/session'
import { getHolder, getHolderHistory } from '@/lib/assets/queries'
import { safeDate } from '@/lib/assets/model'

export default async function HolderHistoryPage({
  params,
}: PageProps<'/assets/holders/[code]'>) {
  const { code } = await params
  await requireUser()

  const empCode = decodeURIComponent(code)
  const [holder, history] = await Promise.all([
    getHolder(empCode),
    getHolderHistory(empCode),
  ])
  if (!holder) notFound()

  const holding = history.filter((h) => !h.is_returned)
  const returned = history.filter((h) => h.is_returned)

  return (
    <div className="w-full">
      <Link
        href="/assets/holders"
        className="text-sm text-muted underline-offset-2 hover:underline"
      >
        ← ກັບໄປລາຍຊື່ຜູ້ຖືຄອງ
      </Link>

      <header className="mt-3 flex flex-wrap items-center gap-3">
        <span className="brand-gradient-warm flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white">
          {(holder.emp_name ?? '?').slice(0, 1)}
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-fg">{holder.emp_name}</h1>
          <p className="text-sm text-muted">
            <span className="font-mono">{holder.emp_code}</span>
            {holder.department_name && ` · ${holder.department_name}`}
          </p>
        </div>
      </header>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <Stat label="ກຳລັງຖືຢູ່" value={holder.holding} highlight />
        <Stat label="ເຄີຍຢືມທັງໝົດ" value={holder.total} />
        <Stat label="ຢືມລ່າສຸດ" value={safeDate(holder.last_borrowed_at)} />
      </div>

      <Section title={`ກຳລັງຖືຄອງ (${holding.length})`} empty="ບໍ່ມີອຸປະກອນທີ່ຖືຢູ່">
        {holding.map((m, index) => (
          <MovementRow key={`${m.borrow_doc_no}-${index}`} movement={m} />
        ))}
      </Section>

      <Section title={`ຄືນແລ້ວ (${returned.length})`} empty="ຍັງບໍ່ມີປະຫວັດການຄືນ">
        {returned.map((m, index) => (
          <MovementRow key={`${m.return_doc_no}-${index}`} movement={m} />
        ))}
      </Section>
    </div>
  )
}

function Stat({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="glass-card rounded-xl p-4">
      <p className="text-xs text-muted">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold ${
          highlight && Number(value) > 0 ? 'text-brand-orange' : 'text-fg'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function Section({
  title,
  empty,
  children,
}: {
  title: string
  empty: string
  children: React.ReactNode[]
}) {
  return (
    <section className="mt-6">
      <h2 className="mb-3 text-lg font-semibold text-fg">{title}</h2>
      <div className="glass-card divide-line divide-y rounded-xl">
        {children.length > 0 ? (
          children
        ) : (
          <p className="px-4 py-8 text-center text-muted">{empty}</p>
        )}
      </div>
    </section>
  )
}

function MovementRow({
  movement,
}: {
  movement: {
    asset_code: string
    asset_name: string
    category_name: string | null
    brand: string | null
    model: string | null
    serial_no: string | null
    borrow_doc_no: string | null
    borrowed_at: string | null
    return_doc_no: string | null
    returned_at: string | null
    is_returned: boolean
  }
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
      <span className="min-w-0 flex-1">
        <Link
          href={`/assets/${encodeURIComponent(movement.asset_code)}`}
          className="block truncate text-fg underline-offset-2 hover:underline"
        >
          {movement.asset_name}
        </Link>
        <span className="block text-xs text-muted">
          <span className="font-mono">{movement.asset_code}</span>
          {[movement.category_name, movement.brand, movement.serial_no]
            .filter(Boolean)
            .map((part) => ` · ${part}`)}
        </span>
      </span>

      <span className="text-xs whitespace-nowrap text-muted">
        {safeDate(movement.borrowed_at)}
        {movement.is_returned && ` → ${safeDate(movement.returned_at)}`}
      </span>

      {!movement.is_returned && (
        <span className="rounded-full bg-brand-orange/20 px-2 py-0.5 text-xs font-medium text-brand-orange">
          ຍັງບໍ່ຄືນ
        </span>
      )}
    </div>
  )
}

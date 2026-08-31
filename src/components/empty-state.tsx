import Link from 'next/link'

export default function EmptyState({ title, description, action, href, compact = false }: {
  title: string
  description?: string
  action?: string
  href?: string
  compact?: boolean
}) {
  return (
    <div className={`text-center ${compact ? 'py-6' : 'glass-card rounded-xl px-5 py-12'}`}>
      <span className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-brand-blue/10 text-xl text-brand-blue" aria-hidden="true">◇</span>
      <h3 className="mt-3 font-semibold text-fg">{title}</h3>
      {description && <p className="mx-auto mt-1 max-w-md text-sm text-muted">{description}</p>}
      {action && href && <Link href={href} className="btn-primary mt-4 inline-flex rounded px-3 py-1.5 text-[13px]">{action}</Link>}
    </div>
  )
}

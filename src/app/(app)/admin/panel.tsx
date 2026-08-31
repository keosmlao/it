/**
 * ແຜ່ນເນື້ອຫາຂອງໜ້າຕັ້ງຄ່າ — ໃຊ້ຮ່ວມກັນທຸກໜ້າຍ່ອຍ
 *
 * ແຍກອອກມາຕອນຊອຍໜ້າ /admin ທີ່ຍາວ 625 ແຖວ ອອກເປັນເມນູຍ່ອຍ
 */
export function Panel({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="glass-card rounded p-4">
      <h2 className="font-semibold text-fg">{title}</h2>
      {hint && <p className="mt-1 mb-3 text-sm text-muted">{hint}</p>}
      <div className={hint ? '' : 'mt-3'}>{children}</div>
    </section>
  )
}

export function Stat({
  label,
  value,
  warn,
  danger,
}: {
  label: string
  value: string
  warn?: boolean
  danger?: boolean
}) {
  const n = Number(value)
  return (
    <div className="rounded bg-brand-blue/5 px-4 py-2">
      <p className="text-xs text-muted">{label}</p>
      <p
        className={`text-lg font-semibold ${
          n === 0
            ? 'text-fg'
            : danger
              ? 'text-red-600 dark:text-red-400'
              : warn
                ? 'text-brand-orange'
                : 'text-fg'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

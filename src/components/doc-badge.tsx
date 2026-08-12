/** ປ້າຍປະເພດເອກະສານ: ໃບຢືມ (ສົ້ມ) / ໃບຄືນ (ຂຽວ) */
export default function DocKindBadge({
  kind,
}: {
  kind: 'borrow' | 'return'
}) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        kind === 'borrow'
          ? 'bg-brand-orange/20 text-brand-orange'
          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
      }`}
    >
      {kind === 'borrow' ? 'ໃບຢືມ' : 'ໃບຄືນ'}
    </span>
  )
}

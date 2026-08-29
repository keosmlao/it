import Link from 'next/link'
import { isoDate } from '@/lib/format'
import type { TeamWeekCell } from '@/lib/plans/queries'

const DAY_LO = ['ອາ', 'ຈ', 'ອຄ', 'ພ', 'ພຫ', 'ສຸ', 'ສ']

/**
 * ຕາຕະລາງ 7 ມື້ × ຄົນ
 *
 * ຈຸດປະສົງບໍ່ແມ່ນສະແດງລາຍລະອຽດວຽກ ແຕ່ໃຫ້ເຫັນ "ໃຜບໍ່ໄດ້ວາງແຜນ" ໃນຕາດຽວ —
 * ຊ່ອງຫວ່າງຈຶ່ງຕ້ອງເຫັນຊັດກວ່າຊ່ອງທີ່ມີຂໍ້ມູນ
 */
export default function WeekGrid({
  cells,
  days,
  selected,
}: {
  cells: TeamWeekCell[]
  days: string[]
  selected: string
}) {
  const people = new Map<
    number,
    { name: string; unit: string | null; byDay: Map<string, TeamWeekCell> }
  >()

  for (const c of cells) {
    const person = people.get(c.employee_id) ?? {
      name: c.nickname || c.fullname_lo,
      unit: c.unit_name_lo,
      byDay: new Map<string, TeamWeekCell>(),
    }
    person.byDay.set(isoDate(c.plan_date), c)
    people.set(c.employee_id, person)
  }

  if (people.size === 0) return null

  return (
    <div className="glass-card mt-4 rounded-xl p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-fg">ພາບລວມ 7 ມື້</h2>
        <span className="text-xs text-muted">
          ຕົວເລກ = ວຽກທີ່ເຮັດແລ້ວ / ວຽກທັງໝົດ · ຂີດ = ຍັງບໍ່ໄດ້ວາງແຜນ
        </span>
      </div>

      <div className="-mx-4 mt-3 overflow-x-auto px-4">
        <table className="o-list w-full min-w-[620px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="pb-2 text-left text-xs font-medium text-muted">
                ພະນັກງານ
              </th>
              {days.map((d) => {
                const dt = new Date(`${d}T00:00:00`)
                return (
                  <th
                    key={d}
                    className={`px-1 pb-2 text-center text-xs font-medium ${
                      d === selected ? 'text-fg' : 'text-muted'
                    }`}
                  >
                    <Link
                      href={`/plans/team?date=${d}`}
                      className="block hover:underline"
                    >
                      {DAY_LO[dt.getDay()]}
                      <span className="block text-[10px] text-faint">
                        {d.slice(8)}
                      </span>
                    </Link>
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody>
            {[...people.entries()].map(([id, person]) => (
              <tr key={id} className="border-t border-line/60">
                <td className="py-1.5 pr-3">
                  <span className="text-sm text-fg">{person.name}</span>
                  {person.unit && (
                    <span className="ml-1 text-xs text-faint">
                      {person.unit}
                    </span>
                  )}
                </td>

                {days.map((d) => {
                  const cell = person.byDay.get(d)
                  const total = Number(cell?.item_count ?? 0)
                  const done = Number(cell?.done_count ?? 0)
                  const isSelected = d === selected

                  if (!cell || total === 0) {
                    return (
                      <td key={d} className="px-1 py-1.5 text-center">
                        <span
                          className={`inline-block w-full rounded-md py-1 text-xs ${
                            isSelected
                              ? 'bg-brand-orange/10 text-brand-orange'
                              : 'text-faint'
                          }`}
                          title="ຍັງບໍ່ໄດ້ວາງແຜນ"
                        >
                          —
                        </span>
                      </td>
                    )
                  }

                  const complete = done === total
                  return (
                    <td key={d} className="px-1 py-1.5 text-center">
                      <span
                        title={`${done}/${total} ວຽກ · ວາງແຜນ ${Number(
                          cell.planned_hours ?? 0
                        )} ຊມ`}
                        className={`inline-block w-full rounded-md py-1 text-xs font-medium ${
                          complete
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'bg-brand-blue/10 text-brand-blue'
                        } ${isSelected ? 'ring-1 ring-brand-blue/40' : ''}`}
                      >
                        {done}/{total}
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

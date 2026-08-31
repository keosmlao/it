import Link from 'next/link'
import { requireUser } from '@/lib/auth/session'
import { searchAll } from '@/lib/search/queries'
import EmptyState from '@/components/empty-state'

export const metadata = { title: 'ຄົ້ນຫາ' }

export default async function SearchPage({ searchParams }: PageProps<'/search'>) {
  const params = await searchParams
  const user = await requireUser()

  const q = pick(params.q).trim()
  const { hits, total } = q ? await searchAll(user, q) : { hits: [], total: 0 }

  // ຈັດເປັນກຸ່ມຕາມໂມດູນ ໂດຍຮັກສາລຳດັບທີ່ query ຄືນມາ
  const groups = new Map<string, typeof hits>()
  for (const hit of hits) {
    const list = groups.get(hit.group) ?? []
    list.push(hit)
    groups.set(hit.group, list)
  }

  return (
    <div className="w-full">
      <form className="glass-card flex flex-wrap items-end gap-3 rounded-xl p-4">
        <label className="flex flex-1 flex-col gap-1 text-xs text-muted">
          ຄົ້ນຫາທົ່ວລະບົບ
          <input
            name="q"
            defaultValue={q}
            autoFocus
            placeholder="ຊື່ຄົນ, ລະຫັດເຄື່ອງ, S/N, IP, ຊື່ບໍລິການ, ບົດຄວາມ…"
            className="input w-full rounded px-2 py-1 text-[13px]"
          />
        </label>
        <button type="submit" className="btn-primary rounded px-3 py-1.5 text-[13px]">
          ຄົ້ນຫາ
        </button>
      </form>

      {!q ? (
        <p className="mt-5 rounded-lg bg-brand-blue/5 px-4 py-3 text-sm text-body">
          ຫາໄດ້ໃນ: Ticket · ອຸປະກອນ (ລະຫັດ/ຊື່/S-N/MAC) · ຄັງຄວາມຮູ້ ·
          ຄ່າເຊົ່າບໍລິການ · ເຫດຂັດຂ້ອງ · ບຳລຸງຮັກສາ · ຂອງສິ້ນເປືອງ · ທະບຽນ IP ·
          ຜູ້ຂາຍ · ບັນຊີຜູ້ໃຊ້
        </p>
      ) : total === 0 ? (
        <div className="mt-5">
          <EmptyState
            title={`ບໍ່ພົບຫຍັງກົງກັບ “${q}”`}
            description="ລອງໃຊ້ຄຳສັ້ນລົງ ຫຼື ພິມສ່ວນໜຶ່ງຂອງລະຫັດ"
          />
        </div>
      ) : (
        <>
          <p className="mt-4 text-sm text-muted">
            ພົບ {total} ລາຍການໃນ {groups.size} ໝວດ
          </p>

          <div className="mt-4 space-y-4">
            {[...groups.entries()].map(([group, items]) => (
              <div key={group} className="glass-card rounded-xl">
                <h2 className="border-b border-line px-4 py-2.5 text-xs font-semibold tracking-wide text-muted uppercase">
                  {group} ({items.length})
                </h2>
                <div className="divide-line divide-y">
                  {items.map((hit, i) => (
                    <Link
                      key={`${hit.href}-${i}`}
                      href={hit.href}
                      className="hover-surface flex flex-wrap items-center gap-3 px-4 py-2.5 transition"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-fg">{hit.title}</span>
                        {hit.subtitle && (
                          <span className="block truncate text-xs text-muted">
                            {hit.subtitle}
                          </span>
                        )}
                      </span>
                      {hit.badge && (
                        <span className="rounded-full bg-brand-navy/10 px-2 py-0.5 text-xs text-muted dark:bg-white/5">
                          {hit.badge}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs text-faint">
            ສະແດງສູງສຸດ 5 ລາຍການຕໍ່ໝວດ — ຖ້າຫາບໍ່ພົບ ໃຫ້ເຂົ້າໜ້າຂອງໂມດູນນັ້ນແລ້ວກັ່ນຕອງ
          </p>
        </>
      )}
    </div>
  )
}

function pick(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

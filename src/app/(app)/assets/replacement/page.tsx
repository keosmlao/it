import Link from 'next/link'
import { requireUser } from '@/lib/auth/session'
import {
  PRIORITY_LABEL_LO,
  PRIORITY_STYLE,
  getCategoryNames,
  getReplacementByCategory,
  getReplacementSummary,
  listReplacementCandidates,
  reasonsOf,
} from '@/lib/assets/replacement'
import { formatMoney, safeDate } from '@/lib/assets/model'
import EmptyState from '@/components/empty-state'
import ExportMenu from '@/components/export-menu'

export const metadata = { title: 'ແຜນປ່ຽນເຄື່ອງ' }

export default async function ReplacementPage({
  searchParams,
}: PageProps<'/assets/replacement'>) {
  const params = await searchParams
  await requireUser()

  // ຕັ້ງຕົ້ນສະແດງສະເພາະອັນທີ່ຄວນວາງແຜນ — ບໍ່ດັ່ງນັ້ນລາຍການຈະຍາວຈົນອ່ານບໍ່ໄຫວ
  const priority = pick(params.priority) || 'plan'
  const category = pick(params.category) || 'all'
  const minAge = Number(pick(params.age) || '0')
  const q = pick(params.q)

  const [rows, summary, byCategory, categories] = await Promise.all([
    listReplacementCandidates({ priority, category, minAge, q }),
    getReplacementSummary(),
    getReplacementByCategory(),
    getCategoryNames(),
  ])

  const noPrice = Number(summary?.no_price ?? 0)

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          ເຂົ້າເງື່ອນໄຂທັງໝົດ {summary?.total ?? 0} ເຄື່ອງ · ດ່ວນ{' '}
          <span className="font-medium text-red-600 dark:text-red-400">
            {summary?.high ?? 0}
          </span>{' '}
          · ຄວນວາງແຜນ{' '}
          <span className="font-medium text-brand-orange">{summary?.medium ?? 0}</span> ·
          ເຝົ້າເບິ່ງ {summary?.low ?? 0}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/budget" className="btn-secondary rounded-lg px-4 py-2 text-sm">
            ໄປຕັ້ງງົບປະມານ →
          </Link>
          <ExportMenu dataset="replacement" query={{ q }} />
        </div>
      </div>

      <p className="mt-4 rounded-lg bg-brand-blue/5 px-4 py-3 text-sm text-body">
        ຄິດຈາກຂໍ້ມູນທີ່ມີຢູ່ແລ້ວ — ອາຍຸເກີນ 5 ປີ · ໝົດປະກັນ · ຄ່າສ້ອມເກີນ 40%
        ຂອງລາຄາຊື້ · ສ້ອມຫຼາຍກວ່າ 2 ຄັ້ງ · ສະພາບເພ. ຍິ່ງເຂົ້າຫຼາຍຂໍ້ຍິ່ງດ່ວນ
      </p>

      {noPrice > 0 && (
        <p className="mt-3 rounded-lg bg-brand-orange/10 px-4 py-3 text-sm text-brand-orange">
          ⚠️ ມີ {noPrice} ເຄື່ອງທີ່ບໍ່ມີລາຄາຊື້ໃນທະບຽນ — ຕົວເລກງົບປະມານລຸ່ມນີ້
          ຈຶ່ງ<strong>ຕໍ່າກວ່າຄວາມຈິງ</strong>. ຕື່ມລາຄາໄດ້ຢູ່ໜ້າລາຍລະອຽດຂອງແຕ່ລະເຄື່ອງ
        </p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="glass-card rounded-xl p-4">
          <p className="text-xs text-muted">ງົບປະມານປະມານ (ຈາກລາຄາຊື້ເດີມ)</p>
          <p className="mt-1 text-xl font-semibold text-fg">
            {formatMoney(summary?.estimated ?? null)} ກີບ
          </p>
          <p className="mt-0.5 text-xs text-faint">ລວມທຸກລະດັບຄວາມດ່ວນ</p>
        </div>

        {byCategory.slice(0, 2).map((c) => (
          <div key={c.category_name ?? 'none'} className="glass-card rounded-xl p-4">
            <p className="text-xs text-muted">{c.category_name ?? 'ບໍ່ໄດ້ລະບຸປະເພດ'}</p>
            <p className="mt-1 text-xl font-semibold text-fg">{c.total} ເຄື່ອງ</p>
            <p className="mt-0.5 text-xs text-faint">
              ດ່ວນ {c.high} · ~{formatMoney(c.estimated)} ກີບ
            </p>
          </div>
        ))}
      </div>

      <form className="glass-card mt-5 flex flex-wrap items-end gap-3 rounded-xl p-4">
        <label className="flex flex-col gap-1 text-xs text-muted">
          ຄວາມດ່ວນ
          <select
            name="priority"
            defaultValue={priority}
            className="input rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="plan">ດ່ວນ + ຄວນວາງແຜນ</option>
            <option value="high">ດ່ວນເທົ່ານັ້ນ</option>
            <option value="all">ທັງໝົດ</option>
            <option value="low">ເຝົ້າເບິ່ງ</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-muted">
          ອາຍຸຢ່າງໜ້ອຍ (ປີ)
          <input
            name="age"
            type="number"
            min={0}
            max={20}
            step={1}
            defaultValue={minAge || ''}
            className="input w-28 rounded-lg px-3 py-1.5 text-sm"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-muted">
          ປະເພດ
          <select
            name="category"
            defaultValue={category}
            className="input rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="all">ທັງໝົດ</option>
            {categories.map((c) => (
              <option key={c.category_name} value={c.category_name}>
                {c.category_name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-muted">
          ຄົ້ນຫາ
          <input
            name="q"
            defaultValue={q}
            placeholder="ລະຫັດ, ຊື່, ຜູ້ຖືຄອງ"
            className="input w-52 rounded-lg px-3 py-1.5 text-sm"
          />
        </label>

        <button type="submit" className="btn-secondary rounded-lg px-4 py-1.5 text-sm">
          ກັ່ນຕອງ
        </button>
      </form>

      {rows.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            title="ບໍ່ມີເຄື່ອງທີ່ເຂົ້າເງື່ອນໄຂ"
            description="ລອງຜ່ອນຕົວກັ່ນຕອງ ຫຼື ເບິ່ງລະດັບ ‘ເຝົ້າເບິ່ງ’"
          />
        </div>
      ) : (
        <div className="glass-card divide-line mt-5 divide-y rounded-xl">
          {rows.map((c) => (
            <Link
              key={c.asset_code}
              href={`/assets/${c.asset_code}`}
              className="hover-surface flex flex-wrap items-center gap-3 px-4 py-3 transition"
            >
              <span className="font-mono text-xs text-muted">{c.asset_code}</span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-fg">{c.name}</span>
                <span className="text-xs text-muted">
                  {reasonsOf(c).join(' · ')}
                  {c.holder_name && ` — ${c.holder_name}`}
                </span>
              </span>

              <span className="w-24 text-right text-xs text-muted">
                {safeDate(c.purchase_date)}
              </span>

              <span className="w-28 text-right text-sm text-body">
                {Number(c.estimated_cost) > 0 ? (
                  `${formatMoney(c.estimated_cost)} ກີບ`
                ) : (
                  <span className="text-faint">ບໍ່ມີລາຄາ</span>
                )}
              </span>

              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLE[c.priority]}`}
              >
                {PRIORITY_LABEL_LO[c.priority]}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function pick(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

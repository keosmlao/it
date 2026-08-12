import Link from 'next/link'
import { requireUser } from '@/lib/auth/session'
import ActionForm, { SubmitButton } from '@/components/action-form'
import {
  getPlan,
  getPlanItems,
  getPlanSources,
  getPlanStreak,
} from '@/lib/plans/queries'
import { PLAN_STATUS_LABEL_LO } from '@/lib/plans/model'
import { can } from '@/lib/auth/roles'
import { isoDate, shiftDate, todayISO } from '@/lib/format'
import { safeDate } from '@/lib/assets/model'
import PlanItemRow from './plan-item-row'
import { addPlanItem, closePlan, savePlanHeader, submitPlan } from './actions'

export const metadata = { title: 'ແຜນວຽກປະຈຳວັນ' }

export default async function PlansPage({ searchParams }: PageProps<'/plans'>) {
  const params = await searchParams
  const user = await requireUser()

  const date = normalizeDate(pick(params.date)) || todayISO()
  // ບໍ່ສ້າງແຖວຕອນເປີດເບິ່ງ — ແຖວຈະຖືກສ້າງເມື່ອຜູ້ໃຊ້ບັນທຶກຄັ້ງທຳອິດ
  const plan = await getPlan(user.employee_id, date)

  const [items, sources, streak] = await Promise.all([
    plan ? getPlanItems(plan.id) : [],
    getPlanSources(user.employee_id),
    getPlanStreak(user.employee_id, date),
  ])

  const editable = plan?.status !== 'closed'
  const isToday = date === todayISO()

  return (
    <div className="w-full max-w-4xl">
      {/* ---------- ແຖບເລືອກວັນ ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href={`/plans?date=${shiftDate(date, -1)}`}
            className="btn-secondary rounded-lg px-3 py-1.5 text-sm"
          >
            ←
          </Link>
          <div>
            <p className="font-medium text-fg">{safeDate(date)}</p>
            <p className="text-xs text-muted">
              {isToday ? 'ມື້ນີ້ · ' : ''}
              {plan ? PLAN_STATUS_LABEL_LO[plan.status] : 'ຍັງບໍ່ໄດ້ວາງແຜນ'}
            </p>
          </div>
          <Link
            href={`/plans?date=${shiftDate(date, 1)}`}
            className="btn-secondary rounded-lg px-3 py-1.5 text-sm"
          >
            →
          </Link>
          {!isToday && (
            <Link href="/plans" className="text-sm text-muted hover:underline">
              ກັບມື້ນີ້
            </Link>
          )}
        </div>

        {can.viewReports(user) && (
          <Link
            href={`/plans/team?date=${date}`}
            className="btn-secondary rounded-lg px-4 py-2 text-sm"
          >
            ເບິ່ງແຜນທັງທີມ →
          </Link>
        )}
      </div>

      {/* ---------- ສະຫຼຸບ 7 ມື້ ---------- */}
      <div className="glass-card mt-4 flex flex-wrap gap-2 rounded-xl p-3">
        {streak.map((d) => {
          const iso = isoDate(d.plan_date)
          const total = Number(d.item_count)
          const done = Number(d.done_count)
          return (
            <Link
              key={iso}
              href={`/plans?date=${iso}`}
              className={`rounded-lg px-3 py-1.5 text-xs transition ${
                iso === date
                  ? 'brand-gradient-cool font-medium text-white'
                  : 'hover-surface text-muted'
              }`}
            >
              {safeDate(iso).slice(0, 5)} · {done}/{total}
            </Link>
          )
        })}
        {streak.length === 0 && (
          <p className="px-2 py-1 text-xs text-faint">ຍັງບໍ່ມີແຜນໃນ 7 ມື້ຜ່ານມາ</p>
        )}
      </div>

      {/* ---------- ເປົ້າໝາຍຂອງມື້ ---------- */}
      <section className="glass-card mt-4 rounded-xl p-4">
        <h2 className="mb-3 text-sm font-semibold text-fg">ເປົ້າໝາຍຫຼັກຂອງມື້</h2>
        {editable ? (
          <ActionForm action={savePlanHeader} className="space-y-3">
            <input type="hidden" name="plan_date" value={date} />
            <input
              name="focus"
              defaultValue={plan?.focus ?? ''}
              placeholder="ມື້ນີ້ຈະໃຫ້ສຳເລັດຫຍັງເປັນຫຼັກ"
              className="input w-full rounded-lg px-3 py-2 text-sm"
            />
            <textarea
              name="blocker"
              rows={2}
              defaultValue={plan?.blocker ?? ''}
              placeholder="ຕິດຂັດຫຍັງ ຕ້ອງການຄວາມຊ່ວຍເຫຼືອຫຍັງ"
              className="input w-full rounded-lg px-3 py-2 text-sm"
            />
            <SubmitButton className="btn-secondary rounded-lg px-4 py-1.5 text-sm">
              ບັນທຶກ
            </SubmitButton>
          </ActionForm>
        ) : (
          <>
            <p className="text-body">{plan?.focus || '— ບໍ່ໄດ້ລະບຸ —'}</p>
            {plan?.blocker && (
              <p className="mt-2 text-sm text-muted">ຕິດຂັດ: {plan.blocker}</p>
            )}
          </>
        )}
      </section>

      {/* ---------- ລາຍການວຽກ ---------- */}
      <section className="glass-card mt-4 rounded-xl">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-fg">
            ວຽກທີ່ວາງແຜນ ({items.length})
          </h2>
          <p className="text-xs text-muted">
            ວາງແຜນລວມ {Number(plan?.planned_hours ?? 0)} ຊມ · ໃຊ້ຈິງ{' '}
            {Number(plan?.actual_hours ?? 0)} ຊມ · ສຳເລັດ{' '}
            {plan?.done_count ?? 0}/{plan?.item_count ?? 0}
          </p>
        </header>

        <ul className="divide-y divide-line">
          {items.map((item) => (
            <PlanItemRow key={item.id} item={item} editable={editable} />
          ))}

          {items.length === 0 && (
            <li className="px-4 py-10 text-center text-muted">
              ຍັງບໍ່ໄດ້ວາງແຜນວຽກມື້ນີ້ — ເພີ່ມລາຍການທຳອິດຂ້າງລຸ່ມ
            </li>
          )}
        </ul>
      </section>

      {/* ---------- ເພີ່ມວຽກ ---------- */}
      {editable && (
        <section className="glass-card mt-4 rounded-xl p-4">
          <h2 className="mb-3 text-sm font-semibold text-fg">ເພີ່ມວຽກເຂົ້າແຜນ</h2>
          <ActionForm action={addPlanItem} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="plan_date" value={date} />

            <label className="flex flex-col gap-1 text-xs text-muted">
              ຊື່ວຽກ *
              <input
                name="title"
                required
                placeholder="ແກ້ບັນຫາ printer ຫ້ອງບັນຊີ"
                className="input w-72 rounded-lg px-3 py-1.5 text-sm"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs text-muted">
              ຊົ່ວໂມງທີ່ຄາດ
              <input
                type="number"
                name="planned_hours"
                min="0"
                max="24"
                step="0.25"
                defaultValue={1}
                className="input w-24 rounded-lg px-3 py-1.5 text-sm"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs text-muted">
              ຜູກກັບວຽກທີ່ມີຢູ່
              <select name="link" className="input w-72 rounded-lg px-3 py-1.5 text-sm">
                <option value="">— ບໍ່ຜູກ —</option>
                {sources.tickets.length > 0 && (
                  <optgroup label="Ticket ທີ່ຍັງເປີດຢູ່">
                    {sources.tickets.map((t) => (
                      <option key={t.id} value={`ticket:${t.id}`}>
                        {t.ticket_no} · {t.title}
                      </option>
                    ))}
                  </optgroup>
                )}
                {sources.tasks.length > 0 && (
                  <optgroup label="Task ໃນໂປຣເຈັກ">
                    {sources.tasks.map((t) => (
                      <option key={t.id} value={`task:${t.id}`}>
                        {t.title}
                        {t.project_name && ` (${t.project_name})`}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs text-muted">
              ລາຍລະອຽດ
              <input
                name="detail"
                className="input w-64 rounded-lg px-3 py-1.5 text-sm"
              />
            </label>

            <SubmitButton className="btn-primary rounded-lg px-4 py-1.5 text-sm font-medium">
              + ເພີ່ມ
            </SubmitButton>
          </ActionForm>
        </section>
      )}

      {/* ---------- ປຸ່ມສະຖານະແຜນ ---------- */}
      {editable && plan && (
        <div className="mt-4 flex flex-wrap gap-2">
          {plan.status === 'draft' && (
            <ActionForm action={submitPlan}>
              <input type="hidden" name="plan_id" value={plan.id} />
              <SubmitButton className="btn-primary rounded-lg px-4 py-2 text-sm font-medium">
                ສົ່ງແຜນໃຫ້ຫົວໜ້າ
              </SubmitButton>
            </ActionForm>
          )}

          <ActionForm action={closePlan}>
            <input type="hidden" name="plan_id" value={plan.id} />
            <input type="hidden" name="carry" value="1" />
            <SubmitButton className="btn-secondary rounded-lg px-4 py-2 text-sm">
              ສະຫຼຸບທ້າຍມື້ (ຍົກວຽກຄ້າງໄປມື້ຕໍ່ໄປ)
            </SubmitButton>
          </ActionForm>

          <ActionForm action={closePlan}>
            <input type="hidden" name="plan_id" value={plan.id} />
            <SubmitButton className="btn-secondary rounded-lg px-4 py-2 text-sm">
              ສະຫຼຸບເສີຍໆ
            </SubmitButton>
          </ActionForm>
        </div>
      )}
    </div>
  )
}

/** ຮັບສະເພາະ yyyy-MM-dd ເພື່ອບໍ່ໃຫ້ຄ່າມົ້ວໆເຂົ້າ query */
function normalizeDate(value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ''
}

function pick(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

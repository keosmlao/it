import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import {
  listPlanlessStaff,
  listTeamPlans,
  listTeamWeek,
} from '@/lib/plans/queries'
import { PLAN_STATUS_LABEL_LO } from '@/lib/plans/model'
import { isoDate, shiftDate, todayISO } from '@/lib/format'
import { safeDate } from '@/lib/assets/model'
import ExportMenu from '@/components/export-menu'
import WeekGrid from './week-grid'

export const metadata = { title: 'ແຜນວຽກທັງທີມ' }

export default async function TeamPlansPage({
  searchParams,
}: PageProps<'/plans/team'>) {
  const params = await searchParams
  const user = await requireUser()
  if (!can.viewReports(user)) notFound()

  const date = normalizeDate(pick(params.date)) || todayISO()
  // ຜູ້ຈັດການເຫັນທັງພະແນກ, ຫົວໜ້າເຫັນສະເພາະໜ່ວຍງານຕົນ
  const unitCode = can.viewAllUnits(user) ? null : user.unit_code

  // ວັນທີເລືອກຢູ່ຂວາສຸດ — ເບິ່ງຫຼັງ 6 ມື້ ເພາະສ່ວນຫຼາຍຢາກຮູ້ວ່າຜ່ານມາເປັນແນວໃດ
  const weekFrom = shiftDate(date, -6)
  const days = Array.from({ length: 7 }, (_, i) => shiftDate(weekFrom, i))

  const [plans, planless, week] = await Promise.all([
    listTeamPlans(date, unitCode),
    listPlanlessStaff(date, unitCode),
    listTeamWeek(weekFrom, date, unitCode),
  ])

  const totalPlanned = plans.reduce((sum, p) => sum + Number(p.planned_hours), 0)
  const totalActual = plans.reduce((sum, p) => sum + Number(p.actual_hours), 0)

  return (
    <div className="w-full">
      <div className="o-page-actions">
        <div className="flex items-center gap-2">
          <Link
            href={`/plans/team?date=${shiftDate(date, -1)}`}
            className="btn-secondary rounded px-3 py-1.5 text-[13px]"
          >
            ←
          </Link>
          <div>
            <p className="font-medium text-fg">{safeDate(date)}</p>
            <p className="text-xs text-muted">
              {plans.length} ຄົນວາງແຜນແລ້ວ · ວາງແຜນລວມ {totalPlanned} ຊມ · ໃຊ້ຈິງ{' '}
              {totalActual} ຊມ
            </p>
          </div>
          <Link
            href={`/plans/team?date=${shiftDate(date, 1)}`}
            className="btn-secondary rounded px-3 py-1.5 text-[13px]"
          >
            →
          </Link>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/plans?date=${date}`}
            className="btn-secondary rounded px-3 py-1.5 text-[13px]"
          >
            ແຜນຂອງຂ້ອຍ →
          </Link>
          <ExportMenu dataset="plans" query={{ from: date, to: date }} />
        </div>
      </div>

      <WeekGrid cells={week} days={days} selected={date} />

      {planless.length > 0 && (
        <p className="mt-4 rounded-lg bg-brand-orange/10 px-4 py-3 text-sm text-body">
          ຍັງບໍ່ໄດ້ວາງແຜນ {planless.length} ຄົນ:{' '}
          {planless.map((p) => p.fullname_lo).join(', ')}
        </p>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {plans.map((plan) => (
          <article key={plan.id} className="glass-card rounded-xl p-4">
            <header className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-fg">{plan.employee_name}</p>
                <p className="text-xs text-muted">
                  {plan.department_name ?? '—'} · {PLAN_STATUS_LABEL_LO[plan.status]}
                </p>
              </div>
              <p className="text-right text-xs text-muted">
                ສຳເລັດ {plan.done_count}/{plan.item_count}
                <br />
                {Number(plan.actual_hours)}/{Number(plan.planned_hours)} ຊມ
              </p>
            </header>

            {plan.focus && (
              <p className="mt-2 text-sm text-body">🎯 {plan.focus}</p>
            )}
            {plan.blocker && (
              <p className="mt-1 text-sm text-brand-orange">⚠ {plan.blocker}</p>
            )}

            <p className="mt-2 text-xs text-faint">
              ແຜນວັນທີ {safeDate(isoDate(plan.plan_date))}
            </p>
          </article>
        ))}

        {plans.length === 0 && (
          <p className="glass-card rounded-xl px-4 py-10 text-center text-muted lg:col-span-2">
            ຍັງບໍ່ມີໃຜວາງແຜນໃນວັນນີ້
          </p>
        )}
      </div>
    </div>
  )
}

function normalizeDate(value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ''
}

function pick(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

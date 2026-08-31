import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireMenuView } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { getMaintenanceLogs, getMaintenancePlan } from '@/lib/maintenance/queries'
import {
  PM_CATEGORY_LABEL_LO,
  PM_DUE_LABEL_LO,
  PM_DUE_STYLE,
  PM_RESULT_LABEL_LO,
  PM_RESULT_STYLE,
} from '@/lib/maintenance/model'
import { safeDate } from '@/lib/assets/model'
import { formatDateTime, todayISO } from '@/lib/format'
import LogPanel from './log-panel'

export default async function MaintenancePlanPage({
  params,
}: PageProps<'/maintenance/[id]'>) {
  const { id } = await params
  const user = await requireMenuView('/maintenance')

  const plan = await getMaintenancePlan(id)
  if (!plan) notFound()

  const logs = await getMaintenanceLogs(id)
  const editable = can.manageAssets(user)

  return (
    <div className="w-full">
      <p className="font-mono text-xs text-muted">{plan.code}</p>
      <h1 className="mt-1 text-xl font-semibold text-fg">{plan.title}</h1>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${PM_DUE_STYLE[plan.due_status]}`}
        >
          {PM_DUE_LABEL_LO[plan.due_status]}
        </span>
        <span className="text-sm text-muted">
          {PM_CATEGORY_LABEL_LO[plan.category]} · ທຸກ {plan.interval_days} ວັນ
        </span>
        {editable && (
          <Link
            href={`/maintenance/${plan.id}/edit`}
            className="btn-secondary ml-auto rounded px-3 py-1.5 text-[13px]"
          >
            ແກ້ໄຂ
          </Link>
        )}
      </div>

      <div className="glass-card mt-5 grid gap-4 rounded-xl p-5 sm:grid-cols-2 lg:grid-cols-4">
        <Info label="ກຳນົດຄັ້ງຕໍ່ໄປ" value={safeDate(plan.next_due_date)} />
        <Info
          label="ເຮັດຄັ້ງຫຼ້າສຸດ"
          value={plan.last_done_at ? safeDate(plan.last_done_at) : 'ຍັງບໍ່ເຄີຍເຮັດ'}
        />
        <Info label="ຜູ້ຮັບຜິດຊອບ" value={plan.owner_name ?? '—'} />
        <Info label="ສະຖານທີ່" value={plan.location_name ?? '—'} />
        <Info
          label="ອຸປະກອນ"
          value={plan.asset_code ? `${plan.asset_code} · ${plan.asset_name ?? ''}` : '—'}
        />
        <Info label="ບັນທຶກທັງໝົດ" value={`${plan.log_count} ຄັ້ງ`} />
        <Info label="ພົບບັນຫາ" value={`${plan.issue_count} ຄັ້ງ`} />
        <Info label="ສະຖານະແຜນ" value={plan.is_active ? 'ເປີດຢູ່' : 'ປິດໄວ້'} />
      </div>

      {plan.checklist && (
        <div className="glass-card mt-4 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-fg">ລາຍການທີ່ຕ້ອງກວດ</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-body">{plan.checklist}</p>
        </div>
      )}

      {editable && <LogPanel plan={plan} today={todayISO()} />}

      <div className="glass-card mt-4 rounded-xl">
        <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-fg">
          ປະຫວັດການເຮັດວຽກ
        </h2>
        <div className="divide-line divide-y">
          {logs.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="w-24 text-sm text-body">{safeDate(l.performed_at)}</span>
              <span className="min-w-0 flex-1 text-xs text-muted">
                {l.performed_by_name}
                {l.minutes !== null && ` · ${l.minutes} ນາທີ`}
                {l.note && <span className="block text-body">{l.note}</span>}
              </span>
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${PM_RESULT_STYLE[l.result]}`}
              >
                {PM_RESULT_LABEL_LO[l.result]}
              </span>
            </div>
          ))}
          {logs.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted">
              ຍັງບໍ່ມີບັນທຶກການເຮັດວຽກ
            </p>
          )}
        </div>
      </div>

      <p className="mt-4 text-xs text-faint">
        ຕັ້ງແຜນໂດຍ {plan.created_by_name ?? '—'} · {formatDateTime(plan.created_at)}
      </p>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 break-words text-sm text-body">{value}</p>
    </div>
  )
}

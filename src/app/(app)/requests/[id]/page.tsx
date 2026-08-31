import Link from 'next/link'
import ActionForm from '@/components/action-form'
import { notFound } from 'next/navigation'
import { requireModuleView } from '@/lib/auth/session'
import { canDecide, getApprovals, getRequest } from '@/lib/requests/queries'
import { RequestStatusBadge } from '@/components/request-badge'
import { formatDateTime } from '@/lib/format'
import { cancelRequest, convertToProject, decideRequest } from '../actions'

export default async function RequestDetailPage({
  params,
}: PageProps<'/requests/[id]'>) {
  const { id } = await params
  const user = await requireModuleView('requests')

  const request = await getRequest(id)
  if (!request) notFound()

  const approvals = await getApprovals(id)
  const decidable = canDecide(user, request)
  const cancellable =
    request.requester_employee_id === user.employee_id && !request.is_finished
  const convertible =
    request.status === 'approved' &&
    !request.linked_project_id &&
    (user.role === 'manager' || user.role === 'head')

  return (
    <div className="w-full">
      <Link
        href="/requests"
        className="text-sm text-muted underline-offset-2 hover:underline"
      >
        ← ກັບໄປລາຍການຄຳຮ້ອງ
      </Link>

      <header className="mt-3">
        <p className="font-mono text-sm text-muted">
          {request.request_no}
        </p>
        <h1 className="text-2xl font-semibold text-fg">
          {request.title}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <RequestStatusBadge status={request.status} />
          <span className="text-sm text-muted">
            {request.type_name_lo} · {request.requester_name}
            {request.requester_department_name &&
              ` · ${request.requester_department_name}`}{' '}
            · {formatDateTime(request.created_at)}
          </span>
        </div>
      </header>

      <section className="mt-5 glass-card rounded-xl p-4">
        <h2 className="mb-2 text-sm font-semibold text-fg">
          ລາຍລະອຽດ
        </h2>
        <p className="whitespace-pre-wrap text-body">
          {request.detail || '— ບໍ່ມີລາຍລະອຽດ —'}
        </p>
      </section>

      <section className="mt-4 glass-card rounded-xl p-4">
        <h2 className="mb-3 text-sm font-semibold text-fg">
          ຂັ້ນຕອນການອະນຸມັດ
        </h2>

        <ol className="space-y-3">
          <Step
            level={1}
            label="ຫົວໜ້າໜ່ວຍງານ"
            approval={approvals.find((a) => a.level === 1)}
          />
          <Step
            level={2}
            label="ຜູ້ຈັດການ"
            approval={approvals.find((a) => a.level === 2)}
          />
        </ol>
      </section>

      {decidable && (
        <section className="mt-4 glass-card rounded-xl p-4">
          <h2 className="mb-3 text-sm font-semibold text-fg">
            ຕັດສິນຄຳຮ້ອງ
          </h2>
          <ActionForm action={decideRequest} className="space-y-3">
            <input type="hidden" name="request_id" value={request.id} />
            <textarea
              name="note"
              rows={3}
              placeholder="ຄຳເຫັນ (ບໍ່ບັງຄັບ)"
              className="w-full rounded-lg border border-line px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                name="decision"
                value="approved"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
              >
                ອະນຸມັດ
              </button>
              <button
                type="submit"
                name="decision"
                value="rejected"
                className="btn-danger rounded px-3 py-1.5 text-[13px] font-medium"
              >
                ບໍ່ອະນຸມັດ
              </button>
            </div>
          </ActionForm>
        </section>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {convertible && (
          <ActionForm action={convertToProject}>
            <input type="hidden" name="request_id" value={request.id} />
            <button
              type="submit"
              className="btn-primary rounded px-3 py-1.5 text-[13px] font-medium"
            >
              ເປີດເປັນໂປຣເຈັກພັດທະນາ
            </button>
          </ActionForm>
        )}

        {request.linked_project_id && (
          <Link
            href={`/projects/${request.linked_project_id}`}
            className="btn-secondary rounded px-3 py-1.5 text-[13px]"
          >
            ເບິ່ງໂປຣເຈັກທີ່ເປີດແລ້ວ →
          </Link>
        )}

        {cancellable && (
          <ActionForm action={cancelRequest}>
            <input type="hidden" name="request_id" value={request.id} />
            <button
              type="submit"
              className="btn-secondary rounded px-3 py-1.5 text-[13px]"
            >
              ຍົກເລີກຄຳຮ້ອງ
            </button>
          </ActionForm>
        )}
      </div>
    </div>
  )
}

function Step({
  level,
  label,
  approval,
}: {
  level: number
  label: string
  approval?: {
    decision: string
    note: string | null
    approver_name: string
    decided_at: string
  }
}) {
  return (
    <li className="flex gap-3">
      <span
        className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
          !approval
            ? 'bg-slate-200 text-muted dark:bg-slate-800'
            : approval.decision === 'approved'
              ? 'bg-emerald-600 text-white'
              : 'bg-red-600 text-white'
        }`}
      >
        {level}
      </span>
      <div>
        <p className="text-sm font-medium text-fg">{label}</p>
        {approval ? (
          <p className="text-xs text-muted">
            {approval.decision === 'approved' ? 'ອະນຸມັດ' : 'ບໍ່ອະນຸມັດ'} ໂດຍ{' '}
            {approval.approver_name} · {formatDateTime(approval.decided_at)}
            {approval.note && ` — ${approval.note}`}
          </p>
        ) : (
          <p className="text-xs text-faint">ລໍຖ້າ</p>
        )}
      </div>
    </li>
  )
}

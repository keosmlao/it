import Link from 'next/link'
import { requireUser } from '@/lib/auth/session'
import {
  REQUEST_STATUSES,
  REQUEST_STATUS_LABEL_LO,
  listRequests,
} from '@/lib/requests/queries'
import { RequestStatusBadge } from '@/components/request-badge'
import { formatDateTime } from '@/lib/format'

export const metadata = { title: 'ຄຳຮ້ອງ & ອະນຸມັດ' }

export default async function RequestsPage({
  searchParams,
}: PageProps<'/requests'>) {
  const params = await searchParams
  const user = await requireUser()

  // ບໍ່ໄດ້ລະບຸມາ = ສະເພາະທີ່ລໍອະນຸມັດ; 'all' = ເອົາໝົດ
  const status =
    params.status === undefined ? 'pending' : pick(params.status) || 'all'
  const mine = pick(params.mine) === '1'
  const requests = await listRequests({ status, mine }, user)

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="mt-1 text-sm text-muted">
            {requests.length} ລາຍການ
          </p>
        </div>

        <Link
          href="/requests/new"
          className="btn-primary rounded-lg px-4 py-2 text-sm font-medium"
        >
          + ສ້າງຄຳຮ້ອງ
        </Link>
      </div>

      <form className="mt-5 flex flex-wrap items-end gap-3 glass-card rounded-xl p-4">
        <label className="flex flex-col gap-1 text-xs text-muted">
          ສະຖານະ
          <select
            name="status"
            defaultValue={status}
            className="input rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="pending">ລໍອະນຸມັດ</option>
            <option value="all">ທັງໝົດ</option>
            {REQUEST_STATUSES.map((s) => (
              <option key={s} value={s}>
                {REQUEST_STATUS_LABEL_LO[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 pb-1.5 text-sm text-body">
          <input
            type="checkbox"
            name="mine"
            value="1"
            defaultChecked={mine}
            className="size-4"
          />
          ຂອງຂ້ອຍ
        </label>
        <button
          type="submit"
          className="btn-secondary rounded-lg px-4 py-1.5 text-sm"
        >
          ກັ່ນຕອງ
        </button>
      </form>

      <div className="mt-5 divide-y divide-line glass-card rounded-xl">
        {requests.map((r) => (
          <Link
            key={r.id}
            href={`/requests/${r.id}`}
            className="flex flex-wrap items-center gap-3 px-4 py-3 transition hover-surface"
          >
            <span className="font-mono text-xs text-muted">
              {r.request_no}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-fg">
                {r.title}
              </span>
              <span className="text-xs text-muted">
                {r.type_name_lo} · {r.requester_name} ·{' '}
                {formatDateTime(r.created_at)}
              </span>
            </span>
            <RequestStatusBadge status={r.status} />
          </Link>
        ))}

        {requests.length === 0 && (
          <p className="px-4 py-10 text-center text-muted">
            ບໍ່ມີຄຳຮ້ອງຕາມເງື່ອນໄຂທີ່ເລືອກ
          </p>
        )}
      </div>
    </div>
  )
}

function pick(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

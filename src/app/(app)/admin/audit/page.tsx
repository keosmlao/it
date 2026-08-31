import { query } from '@/lib/db'
import { requireMenuView } from '@/lib/auth/session'
import { formatDateTime } from '@/lib/format'
import Pagination from '@/components/pagination'
import { PAGE_SIZE, pageNumber } from '@/lib/pagination'
import { Panel } from '../panel'

export const metadata = { title: 'ບັນທຶກການປ່ຽນແປງ' }

/** ໃຜແກ້ຫຍັງເມື່ອໃດ — ອ່ານຢ່າງດຽວ ລຶບບໍ່ໄດ້ */
export default async function AuditPage({
  searchParams,
}: PageProps<'/admin/audit'>) {
  const params = await searchParams
  const page = pageNumber(params.page)
  await requireMenuView('/admin/audit')

  const [rows, countRows] = await Promise.all([
    query<{
      id: string
      employee_name: string
      entity: string
      entity_id: string | null
      action: string
      detail: string | null
      created_at: string
    }>(
      `select a.id, e.fullname_lo as employee_name, a.entity, a.entity_id,
              a.action, a.detail, a.created_at
         from it.audit_logs a
         join public.odg_employee e on e.employee_id = a.employee_id
        order by a.created_at desc
        limit $1 offset $2`,
      [PAGE_SIZE, (page - 1) * PAGE_SIZE]
    ),
    query<{ total: string }>('select count(*) as total from it.audit_logs'),
  ])

  const total = Number(countRows[0]?.total ?? 0)
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="w-full">
      <Panel title="ບັນທຶກການປ່ຽນແປງ" hint={`ທັງໝົດ ${total} ລາຍການ`}>
        <div className="o-list-wrap overflow-x-auto">
          <table className="o-list w-full min-w-[560px] text-[13px]">
            <thead>
              <tr>
                <th className="px-3 py-1.5 text-left font-medium">ເວລາ</th>
                <th className="px-3 py-1.5 text-left font-medium">ຜູ້ເຮັດ</th>
                <th className="px-3 py-1.5 text-left font-medium">ເລື່ອງ</th>
                <th className="px-3 py-1.5 text-left font-medium">ລາຍລະອຽດ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((a) => (
                <tr key={a.id} className="hover-surface transition">
                  <td className="px-3 py-1.5 text-xs whitespace-nowrap text-muted">
                    {formatDateTime(a.created_at)}
                  </td>
                  <td className="px-3 py-1.5 text-body">{a.employee_name}</td>
                  <td className="px-3 py-1.5 text-fg">
                    {a.action}
                    <span className="ml-1 text-muted">
                      · {a.entity}
                      {a.entity_id ? ` #${a.entity_id}` : ''}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-muted">{a.detail ?? '—'}</td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-muted">
                    ຍັງບໍ່ມີບັນທຶກ
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          pageCount={pageCount}
          total={total}
          pageSize={PAGE_SIZE}
          query={params}
        />
      </Panel>
    </div>
  )
}

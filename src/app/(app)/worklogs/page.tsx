import { requireUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import {
  getLoggableWork,
  listWorkLogs,
  summariseHours,
} from '@/lib/worklogs/queries'
import { deleteWorkLog } from './actions'
import WorkLogForm from './work-log-form'

export const metadata = { title: 'ບັນທຶກຊົ່ວໂມງ' }

export default async function WorkLogsPage({
  searchParams,
}: PageProps<'/worklogs'>) {
  const params = await searchParams
  const user = await requireUser()

  // ຄ່າເລີ່ມຕົ້ນ: 30 ມື້ຫຼ້າສຸດ
  const today = new Date()
  const monthAgo = new Date(today.getTime() - 29 * 86400_000)
  const from = pick(params.from) || monthAgo.toISOString().slice(0, 10)
  const to = pick(params.to) || today.toISOString().slice(0, 10)

  const [logs, work, summary] = await Promise.all([
    listWorkLogs(user, { from, to }),
    getLoggableWork(user.employee_id),
    can.viewReports(user) ? summariseHours(from, to) : Promise.resolve([]),
  ])

  const myTotal = logs
    .filter((l) => l.employee_id === user.employee_id)
    .reduce((sum, l) => sum + Number(l.hours), 0)

  return (
    <div className="w-full">
      <p className="mt-1 text-sm text-muted">
        {from} ຫາ {to} · ຂອງຂ້ອຍລວມ {myTotal.toFixed(1)} ຊົ່ວໂມງ
      </p>

      <div className="mt-5">
        <WorkLogForm tickets={work.tickets} tasks={work.tasks} />
      </div>

      <form className="o-filter-bar mt-3">
        <label className="flex flex-col gap-1 text-xs text-muted">
          ຈາກວັນທີ
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="input rounded-lg px-3 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          ຫາວັນທີ
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="input rounded-lg px-3 py-1.5 text-sm"
          />
        </label>
        <button
          type="submit"
          className="btn-secondary rounded-lg px-4 py-1.5 text-sm"
        >
          ເບິ່ງ
        </button>
      </form>

      {summary.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-3 text-lg font-semibold text-fg">
            ສະຫຼຸບຊົ່ວໂມງຕໍ່ຄົນ
          </h2>
          <div className="o-list-wrap overflow-x-auto">
            <table className="o-list w-full text-[13px]">
              <thead className="border-b border-line text-left text-muted">
                <tr>
                  <th className="px-3 py-1.5 font-medium">ພະນັກງານ</th>
                  <th className="px-3 py-1.5 text-right font-medium">Ticket</th>
                  <th className="px-3 py-1.5 text-right font-medium">ວຽກພັດທະນາ</th>
                  <th className="px-3 py-1.5 text-right font-medium">ອື່ນໆ</th>
                  <th className="px-3 py-1.5 text-right font-medium">ລວມ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {summary.map((s) => (
                  <tr key={s.employee_id}>
                    <td className="px-3 py-1.5 text-fg">
                      {s.employee_name}
                    </td>
                    <td className="px-3 py-1.5 text-right text-muted">
                      {Number(s.ticket_hours).toFixed(1)}
                    </td>
                    <td className="px-3 py-1.5 text-right text-muted">
                      {Number(s.task_hours).toFixed(1)}
                    </td>
                    <td className="px-3 py-1.5 text-right text-muted">
                      {Number(s.other_hours).toFixed(1)}
                    </td>
                    <td className="px-3 py-1.5 text-right font-medium text-fg">
                      {Number(s.total_hours).toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold text-fg">
          ລາຍການບັນທຶກ ({logs.length})
        </h2>

        <div className="divide-y divide-line glass-card rounded-xl">
          {logs.map((log) => (
            <div key={log.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="w-24 shrink-0 text-sm text-muted">
                {log.log_date}
              </span>
              <span className="w-16 shrink-0 text-sm font-medium text-fg">
                {Number(log.hours).toFixed(1)} ຊມ
              </span>
              <span className="min-w-0 flex-1 text-sm text-body">
                {log.ticket_no
                  ? `${log.ticket_no} · ${log.ticket_title}`
                  : (log.task_title ?? log.work_type ?? '—')}
                {log.note && (
                  <span className="text-muted">
                    {' '}
                    — {log.note}
                  </span>
                )}
              </span>
              <span className="text-xs text-muted">
                {log.employee_name}
              </span>

              {(log.employee_id === user.employee_id || can.administer(user)) && (
                <form action={deleteWorkLog}>
                  <input type="hidden" name="id" value={log.id} />
                  <button
                    type="submit"
                    className="text-xs text-red-600 underline-offset-2 hover:underline dark:text-red-400"
                  >
                    ລຶບ
                  </button>
                </form>
              )}
            </div>
          ))}

          {logs.length === 0 && (
            <p className="px-4 py-10 text-center text-muted">
              ຍັງບໍ່ມີບັນທຶກໃນຊ່ວງເວລານີ້
            </p>
          )}
        </div>
      </section>
    </div>
  )
}

function pick(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

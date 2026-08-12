import { redirect } from 'next/navigation'
import ActionForm from '@/components/action-form'
import { query } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { ROLES, ROLE_LABEL_LO, can, type Role } from '@/lib/auth/roles'
import { getPriorities } from '@/lib/tickets/queries'
import { formatDateTime, formatDuration } from '@/lib/format'
import {
  saveTicketCategory,
  setRoleOverride,
  toggleCategory,
  updateSla,
} from './actions'
import Pagination from '@/components/pagination'
import { PAGE_SIZE, pageNumber } from '@/lib/pagination'

export const metadata = { title: 'ຕັ້ງຄ່າລະບົບ' }

export default async function AdminPage({ searchParams }: PageProps<'/admin'>) {
  const params = await searchParams
  const auditPage = pageNumber(params.page)
  const user = await requireUser()
  if (!can.administer(user)) redirect('/')

  const [priorities, categories, staff, overrides, audit, auditCount] = await Promise.all([
    getPriorities(),
    query<{
      code: string
      name_lo: string
      unit_code: string | null
      sort_order: number
      is_active: boolean
    }>('select * from it.ticket_categories order by sort_order'),
    query<{
      employee_id: number
      employee_code: string
      fullname_lo: string
      role: Role
      unit_name_lo: string | null
    }>('select * from it.v_it_staff order by employee_code'),
    query<{ employee_id: number; role: string; note: string | null }>(
      'select employee_id, role, note from it.user_role_override'
    ),
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
      [PAGE_SIZE, (auditPage - 1) * PAGE_SIZE]
    ),
    query<{ total: string }>('select count(*) as total from it.audit_logs'),
  ])
  const auditTotal = Number(auditCount[0]?.total ?? 0)
  const auditPageCount = Math.max(1, Math.ceil(auditTotal / PAGE_SIZE))

  const overrideBy = new Map(overrides.map((o) => [o.employee_id, o]))

  return (
    <div className="space-y-8">
      <div>
        <p className="mt-1 text-sm text-muted">
          ສະເພາະຜູ້ຈັດການ · ການປ່ຽນແປງທັງໝົດຖືກບັນທຶກໄວ້
        </p>
      </div>

      <Panel
        title="ຂໍ້ຕົກລົງລະດັບການບໍລິການ (SLA)"
        hint="ນັບເປັນນາທີແບບປະຕິທິນ ນັບຈາກເວລາທີ່ແຈ້ງ"
      >
        <div className="space-y-3">
          {priorities.map((p) => (
            <ActionForm
              key={p.priority}
              action={updateSla}
              className="flex flex-wrap items-end gap-3"
            >
              <input type="hidden" name="priority" value={p.priority} />
              <span className="w-24 pb-2 text-sm text-body">
                {p.name_lo}
              </span>
              <label className="flex flex-col gap-1 text-xs text-muted">
                ຕອບພາຍໃນ (ນາທີ)
                <input
                  type="number"
                  name="respond_minutes"
                  min="1"
                  defaultValue={p.respond_minutes}
                  className="input w-32 rounded-lg px-3 py-1.5 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted">
                ແກ້ໄຂພາຍໃນ (ນາທີ)
                <input
                  type="number"
                  name="resolve_minutes"
                  min="1"
                  defaultValue={p.resolve_minutes}
                  className="input w-32 rounded-lg px-3 py-1.5 text-sm"
                />
              </label>
              <span className="pb-2 text-xs text-faint">
                = {formatDuration(p.respond_minutes)} / {formatDuration(p.resolve_minutes)}
              </span>
              <button
                type="submit"
                className="btn-secondary rounded-lg px-3 py-1.5 text-sm"
              >
                ບັນທຶກ
              </button>
            </ActionForm>
          ))}
        </div>
      </Panel>

      <Panel title="ປະເພດບັນຫາ" hint="ປະເພດຈະກຳນົດໜ່ວຍງານທີ່ຮັບຜິດຊອບ ticket ໂດຍອັດຕະໂນມັດ">
        <table className="w-full text-sm">
          <thead className="border-b border-line text-left text-muted">
            <tr>
              <th className="py-2 font-medium">ລະຫັດ</th>
              <th className="py-2 font-medium">ຊື່</th>
              <th className="py-2 font-medium">ໜ່ວຍງານ</th>
              <th className="py-2 font-medium">ສະຖານະ</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {categories.map((c) => (
              <tr key={c.code}>
                <td className="py-2 font-mono text-xs text-muted">
                  {c.code}
                </td>
                <td className="py-2 text-fg">{c.name_lo}</td>
                <td className="py-2 text-muted">
                  {c.unit_code === '8011'
                    ? 'ພັດທະນາລະບົບ'
                    : c.unit_code === '8010'
                      ? 'Support'
                      : '—'}
                </td>
                <td className="py-2">
                  {c.is_active ? (
                    <span className="text-emerald-600 dark:text-emerald-400">ໃຊ້ງານ</span>
                  ) : (
                    <span className="text-faint">ປິດ</span>
                  )}
                </td>
                <td className="py-2 text-right">
                  <ActionForm action={toggleCategory}>
                    <input type="hidden" name="code" value={c.code} />
                    <button
                      type="submit"
                      className="text-xs text-muted underline-offset-2 hover:underline"
                    >
                      {c.is_active ? 'ປິດ' : 'ເປີດ'}
                    </button>
                  </ActionForm>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <ActionForm
          action={saveTicketCategory}
          className="mt-4 flex flex-wrap items-end gap-3 border-t border-line pt-4"
        >
          <label className="flex flex-col gap-1 text-xs text-muted">
            ລະຫັດ
            <input
              name="code"
              required
              maxLength={20}
              placeholder="BACKUP"
              className="input w-32 rounded-lg px-3 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            ຊື່
            <input
              name="name_lo"
              required
              maxLength={100}
              className="input w-52 rounded-lg px-3 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            ໜ່ວຍງານ
            <select
              name="unit_code"
              defaultValue=""
              className="input rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="">— ບໍ່ລະບຸ —</option>
              <option value="8010">Support</option>
              <option value="8011">ພັດທະນາລະບົບ</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            ລຳດັບ
            <input
              type="number"
              name="sort_order"
              defaultValue={50}
              className="input w-20 rounded-lg px-3 py-1.5 text-sm"
            />
          </label>
          <button
            type="submit"
            className="btn-primary rounded-lg px-4 py-1.5 text-sm font-medium"
          >
            ເພີ່ມ / ອັບເດດ
          </button>
        </ActionForm>
      </Panel>

      <Panel
        title="ບົດບາດຜູ້ໃຊ້"
        hint="ໂດຍປົກກະຕິ role ຄິດຈາກຕຳແໜ່ງ ແລະ ໜ່ວຍງານໃນຂໍ້ມູນ HR — ຕັ້ງທີ່ນີ້ເມື່ອຕ້ອງການຍົກເວັ້ນ"
      >
        <div className="space-y-3">
          {staff.map((s) => {
            const override = overrideBy.get(s.employee_id)

            return (
              <ActionForm
                key={s.employee_id}
                action={setRoleOverride}
                className="flex flex-wrap items-center gap-3"
              >
                <input type="hidden" name="employee_id" value={s.employee_id} />
                <span className="w-52 text-sm text-fg">
                  {s.fullname_lo}
                  <span className="ml-1 text-xs text-muted">
                    {s.employee_code}
                  </span>
                </span>
                <select
                  name="role"
                  defaultValue={override?.role ?? ''}
                  className="input rounded-lg px-3 py-1.5 text-sm"
                >
                  <option value="">ຕາມ HR ({ROLE_LABEL_LO[s.role]})</option>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL_LO[r]}
                    </option>
                  ))}
                </select>
                <input
                  name="note"
                  defaultValue={override?.note ?? ''}
                  placeholder="ເຫດຜົນ"
                  className="input w-52 rounded-lg px-3 py-1.5 text-sm"
                />
                <button
                  type="submit"
                  className="btn-secondary rounded-lg px-3 py-1.5 text-sm"
                >
                  ບັນທຶກ
                </button>
              </ActionForm>
            )
          })}
        </div>
      </Panel>

      <Panel title="ບັນທຶກການປ່ຽນແປງ">
        <ol className="space-y-2 text-sm">
          {audit.map((a) => (
            <li key={a.id} className="flex flex-wrap gap-2">
              <span className="w-40 shrink-0 text-xs text-muted">
                {formatDateTime(a.created_at)}
              </span>
              <span className="text-body">
                {a.employee_name}
              </span>
              <span className="text-muted">
                {a.action} · {a.entity}
                {a.entity_id ? ` #${a.entity_id}` : ''}
                {a.detail ? ` — ${a.detail}` : ''}
              </span>
            </li>
          ))}
          {audit.length === 0 && (
            <li className="py-4 text-center text-muted">
              ຍັງບໍ່ມີບັນທຶກ
            </li>
          )}
        </ol>
        <Pagination page={auditPage} pageCount={auditPageCount} total={auditTotal} query={params} />
      </Panel>
    </div>
  )
}

function Panel({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="glass-card rounded-xl p-5">
      <h2 className="text-lg font-semibold text-fg">{title}</h2>
      {hint && (
        <p className="mt-1 mb-4 text-sm text-muted">{hint}</p>
      )}
      <div className={hint ? '' : 'mt-4'}>{children}</div>
    </section>
  )
}

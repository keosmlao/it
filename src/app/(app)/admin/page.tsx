import { redirect } from 'next/navigation'
import ActionForm, { SubmitButton } from '@/components/action-form'
import { query } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { ROLES, ROLE_LABEL_LO, can, type Role } from '@/lib/auth/roles'
import PermissionGrid, {
  type PermissionRow,
} from './permission-grid'
import { getPriorities } from '@/lib/tickets/queries'
import { formatDateTime, formatDuration } from '@/lib/format'
import { lineConfigured } from '@/lib/notify/line'
import { getOutboxStats, listOutbox } from '@/lib/notify/outbox'
import { getApprovalSteps } from '@/lib/purchase/queries'
import {
  retryNotifications,
  savePrStep,
  saveTicketCategory,
  sendQueuedNotifications,
  sendTestNotification,
  setRoleOverride,
  toggleCategory,
  togglePrStep,
  updateSla,
} from './actions'

const OUTBOX_LABEL: Record<string, string> = {
  pending: 'ຄ້າງຢູ່ຄິວ',
  sent: 'ສົ່ງແລ້ວ',
  failed: 'ລົ້ມເຫຼວ',
  skipped: 'ຂ້າມ',
}
import Pagination from '@/components/pagination'
import { PAGE_SIZE, pageNumber } from '@/lib/pagination'

export const metadata = { title: 'ຕັ້ງຄ່າລະບົບ' }

export default async function AdminPage({ searchParams }: PageProps<'/admin'>) {
  const params = await searchParams
  const auditPage = pageNumber(params.page)
  const user = await requireUser()
  if (!can.administer(user)) redirect('/')

  const [
    priorities,
    categories,
    staff,
    overrides,
    permissionRows,
    audit,
    auditCount,
    outbox,
    outboxRows,
    prSteps,
  ] = await Promise.all([
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
    query<PermissionRow>(
      'select employee_id, permission, allowed from it.user_permissions'
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
    getOutboxStats(),
    listOutbox(20),
    getApprovalSteps(),
  ])
  const lineReady = lineConfigured()
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
                  className="input w-32 rounded px-2 py-1 text-[13px]"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted">
                ແກ້ໄຂພາຍໃນ (ນາທີ)
                <input
                  type="number"
                  name="resolve_minutes"
                  min="1"
                  defaultValue={p.resolve_minutes}
                  className="input w-32 rounded px-2 py-1 text-[13px]"
                />
              </label>
              <span className="pb-2 text-xs text-faint">
                = {formatDuration(p.respond_minutes)} / {formatDuration(p.resolve_minutes)}
              </span>
              <button
                type="submit"
                className="btn-secondary rounded px-3 py-1.5 text-[13px]"
              >
                ບັນທຶກ
              </button>
            </ActionForm>
          ))}
        </div>
      </Panel>

      <Panel title="ປະເພດບັນຫາ" hint="ປະເພດຈະກຳນົດໜ່ວຍງານທີ່ຮັບຜິດຊອບ ticket ໂດຍອັດຕະໂນມັດ">
        <table className="o-list w-full text-[13px]">
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
              className="input w-32 rounded px-2 py-1 text-[13px]"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            ຊື່
            <input
              name="name_lo"
              required
              maxLength={100}
              className="input w-52 rounded px-2 py-1 text-[13px]"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            ໜ່ວຍງານ
            <select
              name="unit_code"
              defaultValue=""
              className="input rounded px-2 py-1 text-[13px]"
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
              className="input w-20 rounded px-2 py-1 text-[13px]"
            />
          </label>
          <button
            type="submit"
            className="btn-primary rounded px-3 py-1.5 text-[13px] font-medium"
          >
            ເພີ່ມ / ອັບເດດ
          </button>
        </ActionForm>
      </Panel>

      <Panel
        title="ສິດລາຍຄົນ"
        hint="ບົດບາດເປັນຄ່າຕັ້ງຕົ້ນ — ຕັ້ງທີ່ນີ້ເມື່ອຢາກເປີດ ຫຼື ຫ້າມສະເພາະບາງຂໍ້ໃຫ້ຄົນໃດຄົນໜຶ່ງ ໂດຍບໍ່ຕ້ອງປ່ຽນບົດບາດ. ເລື່ອນຕາຕະລາງໄປຂວາເພື່ອເບິ່ງໃຫ້ຄົບ"
      >
        <PermissionGrid staff={staff} rows={permissionRows} />
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
                  className="input rounded px-2 py-1 text-[13px]"
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
                  className="input w-52 rounded px-2 py-1 text-[13px]"
                />
                <button
                  type="submit"
                  className="btn-secondary rounded px-3 py-1.5 text-[13px]"
                >
                  ບັນທຶກ
                </button>
              </ActionForm>
            )
          })}
        </div>
      </Panel>

      <section id="pr-steps" className="glass-card rounded-xl p-5">
        <h2 className="text-lg font-semibold text-fg">ຂັ້ນຕອນອະນຸມັດໃບສະເໜີຊື້</h2>
        <p className="mt-1 mb-4 text-sm text-muted">
          ໃບສະເໜີຊື້ຈະຜ່ານຂັ້ນເຫຼົ່ານີ້ຕາມລຳດັບ — ເພີ່ມ/ແກ້/ປິດໄດ້ຕາມລະບຽບຈິງຂອງບໍລິສັດ
          ໂດຍບໍ່ຕ້ອງແກ້ໂປຣແກຣມ. ຕັ້ງ &quot;ມູນຄ່າຕັ້ງແຕ່&quot; ໄວ້ ຖ້າຂັ້ນນັ້ນໃຊ້ສະເພາະໃບໃຫຍ່
        </p>

        <div className="overflow-x-auto">
          <table className="o-list w-full text-[13px]">
            <thead className="border-b border-line text-left text-muted">
              <tr>
                <th className="py-2 pr-3 font-medium">ຂັ້ນ</th>
                <th className="py-2 pr-3 font-medium">ຊື່ຂັ້ນ</th>
                <th className="py-2 pr-3 font-medium">ຜູ້ອະນຸມັດ</th>
                <th className="py-2 pr-3 font-medium">ມູນຄ່າຕັ້ງແຕ່</th>
                <th className="py-2 pr-3 font-medium">ສະຖານະ</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {prSteps.map((s) => (
                <tr key={s.step_no}>
                  <td className="py-2 pr-3 text-muted">{s.step_no}</td>
                  <td className="py-2 pr-3 text-fg">{s.name_lo}</td>
                  <td className="py-2 pr-3 text-body">
                    {s.approver_name ??
                      (s.approver_role === 'manager'
                        ? 'ຜູ້ຈັດການ (ຜູ້ໃດກໍໄດ້)'
                        : 'ຫົວໜ້າໜ່ວຍງານ')}
                  </td>
                  <td className="py-2 pr-3 text-right text-body">
                    {Number(s.min_amount) > 0 ? Number(s.min_amount).toLocaleString('lo-LA') : 'ທຸກໃບ'}
                  </td>
                  <td className="py-2 pr-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        s.is_active
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-slate-100 text-muted dark:bg-white/5'
                      }`}
                    >
                      {s.is_active ? 'ໃຊ້ຢູ່' : 'ປິດ'}
                    </span>
                  </td>
                  <td className="py-2 text-right">
                    <div className="flex justify-end gap-3">
                      <ActionForm action={togglePrStep}>
                        <input type="hidden" name="step_no" value={s.step_no} />
                        <SubmitButton pendingLabel="…" className="text-xs text-muted hover:underline">
                          {s.is_active ? 'ປິດ' : 'ເປີດ'}
                        </SubmitButton>
                      </ActionForm>
                      <ActionForm action={togglePrStep}>
                        <input type="hidden" name="step_no" value={s.step_no} />
                        <input type="hidden" name="mode" value="delete" />
                        <SubmitButton
                          pendingLabel="…"
                          className="text-xs text-red-600 hover:underline dark:text-red-400"
                        >
                          ລຶບ
                        </SubmitButton>
                      </ActionForm>
                    </div>
                  </td>
                </tr>
              ))}

              {prSteps.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-muted">
                    ຍັງບໍ່ໄດ້ຕັ້ງຂັ້ນຕອນ — ໃບສະເໜີຊື້ຈະສົ່ງອະນຸມັດບໍ່ໄດ້
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <ActionForm action={savePrStep} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-muted">
            ຂັ້ນທີ *
            <input
              type="number"
              name="step_no"
              min="1"
              required
              defaultValue={prSteps.length + 1}
              className="input w-20 rounded px-2 py-1 text-[13px]"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            ຊື່ຂັ້ນ *
            <input
              name="name_lo"
              required
              placeholder="ຫົວໜ້າພະແນກບັນຊີ"
              className="input w-52 rounded px-2 py-1 text-[13px]"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            ບົດບາດຜູ້ອະນຸມັດ
            <select
              name="approver_role"
              defaultValue="head"
              className="input w-40 rounded px-2 py-1 text-[13px]"
            >
              <option value="head">ຫົວໜ້າໜ່ວຍງານ</option>
              <option value="manager">ຜູ້ຈັດການ</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            ຫຼື ລະບຸຄົນ
            <select
              name="approver_employee_id"
              defaultValue=""
              className="input w-52 rounded px-2 py-1 text-[13px]"
            >
              <option value="">— ໃຊ້ບົດບາດ —</option>
              {staff.map((s) => (
                <option key={s.employee_id} value={s.employee_id}>
                  {s.fullname_lo}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            ມູນຄ່າຕັ້ງແຕ່
            <input
              name="min_amount"
              inputMode="numeric"
              defaultValue="0"
              className="input w-36 rounded px-2 py-1 text-[13px]"
            />
          </label>
          <SubmitButton className="btn-primary rounded px-3 py-1.5 text-[13px] font-medium">
            ບັນທຶກຂັ້ນ
          </SubmitButton>
        </ActionForm>
      </section>

      <Panel
        title="ແຈ້ງເຕືອນທາງ LINE"
        hint={
          lineReady
            ? `ພະນັກງານທີ່ຜູກ LINE ແລ້ວພ້ອມຮັບການແຈ້ງເຕືອນ · ຍັງບໍ່ໄດ້ຜູກ ${outbox?.no_line ?? 0} ຄົນ`
            : 'ຍັງບໍ່ໄດ້ຕັ້ງ LINE_CHANNEL_ACCESS_TOKEN ໃນ .env.local — ຂໍ້ຄວາມຈະຄ້າງຢູ່ຄິວຈົນກວ່າຈະຕັ້ງຄ່າ'
        }
      >
        <div className="flex flex-wrap gap-4 text-sm">
          <Stat label="ຄ້າງຢູ່ຄິວ" value={outbox?.pending ?? '0'} warn />
          <Stat label="ສົ່ງແລ້ວ" value={outbox?.sent ?? '0'} />
          <Stat label="ລົ້ມເຫຼວ" value={outbox?.failed ?? '0'} danger />
          <Stat label="ຂ້າມ (ບໍ່ມີ LINE)" value={outbox?.skipped ?? '0'} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <ActionForm action={sendQueuedNotifications}>
            <SubmitButton
              pendingLabel="ກຳລັງສົ່ງ…"
              className="btn-primary rounded px-3 py-1.5 text-[13px] font-medium"
            >
              ສົ່ງຂໍ້ຄວາມທີ່ຄ້າງ
            </SubmitButton>
          </ActionForm>

          <ActionForm action={retryNotifications}>
            <SubmitButton className="btn-secondary rounded px-3 py-1.5 text-[13px]">
              ລອງສົ່ງອັນທີ່ລົ້ມເຫຼວໃໝ່
            </SubmitButton>
          </ActionForm>

          <ActionForm action={sendTestNotification}>
            <SubmitButton
              pendingLabel="ກຳລັງສົ່ງ…"
              className="btn-secondary rounded px-3 py-1.5 text-[13px]"
            >
              ສົ່ງທົດສອບຫາຕົນເອງ
            </SubmitButton>
          </ActionForm>
        </div>

        {outboxRows.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="o-list w-full text-[13px]">
              <thead className="border-b border-line text-left text-muted">
                <tr>
                  <th className="py-2 pr-3 font-medium">ເວລາ</th>
                  <th className="py-2 pr-3 font-medium">ຜູ້ຮັບ</th>
                  <th className="py-2 pr-3 font-medium">ຫົວຂໍ້</th>
                  <th className="py-2 pr-3 font-medium">ສະຖານະ</th>
                  <th className="py-2 font-medium">ເຫດຜົນ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {outboxRows.map((row) => (
                  <tr key={row.id}>
                    <td className="py-2 pr-3 text-xs whitespace-nowrap text-muted">
                      {formatDateTime(row.created_at)}
                    </td>
                    <td className="py-2 pr-3 text-body">{row.fullname_lo}</td>
                    <td className="py-2 pr-3 text-muted">{row.title}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          row.status === 'sent'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : row.status === 'failed'
                              ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                              : 'bg-slate-100 text-muted dark:bg-white/5'
                        }`}
                      >
                        {OUTBOX_LABEL[row.status] ?? row.status}
                      </span>
                      {row.attempts > 0 && (
                        <span className="ml-1 text-[11px] text-faint">×{row.attempts}</span>
                      )}
                    </td>
                    <td className="py-2 text-xs text-muted">{row.last_error ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

function Stat({
  label,
  value,
  warn,
  danger,
}: {
  label: string
  value: string
  warn?: boolean
  danger?: boolean
}) {
  const n = Number(value)
  return (
    <div className="rounded-lg bg-brand-blue/5 px-4 py-2">
      <p className="text-xs text-muted">{label}</p>
      <p
        className={`text-lg font-semibold ${
          n === 0
            ? 'text-fg'
            : danger
              ? 'text-red-600 dark:text-red-400'
              : warn
                ? 'text-brand-orange'
                : 'text-fg'
        }`}
      >
        {value}
      </p>
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

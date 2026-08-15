import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import {
  getAccountsForEmployee,
  getChecklist,
  getChecklistItems,
} from '@/lib/accounts/queries'
import {
  ACCOUNT_STATUS_LABEL_LO,
  CHECKLIST_KIND_LABEL_LO,
  CHECKLIST_KIND_STYLE,
  CHECKLIST_STATUS_LABEL_LO,
} from '@/lib/accounts/model'
import { safeDate } from '@/lib/assets/model'
import { formatDateTime } from '@/lib/format'
import ItemRow from './item-row'
import ChecklistFooter from './checklist-footer'

export default async function ChecklistPage({ params }: PageProps<'/onboarding/[id]'>) {
  const { id } = await params
  const user = await requireUser()

  const checklist = await getChecklist(id)
  if (!checklist) notFound()

  const [items, accounts] = await Promise.all([
    getChecklistItems(id),
    getAccountsForEmployee(checklist.employee_id),
  ])

  const editable = can.manageAccounts(user)
  const open = checklist.status === 'open'

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${CHECKLIST_KIND_STYLE[checklist.kind]}`}
        >
          {CHECKLIST_KIND_LABEL_LO[checklist.kind]}
        </span>
        <span className="text-xs text-muted">
          {CHECKLIST_STATUS_LABEL_LO[checklist.status]}
        </span>
      </div>

      <h1 className="mt-1 text-xl font-semibold text-fg">
        {checklist.employee_name ?? `ລະຫັດ ${checklist.employee_id}`}
      </h1>
      <p className="mt-0.5 text-sm text-muted">
        {checklist.department_name ?? '—'} · ເລີ່ມ {safeDate(checklist.started_at)}
        {checklist.target_date && ` · ກຳນົດ ${safeDate(checklist.target_date)}`}
        {checklist.is_late && (
          <span className="font-medium text-red-600 dark:text-red-400"> · ເກີນກຳນົດ</span>
        )}
      </p>

      <div className="glass-card mt-5 rounded-xl">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-fg">
            ລາຍການທີ່ຕ້ອງເຮັດ ({checklist.done_count}/{checklist.item_count})
          </h2>
          <span className="w-32">
            <span className="block h-1.5 overflow-hidden rounded-full bg-brand-blue/10">
              <span
                className="block h-full rounded-full bg-brand-blue"
                style={{ width: `${checklist.percent_done}%` }}
              />
            </span>
          </span>
        </div>

        <div className="divide-line divide-y">
          {items.map((item) => (
            <ItemRow key={item.id} item={item} editable={editable && open} />
          ))}
          {items.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted">
              ບໍ່ມີລາຍການ — ແມ່ແບບອາດຖືກປິດໄວ້ໝົດ
            </p>
          )}
        </div>
      </div>

      {accounts.length > 0 && (
        <div className="glass-card mt-4 rounded-xl">
          <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-fg">
            ບັນຊີຂອງຄົນນີ້ ({accounts.length})
          </h2>
          <div className="divide-line divide-y">
            {accounts.map((a) => (
              <div
                key={a.id}
                className={`flex flex-wrap items-center gap-3 px-4 py-2.5 ${
                  a.should_close ? 'bg-red-50/60 dark:bg-red-950/30' : ''
                }`}
              >
                <span className="w-32 truncate text-xs text-muted">{a.system_name}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-fg">
                  {a.username}
                </span>
                <span className="text-xs text-muted">
                  {ACCOUNT_STATUS_LABEL_LO[a.status]}
                </span>
              </div>
            ))}
          </div>
          <p className="border-t border-line px-4 py-2.5 text-xs text-muted">
            ປິດບັນຊີໄດ້ຢູ່ໜ້າ{' '}
            <Link href="/accounts" className="text-brand-blue underline">
              ບັນຊີຜູ້ໃຊ້
            </Link>
          </p>
        </div>
      )}

      {checklist.note && (
        <div className="glass-card mt-4 rounded-xl p-5">
          <p className="text-xs text-muted">ໝາຍເຫດ</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-body">{checklist.note}</p>
        </div>
      )}

      {editable && open && (
        <ChecklistFooter
          id={checklist.id}
          pending={Number(checklist.item_count) - Number(checklist.done_count)}
        />
      )}

      <p className="mt-4 text-xs text-faint">
        ສ້າງໂດຍ {checklist.created_by_name ?? '—'} ·{' '}
        {formatDateTime(checklist.created_at)}
        {checklist.completed_at && ` · ຈົບ ${safeDate(checklist.completed_at)}`}
      </p>
    </div>
  )
}
